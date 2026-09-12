import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { requestIdMiddleware } from '../src/common/middleware/request-id.middleware.js';

describe('Milestone 14 — Monitoring, Operational Telemetry & Health Probes (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Register correlation ID middleware
    app.use(requestIdMiddleware);

    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Health and Readiness Probes', () => {
    it('GET /api/v1/health should return 200 with database operational status', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.info?.database?.status).toBe('up');
    });

    it('GET /api/v1/health/liveness should return 200 for process liveness', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/liveness');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.service).toBe('api');
      expect(res.body.data.timestamp).toBeDefined();
    });

    it('GET /api/v1/health/readiness should return 200 for Render readiness probes', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/readiness');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.info?.database?.status).toBe('up');
    });
  });

  describe('2. Correlation / Request ID Lifecycle', () => {
    it('should generate an x-request-id response header when none is supplied', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/liveness');
      expect(res.status).toBe(200);
      const reqId = res.headers['x-request-id'];
      expect(reqId).toBeDefined();
      expect(reqId.length).toBeGreaterThan(10);
    });

    it('should preserve and propagate a valid client-supplied x-request-id', async () => {
      const customTraceId = 'trace-client-abc-12345';
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/liveness')
        .set('x-request-id', customTraceId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customTraceId);
    });

    it('should sanitize malformed or malicious x-request-id and replace with random UUID', async () => {
      const malformedId = 'bad<script>alert(1)</script>';
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/liveness')
        .set('x-request-id', malformedId);

      expect(res.status).toBe(200);
      const reqId = res.headers['x-request-id'];
      expect(reqId).toBeDefined();
      expect(reqId).not.toBe(malformedId);
      expect(/^[a-zA-Z0-9_-]+$/.test(reqId)).toBe(true);
    });
  });

  describe('3. Error Response Correlation & Telemetry', () => {
    it('should attach requestId to error payload and response header on resource 404', async () => {
      const customTraceId = 'trace-error-test-404';
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/marketplace/products/${nonExistentId}`)
        .set('x-request-id', customTraceId);

      expect(res.status).toBe(404);
      expect(res.headers['x-request-id']).toBe(customTraceId);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.requestId).toBe(customTraceId);
      expect(res.body.error.path).toBe(`/api/v1/marketplace/products/${nonExistentId}`);
    });

    it('should attach custom requestId to error payload on validation 400', async () => {
      const customTraceId = 'trace-validation-error-400';
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-request-id', customTraceId)
        .send({});

      expect(res.status).toBe(400);
      expect(res.headers['x-request-id']).toBe(customTraceId);
      expect(res.body.success).toBe(false);
      expect(res.body.error.requestId).toBe(customTraceId);
    });

    it('should attach auto-generated requestId to error payload on unauthenticated access', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/orders');

      expect(res.status).toBe(401);
      const reqId = res.headers['x-request-id'];
      expect(reqId).toBeDefined();
      expect(res.body.success).toBe(false);
      expect(res.body.error.requestId).toBe(reqId);
    });
  });

  describe('4. AI Observability & Fault-Tolerant Fallback', () => {
    it('should execute market intelligence with graceful fallback when FastAPI is unreachable', async () => {
      // Calling market intelligence for a commodity when AI service is offline
      // should return enhanced market intelligence using platform database records
      // and safe APMC baseline without throwing an unhandled exception
      const res = await request(app.getHttpServer()).get('/api/v1/ai/market-intelligence/Wheat');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.commodity).toBe('Wheat');
      expect(res.body.data.overallStats).toBeDefined();
      expect(res.body.data.platformMarket).toBeDefined();
      expect(res.body.data.dataSourceDisclosures).toBeDefined();
    });
  });

  describe('5. Secret Protection in Telemetry & Outputs', () => {
    it('should not leak JWT_SECRET, passwords, or DATABASE_URL in health probes', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      const responseText = JSON.stringify(res.body);

      expect(responseText).not.toContain('password');
      expect(responseText).not.toContain('postgres://');
      expect(responseText).not.toContain('postgresql://');
      expect(responseText).not.toContain('JWT_SECRET');
      expect(responseText).not.toContain('AI_INTERNAL_KEY');
    });
  });
});
