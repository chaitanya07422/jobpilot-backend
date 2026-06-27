import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LlmPromptDocument = HydratedDocument<LlmPrompt>;

@Schema({ timestamps: true, collection: 'llm_prompts' })
export class LlmPrompt {
  @Prop({ required: true, trim: true })
  key: string;

  @Prop({ required: true, default: 1 })
  version: number;

  @Prop({ required: true })
  systemPrompt: string;

  @Prop({ required: true })
  userMessageTemplate: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 'gemini-2.0-flash' })
  llmModel: string;

  @Prop({ default: 0.1 })
  temperature: number;

  @Prop({ default: 8192 })
  maxOutputTokens: number;

  @Prop({ default: 'application/json' })
  responseMimeType: string;

  @Prop()
  description?: string;
}

export const LlmPromptSchema = SchemaFactory.createForClass(LlmPrompt);

LlmPromptSchema.index(
  { key: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);
