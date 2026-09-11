import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { SellerOrdersController } from './seller-orders.controller.js';
import { OrdersService } from './orders.service.js';
import { LogisticsModule } from '../logistics/logistics.module.js';

@Module({
  imports: [LogisticsModule],
  controllers: [OrdersController, SellerOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
