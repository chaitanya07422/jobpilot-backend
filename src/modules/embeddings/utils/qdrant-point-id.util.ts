import { createHash } from 'node:crypto';

/** Deterministic UUID-shaped ID for Qdrant from a Mongo ObjectId string. */
export function toQdrantPointId(sourceId: string): string {
  const hash = createHash('sha256')
    .update(`jobpilot:${sourceId}`)
    .digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}
