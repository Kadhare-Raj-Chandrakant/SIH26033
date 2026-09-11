import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LogisticsService } from './logistics.service.js';
import { MockLogisticsProvider } from './providers/mock-logistics.provider.js';

@Module({
  imports: [ConfigModule],
  providers: [MockLogisticsProvider, LogisticsService],
  exports: [LogisticsService],
})
export class LogisticsModule {}
