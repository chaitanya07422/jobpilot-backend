import { Logger } from '@nestjs/common';

const RETRYABLE_PATTERNS = [
  '503',
  '429',
  '500',
  '502',
  '504',
  'high demand',
  'RESOURCE_EXHAUSTED',
  'UNAVAILABLE',
  'Deadline Exceeded',
  'fetch failed',
];

export function isRetryableGeminiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return RETRYABLE_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase()),
  );
}

export function toUserFacingGeminiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes('503') ||
    message.toLowerCase().includes('high demand')
  ) {
    return 'AI service is busy right now. Please try again in a minute.';
  }

  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
    return 'AI rate limit reached. Please wait a moment and try again.';
  }

  return 'AI processing failed. Please try again.';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    logger?: Logger;
    label?: string;
  } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 1500;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableGeminiError(error) || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      options.logger?.warn(
        `${options.label ?? 'Gemini'} attempt ${attempt}/${maxAttempts} failed — retrying in ${delayMs}ms`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}
