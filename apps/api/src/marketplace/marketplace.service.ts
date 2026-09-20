// SIH26033 Agricultural Marketplace Service - Fresh Types
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MarketplaceQueryDto, MarketplaceSort } from './dto/marketplace-query.dto.js';
import {
  MarketplaceProductDto,
  MarketplaceProductsResponseDto,
  MarketplaceProductDetailResponseDto,
} from './dto/marketplace-product.dto.js';
import { Prisma, ProductStatus } from '@prisma/client';

export type MarketplaceProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: {
      select: {
        id: true;
        name: true;
        slug: true;
        description: true;
      };
    };
    images: {
      select: {
        id: true;
        url: true;
        isPrimary: true;
      };
    };
    inventory: {
      select: {
        availableQuantity: true;
      };
    };
    seller: {
      select: {
        id: true;
        sellerType: true;
        businessName: true;
        farmLocation: true;
        verificationStatus: true;
      };
    };
  };
}> & {
  primaryImage?: string | null;
};

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to format Prisma product into safe buyer-facing DTO
   */
  private mapToSafeProduct(product: MarketplaceProductWithRelations): MarketplaceProductDto {
    const rawPrice = product.price ? Number(product.price) : 0;
    const hasValidPrice =
      rawPrice > 0 &&
      product.illustrativeFarmerListingReferenceInr !== null &&
      product.illustrativeFarmerListingReferenceInr !== undefined &&
      Number(product.illustrativeFarmerListingReferenceInr) > 0;

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: rawPrice,
      unit: product.unit,
      location: product.location,
      status: hasValidPrice ? product.status : ProductStatus.OUT_OF_STOCK,
      farmerName: product.farmerName || null,
      farmName: product.farmName || null,
      state: product.state || null,
      district: product.district || null,
      marketMandi: product.marketMandi || null,
      varietyType: product.varietyType || null,
      sellingUnit: product.sellingUnit || 'Rs./Quintal',
      officialMandiModalPriceInr: product.officialMandiModalPriceInr ? Number(product.officialMandiModalPriceInr) : null,
      illustrativeFarmerListingReferenceInr: product.illustrativeFarmerListingReferenceInr ? Number(product.illustrativeFarmerListingReferenceInr) : null,
      officialPriceDate: product.officialPriceDate || null,
      notes: product.notes || null,
      availableQuantity: product.inventory?.availableQuantity
        ? Number(product.inventory.availableQuantity)
        : 0,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        description: product.category.description,
      },
      primaryImage:
        product.primaryImage ||
        product.images?.find((img) => img.isPrimary)?.url ||
        product.images?.[0]?.url ||
        null,
      images: (product.images || []).map((img) => ({
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
    const { minPrice, maxPrice, categoryId, location, state, district, search, sort, page = 1, limit = 20 } = query;

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

    // State filter (case-insensitive)
    if (state && state.trim()) {
      where.state = {
        equals: state.trim(),
        mode: 'insensitive',
      };
    }

    // District filter (case-insensitive)
    if (district && district.trim()) {
      where.district = {
        equals: district.trim(),
        mode: 'insensitive',
      };
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

    // Text search (safe parametrized search across name, description, category, farmer, variety, mandi, etc.)
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { farmerName: { contains: searchTerm, mode: 'insensitive' } },
        { farmName: { contains: searchTerm, mode: 'insensitive' } },
        { varietyType: { contains: searchTerm, mode: 'insensitive' } },
        { district: { contains: searchTerm, mode: 'insensitive' } },
        { state: { contains: searchTerm, mode: 'insensitive' } },
        { marketMandi: { contains: searchTerm, mode: 'insensitive' } },
        { notes: { contains: searchTerm, mode: 'insensitive' } },
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

  /**
   * Return distinct states, districts by state, and category list for filtering
   */
  async getFilterOptions() {
    const products = await this.prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE },
      select: { state: true, district: true },
    });

    const statesSet = new Set<string>();
    const stateDistrictsMap: Record<string, Set<string>> = {};

    for (const p of products) {
      if (p.state) {
        statesSet.add(p.state);
        if (!stateDistrictsMap[p.state]) {
          stateDistrictsMap[p.state] = new Set();
        }
        if (p.district) {
          stateDistrictsMap[p.state].add(p.district);
        }
      }
    }

    const states = Array.from(statesSet).sort();
    const districtsByState: Record<string, string[]> = {};
    for (const s of states) {
      districtsByState[s] = Array.from(stateDistrictsMap[s] || []).sort();
    }

    const allDistricts = Array.from(
      new Set(products.map((p) => p.district).filter(Boolean) as string[])
    ).sort();

    return {
      success: true,
      data: {
        states,
        districtsByState,
        allDistricts,
      },
    };
  }
}
