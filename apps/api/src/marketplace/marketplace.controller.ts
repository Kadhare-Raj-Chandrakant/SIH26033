import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service.js';
import { MarketplaceQueryDto } from './dto/marketplace-query.dto.js';
import {
  MarketplaceProductsResponseDto,
  MarketplaceProductDetailResponseDto,
} from './dto/marketplace-product.dto.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('marketplace')
@Controller('marketplace/products')
@Public()
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get()
  @ApiOperation({
    summary: 'Discover active marketplace products with optional search, filters, sorting, and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'List of marketplace products retrieved successfully.',
    type: MarketplaceProductsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request — invalid search, filter, sort, or pagination parameters.',
  })
  async findAll(@Query() query: MarketplaceQueryDto): Promise<MarketplaceProductsResponseDto> {
    return this.marketplaceService.findAll(query);
  }

  @Get('filter-options')
  @ApiOperation({
    summary: 'Get available marketplace filter options including distinct states and districts',
  })
  async getFilterOptions() {
    return this.marketplaceService.getFilterOptions();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get marketplace product detail by ID (safe buyer projection)',
  })
  @ApiResponse({
    status: 200,
    description: 'Product detail retrieved successfully.',
    type: MarketplaceProductDetailResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found or not available in the marketplace.',
  })
  async findOne(@Param('id') id: string): Promise<MarketplaceProductDetailResponseDto> {
    return this.marketplaceService.findById(id);
  }
}
