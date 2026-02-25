import { Injectable } from '@nestjs/common';
import { AiRequestDto } from './dto/ai-request.dto';

@Injectable()
export class AiService {
  async handlePrompt(dto: AiRequestDto): Promise<any> {
    // Simple implementation for now
    return {
      response: `Processed prompt: ${dto.prompt}`,
      timestamp: new Date().toISOString(),
    };
  }
}
