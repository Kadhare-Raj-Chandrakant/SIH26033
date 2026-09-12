import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateInventoryDto } from './dto/update-inventory.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import 'multer';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ==========================================
  // SELLER PRODUCT MANAGEMENT
  // ==========================================

  @Post()
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

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FARMER', 'FPO')
  @ApiOperation({ summary: 'Update a product (Seller only, must own product)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(user.sub, id, updateProductDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FARMER', 'FPO')
  @ApiOperation({ summary: 'Delete a product (Seller only, must own product)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.remove(user.sub, id);
  }

  // ==========================================
  // INVENTORY MANAGEMENT
  // ==========================================

  @Patch(':id/inventory')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FARMER', 'FPO')
  @ApiOperation({ summary: 'Update product inventory (Seller only, must own product)' })
  @ApiResponse({ status: 200, description: 'Product inventory updated successfully.' })
  async updateInventory(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.productsService.updateInventory(user.sub, id, updateInventoryDto);
  }

  // ==========================================
  // PRODUCT IMAGES
  // ==========================================

  @Post(':id/images')
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
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB limit
      },
      fileFilter: (_req, file, callback) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        const allowedExts = /\.(jpe?g|png|webp)$/i;

        if (!allowedMimes.includes(file.mimetype) || !allowedExts.test(file.originalname)) {
          return callback(
            new BadRequestException('Only image files (JPEG, PNG, WebP) are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadImage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.productsService.uploadImage(user.sub, id, file);
  }

  @Delete(':id/images/:imageId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FARMER', 'FPO')
  @ApiOperation({ summary: 'Delete an individual product image (Seller only, must own product)' })
  @ApiResponse({ status: 200, description: 'Product image deleted successfully.' })
  async removeImage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.productsService.removeImage(user.sub, id, imageId);
  }

  // ==========================================
  // PUBLIC PRODUCT READ
  // ==========================================

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID (Public read)' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }
}
