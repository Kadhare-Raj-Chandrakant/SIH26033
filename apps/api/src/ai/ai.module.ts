import { Module } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { AiController } from './ai.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LogisticsModule } from '../logistics/logistics.module.js';
import { NetRealizationService } from './decision-engine/net-realization.service.js';
import { MatchingService } from './decision-engine/matching.service.js';
import { SellTimingService } from './decision-engine/sell-timing.service.js';
import { SmartAllocationService } from './decision-engine/smart-allocation.service.js';
import { MarketIntelligenceService } from './decision-engine/market-intelligence.service.js';

@Module({
  imports: [PrismaModule, LogisticsModule],
  controllers: [AiController],
  providers: [
    AiService,
    NetRealizationService,
    MatchingService,
    SellTimingService,
    SmartAllocationService,
    MarketIntelligenceService,
  ],
  exports: [
    AiService,
    NetRealizationService,
    MatchingService,
    SellTimingService,
    SmartAllocationService,
    MarketIntelligenceService,
  ],
})
export class AiModule {}

