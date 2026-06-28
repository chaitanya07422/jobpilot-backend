import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { ProfileEmbeddingTextService } from './profile-embedding-text.service';

@Module({
  providers: [EmbeddingService, ProfileEmbeddingTextService],
  exports: [EmbeddingService, ProfileEmbeddingTextService],
})
export class EmbeddingsModule {}
