import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LlmPrompt, LlmPromptSchema } from './schemas';
import { LlmPromptSeedService, LlmPromptService } from './services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LlmPrompt.name, schema: LlmPromptSchema },
    ]),
  ],
  providers: [LlmPromptService, LlmPromptSeedService],
  exports: [LlmPromptService, MongooseModule],
})
export class LlmPromptsModule {}
