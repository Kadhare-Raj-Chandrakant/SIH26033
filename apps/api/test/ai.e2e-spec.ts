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

  // ---------------------------------------------------------------------------
  // MILESTONE 10 — DECISION ENGINE & MARKET INTELLIGENCE E2E TESTS
  // ---------------------------------------------------------------------------

  it('GET /ai/market-intelligence/:commodity should return APMC benchmark and platform listings', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        commodity: 'Tomato',
        reporting_date: '2025-12-31',
        total_markets_reporting: 2,
        overall_stats: {
          min_modal_price: 2400,
          max_modal_price: 2700,
          avg_modal_price: 2550,
          total_arrivals_tonnes: 3200,
          top_paying_market: 'Pune',
          lowest_paying_market: 'Nashik',
        },
        markets: [
          {
            market: 'Pune',
            district: 'Pune',
            state: 'Maharashtra',
            min_price: 2300,
            max_price: 2800,
            modal_price: 2700,
            arrivals: 1800,
          },
          {
            market: 'Nashik',
            district: 'Nashik',
            state: 'Maharashtra',
            min_price: 2200,
            max_price: 2600,
            modal_price: 2400,
            arrivals: 1400,
          },
        ],
        historical_trend: [{ date: '2025-12-30', modal_price: 2540, arrivals: 3100 }],
        forward_outlook: {
          current_modal_price: 2550,
          projected_7d_price: 2620,
          projected_14d_price: 2680,
          projected_change_percent: 5.1,
          price_trend_direction: 'RISING',
          demand_absorption_band: 'HIGH',
          supporting_factors: ['Steady wholesale demand'],
        },
      }),
    } as any);

    const res = await request(app.getHttpServer())
      .get('/ai/market-intelligence/Tomato?city=Nashik&state=Maharashtra')
      .expect(200);

    expect(res.body.commodity).toBe('Tomato');
    expect(res.body.totalMarketsReporting).toBe(2);
    expect(res.body.overallStats.avgModalPrice).toBe(2550);
    expect(res.body.markets.length).toBe(2);
    expect(res.body.dataSourceDisclosures).toBeDefined();
    expect(res.body.dataSourceDisclosures.apmcMandi).toContain('Benchmark');
  });

  it('POST /ai/price-intelligence should provide predictions, confidence bounds, and contributing factors', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/market/intelligence')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            commodity: 'Tomato',
            overall_stats: { avg_modal_price: 2500 },
            markets: [],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          commodity: 'Tomato',
          market: 'Azadpur',
          predicted_modal_price: 2650.0,
          lower_bound: 2350.0,
          upper_bound: 2950.0,
          model_version: '1.1.0',
          explainability_factors: [
            {
              feature: 'price_rolling_mean_7',
              weight: 0.95,
              interpretation: 'Primary price momentum driver',
            },
          ],
        }),
      });
    });

    const res = await request(app.getHttpServer())
      .post('/ai/price-intelligence')
      .send({
        commodity: 'Tomato',
        market: 'Azadpur',
        recentPrice: 2500,
      })
      .expect(200);

    expect(res.body.commodity).toBe('Tomato');
    expect(res.body.predictedPrice).toBe(2650.0);
    expect(res.body.lowerBound).toBe(2350.0);
    expect(res.body.upperBound).toBe(2950.0);
    expect(res.body.trend).toBe('RISING');
    expect(res.body.factors.length).toBeGreaterThan(0);
    expect(res.body.factors[0].feature).toBe('price_rolling_mean_7');
  });

  it('POST /ai/net-realization should calculate gross-to-net realization waterfall with mandatory settlement notice', async () => {
    const res = await request(app.getHttpServer())
      .post('/ai/net-realization')
      .send({
        quantity: 50,
        unit: 'QUINTAL',
        grossPricePerUnit: 2400,
        destinationName: 'Pune APMC',
        distanceKm: 120,
        packagingCostPerUnit: 15,
        handlingCostPerUnit: 12,
        mandiCessPercent: 1.0,
        platformFeeRatePercent: 0,
      })
      .expect(200);

    expect(res.body.grossSellingValue).toBe(120000);
    expect(res.body.deductions.length).toBeGreaterThanOrEqual(4);
    expect(res.body.totalDeductions).toBeGreaterThan(0);
    expect(res.body.estimatedNetRealization).toBeLessThan(120000);
    expect(res.body.calculationType).toBe('ESTIMATED_PRE_SALE');
    expect(res.body.settlementDistinctionNotice).toContain('CRITICAL DISTINCTION');
  });

  it('POST /ai/best-time-to-sell should provide relative timing recommendation and risk factors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        commodity: 'Onion',
        forward_outlook: {
          current_modal_price: 2100,
          projected_7d_price: 2200,
          projected_14d_price: 2280,
          projected_change_percent: 8.5,
          demand_absorption_band: 'HIGH',
          supporting_factors: ['Favorable seasonal demand'],
        },
      }),
    } as any);

    const res = await request(app.getHttpServer())
      .post('/ai/best-time-to-sell')
      .send({
        commodity: 'Onion',
        market: 'Lasalgaon',
        currentPrice: 2100,
        isHighlyPerishable: false,
      })
      .expect(200);

    expect(res.body.commodity).toBe('Onion');
    expect(res.body.recommendation).toBe('Consider waiting');
    expect(res.body.forwardProjections.horizon14DaysPrice).toBe(2280);
    expect(res.body.supportingFactors.length).toBeGreaterThan(0);
  });

  it('POST /ai/smart-allocation should reject unauthenticated requests with 401', async () => {
    await request(app.getHttpServer())
      .post('/ai/smart-allocation')
      .send({
        commodity: 'Onion',
        quantity: 50,
        sellerLocation: { city: 'Nashik' },
      })
      .expect(401);
  });

  it('POST /ai/smart-allocation should reject BUYER role with 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .post('/ai/smart-allocation')
      .set('Authorization', `Bearer ${testUser2Token}`) // Buyer token
      .send({
        commodity: 'Onion',
        quantity: 50,
        sellerLocation: { city: 'Nashik' },
      })
      .expect(403);
  });

  it('POST /ai/smart-allocation should return ranked channel options and explainable rationale for FARMER', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        commodity: 'Onion',
        overall_stats: { avg_modal_price: 2250 },
        markets: [
          {
            market: 'Lasalgaon',
            state: 'Maharashtra',
            modal_price: 2150,
            arrivals: 4500,
          },
        ],
      }),
    } as any);

    const res = await request(app.getHttpServer())
      .post('/ai/smart-allocation')
      .set('Authorization', `Bearer ${testUser1Token}`) // Farmer token
      .send({
        commodity: 'Onion',
        quantity: 50,
        sellerLocation: { city: 'Nashik', state: 'Maharashtra' },
        maxTransitDistanceKm: 300,
        includeMandis: true,
        includeDirectBuyers: true,
        includePlatformListing: true,
      })
      .expect(200);

    expect(res.body.commodity).toBe('Onion');
    expect(res.body.quantity).toBe(50);
    expect(res.body.rankedOptions.length).toBeGreaterThan(0);
    expect(res.body.recommendedOption).toBeDefined();
    expect(res.body.recommendationRationale).toBeDefined();
    expect(res.body.settlementDistinctionNotice).toContain('CRITICAL NOTICE');
  });

  it('POST /ai/matching/buyers should find compatible buyer requirements for FARMER', async () => {
    const res = await request(app.getHttpServer())
      .post('/ai/matching/buyers')
      .set('Authorization', `Bearer ${testUser1Token}`)
      .send({
        commodity: 'Onion',
        quantity: 50,
        location: { city: 'Nashik' },
      })
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /ai/matching/sellers should find in-stock seller products for BUYER', async () => {
    const res = await request(app.getHttpServer())
      .post('/ai/matching/sellers')
      .set('Authorization', `Bearer ${testUser2Token}`)
      .send({
        commodity: 'Tomato',
        requiredQuantity: 30,
        deliveryLocation: { city: 'Pune' },
      })
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});

