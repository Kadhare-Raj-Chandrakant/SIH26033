import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service.js';
import { OrderQueryDto } from './dto/order-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@ApiTags('seller-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.FARMER, Role.FPO)
@Controller(['seller/orders', 'sellers/orders'])
export class SellerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get orders received for authenticated farmer/FPO' })
  @ApiResponse({ status: 200, description: 'Seller orders retrieved successfully.' })
  async getSellerOrders(
    @CurrentUser() user: AuthUser,
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.getSellerOrders(user.sub, query);
  }
}
