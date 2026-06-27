export function extractJsonString(raw: string): string {
  let text = raw.trim();

  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenced) {
    text = fenced[1].trim();
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }

  return text.replace(/,\s*([}\]])/g, '$1');
}

export function parseLlmJson<T>(raw: string): T {
  const candidates = [raw.trim(), extractJsonString(raw)];

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (typeof parsed === 'string') {
        return JSON.parse(parsed) as T;
      }
      return parsed as T;
    } catch {
      // try next candidate
    }
  }

  throw new Error('Could not parse LLM JSON response');
}
