import { Module } from '@nestjs/common';
import { StructuredLogger } from './structured-logger.service';

@Module({
  providers: [StructuredLogger],
  exports: [StructuredLogger],
})
export class LoggingModule {}
