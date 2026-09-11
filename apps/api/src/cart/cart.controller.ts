import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BUYER)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('items')
  @ApiOperation({ summary: 'Add a product to cart' })
  @ApiResponse({ status: 201, description: 'Product added to cart successfully.' })
  @ApiResponse({ status: 400, description: 'Stock validation failed or invalid input.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async addToCart(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addToCart(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current buyer cart with item breakdown and subtotal' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully.' })
  async getCart(@CurrentUser() user: AuthUser) {
    return this.cartService.getCart(user.sub);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully.' })
  @ApiResponse({ status: 400, description: 'Requested quantity exceeds stock.' })
  @ApiResponse({ status: 404, description: 'Cart item not found.' })
  async updateCartItem(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(user.sub, productId, dto);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove a product from cart' })
  @ApiResponse({ status: 200, description: 'Cart item removed successfully.' })
  @ApiResponse({ status: 404, description: 'Cart item not found.' })
  async removeCartItem(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.cartService.removeCartItem(user.sub, productId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all items from buyer cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully.' })
  async clearCart(@CurrentUser() user: AuthUser) {
    return this.cartService.clearCart(user.sub);
  }
}
