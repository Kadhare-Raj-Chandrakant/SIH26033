import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { Role } from '@prisma/client';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';

describe('AuthController (e2e)', () => {
  let app: INestApplication<any>;
  let prisma: PrismaService;

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

    prisma = app.get<PrismaService>(PrismaService);

    // Ensure pristine database state before tests
    const users = await prisma.user.findMany({ where: { email: { contains: 'e2e-test' } } });
    const userIds = users.map(u => u.id);
    if (userIds.length > 0) {
      await prisma.sellerProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.buyerProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  afterAll(async () => {
    // Clean up test data safely using a targeted delete
    const users = await prisma.user.findMany({ where: { email: { contains: 'e2e-test' } } });
    const userIds = users.map(u => u.id);
    if (userIds.length > 0) {
      await prisma.sellerProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.buyerProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
  });

  const testUser = {
    name: 'E2E Farmer',
    email: 'farmer.e2e-test@example.com',
    password: 'StrongPassword1!',
    role: Role.FARMER,
  };

  let accessToken: string;

  describe('/api/v1/auth/register (POST)', () => {
    it('should forbid ADMIN registration', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, role: Role.ADMIN })
        .expect(403);
    });

    it('should successfully register a FARMER', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.email).toBe(testUser.email);
          expect(res.body.data.role).toBe(Role.FARMER);
          expect(res.body.data.passwordHash).toBeUndefined();
        });
    });

    it('should return 409 for duplicate registration', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    it('should fail with incorrect password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword2@' })
        .expect(401);
    });

    it('should successfully login and return JWT', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.accessToken).toBeDefined();
          accessToken = res.body.data.accessToken;
        });
    });
  });

  describe('/api/v1/auth/me (GET)', () => {
    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should return user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.email).toBe(testUser.email);
          expect(res.body.data.sellerProfile).toBeDefined(); // Since it's a FARMER
        });
    });
  });
});
