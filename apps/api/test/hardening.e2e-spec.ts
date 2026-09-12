import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Role, AccountStatus, ProductStatus, ProductUnit } from '@prisma/client';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';

describe('Milestone 12 — Hardening, Security, Validation & AI Safety (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let adminUser: any;
  let farmerA: any;
  let farmerB: any;
  let buyerUser: any;
  let suspendedUser: any;
  let deactivatedUser: any;

  let adminToken: string;
  let farmerAToken: string;
  let farmerBToken: string;
  let buyerToken: string;

  let category: any;
  let farmerAProduct: any;

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
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Clean up test data
    const existingTestUsers = await prisma.user.findMany({
      where: { email: { contains: 'm12-test' } },
    });
    const testUserIds = existingTestUsers.map((u) => u.id);

    if (testUserIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { actorUserId: { in: testUserIds } } });
      await prisma.moderationReport.deleteMany({ where: { reporterUserId: { in: testUserIds } } });
      await prisma.cartItem.deleteMany({ where: { buyer: { userId: { in: testUserIds } } } });
      await prisma.orderItem.deleteMany({ where: { order: { buyer: { userId: { in: testUserIds } } } } });
      await prisma.order.deleteMany({ where: { buyer: { userId: { in: testUserIds } } } });
      await prisma.productImage.deleteMany({ where: { product: { seller: { userId: { in: testUserIds } } } } });
      await prisma.inventory.deleteMany({ where: { product: { seller: { userId: { in: testUserIds } } } } });
      await prisma.product.deleteMany({ where: { seller: { userId: { in: testUserIds } } } });
      await prisma.sellerProfile.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.buyerProfile.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
    }

    const defaultPassword = 'SecurePassword123!';
    const passwordHash = await argon2.hash(defaultPassword);

    // Seed Admin
    adminUser = await prisma.user.create({
      data: {
        email: 'admin.m12-test@example.com',
        passwordHash,
        role: Role.ADMIN,
        status: AccountStatus.ACTIVE,
      },
    });
    adminToken = jwtService.sign({ sub: adminUser.id, role: Role.ADMIN });

    // Seed Farmer A
    farmerA = await prisma.user.create({
      data: {
        email: 'farmer-a.m12-test@example.com',
        passwordHash,
        role: Role.FARMER,
        status: AccountStatus.ACTIVE,
        sellerProfile: {
          create: {
            sellerType: 'FARMER',
            businessName: 'Farmer A Organic Farm',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { sellerProfile: true },
    });
    farmerAToken = jwtService.sign({ sub: farmerA.id, role: Role.FARMER });

    // Seed Farmer B
    farmerB = await prisma.user.create({
      data: {
        email: 'farmer-b.m12-test@example.com',
        passwordHash,
        role: Role.FARMER,
        status: AccountStatus.ACTIVE,
        sellerProfile: {
          create: {
            sellerType: 'FARMER',
            businessName: 'Farmer B Farm',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { sellerProfile: true },
    });
    farmerBToken = jwtService.sign({ sub: farmerB.id, role: Role.FARMER });

    // Seed Buyer
    buyerUser = await prisma.user.create({
      data: {
        email: 'buyer.m12-test@example.com',
        passwordHash,
        role: Role.BUYER,
        status: AccountStatus.ACTIVE,
        buyerProfile: {
          create: {
            buyerType: 'INDIVIDUAL',
            businessName: 'Buyer M12',
          },
        },
      },
      include: { buyerProfile: true },
    });
    buyerToken = jwtService.sign({ sub: buyerUser.id, role: Role.BUYER });

    // Seed Suspended User
    suspendedUser = await prisma.user.create({
      data: {
        email: 'suspended.m12-test@example.com',
        passwordHash,
        role: Role.BUYER,
        status: AccountStatus.SUSPENDED,
      },
    });

    // Seed Deactivated User
    deactivatedUser = await prisma.user.create({
      data: {
        email: 'deactivated.m12-test@example.com',
        passwordHash,
        role: Role.BUYER,
        status: AccountStatus.DEACTIVATED,
      },
    });

    // Seed test category
    category = await prisma.category.upsert({
      where: { slug: 'vegetables-m12-test' },
      update: {},
      create: {
        name: 'Vegetables M12 Test',
        slug: 'vegetables-m12-test',
        description: 'Test category for M12 hardening',
      },
    });

    // Seed Farmer A's product
    farmerAProduct = await prisma.product.create({
      data: {
        sellerId: farmerA.sellerProfile.id,
        categoryId: category.id,
        name: 'Fresh Nashik Red Onions',
        description: 'High quality Grade A onions',
        price: 22.5,
        unit: ProductUnit.KG,
        status: ProductStatus.ACTIVE,
        inventory: {
          create: {
            availableQuantity: 500,
            reservedQuantity: 0,
          },
        },
      },
    });
  });

  afterAll(async () => {
    const existingTestUsers = await prisma.user.findMany({
      where: { email: { contains: 'm12-test' } },
    });
    const testUserIds = existingTestUsers.map((u) => u.id);

    if (testUserIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { actorUserId: { in: testUserIds } } });
      await prisma.moderationReport.deleteMany({ where: { reporterUserId: { in: testUserIds } } });
      await prisma.cartItem.deleteMany({ where: { buyer: { userId: { in: testUserIds } } } });
      await prisma.orderItem.deleteMany({ where: { order: { buyer: { userId: { in: testUserIds } } } } });
      await prisma.order.deleteMany({ where: { buyer: { userId: { in: testUserIds } } } });
      await prisma.productImage.deleteMany({ where: { product: { seller: { userId: { in: testUserIds } } } } });
      await prisma.inventory.deleteMany({ where: { product: { seller: { userId: { in: testUserIds } } } } });
      await prisma.product.deleteMany({ where: { seller: { userId: { in: testUserIds } } } });
      await prisma.sellerProfile.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.buyerProfile.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
    }
    await prisma.category.deleteMany({ where: { slug: 'vegetables-m12-test' } });

    await app.close();
  });

  // ===========================================================================
  // 1. AUTHENTICATION HARDENING
  // ===========================================================================
  describe('1. Authentication Hardening', () => {
    it('should reject malformed JWT with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.malformed.token')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should reject expired JWT with 401 Unauthorized', async () => {
      const expiredToken = jwtService.sign(
        { sub: farmerA.id, role: Role.FARMER },
        { expiresIn: '-10s' },
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should reject login for SUSPENDED user with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: suspendedUser.email,
          password: 'SecurePassword123!',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/suspended/i);
    });

    it('should reject bearer token authentication for SUSPENDED user with 401 Unauthorized', async () => {
      const suspendedToken = jwtService.sign({
        sub: suspendedUser.id,
        role: Role.BUYER,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${suspendedToken}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/suspended/i);
    });

    it('should reject login for DEACTIVATED user with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: deactivatedUser.email,
          password: 'SecurePassword123!',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/deactivated/i);
    });

    it('should reject bearer token authentication for DEACTIVATED user with 401 Unauthorized', async () => {
      const deactivatedToken = jwtService.sign({
        sub: deactivatedUser.id,
        role: Role.BUYER,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${deactivatedToken}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/deactivated/i);
    });
  });

  // ===========================================================================
  // 2. AUTHORIZATION & RBAC HARDENING
  // ===========================================================================
  describe('2. Authorization & RBAC Hardening', () => {
    it('should reject unauthenticated request to admin dashboard with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .expect(401);
    });

    it('should allow ADMIN access to admin dashboard with 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.users).toBeDefined();
    });

    it('should reject non-admin (FARMER) access to admin dashboard with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${farmerAToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should reject non-admin (BUYER) access to admin users list with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should forbid Farmer B from modifying Farmer A product (cross-seller isolation)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerAProduct.id}`)
        .set('Authorization', `Bearer ${farmerBToken}`)
        .send({ name: 'Tampered Name By Farmer B' })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/permission/i);
    });

    it('should forbid BUYER from creating a product listing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          name: 'Buyer Illegal Product',
          description: 'This should be forbidden',
          categoryId: category.id,
          price: 100,
          unit: ProductUnit.KG,
          initialQuantity: 50,
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  // ===========================================================================
  // 3. INPUT VALIDATION & BOUNDARY HARDENING
  // ===========================================================================
  describe('3. Input Validation & Boundary Hardening', () => {
    it('should reject product creation with negative price with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${farmerAToken}`)
        .send({
          name: 'Invalid Price Product',
          description: 'Testing bounds',
          categoryId: category.id,
          price: -50,
          unit: ProductUnit.KG,
          initialQuantity: 10,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject product creation with NaN price with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${farmerAToken}`)
        .send({
          name: 'Invalid NaN Price Product',
          description: 'Testing bounds',
          categoryId: category.id,
          price: 'not-a-number',
          unit: ProductUnit.KG,
          initialQuantity: 10,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject product creation with negative initialQuantity with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${farmerAToken}`)
        .send({
          name: 'Invalid Quantity Product',
          description: 'Testing bounds',
          categoryId: category.id,
          price: 100,
          unit: ProductUnit.KG,
          initialQuantity: -25,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject invalid UUID route param with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/not-a-valid-uuid')
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject cart item addition with quantity <= 0 with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: farmerAProduct.id,
          quantity: 0,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject cart item addition with huge quantity exceeding bound (> 100,000) with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: farmerAProduct.id,
          quantity: 99999999,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject marketplace query with limit > 100 with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products?limit=500')
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ===========================================================================
  // 4. AI SERVICE RESILIENCE & SMART ALLOCATION NaN REGRESSION
  // ===========================================================================
  describe('4. AI Boundary, Numerical Safety & NaN Regression', () => {
    it('should reject recommend-crop with NaN or invalid inputs with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/predict/crop')
        .send({
          N: 'not-a-number',
          P: 42,
          K: 43,
          temperature: 25.5,
          humidity: 78.0,
          ph: 6.5,
          rainfall: 200.0,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject net-realization calculation with negative quantity with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/net-realization')
        .send({
          quantity: -10,
          grossPricePerUnit: 2500,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should compute net-realization with valid inputs accurately without NaN or Infinity', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/net-realization')
        .send({
          quantity: 50,
          grossPricePerUnit: 2400,
          logisticsCost: 3500,
          storageDays: 0,
          packagingCostPerUnit: 20,
          handlingCostPerUnit: 15,
          platformFeeRatePercent: 1.5,
          mandiCessPercent: 0,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(Number.isFinite(data.grossSellingValue)).toBe(true);
      expect(Number.isFinite(data.estimatedNetRealization)).toBe(true);
      expect(Number.isFinite(data.perUnitNetRealization)).toBe(true);
      expect(Number.isNaN(data.estimatedNetRealization)).toBe(false);
      expect(data.grossSellingValue).toBe(120000);
    });

    it('should optimize smart allocation and ensure recommendation rationale NEVER contains NaN, undefined, null, or Infinity', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/smart-allocation')
        .set('Authorization', `Bearer ${farmerAToken}`)
        .send({
          commodity: 'Onion',
          quantity: 50,
          unit: 'QUINTAL',
          sellerLocation: {
            city: 'Nashik',
            state: 'Maharashtra',
            latitude: 19.997,
            longitude: 73.789,
          },
          includeMandis: true,
          includeDirectBuyers: true,
          includePlatformListing: true,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      const allocation = res.body.data;
      expect(allocation.recommendationRationale).toBeDefined();
      expect(typeof allocation.recommendationRationale).toBe('string');

      // CRITICAL ASSERTION: No user-facing text may contain NaN, undefined, null, or Infinity
      expect(allocation.recommendationRationale).not.toMatch(/NaN/);
      expect(allocation.recommendationRationale).not.toMatch(/undefined/);
      expect(allocation.recommendationRationale).not.toMatch(/Infinity/);
      expect(allocation.recommendationRationale).not.toMatch(/₹null/);
      expect(allocation.recommendationRationale).not.toMatch(/₹NaN/);

      // Verify rankedOptions list
      expect(Array.isArray(allocation.rankedOptions)).toBe(true);
      allocation.rankedOptions.forEach((ch: any) => {
        expect(ch.channelType).toBeDefined();
        if (ch.estimatedNetRealization !== null) {
          expect(Number.isFinite(ch.estimatedNetRealization)).toBe(true);
          expect(Number.isNaN(ch.estimatedNetRealization)).toBe(false);
        }
      });
    });
  });

  // ===========================================================================
  // 5. SECURITY & SENSITIVE DATA EXCLUSION
  // ===========================================================================
  describe('5. Security & Sensitive Data Exclusion', () => {
    it('should never expose passwordHash in /auth/login response', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: farmerA.email,
          password: 'SecurePassword123!',
        })
        .expect(201);

      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('should never expose passwordHash in /auth/me response', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${farmerAToken}`)
        .expect(200);

      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should sanitize error responses and never expose internal stack traces or SQL', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.stack).toBeUndefined();
      expect(res.body.error.sql).toBeUndefined();
    });
  });
});
