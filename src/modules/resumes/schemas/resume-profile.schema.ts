import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';
import { Resume } from './resume.schema';
import { ExtractionStatus } from '../enums/extraction-status.enum';

export type ResumeProfileDocument = HydratedDocument<ResumeProfile>;

@Schema({ _id: false })
export class ExperienceEntry {
  @Prop({ default: '' }) company: string;
  @Prop({ default: '' }) role: string;
  @Prop() location?: string;
  @Prop() startDate?: string;
  @Prop() endDate?: string;
  @Prop({ type: [String], default: [] }) highlights: string[];
  @Prop({ type: [String], default: [] }) technologies: string[];
}

@Schema({ _id: false })
export class EducationEntry {
  @Prop({ default: '' }) institution: string;
  @Prop() degree?: string;
  @Prop() field?: string;
  @Prop() startDate?: string;
  @Prop() endDate?: string;
  @Prop() grade?: string;
}

@Schema({ _id: false })
export class ProjectEntry {
  @Prop({ default: '' }) name: string;
  @Prop() description?: string;
  @Prop({ type: [String], default: [] }) technologies: string[];
  @Prop() url?: string;
}

@Schema({ _id: false })
export class OtherSectionEntry {
  @Prop({ default: '' }) title: string;
  @Prop({ type: [String], default: [] }) items: string[];
}

@Schema({ timestamps: true, collection: 'resume_profiles' })
export class ResumeProfile {
  @Prop({
    type: Types.ObjectId,
    ref: Resume.name,
    required: true,
    unique: true,
  })
  resumeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ExtractionStatus,
    default: ExtractionStatus.Pending,
  })
  extractionStatus: ExtractionStatus;

  @Prop() extractionError?: string;

  @Prop() summary?: string;

  @Prop() totalYearsExperience?: number;

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({ type: [String], default: [] })
  technologies: string[];

  @Prop({ type: [ExperienceEntry], default: [] })
  experience: ExperienceEntry[];

  @Prop({ type: [EducationEntry], default: [] })
  education: EducationEntry[];

  @Prop({ type: [ProjectEntry], default: [] })
  projects: ProjectEntry[];

  @Prop({ type: [String], default: [] })
  certifications: string[];

  @Prop({ type: [String], default: [] })
  languages: string[];

  @Prop({ type: [OtherSectionEntry], default: [] })
  otherSections: OtherSectionEntry[];

  @Prop()
  profileConfirmedAt?: Date;

  @Prop({ default: 0 })
  profileEditCount: number;

  @Prop({ default: 2 })
  profileEditLimit: number;

  @Prop()
  qdrantSyncedAt?: Date;

  @Prop()
  qdrantSyncError?: string;

  @Prop()
  embeddingModel?: string;

  @Prop()
  embeddingTextHash?: string;

  @Prop()
  qdrantPointId?: string;
}

export const ResumeProfileSchema = SchemaFactory.createForClass(ResumeProfile);
