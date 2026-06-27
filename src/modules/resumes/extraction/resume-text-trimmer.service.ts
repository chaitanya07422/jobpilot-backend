import { Injectable } from '@nestjs/common';

const LINK_PATTERNS: RegExp[] = [
  /https?:\/\/[^\s)>\]]+/gi,
  /www\.[^\s)>\]]+/gi,
  /\b[\w.-]+@[\w.-]+\.\w{2,}\b/gi,
  /\blinkedin\.com\/[^\s)>\]]+/gi,
  /\bgithub\.com\/[^\s)>\]]+/gi,
  /\bgitlab\.com\/[^\s)>\]]+/gi,
  /\b(bit\.ly|tinyurl\.com|t\.co)\/[^\s)>\]]+/gi,
  /\b(portfolio|website|blog)\s*:\s*[^\s]+/gi,
];

@Injectable()
export class ResumeTextTrimmerService {
  trimLinks(text: string): string {
    let cleaned = text;

    for (const pattern of LINK_PATTERNS) {
      cleaned = cleaned.replace(pattern, ' ');
    }

    return cleaned
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
