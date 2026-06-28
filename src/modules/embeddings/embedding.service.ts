import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  isRetryableGeminiError,
  toUserFacingGeminiError,
  withGeminiRetry,
} from '../shared/helpers/gemini-retry.helper';

interface EmbedContentApiResponse {
  embedding?: { values?: number[] };
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private readonly configService: ConfigService) {}

  get modelId(): string {
    return (
      this.configService.get<string>('GEMINI_EMBEDDING_MODEL')?.trim() ||
      'gemini-embedding-001'
    );
  }

  get vectorSize(): number {
    return Number(
      this.configService.get<string>('EMBEDDING_VECTOR_SIZE') ?? 768,
    );
  }

  private get retryAttempts(): number {
    return Number(this.configService.get<string>('GEMINI_RETRY_ATTEMPTS') ?? 4);
  }

  async embed(text: string): Promise<number[]> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'GEMINI_API_KEY is not configured',
      );
    }

    const values = await withGeminiRetry(
      () => this.requestEmbedding(apiKey, text),
      {
        maxAttempts: this.retryAttempts,
        logger: this.logger,
        label: `Gemini embedding (${this.modelId})`,
      },
    );

    this.logger.log('Profile embedding generated');
    return values;
  }

  private async requestEmbedding(
    apiKey: string,
    text: string,
  ): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:embedContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: `models/${this.modelId}`,
        content: { parts: [{ text }] },
        outputDimensionality: this.vectorSize,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const error = new Error(
        `Embedding API ${response.status}: ${errorBody.slice(0, 300)}`,
      );

      if (isRetryableGeminiError(error)) {
        throw error;
      }

      this.logger.error(`Embedding API error: ${errorBody}`);
      throw new InternalServerErrorException(toUserFacingGeminiError(error));
    }

    const data = (await response.json()) as EmbedContentApiResponse;
    const values = data.embedding?.values;

    if (!values?.length) {
      throw new InternalServerErrorException(
        'Embedding API returned empty vector',
      );
    }

    if (values.length !== this.vectorSize) {
      throw new InternalServerErrorException(
        `Embedding dimension mismatch: expected ${this.vectorSize}, got ${values.length}`,
      );
    }

    return values;
  }
}
