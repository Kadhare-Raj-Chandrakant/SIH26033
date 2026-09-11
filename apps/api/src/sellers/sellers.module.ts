import { Module } from '@nestjs/common';
import { SellersService } from './sellers.service.js';
import { SellersController } from './sellers.controller.js';

@Module({
  controllers: [SellersController],
  providers: [SellersService],
  exports: [SellersService],
})
export class SellersModule {}
