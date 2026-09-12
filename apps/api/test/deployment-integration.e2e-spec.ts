import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

describe('Milestone 13 — Production Deployment & Cross-Module Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Operational Health & Readiness Probes', () => {
    it('GET /api/v1/health should return 200 with database operational status', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.info?.database?.status).toBe('up');
    });

    it('GET /api/v1/health/readiness should return 200 for Render readiness probes', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/readiness');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.info?.database?.status).toBe('up');
    });

    it('GET /api/v1/health/liveness should return 200 for process liveness', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/liveness');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.service).toBe('api');
    });
  });

  describe('Cross-Module End-to-End Integration Flows', () => {
    const uniqueSuffix = Date.now().toString().slice(-5);
    let farmerToken: string;
    let farmerId: string;
    let farmerSellerId: string;
    let buyerToken: string;
    let buyerId: string;
    let categoryId: string;
    let productId: string;
    let buyerAddressId: string;
    let createdOrderId: string;
    let adminToken: string;

    it('FLOW 1: Farmer onboarding -> Seller profile -> Product listing -> Marketplace visibility', async () => {
      // 1. Register Farmer
      const email = `farmer_m13_${uniqueSuffix}@example.com`;
      const regRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Farmer Ramesh',
          email,
          mobile: `+9198100${uniqueSuffix}`,
          password: 'Password123!',
          role: 'FARMER',
        });
      expect(regRes.status).toBe(201);
      farmerId = regRes.body.data.id;

      // 2. Login to get JWT
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email,
          password: 'Password123!',
        });
      expect(loginRes.status).toBe(201);
      farmerToken = loginRes.body.data.accessToken;

      // Seller profile is auto-created during registration; verify and update details
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { userId: farmerId },
      });
      expect(sellerProfile).toBeDefined();
      farmerSellerId = sellerProfile!.id;

      await prisma.sellerProfile.update({
        where: { id: farmerSellerId },
        data: {
          verificationStatus: 'VERIFIED',
          farmLocation: 'Nashik, Maharashtra',
        },
      });

      // Ensure category exists
      let cat = await prisma.category.findFirst({ where: { slug: 'vegetables' } });
      if (!cat) {
        cat = await prisma.category.create({
          data: { name: 'Vegetables', slug: 'vegetables' },
        });
      }
      categoryId = cat.id;

      // 3. Create Product with Inventory
      const prodRes = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          name: `Organic Red Onion Batch ${uniqueSuffix}`,
          description: 'Fresh export quality red onions directly from Nashik farm',
          price: 25.5,
          unit: 'KG',
          categoryId: categoryId,
          initialQuantity: 500,
        });
      expect(prodRes.status).toBe(201);
      productId = prodRes.body.data.id;

      // 4. Verify Marketplace Search and Visibility
      const marketRes = await request(app.getHttpServer())
        .get('/api/v1/marketplace/products')
        .query({ search: `Batch ${uniqueSuffix}` });
      expect(marketRes.status).toBe(200);
      const items = marketRes.body.data.items || marketRes.body.data;
      expect(Array.isArray(items)).toBe(true);
      const found = items.some((p: any) => p.id === productId);
      expect(found).toBe(true);
    });

    it('FLOW 2: Buyer onboarding -> Search -> Cart -> Checkout -> Order creation', async () => {
      // 1. Register Buyer
      const email = `buyer_m13_${uniqueSuffix}@example.com`;
      const buyerRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Buyer Suresh',
          email,
          mobile: `+9198200${uniqueSuffix}`,
          password: 'Password123!',
          role: 'BUYER',
        });
      expect(buyerRes.status).toBe(201);
      buyerId = buyerRes.body.data.id;

      // Login Buyer
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email,
          password: 'Password123!',
        });
      expect(loginRes.status).toBe(201);
      buyerToken = loginRes.body.data.accessToken;

      // 2. Create Buyer Delivery Address
      const addr = await prisma.address.create({
        data: {
          userId: buyerId,
          name: 'Vashi Main Warehouse',
          addressLine: 'Shop 42, Vashi APMC Market',
          city: 'Navi Mumbai',
          state: 'Maharashtra',
          pincode: '400703',
          country: 'India',
          phone: `+9198200${uniqueSuffix}`,
          isDefault: true,
        },
      });
      buyerAddressId = addr.id;

      // 3. Add Product to Cart
      const cartRes = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: productId,
          quantity: 50,
        });
      expect(cartRes.status).toBe(201);

      // 4. Inspect Cart
      const getCartRes = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(getCartRes.status).toBe(200);
      expect(getCartRes.body.data.items.length).toBeGreaterThan(0);

      // 5. Checkout via POST /orders
      const checkoutRes = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          addressId: buyerAddressId,
        });
      expect(checkoutRes.status).toBe(201);
      const orders = checkoutRes.body.data.orders;
      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBe(1);
      createdOrderId = orders[0].id;
      expect(orders[0].status).toBe('PENDING');

      // 6. Verify inventory was decremented/reserved
      const updatedInv = await prisma.inventory.findUnique({
        where: { productId: productId },
      });
      expect(Number(updatedInv?.availableQuantity)).toBe(450);
      expect(Number(updatedInv?.reservedQuantity)).toBe(50);
    });

    it('FLOW 3: Multi-seller cart isolation and vendor-scoped orders', async () => {
      // Create second farmer
      const email2 = `farmer2_m13_${uniqueSuffix}@example.com`;
      const farmer2Res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Farmer Ganpat',
          email: email2,
          mobile: `+9198300${uniqueSuffix}`,
          password: 'Password123!',
          role: 'FARMER',
        });
      expect(farmer2Res.status).toBe(201);

      const login2 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: email2,
          password: 'Password123!',
        });
      expect(login2.status).toBe(201);
      const farmer2Token = login2.body.data.accessToken;

      const profile2 = await prisma.sellerProfile.findUnique({
        where: { userId: farmer2Res.body.data.id },
      });
      await prisma.sellerProfile.update({
        where: { id: profile2!.id },
        data: {
          verificationStatus: 'VERIFIED',
          farmLocation: 'Baramati, Maharashtra',
        },
      });

      const prod2 = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${farmer2Token}`)
        .send({
          name: `Fresh Green Capsicum ${uniqueSuffix}`,
          description: 'Polyhouse crisp capsicum',
          price: 40.0,
          unit: 'KG',
          categoryId: categoryId,
          initialQuantity: 300,
        });
      expect(prod2.status).toBe(201);

      // Add product from Farmer 1 and Farmer 2 to buyer cart
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: productId, quantity: 20 });

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: prod2.body.data.id, quantity: 25 });

      // Checkout creates distinct vendor-scoped sub-orders
      const multiCheckout = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          addressId: buyerAddressId,
        });
      expect(multiCheckout.status).toBe(201);
      expect(multiCheckout.body.data.orders.length).toBe(2);
    });

    it('FLOW 4: Seller fulfillment -> READY_FOR_SHIPMENT -> Dispatch -> Tracking events', async () => {
      // 1. Seller confirms order (PENDING -> CONFIRMED)
      const confirmRes = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${createdOrderId}/confirm`)
        .set('Authorization', `Bearer ${farmerToken}`);
      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.status).toBe('CONFIRMED');

      // 2. Seller starts processing order (CONFIRMED -> PROCESSING)
      const processRes = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${createdOrderId}/processing`)
        .set('Authorization', `Bearer ${farmerToken}`);
      expect(processRes.status).toBe(200);
      expect(processRes.body.data.status).toBe('PROCESSING');

      // 3. Seller marks ready for shipment (PROCESSING -> READY_FOR_SHIPMENT)
      const readyRes = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${createdOrderId}/ready-for-shipment`)
        .set('Authorization', `Bearer ${farmerToken}`);
      expect(readyRes.status).toBe(200);
      expect(readyRes.body.data.status).toBe('READY_FOR_SHIPMENT');

      // 4. Seller dispatches via carrier adapter (READY_FOR_SHIPMENT -> SHIPPED)
      const shipRes = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${createdOrderId}/ship`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ carrierNotes: 'Handle with care - Fresh farm produce' });
      expect(shipRes.status).toBe(201);
      expect(shipRes.body.data.status).toBe('SHIPPED');

      // 5. Verify shipment record created in database with tracking events
      const shipment = await prisma.shipment.findFirst({
        where: { orderId: createdOrderId },
        include: { events: true },
      });
      expect(shipment).toBeDefined();
      expect(shipment?.trackingNumber).toBeDefined();
      expect(shipment?.events.length).toBeGreaterThan(0);

      // 6. Buyer reads tracking status
      const trackRes = await request(app.getHttpServer())
        .get(`/api/v1/orders/${createdOrderId}/tracking`)
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(trackRes.status).toBe(200);
      expect(trackRes.body.data.shipment.trackingNumber).toBe(shipment?.trackingNumber);
      expect(trackRes.body.data.shipment.events.length).toBeGreaterThan(0);
    });

    it('FLOW 5: AI intelligence & Decision Engine algorithms', async () => {
      // 1. Price Intelligence
      const priceRes = await request(app.getHttpServer())
        .post('/api/v1/ai/price-intelligence')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          commodity: 'Onion',
          market: 'Lasalgaon',
          state: 'Maharashtra',
        });
      expect(priceRes.status).toBe(200);
      expect(priceRes.body.data.commodity).toBe('Onion');
      expect(priceRes.body.data.predictedPrice).toBeDefined();
      expect(priceRes.body.data.factors).toBeDefined();

      // 2. Market Intelligence
      const marketIntel = await request(app.getHttpServer())
        .get('/api/v1/ai/market-intelligence/Onion')
        .set('Authorization', `Bearer ${farmerToken}`);
      expect(marketIntel.status).toBe(200);
      expect(marketIntel.body.data.commodity).toBe('Onion');

      // 3. Best Time to Sell
      const sellTiming = await request(app.getHttpServer())
        .post('/api/v1/ai/best-time-to-sell')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          commodity: 'Onion',
          currentPrice: 2500,
          isHighlyPerishable: false,
        });
      expect(sellTiming.status).toBe(200);
      expect(sellTiming.body.data.recommendation).toBeDefined();

      // 4. Net Realization
      const netReal = await request(app.getHttpServer())
        .post('/api/v1/ai/net-realization')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          grossPricePerUnit: 25.0,
          quantity: 10,
          distanceKm: 120,
          storageDays: 5,
        });
      expect(netReal.status).toBe(200);
      expect(netReal.body.data.estimatedNetRealization).toBeDefined();

      // 5. Smart Allocation
      const alloc = await request(app.getHttpServer())
        .post('/api/v1/ai/smart-allocation')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          commodity: 'Onion',
          quantity: 50,
          sellerLocation: {
            city: 'Nashik',
            state: 'Maharashtra',
            latitude: 20.0,
            longitude: 74.0,
          },
        });
      expect(alloc.status).toBe(200);
      expect(alloc.body.data.rankedOptions).toBeDefined();
    });

    it('FLOW 6: Admin Dashboard -> RBAC Enforcement -> Reports & Audit Logs', async () => {
      // 1. Create Admin User
      const adminHash = await argon2.hash('AdminPass123!');
      const adminUser = await prisma.user.create({
        data: {
          email: `admin_m13_${uniqueSuffix}@example.com`,
          mobile: `+9198000${uniqueSuffix}`,
          passwordHash: adminHash,
          role: 'ADMIN',
        },
      });
      adminToken = jwtService.sign({ sub: adminUser.id, role: adminUser.role });

      // 2. Admin Dashboard Aggregations
      const dashRes = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(dashRes.status).toBe(200);
      expect(dashRes.body.data.users).toBeDefined();
      expect(dashRes.body.data.orders).toBeDefined();
      expect(dashRes.body.data.payments).toBeDefined();
      expect(dashRes.body.data.logistics).toBeDefined();

      // 3. Admin User List
      const usersRes = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(usersRes.status).toBe(200);
      expect(usersRes.body.data.data.length).toBeGreaterThan(0);

      // 4. Admin Seller List
      const sellersRes = await request(app.getHttpServer())
        .get('/api/v1/admin/sellers')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(sellersRes.status).toBe(200);
      expect(sellersRes.body.data.data.length).toBeGreaterThan(0);

      // 5. Admin Audit Logs
      const auditRes = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.data).toBeDefined();

      // 6. RBAC Boundary: Non-admin (Farmer) must be strictly forbidden from accessing admin endpoints
      const forbidRes = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${farmerToken}`);
      expect(forbidRes.status).toBe(403);
    });
  });
});
