import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller.js';
import { MarketplaceService } from './marketplace.service.js';
import { BuyerRequirementsController } from './buyer-requirements.controller.js';
import { BuyerRequirementsService } from './buyer-requirements.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [MarketplaceController, BuyerRequirementsController],
  providers: [MarketplaceService, BuyerRequirementsService],
  exports: [MarketplaceService, BuyerRequirementsService],
})
export class MarketplaceModule {}

