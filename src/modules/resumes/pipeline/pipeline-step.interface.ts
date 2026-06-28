import { ResumeProfileDocument } from '../schemas/resume-profile.schema';

export interface ResumePipelineContext {
  profile: ResumeProfileDocument;
  embeddingSynced?: boolean;
}

export interface PipelineStep {
  readonly name: string;
  shouldRun(ctx: ResumePipelineContext): boolean;
  run(ctx: ResumePipelineContext): Promise<ResumePipelineContext>;
}
