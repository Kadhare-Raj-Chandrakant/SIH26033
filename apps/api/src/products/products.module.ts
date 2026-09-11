import { Module } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { SellerProductsController } from './seller-products.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { MediaModule } from '../media/media.module.js';

@Module({
  imports: [InventoryModule, MediaModule],
  controllers: [ProductsController, SellerProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
