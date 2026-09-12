import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { MediaModule } from './media/media.module.js';
import { SellersModule } from './sellers/sellers.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ProductsModule } from './products/products.module.js';
import { MarketplaceModule } from './marketplace/marketplace.module.js';
import { AddressesModule } from './addresses/addresses.module.js';
import { CartModule } from './cart/cart.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { LogisticsModule } from './logistics/logistics.module.js';
import { AiModule } from './ai/ai.module.js';
import { AdminModule } from './admin/admin.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    MediaModule,
    SellersModule,
    InventoryModule,
    CategoriesModule,
    ProductsModule,
    MarketplaceModule,
    AddressesModule,
    CartModule,
    OrdersModule,
    LogisticsModule,
    AiModule,
    AdminModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: process.env.NODE_ENV === 'test' ? 1000 : 100, // 100 req/min baseline
      },
      {
        name: 'strict',
        ttl: 60000,
        limit: process.env.NODE_ENV === 'test' ? 1000 : 10, // 10 req/min for sensitive operations
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Global JWT Guard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Global Roles Guard
    },
  ],
})
export class AppModule {}
