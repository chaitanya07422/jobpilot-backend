import { Injectable, Logger } from '@nestjs/common';
import { ResumeVectorService } from '../services/resume-vector.service';
import { PipelineStep, ResumePipelineContext } from './pipeline-step.interface';

@Injectable()
export class ProfileEmbeddingStep implements PipelineStep {
  readonly name = 'profile-embedding';

  constructor(private readonly resumeVectorService: ResumeVectorService) {}

  shouldRun(): boolean {
    return true;
  }

  async run(ctx: ResumePipelineContext): Promise<ResumePipelineContext> {
    ctx.embeddingSynced = await this.resumeVectorService.syncConfirmedProfile(
      ctx.profile,
    );
    return ctx;
  }
}

@Injectable()
export class ResumePipelineService {
  private readonly logger = new Logger(ResumePipelineService.name);

  constructor(private readonly profileEmbeddingStep: ProfileEmbeddingStep) {}

  async runConfirmPipeline(
    profile: ResumePipelineContext['profile'],
  ): Promise<ResumePipelineContext> {
    const steps: PipelineStep[] = [this.profileEmbeddingStep];
    let ctx: ResumePipelineContext = { profile };

    for (const step of steps) {
      if (!step.shouldRun(ctx)) {
        continue;
      }

      this.logger.log(`Running pipeline step: ${step.name}`);
      ctx = await step.run(ctx);
    }

    return ctx;
  }
}
