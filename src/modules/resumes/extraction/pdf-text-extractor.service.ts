import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class PdfTextExtractorService {
  async extractFromBuffer(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      const text = result.text;

      if (!text || text.trim().length < 50) {
        throw new BadRequestException(
          'Could not read text from PDF. Upload a text-based PDF (not a scanned image).',
        );
      }

      return text;
    } finally {
      await parser.destroy();
    }
  }
}
