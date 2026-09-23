import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { CloudinaryService } from '../media/cloudinary.service.js';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProductStatus, ProductUnit, Role, SellerType } from '@prisma/client';
import { Prisma } from '@prisma/client';

describe('ProductsService - Manual Product Listing & Ownership QA', () => {
  let service: ProductsService;
  let prisma: any;
  let inventoryService: any;
  let cloudinaryService: any;

  const mockFarmerUser = {
    id: 'user-farmer-1',
    email: 'farmer1_demo@sih26033.org',
    role: Role.FARMER,
    sellerProfile: {
      id: 'seller-profile-1',
      userId: 'user-farmer-1',
      sellerType: SellerType.FARMER,
      businessName: 'Nashik Organic Farms',
      farmLocation: 'Nashik, Maharashtra',
    },
    addresses: [
      {
        id: 'addr-1',
        userId: 'user-farmer-1',
        state: 'Maharashtra',
        district: 'Nashik',
        city: 'Nashik',
        isDefault: true,
      },
    ],
  };

  const mockCategory = {
    id: 'cat-veg-1',
    name: 'Vegetables',
    slug: 'vegetables',
  };

  beforeEach(() => {
    prisma = {
      sellerProfile: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      category: {
        findUnique: vi.fn(),
      },
      product: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      inventory: {
        update: vi.fn(),
        delete: vi.fn(),
      },
      productImage: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prisma)),
    };

    inventoryService = {
      initializeInventory: vi.fn().mockResolvedValue({ id: 'inv-1', availableQuantity: 150 }),
    };

    cloudinaryService = {
      uploadImage: vi.fn().mockResolvedValue({ public_id: 'c-1', secure_url: 'https://cloudinary.com/test.jpg' }),
      deleteImage: vi.fn().mockResolvedValue(undefined),
    };

    service = new ProductsService(prisma, inventoryService, cloudinaryService);
  });

  describe('create - Manual Product Listing Flow', () => {
    it('successfully creates product with authentic origin, inventory, and landed-cost reference price', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(mockFarmerUser.sellerProfile);
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.user.findUnique.mockResolvedValue(mockFarmerUser);

      prisma.product.create.mockImplementation(({ data }: any) => ({
        id: 'prod-new-1',
        ...data,
      }));

      const result = await service.create(mockFarmerUser.id, {
        name: 'Nashik Red Onion',
        description: 'Fresh harvest garwa onion, grade A export quality',
        categoryId: mockCategory.id,
        price: 1950,
        unit: ProductUnit.QUINTAL,
        initialQuantity: 150,
        varietyType: 'Garwa Red',
        notes: 'Grade A Export Quality',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('prod-new-1');
      expect(result.name).toBe('Nashik Red Onion');
      expect(result.state).toBe('Maharashtra');
      expect(result.district).toBe('Nashik');
      expect(result.varietyType).toBe('Garwa Red');
      expect(result.notes).toBe('Grade A Export Quality');

      // Verify inventory was initialized transactionally with positive quantity
      expect(inventoryService.initializeInventory).toHaveBeenCalledWith(
        'prod-new-1',
        new Prisma.Decimal(150),
        prisma,
      );
    });

    it('rejects listing creation if initial quantity is zero or negative', async () => {
      await expect(
        service.create(mockFarmerUser.id, {
          name: 'Zero Stock Crop',
          description: 'No stock crop test',
          categoryId: mockCategory.id,
          price: 100,
          unit: ProductUnit.KG,
          initialQuantity: 0,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create(mockFarmerUser.id, {
          name: 'Negative Stock Crop',
          description: 'Negative stock crop test',
          categoryId: mockCategory.id,
          price: 100,
          unit: ProductUnit.KG,
          initialQuantity: -5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects listing creation if price is zero or negative', async () => {
      await expect(
        service.create(mockFarmerUser.id, {
          name: 'Zero Price Crop',
          description: 'Invalid price test',
          categoryId: mockCategory.id,
          price: 0,
          unit: ProductUnit.KG,
          initialQuantity: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('auto-heals seller profile if an authenticated FARMER user does not have one yet', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValueOnce(null);
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-new-farmer',
        email: 'newfarmer@sih26033.org',
        role: Role.FARMER,
      });
      prisma.sellerProfile.create.mockResolvedValue({
        id: 'seller-new-profile',
        userId: 'user-new-farmer',
        sellerType: SellerType.FARMER,
      });
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-new-farmer',
        role: Role.FARMER,
        sellerProfile: { id: 'seller-new-profile' },
        addresses: [],
      });
      prisma.product.create.mockImplementation(({ data }: any) => ({
        id: 'prod-new-2',
        ...data,
      }));

      const result = await service.create('user-new-farmer', {
        name: 'Wheat Sharbati',
        description: 'Sharbati grain crop',
        categoryId: mockCategory.id,
        price: 3200,
        unit: ProductUnit.QUINTAL,
        initialQuantity: 200,
      });

      expect(prisma.sellerProfile.create).toHaveBeenCalled();
      expect(result.id).toBe('prod-new-2');
    });
  });

  describe('Strict Ownership & Security Checks', () => {
    const existingProduct = {
      id: 'prod-existing-1',
      sellerId: 'seller-owner-1',
      name: 'Owner Crop',
      price: new Prisma.Decimal(1200),
      unit: ProductUnit.QUINTAL,
      status: ProductStatus.ACTIVE,
      inventory: {
        productId: 'prod-existing-1',
        availableQuantity: new Prisma.Decimal(100),
        reservedQuantity: new Prisma.Decimal(0),
      },
    };

    it('forbids updating a product owned by another seller', async () => {
      // Attacker is seller-profile-2
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-attacker-2',
        userId: 'user-attacker',
      });
      // Product belongs to seller-owner-1
      prisma.product.findUnique.mockResolvedValue(existingProduct);

      await expect(
        service.update('user-attacker', existingProduct.id, {
          price: 500,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('forbids modifying inventory of a product owned by another seller', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-attacker-2',
        userId: 'user-attacker',
      });
      prisma.product.findUnique.mockResolvedValue(existingProduct);

      await expect(
        service.updateInventory('user-attacker', existingProduct.id, {
          availableQuantity: 9999,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('forbids deleting a product owned by another seller', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-attacker-2',
        userId: 'user-attacker',
      });
      prisma.product.findUnique.mockResolvedValue(existingProduct);

      await expect(
        service.remove('user-attacker', existingProduct.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows owner to update inventory with valid stock', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-owner-1',
        userId: 'user-owner',
      });
      prisma.product.findUnique.mockResolvedValue(existingProduct);
      prisma.inventory.update.mockResolvedValue({
        productId: existingProduct.id,
        availableQuantity: new Prisma.Decimal(250),
        reservedQuantity: new Prisma.Decimal(0),
      });

      const updated = await service.updateInventory('user-owner', existingProduct.id, {
        availableQuantity: 250,
      });

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { productId: existingProduct.id },
        data: {
          availableQuantity: new Prisma.Decimal(250),
          reservedQuantity: new Prisma.Decimal(0),
        },
      });
      expect(updated.availableQuantity).toEqual(new Prisma.Decimal(250));
    });

    it('rejects negative inventory quantity from owner', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-owner-1',
        userId: 'user-owner',
      });
      prisma.product.findUnique.mockResolvedValue(existingProduct);

      await expect(
        service.updateInventory('user-owner', existingProduct.id, {
          availableQuantity: -10,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
