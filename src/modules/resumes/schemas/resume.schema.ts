import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

export type ResumeDocument = HydratedDocument<Resume>;

@Schema({ timestamps: true, collection: 'resumes' })
export class Resume {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  storagePath: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  sizeBytes: number;

  @Prop({ type: [String], default: [] })
  skillsExtracted: string[];

  @Prop({ default: true })
  isPrimary: boolean;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);
