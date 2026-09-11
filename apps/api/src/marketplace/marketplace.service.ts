import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MarketplaceQueryDto, MarketplaceSort } from './dto/marketplace-query.dto.js';
import {
  MarketplaceProductDto,
  MarketplaceProductsResponseDto,
  MarketplaceProductDetailResponseDto,
} from './dto/marketplace-product.dto.js';
import { Prisma, ProductStatus } from '@prisma/client';

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to format Prisma product into safe buyer-facing DTO
   */
  private mapToSafeProduct(product: any): MarketplaceProductDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      unit: product.unit,
      location: product.location,
      status: product.status,
      availableQuantity: product.inventory?.availableQuantity
        ? Number(product.inventory.availableQuantity)
        : 0,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        description: product.category.description,
      },
      images: (product.images || []).map((img: any) => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
      })),
      seller: {
        id: product.seller.id,
        sellerType: product.seller.sellerType,
        businessName: product.seller.businessName,
        farmLocation: product.seller.farmLocation,
        verificationStatus: product.seller.verificationStatus,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Public discovery: Find active products with available inventory
   */
  async findAll(query: MarketplaceQueryDto): Promise<MarketplaceProductsResponseDto> {
    const { minPrice, maxPrice, categoryId, location, search, sort, page = 1, limit = 20 } = query;

    // Validate price range integrity
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new BadRequestException('minPrice cannot be greater than maxPrice');
    }

    // Build Prisma where clause
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      inventory: {
        availableQuantity: {
          gt: new Prisma.Decimal(0),
        },
      },
    };

    // Category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Location text filter (case-insensitive)
    if (location && location.trim()) {
      where.location = {
        contains: location.trim(),
        mode: 'insensitive',
      };
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = new Prisma.Decimal(minPrice);
      }
      if (maxPrice !== undefined) {
        where.price.lte = new Prisma.Decimal(maxPrice);
      }
    }

    // Text search (safe parametrized search across name, description, and category name)
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    // Controlled sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput;
    switch (sort) {
      case MarketplaceSort.PRICE_ASC:
        orderBy = { price: 'asc' };
        break;
      case MarketplaceSort.PRICE_DESC:
        orderBy = { price: 'desc' };
        break;
      case MarketplaceSort.NAME_ASC:
        orderBy = { name: 'asc' };
        break;
      case MarketplaceSort.NAME_DESC:
        orderBy = { name: 'desc' };
        break;
      case MarketplaceSort.NEWEST:
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              isPrimary: true,
            },
            orderBy: { isPrimary: 'desc' },
          },
          inventory: {
            select: {
              availableQuantity: true,
            },
          },
          seller: {
            select: {
              id: true,
              sellerType: true,
              businessName: true,
              farmLocation: true,
              verificationStatus: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: products.map((p) => this.mapToSafeProduct(p)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Buyer-facing product detail
   */
  async findById(id: string): Promise<MarketplaceProductDetailResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            isPrimary: true,
          },
          orderBy: { isPrimary: 'desc' },
        },
        inventory: {
          select: {
            availableQuantity: true,
          },
        },
        seller: {
          select: {
            id: true,
            sellerType: true,
            businessName: true,
            farmLocation: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Exclude rejected or archived products from marketplace presentation
    if (product.status === ProductStatus.REJECTED || product.status === ProductStatus.ARCHIVED) {
      throw new NotFoundException('Product is not available in the marketplace');
    }

    return {
      success: true,
      data: this.mapToSafeProduct(product),
    };
  }
}
