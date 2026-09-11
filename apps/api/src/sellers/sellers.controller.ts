import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SellersService } from './sellers.service.js';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('sellers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('FARMER', 'FPO') // Only Sellers can access these endpoints
@Controller('api/v1/sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current seller profile' })
  @ApiResponse({ status: 200, description: 'Seller profile retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Seller profile not found.' })
  async getProfile(@CurrentUser() user: AuthUser) {
    return this.sellersService.getProfile(user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current seller profile' })
  @ApiResponse({ status: 200, description: 'Seller profile updated successfully.' })
  @ApiResponse({ status: 404, description: 'Seller profile not found.' })
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() updateSellerProfileDto: UpdateSellerProfileDto,
  ) {
    return this.sellersService.updateProfile(user.sub, updateSellerProfileDto);
  }
}
