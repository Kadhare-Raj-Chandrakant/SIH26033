import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service.js';
import { OrderQueryDto } from './dto/order-query.dto.js';
import { ShipOrderDto } from './dto/ship-order.dto.js';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get single order received detail for authenticated farmer/FPO' })
  @ApiResponse({ status: 200, description: 'Seller order retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async getSellerOrderById(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getSellerOrderById(user.sub, id);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm order by producer (PENDING -> CONFIRMED)' })
  @ApiResponse({ status: 200, description: 'Order confirmed successfully.' })
  @ApiResponse({ status: 400, description: 'Order not in PENDING state.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async confirmOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.confirmOrder(user.sub, id);
  }

  @Post(':id/processing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start harvesting/packing order (CONFIRMED -> PROCESSING)' })
  @ApiResponse({ status: 200, description: 'Order marked as processing.' })
  @ApiResponse({ status: 400, description: 'Order not in CONFIRMED state.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async processOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.processOrder(user.sub, id);
  }

  @Post(':id/ready-for-shipment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark order packed and ready for dispatch (PROCESSING -> READY_FOR_SHIPMENT)' })
  @ApiResponse({ status: 200, description: 'Order marked ready for shipment.' })
  @ApiResponse({ status: 400, description: 'Order not in PROCESSING state.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async markReadyForShipment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.markReadyForShipment(user.sub, id);
  }

  @Post(':id/ship')
  @ApiOperation({ summary: 'Dispatch order and generate shipment via carrier adapter (READY_FOR_SHIPMENT -> SHIPPED)' })
  @ApiResponse({ status: 201, description: 'Shipment created and order dispatched.' })
  @ApiResponse({ status: 400, description: 'Order not in READY_FOR_SHIPMENT state or shipment already created.' })
  @ApiResponse({ status: 502, description: 'Logistics provider dispatch failure.' })
  async shipOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ShipOrderDto,
  ) {
    return this.ordersService.shipOrder(user.sub, id, dto);
  }

  @Post(':id/sync-shipment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Synchronize latest shipment tracking status from carrier' })
  @ApiResponse({ status: 200, description: 'Shipment synchronized successfully.' })
  @ApiResponse({ status: 400, description: 'No active shipment exists on order.' })
  async syncShipment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.syncShipmentStatus(user.sub, id);
  }
}


