import { Body, Controller, Post, Inject } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiRequestDto } from './dto/ai-request.dto';
import { AI_SERVICE } from './constants';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(@Inject(AI_SERVICE) private readonly aiService: AiService) {}

  @Throttle({ default: { limit: 5, ttl: 10000 } })
  @Post('prompt')
  async prompt(@Body() dto: AiRequestDto): Promise<any> {
    return await this.aiService.handlePrompt(dto);
  }
}
