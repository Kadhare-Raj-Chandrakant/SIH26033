import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Category, Product } from '@prisma/client';

describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let farmerToken: string;
  let fpoToken: string;
  let buyerToken: string;

  let category: Category;
  let farmerProduct: Product;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Clean up
    await prisma.productImage.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
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

      // Verify inventory was created
      const inventory = await prisma.inventory.findUnique({
        where: { productId: farmerProduct.id },
      });
      expect(inventory).toBeDefined();
      expect(Number(inventory?.availableQuantity)).toBe(100);
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
  });

  describe('PATCH /api/v1/products/:id', () => {
    it('should update own product', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ price: 60 })
        .expect(200);

      expect(Number(res.body.price)).toBe(60);
    });

    it('should reject FPO from updating FARMER product', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${farmerProduct.id}`)
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({ price: 10 })
        .expect(403);
    });
  });

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
