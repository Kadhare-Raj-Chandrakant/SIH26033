import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Category, Product, ProductStatus } from '@prisma/client';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

describe('CartController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let buyer1Token: string;
  let _buyer1Id: string;
  let buyer2Token: string;
  let _buyer2Id: string;
  let farmerToken: string;

  let testCategory: Category;
  let activeProduct: Product;
  let outOfStockProduct: Product;
  let archivedProduct: Product;

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
    await prisma.orderItem.deleteMany();
    await prisma.review.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.address.deleteMany();
    await prisma.sellerProfile.deleteMany();
    await prisma.buyerProfile.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await argon2.hash('SecretPass123!');

    // Create Category
    testCategory = await prisma.category.create({
      data: { name: 'Vegetables', slug: 'vegetables', description: 'Fresh veggies' },
    });

    // Create Farmer
    const farmer = await prisma.user.create({
      data: {
        email: 'farmer_cart_e2e@example.com',
        mobile: '9870000001',
        passwordHash,
        role: 'FARMER',
        sellerProfile: {
          create: {
            sellerType: 'FARMER',
            businessName: 'Cart Test Farm',
            farmLocation: 'Nashik',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { sellerProfile: true },
    });
    farmerToken = jwtService.sign({ sub: farmer.id, role: farmer.role });

    // Create Buyer 1
    const buyer1 = await prisma.user.create({
      data: {
        email: 'buyer1_cart_e2e@example.com',
        mobile: '9870000002',
        passwordHash,
        role: 'BUYER',
        buyerProfile: {
          create: {
            businessName: 'Buyer One Enterprises',
            buyerType: 'INDIVIDUAL',
          },
        },
      },
      include: { buyerProfile: true },
    });
    _buyer1Id = buyer1.id;
    buyer1Token = jwtService.sign({ sub: buyer1.id, role: buyer1.role });

    // Create Buyer 2
    const buyer2 = await prisma.user.create({
      data: {
        email: 'buyer2_cart_e2e@example.com',
        mobile: '9870000003',
        passwordHash,
        role: 'BUYER',
        buyerProfile: {
          create: {
            businessName: 'Buyer Two Wholesale',
            buyerType: 'BUSINESS',
          },
        },
      },
      include: { buyerProfile: true },
    });
    _buyer2Id = buyer2.id;
    buyer2Token = jwtService.sign({ sub: buyer2.id, role: buyer2.role });

    // Create Active Product with 10 units
    activeProduct = await prisma.product.create({
      data: {
        sellerId: farmer.sellerProfile!.id,
        categoryId: testCategory.id,
        name: 'Fresh Red Tomatoes',
        description: 'Naturally ripened tomatoes',
        price: 40.0,
        unit: 'KG',
        status: ProductStatus.ACTIVE,
        inventory: {
          create: {
            availableQuantity: 10,
            reservedQuantity: 0,
          },
        },
        images: {
          create: {
            url: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337',
            cloudinaryId: 'mock_c1',
            isPrimary: true,
          },
        },
      },
    });

    // Create Out of Stock Product (0 units)
    outOfStockProduct = await prisma.product.create({
      data: {
        sellerId: farmer.sellerProfile!.id,
        categoryId: testCategory.id,
        name: 'Zero Stock Cauliflower',
        description: 'Currently sold out',
        price: 35.0,
        unit: 'PIECE',
        status: ProductStatus.ACTIVE,
        inventory: {
          create: {
            availableQuantity: 0,
            reservedQuantity: 0,
          },
        },
      },
    });

    // Create Archived Product
    archivedProduct = await prisma.product.create({
      data: {
        sellerId: farmer.sellerProfile!.id,
        categoryId: testCategory.id,
        name: 'Archived Potatoes',
        description: 'Old stock archived',
        price: 20.0,
        unit: 'KG',
        status: ProductStatus.ARCHIVED,
        inventory: {
          create: {
            availableQuantity: 50,
            reservedQuantity: 0,
          },
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Adding Items to Cart', () => {
    it('1.1 should allow authenticated buyer to add active product to cart', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: activeProduct.id, quantity: 3 })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.productId).toBe(activeProduct.id);
      expect(res.body.data.quantity).toBe(3);
    });

    it('1.2 should increment quantity when adding the same product again', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: activeProduct.id, quantity: 2 })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.quantity).toBe(5); // 3 + 2 = 5
    });

    it('1.3 should reject quantity that exceeds available inventory', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: activeProduct.id, quantity: 10 }) // Already has 5 in cart, max 10
        .expect(400);

      expect(res.body.message).toContain('exceeds available stock');
    });

    it('1.4 should reject adding out-of-stock product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: outOfStockProduct.id, quantity: 1 })
        .expect(400);

      expect(res.body.message).toContain('out of stock');
    });

    it('1.5 should reject adding non-active (archived) product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: archivedProduct.id, quantity: 1 })
        .expect(400);

      expect(res.body.message).toContain('not active');
    });

    it('1.6 should reject invalid quantities (zero or negative)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: activeProduct.id, quantity: 0 })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: activeProduct.id, quantity: -2 })
        .expect(400);
    });

    it('1.7 should reject non-existent product ID', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: '00000000-0000-0000-0000-000000000000', quantity: 1 })
        .expect(404);

      expect(res.body.message).toContain('Product not found');
    });

    it('1.8 should reject malformed product ID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: 'not-a-uuid', quantity: 1 })
        .expect(400);
    });
  });

  describe('2. Getting Buyer Cart', () => {
    it('2.1 should retrieve buyer cart with correct line totals and subtotal', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.itemCount).toBe(1);
      expect(res.body.data.items[0].productName).toBe('Fresh Red Tomatoes');
      expect(res.body.data.items[0].quantity).toBe(5);
      expect(res.body.data.items[0].unitPrice).toBe(40);
      expect(res.body.data.items[0].lineTotal).toBe(200);
      expect(res.body.data.subtotal).toBe(200);
      expect(res.body.data.items[0].isAvailable).toBe(true);

      // Verify sensitive data is NOT exposed
      expect(res.body.data.items[0].seller.passwordHash).toBeUndefined();
      expect(res.body.data.items[0].seller.email).toBeUndefined();
      expect(res.body.data.items[0].seller.mobile).toBeUndefined();
      expect(res.body.data.items[0].reservedQuantity).toBeUndefined();
    });

    it('2.2 Buyer 2 should have an empty cart (isolation between buyers)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${buyer2Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.itemCount).toBe(0);
      expect(res.body.data.subtotal).toBe(0);
    });
  });

  describe('3. Updating Cart Quantity', () => {
    it('3.1 should update quantity when valid and within available stock', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/cart/items/${activeProduct.id}`)
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ quantity: 8 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.quantity).toBe(8);

      const cartRes = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(200);

      expect(cartRes.body.data.items[0].quantity).toBe(8);
      expect(cartRes.body.data.items[0].lineTotal).toBe(320);
      expect(cartRes.body.data.subtotal).toBe(320);
    });

    it('3.2 should reject update exceeding available stock', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/cart/items/${activeProduct.id}`)
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ quantity: 15 }) // max is 10
        .expect(400);

      expect(res.body.message).toContain('exceeds available stock');
    });

    it('3.3 Buyer 2 cannot update Buyer 1 cart item (IDOR protection)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/cart/items/${activeProduct.id}`)
        .set('Authorization', `Bearer ${buyer2Token}`)
        .send({ quantity: 2 })
        .expect(404);

      expect(res.body.message).toContain('not found in your cart');
    });
  });

  describe('4. Removing Item & Clearing Cart', () => {
    it('4.1 Buyer 2 cannot remove Buyer 1 cart item (IDOR protection)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/cart/items/${activeProduct.id}`)
        .set('Authorization', `Bearer ${buyer2Token}`)
        .expect(404);

      expect(res.body.message).toContain('not found in your cart');
    });

    it('4.2 Buyer 1 can remove own cart item', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/cart/items/${activeProduct.id}`)
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const cartRes = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(200);

      expect(cartRes.body.data.itemCount).toBe(0);
      expect(cartRes.body.data.subtotal).toBe(0);
    });

    it('4.3 Buyer can clear entire cart', async () => {
      // Add item back first
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: activeProduct.id, quantity: 2 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const cartRes = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(200);

      expect(cartRes.body.data.itemCount).toBe(0);
    });
  });

  describe('5. Role & Authorization Enforcement', () => {
    it('5.1 Farmer/Seller cannot access cart endpoints (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${farmerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ productId: activeProduct.id, quantity: 1 })
        .expect(403);
    });

    it('5.2 Unauthenticated user cannot access cart endpoints (401 Unauthorized)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/cart')
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({ productId: activeProduct.id, quantity: 1 })
        .expect(401);
    });
  });
});
