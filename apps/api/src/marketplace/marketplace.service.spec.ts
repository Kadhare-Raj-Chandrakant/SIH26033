import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarketplaceService } from './marketplace.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MarketplaceSort } from './dto/marketplace-query.dto.js';
import { ProductStatus, ProductUnit, SellerType } from '@prisma/client';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let prisma: PrismaService;

  const mockProduct = {
    id: 'prod-123',
    name: 'Organic Tomatoes',
    description: 'Fresh organic farm tomatoes',
    price: 50.0,
    unit: ProductUnit.KG,
    location: 'Vadodara, Gujarat',
    status: ProductStatus.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    category: {
      id: 'cat-123',
      name: 'Vegetables',
      slug: 'vegetables',
      description: 'Fresh vegetables',
    },
    images: [
      {
        id: 'img-1',
        url: 'https://cloudinary.com/test.jpg',
        isPrimary: true,
      },
    ],
    inventory: {
      availableQuantity: 100,
    },
    seller: {
      id: 'seller-123',
      sellerType: SellerType.FARMER,
      businessName: 'Green Farm',
      farmLocation: 'Vadodara',
      verificationStatus: 'VERIFIED',
    },
  };

  beforeEach(() => {
    prisma = {
      product: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    } as any;

    service = new MarketplaceService(prisma);
  });

  describe('findAll', () => {
    it('should throw BadRequestException if minPrice > maxPrice', async () => {
      await expect(
        service.findAll({
          minPrice: 100,
          maxPrice: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should filter active products with available inventory > 0 and calculate pagination', async () => {
      vi.spyOn(prisma, '$transaction').mockResolvedValue([1, [mockProduct]] as any);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        sort: MarketplaceSort.NEWEST,
      });

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe('prod-123');
      expect(result.data[0].availableQuantity).toBe(100);
      expect(result.data[0].price).toBe(50);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should correctly build search and category filters in query', async () => {
      const transactionSpy = vi.spyOn(prisma, '$transaction').mockResolvedValue([0, []] as any);

      await service.findAll({
        search: 'tomato',
        categoryId: 'cat-123',
        location: 'Vadodara',
        minPrice: 20,
        maxPrice: 80,
        sort: MarketplaceSort.PRICE_ASC,
      });

      expect(transactionSpy).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return safe product if active', async () => {
      vi.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);

      const result = await service.findById('prod-123');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('prod-123');
      expect(result.data.seller.businessName).toBe('Green Farm');
      // Verify no sensitive fields
      expect((result.data.seller as any).userId).toBeUndefined();
      expect((result.data.seller as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if product is not found', async () => {
      vi.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if product is REJECTED', async () => {
      vi.spyOn(prisma.product, 'findUnique').mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.REJECTED,
      } as any);

      await expect(service.findById('rejected-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if product is ARCHIVED', async () => {
      vi.spyOn(prisma.product, 'findUnique').mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.ARCHIVED,
      } as any);

      await expect(service.findById('archived-id')).rejects.toThrow(NotFoundException);
    });
  });
});
