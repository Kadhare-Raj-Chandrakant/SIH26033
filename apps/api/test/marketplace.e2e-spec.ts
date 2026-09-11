import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Category, Product, ProductStatus } from '@prisma/client';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

describe('MarketplaceController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let farmerToken: string;
  let _fpoToken: string;
  let buyerToken: string;

  let catVegetables: Category;
  let catFruits: Category;
  let catGrains: Category;

  let prodTomato: Product;
  let prodMango: Product;
  let prodRice: Product;
  let prodOutOfStock: Product;
  let prodArchived: Product;
  let prodRejected: Product;
  let prodZeroStock: Product;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Clean up
    await prisma.cartItem.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.review.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.address.deleteMany();
    await prisma.sellerProfile.deleteMany();
    await prisma.buyerProfile.deleteMany();
    await prisma.user.deleteMany();

    // Create Categories
    catVegetables = await prisma.category.create({
      data: { name: 'Vegetables', slug: 'vegetables', description: 'Fresh vegetables' },
    });
    catFruits = await prisma.category.create({
      data: { name: 'Fruits', slug: 'fruits', description: 'Farm-fresh fruits' },
    });
    catGrains = await prisma.category.create({
      data: { name: 'Grains', slug: 'grains', description: 'Grains and cereals' },
    });

    const passwordHash = await argon2.hash('SecretPass123!');

    // Create Farmer
    const farmer = await prisma.user.create({
      data: {
        email: 'farmer_m6@example.com',
        mobile: '9876543210',
        passwordHash,
        role: 'FARMER',
        sellerProfile: {
          create: {
            sellerType: 'FARMER',
            businessName: 'Green Valley Farm',
            farmLocation: 'Vadodara, Gujarat',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { sellerProfile: true },
    });
    farmerToken = jwtService.sign({ sub: farmer.id, role: farmer.role });

    // Create FPO
    const fpo = await prisma.user.create({
      data: {
        email: 'fpo_m6@example.com',
        mobile: '9876543211',
        passwordHash,
        role: 'FPO',
        sellerProfile: {
          create: {
            sellerType: 'FPO',
            businessName: 'Sahyadri Farmers Co-op',
            farmLocation: 'Nashik, Maharashtra',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { sellerProfile: true },
    });
    _fpoToken = jwtService.sign({ sub: fpo.id, role: fpo.role });

    // Create Buyer
    const buyer = await prisma.user.create({
      data: {
        email: 'buyer_m6@example.com',
        mobile: '9876543212',
        passwordHash,
        role: 'BUYER',
        buyerProfile: {
          create: {
            buyerType: 'INDIVIDUAL',
            businessName: 'Fresh Mart Buyer',
          },
        },
      },
      include: { buyerProfile: true },
    });
    buyerToken = jwtService.sign({ sub: buyer.id, role: buyer.role });

    const farmerSellerId = farmer.sellerProfile!.id;
    const fpoSellerId = fpo.sellerProfile!.id;

    // 1. Active In-Stock Tomato (Farmer)
    prodTomato = await prisma.product.create({
      data: {
        sellerId: farmerSellerId,
        categoryId: catVegetables.id,
        name: 'Organic Fresh Tomato',
        description: 'Juicy red farm tomatoes from Vadodara',
        price: 40.0,
        unit: 'KG',
        location: 'Vadodara',
        status: ProductStatus.ACTIVE,
        inventory: { create: { availableQuantity: 100 } },
        images: {
          create: {
            url: 'https://res.cloudinary.com/test/tomato.jpg',
            cloudinaryId: 'test_tomato_123',
            isPrimary: true,
          },
        },
      },
    });

    // 2. Active In-Stock Mango (FPO)
    prodMango = await prisma.product.create({
      data: {
        sellerId: fpoSellerId,
        categoryId: catFruits.id,
        name: 'Alphonso Mangoes',
        description: 'Sweet Ratnagiri Alphonso mangoes export quality',
        price: 300.0,
        unit: 'BOX',
        location: 'Ratnagiri',
        status: ProductStatus.ACTIVE,
        inventory: { create: { availableQuantity: 50 } },
        images: {
          create: {
            url: 'https://res.cloudinary.com/test/mango.jpg',
            cloudinaryId: 'test_mango_123',
            isPrimary: true,
          },
        },
      },
    });

    // 3. Active In-Stock Rice (Farmer)
    prodRice = await prisma.product.create({
      data: {
        sellerId: farmerSellerId,
        categoryId: catGrains.id,
        name: 'Basmati Rice',
        description: 'Aromatic long grain basmati rice',
        price: 120.0,
        unit: 'QUINTAL',
        location: 'Karnal',
        status: ProductStatus.ACTIVE,
        inventory: { create: { availableQuantity: 200 } },
      },
    });

    // 4. Out of Stock Product (status: OUT_OF_STOCK)
    prodOutOfStock = await prisma.product.create({
      data: {
        sellerId: farmerSellerId,
        categoryId: catVegetables.id,
        name: 'Out of Stock Spinach',
        description: 'Fresh green spinach',
        price: 25.0,
        unit: 'KG',
        location: 'Vadodara',
        status: ProductStatus.OUT_OF_STOCK,
        inventory: { create: { availableQuantity: 0 } },
      },
    });

    // 5. Archived Product (status: ARCHIVED)
    prodArchived = await prisma.product.create({
      data: {
        sellerId: farmerSellerId,
        categoryId: catVegetables.id,
        name: 'Archived Potatoes',
        description: 'Potatoes from previous season',
        price: 30.0,
        unit: 'KG',
        location: 'Agra',
        status: ProductStatus.ARCHIVED,
        inventory: { create: { availableQuantity: 50 } },
      },
    });

    // 6. Rejected Product (status: REJECTED)
    prodRejected = await prisma.product.create({
      data: {
        sellerId: fpoSellerId,
        categoryId: catFruits.id,
        name: 'Rejected Apples',
        description: 'Apples that failed quality inspection',
        price: 150.0,
        unit: 'KG',
        location: 'Shimla',
        status: ProductStatus.REJECTED,
        inventory: { create: { availableQuantity: 50 } },
      },
    });

    // 7. Active Product with 0 inventory
    prodZeroStock = await prisma.product.create({
      data: {
        sellerId: farmerSellerId,
        categoryId: catVegetables.id,
        name: 'Zero Stock Onions',
        description: 'Nashik red onions',
        price: 35.0,
        unit: 'KG',
        location: 'Nashik',
        status: ProductStatus.ACTIVE,
        inventory: { create: { availableQuantity: 0 } },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // =================================================================
  // 1. PUBLIC MARKETPLACE LISTING
  // =================================================================
  describe('1. Public marketplace listing', () => {
    it('should allow unauthenticated access to browse products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });
  });

  // =================================================================
  // 2. ACTIVE PRODUCT APPEARS
  // =================================================================
  describe('2. Active product appears', () => {
    it('should include all active in-stock products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products')
        .expect(200);

      const ids = res.body.data.map((p: any) => p.id);
      expect(ids).toContain(prodTomato.id);
      expect(ids).toContain(prodMango.id);
      expect(ids).toContain(prodRice.id);
    });
  });

  // =================================================================
  // 3. OUT-OF-STOCK PRODUCT EXCLUDED
  // =================================================================
  describe('3. Out-of-stock product excluded', () => {
    it('should exclude products with OUT_OF_STOCK status and active products with 0 inventory', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products')
        .expect(200);

      const ids = res.body.data.map((p: any) => p.id);
      expect(ids).not.toContain(prodOutOfStock.id);
      expect(ids).not.toContain(prodZeroStock.id);
    });
  });

  // =================================================================
  // 4. ARCHIVED PRODUCT EXCLUDED
  // =================================================================
  describe('4. Archived product excluded', () => {
    it('should exclude products with ARCHIVED status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products')
        .expect(200);

      const ids = res.body.data.map((p: any) => p.id);
      expect(ids).not.toContain(prodArchived.id);
    });
  });

  // =================================================================
  // 5. REJECTED PRODUCT EXCLUDED
  // =================================================================
  describe('5. Rejected product excluded', () => {
    it('should exclude products with REJECTED status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products')
        .expect(200);

      const ids = res.body.data.map((p: any) => p.id);
      expect(ids).not.toContain(prodRejected.id);
    });
  });

  // =================================================================
  // 6. SEARCH
  // =================================================================
  describe('6. Search', () => {
    it('should search products by name safely', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?search=tomato')
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(prodTomato.id);
    });

    it('should search products by description safely', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?search=aromatic')
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(prodRice.id);
    });

    it('should search products by category name safely', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?search=fruits')
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(prodMango.id);
    });
  });

  // =================================================================
  // 7. CATEGORY FILTERING
  // =================================================================
  describe('7. Category filtering', () => {
    it('should filter products by categoryId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/marketplace/products?categoryId=${catFruits.id}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(prodMango.id);
      expect(res.body.data[0].category.id).toBe(catFruits.id);
    });

    it('should reject invalid UUID categoryId', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?categoryId=invalid-uuid-123')
        .expect(400);
    });
  });

  // =================================================================
  // 8. LOCATION FILTERING
  // =================================================================
  describe('8. Location filtering', () => {
    it('should filter products by location substring (case-insensitive)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?location=vadodara')
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(prodTomato.id);
      expect(res.body.data[0].location).toBe('Vadodara');
    });
  });

  // =================================================================
  // 9. MINIMUM PRICE
  // =================================================================
  describe('9. Minimum price', () => {
    it('should filter products with price >= minPrice', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?minPrice=100')
        .expect(200);

      const prices = res.body.data.map((p: any) => p.price);
      expect(prices.length).toBe(2); // Mango (300) and Rice (120)
      prices.forEach((price: number) => {
        expect(price).toBeGreaterThanOrEqual(100);
      });
    });
  });

  // =================================================================
  // 10. MAXIMUM PRICE
  // =================================================================
  describe('10. Maximum price', () => {
    it('should filter products with price <= maxPrice', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?maxPrice=50')
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(prodTomato.id);
      expect(res.body.data[0].price).toBe(40);
    });
  });

  // =================================================================
  // 11. INVALID PRICE
  // =================================================================
  describe('11. Invalid price', () => {
    it('should reject negative minPrice', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?minPrice=-10')
        .expect(400);
    });

    it('should reject negative maxPrice', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?maxPrice=-50')
        .expect(400);
    });

    it('should reject non-numeric price', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?minPrice=abc')
        .expect(400);
    });
  });

  // =================================================================
  // 12. INVALID RANGE
  // =================================================================
  describe('12. Invalid range', () => {
    it('should reject when minPrice is greater than maxPrice', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?minPrice=100&maxPrice=50')
        .expect(400);

      expect(JSON.stringify(res.body)).toContain('minPrice cannot be greater than maxPrice');
    });
  });

  // =================================================================
  // 13. SORTING
  // =================================================================
  describe('13. Sorting', () => {
    it('should sort products by price ascending', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?sort=price_asc')
        .expect(200);

      const prices = res.body.data.map((p: any) => p.price);
      expect(prices).toEqual([40, 120, 300]);
    });

    it('should sort products by price descending', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?sort=price_desc')
        .expect(200);

      const prices = res.body.data.map((p: any) => p.price);
      expect(prices).toEqual([300, 120, 40]);
    });

    it('should sort products by name ascending', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?sort=name_asc')
        .expect(200);

      const names = res.body.data.map((p: any) => p.name);
      expect(names).toEqual(['Alphonso Mangoes', 'Basmati Rice', 'Organic Fresh Tomato']);
    });

    it('should reject unsupported sort values', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?sort=unsupported_field;drop_table')
        .expect(400);
    });
  });

  // =================================================================
  // 14. PAGINATION
  // =================================================================
  describe('14. Pagination', () => {
    it('should return correct pagination structure and metadata', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?page=1&limit=2')
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it('should retrieve second page correctly', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?page=2&limit=2')
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.page).toBe(2);
    });
  });

  // =================================================================
  // 15. INVALID PAGINATION
  // =================================================================
  describe('15. Invalid pagination', () => {
    it('should reject page=0', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?page=0')
        .expect(400);
    });

    it('should reject negative page', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?page=-1')
        .expect(400);
    });

    it('should reject limit=0', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?limit=0')
        .expect(400);
    });

    it('should reject limit > 100', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?limit=150')
        .expect(400);
    });
  });

  // =================================================================
  // 16. PRODUCT DETAIL
  // =================================================================
  describe('16. Product detail', () => {
    it('should retrieve active product details with safe fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/marketplace/products/${prodTomato.id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const product = res.body.data;
      expect(product.id).toBe(prodTomato.id);
      expect(product.name).toBe('Organic Fresh Tomato');
      expect(product.price).toBe(40);
      expect(product.unit).toBe('KG');
      expect(product.availableQuantity).toBe(100);
      expect(product.category.name).toBe('Vegetables');
      expect(product.images.length).toBe(1);
      expect(product.images[0].url).toBe('https://res.cloudinary.com/test/tomato.jpg');
      expect(product.seller.businessName).toBe('Green Valley Farm');
      expect(product.seller.sellerType).toBe('FARMER');
      expect(product.seller.farmLocation).toBe('Vadodara, Gujarat');
    });
  });

  // =================================================================
  // 17. NON-EXISTENT OR UNAVAILABLE PRODUCT
  // =================================================================
  describe('17. Non-existent product', () => {
    it('should return 404 for unknown product ID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/marketplace/products/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('should return 404 when requesting an archived product detail', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/marketplace/products/${prodArchived.id}`)
        .expect(404);
    });

    it('should return 404 when requesting a rejected product detail', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/marketplace/products/${prodRejected.id}`)
        .expect(404);
    });
  });

  // =================================================================
  // 18. SAFE SELLER FIELDS
  // =================================================================
  describe('18. Safe seller fields', () => {
    it('should not expose passwordHash, mobile, email, or internal userId in seller object', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/marketplace/products/${prodTomato.id}`)
        .expect(200);

      const seller = res.body.data.seller;
      expect(seller.businessName).toBe('Green Valley Farm');
      expect(seller.sellerType).toBe('FARMER');
      expect(seller.farmLocation).toBe('Vadodara, Gujarat');

      // Verify strict omission of sensitive fields
      expect((seller as any).passwordHash).toBeUndefined();
      expect((seller as any).email).toBeUndefined();
      expect((seller as any).mobile).toBeUndefined();
      expect((seller as any).userId).toBeUndefined();
    });
  });

  // =================================================================
  // 19. BUYER AUTHENTICATED ACCESS
  // =================================================================
  describe('19. Buyer authenticated access', () => {
    it('should allow authenticated BUYER to browse marketplace products without rejection', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
    });
  });

  // =================================================================
  // 20. SELLER MUTATION AUTHORIZATION REGRESSION
  // =================================================================
  describe('20. Seller mutation authorization regression', () => {
    it('should allow FARMER to create a product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          name: 'Fresh Carrots',
          description: 'Crunchy red carrots',
          categoryId: catVegetables.id,
          price: 45,
          unit: 'KG',
          initialQuantity: 80,
        })
        .expect(201);

      const createdProduct = res.body.data ?? res.body;
      expect(createdProduct.name).toBe('Fresh Carrots');
    });
  });

  // =================================================================
  // 21. BUYER CANNOT MUTATE SELLER PRODUCTS
  // =================================================================
  describe('21. Buyer cannot mutate seller products', () => {
    it('should return 403 Forbidden when BUYER attempts to create a product', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          name: 'Unauthorized Crop',
          description: 'Should fail',
          categoryId: catVegetables.id,
          price: 10,
          unit: 'KG',
          initialQuantity: 10,
        })
        .expect(403);
    });

    it('should return 403 Forbidden when BUYER attempts to update product inventory', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${prodTomato.id}/inventory`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          availableQuantity: 9999,
        })
        .expect(403);
    });

    it('should return 403 Forbidden when BUYER attempts to delete a product', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/products/${prodTomato.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });
  });
});
