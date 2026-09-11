import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';

describe('AiController (e2e)', () => {
  let app: INestApplication<any>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let originalFetch: typeof global.fetch;
  let testUser1Token: string;
  let testUser2Token: string;
  const user1Id = '11111111-1111-1111-1111-111111111111';
  const user2Id = '22222222-2222-2222-2222-222222222222';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

    testUser1Token = jwtService.sign({ sub: user1Id, role: 'FARMER' });
    testUser2Token = jwtService.sign({ sub: user2Id, role: 'BUYER' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    originalFetch = global.fetch;
    await prisma.aiPredictionLog.deleteMany();
  });

  afterEach(async () => {
    global.fetch = originalFetch;
  });

  it('GET /ai/health should proxy FastAPI health status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ok',
        service: 'SIH26033 AI Foundation Service',
        version: '1.0.0',
      }),
    } as any);

    const res = await request(app.getHttpServer())
      .get('/ai/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('1.0.0');
  });

  it('POST /ai/predict/price should return price forecast and log to database', async () => {
    const mockFastApiResponse = {
      commodity: 'Tomato',
      market: 'Azadpur',
      predicted_modal_price: 2650.0,
      unit: 'INR / Quintal',
      lower_bound: 2300.0,
      upper_bound: 3000.0,
      model_version: '1.0.0',
      explainability_factors: [
        {
          feature: 'price_rolling_mean_7',
          weight: 0.95,
          interpretation: 'Strong rolling price inertia',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockFastApiResponse,
    } as any);

    const res = await request(app.getHttpServer())
      .post('/ai/predict/price')
      .send({
        commodity: 'Tomato',
        market: 'Azadpur',
        historicalPriceLag1: 2500,
      })
      .expect(200);

    expect(res.body.predicted_modal_price).toBe(2650.0);
    expect(res.body.explainability_factors).toHaveLength(1);

    // Verify prediction log created in database (retry loop for async fire-and-forget logging)
    let recentLogs: any[] = [];
    for (let i = 0; i < 20; i++) {
      recentLogs = await prisma.aiPredictionLog.findMany({
        where: { modelName: 'price_predictor_baseline' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      if (recentLogs.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(recentLogs.length).toBeGreaterThan(0);
    expect((recentLogs[0].inputFeatures as any).commodity).toBe('Tomato');
  });

  it('POST /ai/predict/demand should return demand proxy forecast', async () => {
    const mockDemandResponse = {
      commodity: 'Wheat',
      market: 'Khanna',
      target_date: '2026-09-15',
      forecast_demand_proxy: 3200.5,
      unit: 'Metric Tonnes',
      demand_band: 'MODERATE',
      proxy_disclosure: 'Proxy metric based on APMC wholesale arrival volume',
      model_version: '1.0.0',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockDemandResponse,
    } as any);

    const res = await request(app.getHttpServer())
      .post('/ai/predict/demand')
      .send({
        commodity: 'Wheat',
        market: 'Khanna',
        arrivalsLag1: 3100,
      })
      .expect(200);

    expect(res.body.forecast_demand_proxy).toBe(3200.5);
    expect(res.body.demand_band).toBe('MODERATE');
  });

  it('POST /ai/predict/crop should return ranked crop recommendations', async () => {
    const mockCropResponse = {
      recommended_crop: 'Rice',
      top_recommendations: [
        { crop: 'Rice', confidence_score: 0.85 },
        { crop: 'Jute', confidence_score: 0.12 },
      ],
      model_version: '1.0.0',
      soil_profile_summary: 'Soil exhibits Medium Nitrogen and Neutral pH',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockCropResponse,
    } as any);

    const res = await request(app.getHttpServer())
      .post('/ai/predict/crop')
      .send({
        N: 90,
        P: 42,
        K: 43,
        temperature: 24.5,
        humidity: 80.0,
        ph: 6.5,
        rainfall: 200.0,
      })
      .expect(200);

    expect(res.body.recommended_crop).toBe('Rice');
    expect(res.body.top_recommendations).toHaveLength(2);
  });

  it('POST /ai/predict/crop should reject invalid inputs with 400 Bad Request', async () => {
    // Soil pH 18 is impossible (> 14) and N is negative
    const res = await request(app.getHttpServer())
      .post('/ai/predict/crop')
      .send({
        N: -10,
        P: 42,
        K: 43,
        temperature: 24.5,
        humidity: 80.0,
        ph: 18.0,
        rainfall: 200.0,
      })
      .expect(400);

    expect(res.body.message).toBeDefined();
  });

  it('POST /ai/feedback should reject unauthenticated requests with 401 Unauthorized', async () => {
    await request(app.getHttpServer())
      .post('/ai/feedback')
      .send({
        modelName: 'price_predictor_baseline',
        modelVersion: '1.0.0',
        featuresLogged: { commodity: 'Tomato' },
        predictionOutput: { price: 2650.0 },
        userDecision: 'ACCEPTED',
      })
      .expect(401);
  });

  it('POST /ai/feedback should record platform feedback observation with authenticated userId', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        status: 'RECORDED',
        record_id: 'fb_test_123',
        recorded_at: new Date().toISOString(),
      }),
    } as any);

    const res = await request(app.getHttpServer())
      .post('/ai/feedback')
      .set('Authorization', `Bearer ${testUser1Token}`)
      .send({
        modelName: 'price_predictor_baseline',
        modelVersion: '1.0.0',
        featuresLogged: { commodity: 'Tomato' },
        predictionOutput: { price: 2650.0 },
        userDecision: 'ACCEPTED',
      })
      .expect(201);

    expect(res.body.status).toBe('RECORDED');

    const feedbackInDb = await prisma.aiPredictionLog.findFirst({
      where: { userDecision: 'ACCEPTED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(feedbackInDb).toBeDefined();
    expect(feedbackInDb?.userDecision).toBe('ACCEPTED');
    expect(feedbackInDb?.userId).toBe(user1Id);
  });

  it('POST /ai/feedback should reject attempts to submit feedback for another user prediction with 403 Forbidden', async () => {
    // Seed an initial prediction record owned by user1
    const initialLog = await prisma.aiPredictionLog.create({
      data: {
        modelName: 'price_predictor_baseline',
        modelVersion: '1.0.0',
        inputFeatures: { commodity: 'Wheat' },
        predictionOutput: { modal_price: 2150 },
        userId: user1Id,
      },
    });

    // User2 tries to update User1's prediction
    const res = await request(app.getHttpServer())
      .post('/ai/feedback')
      .set('Authorization', `Bearer ${testUser2Token}`)
      .send({
        predictionId: initialLog.id,
        modelName: 'price_predictor_baseline',
        modelVersion: '1.0.0',
        featuresLogged: { commodity: 'Wheat' },
        predictionOutput: { modal_price: 2150 },
        userDecision: 'REJECTED',
      })
      .expect(403);

    expect(res.body.message).toContain('another user');
  });

  it('should gracefully return 503 if AI service is offline', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const res = await request(app.getHttpServer())
      .post('/ai/predict/price')
      .send({ commodity: 'Tomato' })
      .expect(503);

    expect(res.body.message).toContain('currently unavailable');
  });

  it('should gracefully return 504 on request timeout', async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    global.fetch = vi.fn().mockRejectedValue(abortErr);

    const res = await request(app.getHttpServer())
      .post('/ai/predict/price')
      .send({ commodity: 'Tomato' })
      .expect(504);

    expect(res.body.message).toContain('timed out');
  });
});
