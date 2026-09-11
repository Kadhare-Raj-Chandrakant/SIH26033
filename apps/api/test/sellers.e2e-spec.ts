import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';

describe('SellersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let farmerToken: string;
  let fpoToken: string;
  let buyerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Clean up
    await prisma.cartItem.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.product.deleteMany();
    await prisma.address.deleteMany();
    await prisma.sellerProfile.deleteMany();
    await prisma.buyerProfile.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await argon2.hash('password123');

    // Create Farmer
    const farmer = await prisma.user.create({
      data: {
        email: 'farmer@example.com',
        passwordHash,
        role: 'FARMER',
        sellerProfile: {
          create: {
            sellerType: 'FARMER',
            businessName: 'Green Farm',
          },
        },
      },
      include: { sellerProfile: true },
    });
    farmerToken = jwtService.sign({ sub: farmer.id, role: farmer.role });

    // Create FPO
    const fpo = await prisma.user.create({
      data: {
        email: 'fpo@example.com',
        passwordHash,
        role: 'FPO',
        sellerProfile: {
          create: {
            sellerType: 'FPO',
            businessName: 'United FPO',
          },
        },
      },
      include: { sellerProfile: true },
    });
    fpoToken = jwtService.sign({ sub: fpo.id, role: fpo.role });

    // Create Buyer
    const buyer = await prisma.user.create({
      data: {
        email: 'buyer@example.com',
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

  describe('GET /api/v1/sellers/profile', () => {
    it('should return seller profile for FARMER', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sellers/profile')
        .set('Authorization', `Bearer ${farmerToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.sellerType).toBe('FARMER');
      expect(res.body.businessName).toBe('Green Farm');
    });

    it('should return seller profile via singular /api/v1/seller/profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/seller/profile')
        .set('Authorization', `Bearer ${farmerToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.sellerType).toBe('FARMER');
    });

    it('should return seller profile for FPO', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sellers/profile')
        .set('Authorization', `Bearer ${fpoToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.sellerType).toBe('FPO');
    });

    it('should reject BUYER from accessing seller profile', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/sellers/profile')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/sellers/profile', () => {
    it('should update profile for FARMER', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/sellers/profile')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ businessName: 'Super Green Farm', farmLocation: 'Delhi' })
        .expect(200);

      expect(res.body.businessName).toBe('Super Green Farm');
      expect(res.body.farmLocation).toBe('Delhi');
    });
  });
});
