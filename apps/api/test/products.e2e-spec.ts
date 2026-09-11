import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Category, Product, ProductImage } from '@prisma/client';

describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let farmerToken: string;
  let fpoToken: string;
  let buyerToken: string;

  let category: Category;
  let farmerProduct: Product;
  let uploadedImage: ProductImage;

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
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Clean up test data
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
    await prisma.user.deleteMany();

    // Create Category
    category = await prisma.category.create({
      data: {
        name: 'Vegetables',
        slug: 'vegetables',
      },
    });

    const passwordHash = await argon2.hash('password123');

    // Create Farmer
    const farmer = await prisma.user.create({
      data: {
        email: 'farmer2@example.com',
        passwordHash,
        role: 'FARMER',
        sellerProfile: {
          create: {
            sellerType: 'FARMER',
          },
        },
      },
      include: { sellerProfile: true },
    });
    farmerToken = jwtService.sign({ sub: farmer.id, role: farmer.role });

    // Create FPO
    const fpo = await prisma.user.create({
      data: {
        email: 'fpo2@example.com',
        passwordHash,
        role: 'FPO',
        sellerProfile: {
          create: {
            sellerType: 'FPO',
          },
        },
      },
      include: { sellerProfile: true },
    });
    fpoToken = jwtService.sign({ sub: fpo.id, role: fpo.role });

    // Create Buyer
    const buyer = await prisma.user.create({
      data: {
        email: 'buyer2@example.com',
        passwordHash,
        role: 'BUYER',
        buyerProfile: {
          create: {
            buyerType: 'INDIVIDUAL',
          },
        },
      },
    });
    buyerToken = jwtService.sign({ sub: buyer.id, role: buyer.role });
  });

  afterAll(async () => {
    await app.close();
  });

  // =================================================================
  // 1. PRODUCT CREATION
  // =================================================================
  describe('POST /api/v1/products', () => {
    it('should create a product and inventory for FARMER', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          name: 'Fresh Tomatoes',
          description: 'Organic red tomatoes',
          categoryId: category.id,
          price: 50.5,
          unit: 'KG',
          initialQuantity: 100,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Fresh Tomatoes');
      expect(Number(res.body.price)).toBe(50.5);

      farmerProduct = res.body;

      // Verify inventory was created transactionally
      const inventory = await prisma.inventory.findUnique({
        where: { productId: farmerProduct.id },
      });
      expect(inventory).toBeDefined();
      expect(Number(inventory?.availableQuantity)).toBe(100);
      expect(Number(inventory?.reservedQuantity)).toBe(0);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .send({
          name: 'Anonymous Product',
          description: 'Anon',
          categoryId: category.id,
          price: 10,
          unit: 'KG',
          initialQuantity: 10,
        })
        .expect(401);
    });

    it('should reject BUYER from creating a product', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          name: 'Hacked Product',
          description: 'Hacked',
          categoryId: category.id,
          price: 1,
          unit: 'KG',
          initialQuantity: 1,
        })
        .expect(403);
    });
  });

  // =================================================================
  // 2. SELLER PRODUCTS RETRIEVAL
  // =================================================================
  describe('GET /api/v1/seller/products', () => {
    it('should retrieve only products for the authenticated seller', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/seller/products')
        .set('Authorization', `Bearer ${farmerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(farmerProduct.id);
      expect(res.body[0].inventory).toBeDefined();
    });

    it('should return empty list for FPO who has no products yet', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/seller/products')
        .set('Authorization', `Bearer ${fpoToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('should reject unauthenticated caller', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/seller/products')
        .expect(401);
    });
  });

  // =================================================================
  // 3. PUBLIC PRODUCT READ
  // =================================================================
  describe('GET /api/v1/products/:id', () => {
    it('should retrieve product publicly by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${farmerProduct.id}`)
        .expect(200);

      expect(res.body.id).toBe(farmerProduct.id);
      expect(res.body.seller).toBeDefined();
      expect(res.body.inventory).toBeDefined();
    });

    it('should return 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  // =================================================================
  // 4. PRODUCT UPDATE & STATUS SECURITY
  // =================================================================
  describe('PATCH /api/v1/products/:id & Status Security', () => {
    it('should update own product details', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ price: 60 })
        .expect(200);

      expect(Number(res.body.price)).toBe(60);
    });

    it('should reject FPO from updating FARMER product (IDOR check)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}`)
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({ price: 10 })
        .expect(403);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}`)
        .send({ price: 10 })
        .expect(401);
    });

    it('should reject seller from setting status to REJECTED', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ status: 'REJECTED' })
        .expect(400);
    });

    it('should allow valid seller status transition ACTIVE -> OUT_OF_STOCK', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ status: 'OUT_OF_STOCK' })
        .expect(200);

      expect(res.body.status).toBe('OUT_OF_STOCK');
    });

    it('should allow valid seller status transition OUT_OF_STOCK -> ACTIVE', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      expect(res.body.status).toBe('ACTIVE');
    });

    it('should reject seller from changing a REJECTED product back to ACTIVE', async () => {
      // Direct DB update to simulate moderation having rejected a product
      await prisma.product.update({
        where: { id: farmerProduct.id },
        data: { status: 'REJECTED' },
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ status: 'ACTIVE' })
        .expect(400);

      // Restore to ACTIVE for remaining tests
      await prisma.product.update({
        where: { id: farmerProduct.id },
        data: { status: 'ACTIVE' },
      });
    });
  });

  // =================================================================
  // 5. INVENTORY MANAGEMENT API
  // =================================================================
  describe('PATCH /api/v1/products/:id/inventory', () => {
    it('should allow owner to update available quantity', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}/inventory`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ availableQuantity: 150 })
        .expect(200);

      expect(Number(res.body.availableQuantity)).toBe(150);
    });

    it('should reject negative available quantity', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}/inventory`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ availableQuantity: -10 })
        .expect(400);
    });

    it('should reject invalid reservedQuantity relationship (reserved > available)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}/inventory`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ availableQuantity: 50, reservedQuantity: 100 })
        .expect(400);
    });

    it('should reject BUYER from updating inventory', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}/inventory`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ availableQuantity: 200 })
        .expect(403);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}/inventory`)
        .send({ availableQuantity: 200 })
        .expect(401);
    });

    it('should reject FPO from modifying FARMER inventory (IDOR check)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}/inventory`)
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({ availableQuantity: 200 })
        .expect(403);
    });
  });

  // =================================================================
  // 6. PRODUCT IMAGE MANAGEMENT & VALIDATION
  // =================================================================
  describe('POST & DELETE /api/v1/products/:id/images', () => {
    it('should reject image upload without file', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/products/${farmerProduct.id}/images`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .expect(400);
    });

    it('should reject unsupported MIME type (e.g. text/plain)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/products/${farmerProduct.id}/images`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .attach('file', Buffer.from('fake image content'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('should reject oversized file (>5MB)', async () => {
      // 5MB + 1KB buffer
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);
      await request(app.getHttpServer())
        .post(`/api/v1/products/${farmerProduct.id}/images`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .attach('file', largeBuffer, {
          filename: 'huge.png',
          contentType: 'image/png',
        })
        .expect(413);
    });

    it('should reject cross-seller image upload', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/products/${farmerProduct.id}/images`)
        .set('Authorization', `Bearer ${fpoToken}`)
        .attach('file', Buffer.from('valid png data'), {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(403);
    });

    it('should successfully upload valid image for product owner', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/products/${farmerProduct.id}/images`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .attach('file', Buffer.from('fake valid image bytes'), {
          filename: 'tomato.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.productId).toBe(farmerProduct.id);
      expect(res.body.url).toBeDefined();

      uploadedImage = res.body;
    });

    it('should reject cross-seller from deleting image (IDOR check)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/products/${farmerProduct.id}/images/${uploadedImage.id}`)
        .set('Authorization', `Bearer ${fpoToken}`)
        .expect(403);
    });

    it('should reject image deletion with mismatched productId', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/products/00000000-0000-0000-0000-000000000000/images/${uploadedImage.id}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .expect(404);
    });

    it('should reject unauthenticated image deletion', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/products/${farmerProduct.id}/images/${uploadedImage.id}`)
        .expect(401);
    });

    it('should successfully delete individual product image by owner', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/products/${farmerProduct.id}/images/${uploadedImage.id}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const checkImage = await prisma.productImage.findUnique({
        where: { id: uploadedImage.id },
      });
      expect(checkImage).toBeNull();
    });
  });

  // =================================================================
  // 7. CATEGORIES READ
  // =================================================================
  describe('GET /api/v1/categories', () => {
    it('should return categories list publicly', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =================================================================
  // 8. PRODUCT DELETION
  // =================================================================
  describe('DELETE /api/v1/products/:id', () => {
    it('should reject FPO from deleting FARMER product', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/products/${farmerProduct.id}`)
        .set('Authorization', `Bearer ${fpoToken}`)
        .expect(403);
    });

    it('should delete own product and its inventory', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/products/${farmerProduct.id}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .expect(200);

      // Verify product deleted
      const p = await prisma.product.findUnique({ where: { id: farmerProduct.id } });
      expect(p).toBeNull();

      // Verify inventory deleted
      const i = await prisma.inventory.findUnique({ where: { productId: farmerProduct.id } });
      expect(i).toBeNull();
    });
  });
});
