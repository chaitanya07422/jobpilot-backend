import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LlmPromptService } from '../../llm-prompts/services/llm-prompt.service';
import { RESUME_PROFILE_EXTRACTION_PROMPT_KEY } from '../../llm-prompts/constants/llm-prompt.constants';
import { ExtractedResumeProfile } from '../interfaces/resume-profile.interface';
import { parseLlmJson } from './parse-llm-json';
import { normalizeExtractedProfile } from './resume-profile.validator';

@Injectable()
export class GeminiResumeExtractorService {
  private readonly logger = new Logger(GeminiResumeExtractorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly llmPromptService: LlmPromptService,
  ) {}

  async extract(trimmedText: string): Promise<ExtractedResumeProfile> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'GEMINI_API_KEY is not configured',
      );
    }

    const prompt = await this.llmPromptService.getActivePrompt(
      RESUME_PROFILE_EXTRACTION_PROMPT_KEY,
    );

    const modelName =
      this.configService.get<string>('GEMINI_MODEL')?.trim() || prompt.llmModel;

    const userMessage = prompt.userMessageTemplate.replace(
      '{{resumeText}}',
      trimmedText,
    );

    this.logger.log(
      `Calling Gemini model=${modelName} (text length=${trimmedText.length})`,
    );

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: prompt.systemPrompt,
      generationConfig: {
        temperature: prompt.temperature,
        maxOutputTokens: prompt.maxOutputTokens,
        responseMimeType: prompt.responseMimeType,
      },
    });

    let raw: string;
    try {
      const result = await model.generateContent(userMessage);
      raw = result.response.text();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Gemini request failed';
      this.logger.error(`Gemini call failed: ${message}`);
      throw new InternalServerErrorException(message);
    }

    if (!raw) {
      throw new InternalServerErrorException('Empty response from Gemini');
    }

    try {
      return normalizeExtractedProfile(
        parseLlmJson<ExtractedResumeProfile>(raw),
      );
    } catch {
      this.logger.error(
        `Gemini JSON parse failed (length=${raw.length}): ${raw.slice(0, 200)}...${raw.slice(-200)}`,
      );
      throw new InternalServerErrorException(
        'Gemini returned invalid profile JSON',
      );
    }
  }
}
