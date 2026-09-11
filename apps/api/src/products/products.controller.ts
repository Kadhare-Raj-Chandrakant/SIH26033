import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import 'multer';

@ApiTags('products')
@Controller('api/v1')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ==========================================
  // SELLER PRODUCT MANAGEMENT
  // ==========================================

  @Post('products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FARMER', 'FPO')
  @ApiOperation({ summary: 'Create a new product (Seller only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(user.sub, createProductDto);
  }

  @Get('seller/products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FARMER', 'FPO')
  @ApiOperation({ summary: 'Get all products belonging to the authenticated seller' })
  @ApiResponse({ status: 200, description: 'Seller products retrieved successfully.' })
  async findAllBySeller(@CurrentUser() user: AuthUser) {
    return this.productsService.findAllBySeller(user.sub);
  }

  @Patch('products/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FARMER', 'FPO')
  @ApiOperation({ summary: 'Update a product (Seller only, must own product)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(user.sub, id, updateProductDto);
  }

  @Delete('products/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FARMER', 'FPO')
  @ApiOperation({ summary: 'Delete a product (Seller only, must own product)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.productsService.remove(user.sub, id);
  }

  @Post('products/:id/images')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FARMER', 'FPO')
  @ApiOperation({ summary: 'Upload an image for a product (Seller only, must own product)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.productsService.uploadImage(user.sub, id, file);
  }

  // ==========================================
  // PUBLIC PRODUCT READ
  // ==========================================

  @Get('products/:id')
  @ApiOperation({ summary: 'Get a product by ID (Public read)' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
}
