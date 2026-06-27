import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LlmPrompt, LlmPromptDocument } from '../schemas';

@Injectable()
export class LlmPromptService {
  private cache = new Map<
    string,
    { prompt: LlmPromptDocument; expiresAt: number }
  >();
  private readonly ttlMs = 60_000;

  constructor(
    @InjectModel(LlmPrompt.name)
    private readonly llmPromptModel: Model<LlmPromptDocument>,
  ) {}

  async getActivePrompt(key: string): Promise<LlmPromptDocument> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.prompt;
    }

    const prompt = await this.llmPromptModel
      .findOne({ key, isActive: true })
      .exec();

    if (!prompt) {
      throw new NotFoundException(`Active LLM prompt not found: ${key}`);
    }

    this.cache.set(key, { prompt, expiresAt: Date.now() + this.ttlMs });
    return prompt;
  }

  invalidateCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      return;
    }
    this.cache.clear();
  }
}
