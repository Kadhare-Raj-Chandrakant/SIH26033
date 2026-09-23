import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateInventoryDto } from './dto/update-inventory.dto.js';
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
    let profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && (user.role === 'FARMER' || user.role === 'FPO')) {
        profile = await this.prisma.sellerProfile.create({
          data: {
            userId,
            sellerType: user.role === 'FPO' ? 'FPO' : 'FARMER',
            businessName: user.role === 'FPO' ? 'Registered FPO' : 'Farmer Farm',
          },
        });
      } else {
        throw new ForbiddenException('Only sellers can perform this action. Seller profile not found.');
      }
    }
    return profile.id;
  }

  async create(userId: string, createProductDto: CreateProductDto) {
    if (createProductDto.initialQuantity <= 0) {
      throw new BadRequestException('Initial available quantity must be greater than 0');
    }
    if (createProductDto.price <= 0) {
      throw new BadRequestException('Price must be greater than 0');
    }

    const sellerId = await this.getSellerProfileId(userId);

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });
    if (!category) {
      throw new BadRequestException('Invalid category ID');
    }

    // Resolve seller's authentic registered address and profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        },
        sellerProfile: true,
      },
    });

    const defaultAddr = user?.addresses?.[0];
    const originState = defaultAddr?.state || 'Maharashtra';
    const originDistrict = defaultAddr?.district || defaultAddr?.city || 'Nashik';
    const resolvedLocation = defaultAddr
      ? `${originDistrict}, ${originState}`
      : (createProductDto.location || user?.sellerProfile?.farmLocation || `${originDistrict}, ${originState}`);
    const resolvedFarmerName = user?.sellerProfile?.businessName || 'Verified Producer';
    const resolvedFarmName = user?.sellerProfile?.businessName || 'Producer Farm';

    // Compute pricePerQuintal for illustrative reference in landed-cost intelligence
    let pricePerQuintal = Number(createProductDto.price);
    if (createProductDto.unit === 'KG') {
      pricePerQuintal = pricePerQuintal * 100;
    } else if (createProductDto.unit === 'TONNE') {
      pricePerQuintal = pricePerQuintal / 10;
    }

    // Use transaction to create product, inventory, and optional initial image together
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sellerId,
          categoryId: createProductDto.categoryId,
          name: createProductDto.name.trim(),
          description: createProductDto.description.trim(),
          price: new Prisma.Decimal(createProductDto.price),
          unit: createProductDto.unit,
          location: resolvedLocation,
          state: originState,
          district: originDistrict,
          farmerName: resolvedFarmerName,
          farmName: resolvedFarmName,
          varietyType: createProductDto.varietyType?.trim() || null,
          notes: createProductDto.notes?.trim() || null,
          primaryImage: createProductDto.primaryImage?.trim() || null,
          sellingUnit: 'Rs./Quintal',
          illustrativeFarmerListingReferenceInr: new Prisma.Decimal(pricePerQuintal),
        },
      });

      await this.inventoryService.initializeInventory(
        product.id,
        new Prisma.Decimal(createProductDto.initialQuantity),
        tx,
      );

      if (createProductDto.primaryImage?.trim()) {
        await tx.productImage.create({
          data: {
            productId: product.id,
            cloudinaryId: `prod-img-${Date.now()}`,
            url: createProductDto.primaryImage.trim(),
            isPrimary: true,
          },
        });
      }

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

    // Restrict seller-controlled status transitions
    if (updateProductDto.status && updateProductDto.status !== product.status) {
      const newStatus = updateProductDto.status;
      if (newStatus === ('REJECTED' as any)) {
        throw new BadRequestException('Sellers are not permitted to set status to REJECTED');
      }
      if (product.status === 'REJECTED') {
        throw new BadRequestException('Cannot modify status of a REJECTED product');
      }
      if (product.status === 'ARCHIVED') {
        throw new BadRequestException('Cannot modify status of an ARCHIVED product');
      }

      // Allowed seller transitions:
      // ACTIVE <-> OUT_OF_STOCK
      // ACTIVE -> ARCHIVED
      // OUT_OF_STOCK -> ARCHIVED
      const validFromActive = ['OUT_OF_STOCK', 'ARCHIVED'];
      const validFromOutOfStock = ['ACTIVE', 'ARCHIVED'];

      if (product.status === 'ACTIVE' && !validFromActive.includes(newStatus)) {
        throw new BadRequestException(`Invalid status transition from ACTIVE to ${newStatus}`);
      }
      if (product.status === 'OUT_OF_STOCK' && !validFromOutOfStock.includes(newStatus)) {
        throw new BadRequestException(`Invalid status transition from OUT_OF_STOCK to ${newStatus}`);
      }
    }

    let refPrice: Prisma.Decimal | undefined = undefined;
    if (updateProductDto.price !== undefined) {
      if (updateProductDto.price <= 0) {
        throw new BadRequestException('Price must be greater than 0');
      }
      const activeUnit = updateProductDto.unit || product.unit;
      let pricePerQuintal = Number(updateProductDto.price);
      if (activeUnit === 'KG') {
        pricePerQuintal = pricePerQuintal * 100;
      } else if (activeUnit === 'TONNE') {
        pricePerQuintal = pricePerQuintal / 10;
      }
      refPrice = new Prisma.Decimal(pricePerQuintal);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        price: updateProductDto.price ? new Prisma.Decimal(updateProductDto.price) : undefined,
        illustrativeFarmerListingReferenceInr: refPrice,
      },
    });
  }

  async updateInventory(userId: string, productId: string, updateInventoryDto: UpdateInventoryDto) {
    const sellerId = await this.getSellerProfileId(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('You do not have permission to modify inventory for this product');
    }

    if (!product.inventory) {
      throw new NotFoundException('Inventory record not found for this product');
    }

    const currentAvailable = Number(product.inventory.availableQuantity);
    const currentReserved = Number(product.inventory.reservedQuantity);

    const newAvailable = updateInventoryDto.availableQuantity !== undefined ? updateInventoryDto.availableQuantity : currentAvailable;
    const newReserved = updateInventoryDto.reservedQuantity !== undefined ? updateInventoryDto.reservedQuantity : currentReserved;

    if (newAvailable < 0) {
      throw new BadRequestException('Available quantity cannot be negative');
    }

    if (newReserved < 0) {
      throw new BadRequestException('Reserved quantity cannot be negative');
    }

    if (newReserved > newAvailable) {
      throw new BadRequestException('Reserved quantity cannot exceed available quantity');
    }

    return this.prisma.inventory.update({
      where: { productId },
      data: {
        availableQuantity: new Prisma.Decimal(newAvailable),
        reservedQuantity: new Prisma.Decimal(newReserved),
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
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type '${file.mimetype}'. Allowed types: image/jpeg, image/png, image/webp`,
      );
    }

    const maxFileSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxFileSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

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

    const [newImage] = await this.prisma.$transaction([
      this.prisma.productImage.create({
        data: {
          productId,
          cloudinaryId: uploadResult.public_id,
          url: uploadResult.secure_url,
          isPrimary: !product.primaryImage,
        },
      }),
      this.prisma.product.update({
        where: { id: productId },
        data: {
          primaryImage: product.primaryImage || uploadResult.secure_url,
        },
      }),
    ]);

    return newImage;
  }

  async removeImage(userId: string, productId: string, imageId: string) {
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

    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException('Product image not found');
    }

    if (image.productId !== productId) {
      throw new BadRequestException('Image does not belong to the specified product');
    }

    await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    if (image.cloudinaryId) {
      this.cloudinaryService.deleteImage(image.cloudinaryId).catch(() => {});
    }

    // If deleted image was primary, set next available image or null
    if (product.primaryImage === image.url) {
      const remainingImage = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { createdAt: 'asc' },
      });
      await this.prisma.product.update({
        where: { id: productId },
        data: { primaryImage: remainingImage ? remainingImage.url : null },
      });
    }

    return { success: true, message: 'Product image deleted successfully' };
  }
}
