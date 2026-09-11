import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { CloudinaryService } from '../media/cloudinary.service.js';
import { Prisma } from '@prisma/client';
import 'multer';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Internal helper to resolve seller profile from user ID
   */
  private async getSellerProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new ForbiddenException('Only sellers can perform this action. Seller profile not found.');
    }
    return profile.id;
  }

  async create(userId: string, createProductDto: CreateProductDto) {
    const sellerId = await this.getSellerProfileId(userId);

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });
    if (!category) {
      throw new BadRequestException('Invalid category ID');
    }

    // Use transaction to create product and inventory together
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sellerId,
          categoryId: createProductDto.categoryId,
          name: createProductDto.name,
          description: createProductDto.description,
          price: new Prisma.Decimal(createProductDto.price),
          unit: createProductDto.unit,
          location: createProductDto.location,
        },
      });

      await this.inventoryService.initializeInventory(product.id, new Prisma.Decimal(createProductDto.initialQuantity), tx);

      return product;
    });
  }

  async findAllBySeller(userId: string) {
    const sellerId = await this.getSellerProfileId(userId);

    return this.prisma.product.findMany({
      where: { sellerId },
      include: {
        inventory: true,
        images: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        inventory: true,
        images: true,
        category: true,
        seller: {
          select: {
            businessName: true,
            sellerType: true,
            farmLocation: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(userId: string, id: string, updateProductDto: UpdateProductDto) {
    const sellerId = await this.getSellerProfileId(userId);

    // Verify ownership
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('You do not have permission to modify this product');
    }

    if (updateProductDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateProductDto.categoryId },
      });
      if (!category) throw new BadRequestException('Invalid category ID');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        price: updateProductDto.price ? new Prisma.Decimal(updateProductDto.price) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    const sellerId = await this.getSellerProfileId(userId);

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('You do not have permission to delete this product');
    }

    // We only archive instead of hard delete if there might be orders. 
    // In MVP, we can delete or set to ARCHIVED. Let's do a hard delete inside transaction, 
    // cascading takes care of inventory, but we should handle images.
    
    // If it has order items, it might throw a foreign key error due to restricted referential actions.
    // It's safer to just set status = ARCHIVED if we don't want to break order history.
    // But as requested, we implement DELETE. Prisma schema doesn't specify cascade for orders, 
    // so Prisma will throw if orders exist. This is correct behavior.

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete Inventory
      await tx.inventory.delete({ where: { productId: id } });

      // 2. Delete images from DB
      await tx.productImage.deleteMany({ where: { productId: id } });

      // 3. Delete Product
      await tx.product.delete({ where: { id } });

      // Clean up from Cloudinary in background (non-blocking)
      for (const image of product.images) {
        this.cloudinaryService.deleteImage(image.cloudinaryId).catch(() => {});
      }

      return { success: true };
    });
  }

  async uploadImage(userId: string, productId: string, file: Express.Multer.File) {
    const sellerId = await this.getSellerProfileId(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('You do not have permission to modify this product');
    }

    const uploadResult = await this.cloudinaryService.uploadImage(file);

    return this.prisma.productImage.create({
      data: {
        productId,
        cloudinaryId: uploadResult.public_id,
        url: uploadResult.secure_url,
      },
    });
  }
}
