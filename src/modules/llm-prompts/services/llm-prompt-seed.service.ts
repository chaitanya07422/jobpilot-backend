import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RESUME_PROFILE_EXTRACTION_PROMPT_KEY,
  RESUME_PROFILE_EXTRACTION_SYSTEM_PROMPT,
  RESUME_PROFILE_EXTRACTION_USER_TEMPLATE,
} from '../constants/llm-prompt.constants';
import { LlmPrompt, LlmPromptDocument } from '../schemas';

@Injectable()
export class LlmPromptSeedService implements OnModuleInit {
  private readonly logger = new Logger(LlmPromptSeedService.name);

  constructor(
    @InjectModel(LlmPrompt.name)
    private readonly llmPromptModel: Model<LlmPromptDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedResumeProfileExtractionPrompt();
  }

  private async seedResumeProfileExtractionPrompt(): Promise<void> {
    const existing = await this.llmPromptModel
      .findOne({ key: RESUME_PROFILE_EXTRACTION_PROMPT_KEY, isActive: true })
      .exec();

    if (existing) {
      let updated = false;
      if (existing.llmModel === 'gemini-2.0-flash') {
        existing.llmModel = 'gemini-2.5-flash';
        updated = true;
      }
      if ((existing.maxOutputTokens ?? 4096) < 8192) {
        existing.maxOutputTokens = 8192;
        updated = true;
      }
      if (updated) {
        await existing.save();
        this.logger.log(
          `Updated LLM prompt settings: ${RESUME_PROFILE_EXTRACTION_PROMPT_KEY}`,
        );
      }
      return;
    }

    await this.llmPromptModel.create({
      key: RESUME_PROFILE_EXTRACTION_PROMPT_KEY,
      version: 1,
      systemPrompt: RESUME_PROFILE_EXTRACTION_SYSTEM_PROMPT,
      userMessageTemplate: RESUME_PROFILE_EXTRACTION_USER_TEMPLATE,
      isActive: true,
      llmModel: 'gemini-2.5-flash',
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      description: 'Resume profile extraction v1',
    });

    this.logger.log(
      `Seeded LLM prompt: ${RESUME_PROFILE_EXTRACTION_PROMPT_KEY}`,
    );
  }
}
