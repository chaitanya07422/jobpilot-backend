import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { JobCloseReason } from '../enums/job-close-reason.enum';
import { JobSource } from '../enums/job-source.enum';
import { JobCatalogStatus } from '../enums/job-status.enum';

export type JobDocument = HydratedDocument<Job>;

@Schema({ timestamps: true, collection: 'jobs' })
export class Job {
  @Prop({ type: String, enum: JobSource, required: true })
  source: JobSource;

  @Prop({ required: true })
  externalId: string;

  @Prop({ required: true })
  sourceUrl: string;

  @Prop({ required: true, trim: true })
  company: string;

  @Prop({ required: true, trim: true })
  role: string;

  @Prop({ default: '', trim: true })
  location: string;

  @Prop({ default: false })
  isRemote: boolean;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  applyUrl: string;

  @Prop({ type: [String], default: [] })
  requiredSkills: string[];

  @Prop()
  salary?: string;

  @Prop()
  seniority?: string;

  @Prop({
    type: String,
    enum: JobCatalogStatus,
    default: JobCatalogStatus.Active,
  })
  status: JobCatalogStatus;

  @Prop()
  postedAt?: Date;

  @Prop({ required: true })
  discoveredAt: Date;

  @Prop({ required: true })
  lastSeenAt: Date;

  @Prop()
  closedAt?: Date;

  @Prop()
  expiresAt?: Date;

  @Prop({ type: String, enum: JobCloseReason })
  closeReason?: JobCloseReason;

  @Prop()
  embeddingModel?: string;

  @Prop()
  embeddingTextHash?: string;

  @Prop()
  qdrantPointId?: string;

  @Prop()
  qdrantSyncedAt?: Date;

  @Prop()
  qdrantSyncError?: string;
}

export const JobSchema = SchemaFactory.createForClass(Job);

JobSchema.index({ source: 1, externalId: 1 }, { unique: true });
JobSchema.index({ status: 1, lastSeenAt: -1 });
JobSchema.index({ status: 1, discoveredAt: -1 });
