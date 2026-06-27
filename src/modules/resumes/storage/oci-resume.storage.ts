import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Readable } from 'stream';
import * as common from 'oci-common';
import * as objectstorage from 'oci-objectstorage';
import { ResumeStorageBackend } from './resume-storage.backend';

@Injectable()
export class OciResumeStorage implements ResumeStorageBackend, OnModuleInit {
  private readonly logger = new Logger(OciResumeStorage.name);
  private client!: objectstorage.ObjectStorageClient;
  private namespace!: string;
  private bucketName!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    if (!this.isOciEnabled()) {
      return;
    }

    this.initializeClient();
  }

  private isOciEnabled(): boolean {
    return (
      this.configService.get<string>('STORAGE_PROVIDER', 'local') === 'oci'
    );
  }

  private initializeClient(): void {
    const region = this.configService.getOrThrow<string>('OCI_REGION');
    this.namespace = this.configService.getOrThrow<string>('OCI_NAMESPACE');
    this.bucketName = this.configService.getOrThrow<string>('OCI_BUCKET_NAME');

    const configFile = this.configService.get<string>(
      'OCI_CONFIG_FILE',
      `${process.env.HOME ?? ''}/.oci/config`,
    );
    const profile = this.configService.get<string>(
      'OCI_CONFIG_PROFILE',
      'DEFAULT',
    );

    const provider = new common.ConfigFileAuthenticationDetailsProvider(
      configFile,
      profile,
    );

    this.client = new objectstorage.ObjectStorageClient({
      authenticationDetailsProvider: provider,
    });
    this.client.regionId = region;

    this.logger.log(
      `OCI resume storage ready (bucket=${this.bucketName}, region=${region})`,
    );
  }

  private ensureClient(): void {
    if (this.client) {
      return;
    }

    if (!this.isOciEnabled()) {
      throw new InternalServerErrorException(
        'OCI resume storage is not enabled',
      );
    }

    this.initializeClient();
  }

  async save(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ storagePath: string }> {
    this.ensureClient();
    const storagePath = join('resumes', userId, `${randomUUID()}.pdf`);

    await this.client.putObject({
      namespaceName: this.namespace,
      bucketName: this.bucketName,
      objectName: storagePath,
      putObjectBody: file.buffer,
      contentType: file.mimetype,
      contentLength: file.size,
    });

    return { storagePath };
  }

  async delete(storagePath: string): Promise<void> {
    this.ensureClient();
    try {
      await this.client.deleteObject({
        namespaceName: this.namespace,
        bucketName: this.bucketName,
        objectName: storagePath,
      });
    } catch (error) {
      this.logger.warn(`Failed to delete OCI object ${storagePath}: ${error}`);
    }
  }

  async openReadStream(storagePath: string): Promise<Readable> {
    this.ensureClient();
    try {
      const response = await this.client.getObject({
        namespaceName: this.namespace,
        bucketName: this.bucketName,
        objectName: storagePath,
      });

      const body = response.value;

      if (!body) {
        throw new InternalServerErrorException('Empty object body from OCI');
      }

      if (body instanceof Readable) {
        return body;
      }

      if (body instanceof Buffer || body instanceof Uint8Array) {
        return Readable.from(body);
      }

      return Readable.from(body as AsyncIterable<Uint8Array>);
    } catch (error) {
      this.logger.error(`Failed to read OCI object ${storagePath}: ${error}`);
      throw new InternalServerErrorException('Resume file not found');
    }
  }
}
