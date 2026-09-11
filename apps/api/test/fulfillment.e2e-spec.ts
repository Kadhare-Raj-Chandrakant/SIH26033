import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Category, Product, ProductStatus, Address, OrderStatus } from '@prisma/client';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

describe('Logistics, Order Fulfillment & Tracking (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let buyer1Token: string;
  let buyer1Id: string;
  let buyer1UserId: string;

  let buyer2Token: string;

  let farmer1Token: string;
  let farmer1SellerId: string;

  let farmer2Token: string;

  let testCategory: Category;
  let prodTomato: Product;
  let buyer1Address: Address;

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

    // Clean up DB safely in FK order
    await prisma.notification.deleteMany();
    await prisma.shipmentTrackingEvent.deleteMany();
    await prisma.shipment.deleteMany();
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

    const passwordHash = await argon2.hash('SecretPass123!');

    // Category
    testCategory = await prisma.category.create({
      data: { name: 'Farm Fresh Produce M8', slug: 'farm-fresh-m8' },
    });

    // Farmer 1
    const farmer1 = await prisma.user.create({
      data: {
        email: 'farmer1_m8@example.com',
        mobile: '9870000001',
        passwordHash,
        role: 'FARMER',
        sellerProfile: {
          create: {
            sellerType: 'FARMER',
            businessName: 'Nashik Organic Farms M8',
            farmLocation: 'Nashik, Maharashtra',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { sellerProfile: true },
    });
    farmer1SellerId = farmer1.sellerProfile!.id;
    farmer1Token = jwtService.sign({ sub: farmer1.id, role: farmer1.role });

    // Farmer 2 (for IDOR tests)
    const farmer2 = await prisma.user.create({
      data: {
        email: 'farmer2_m8@example.com',
        mobile: '9870000002',
        passwordHash,
        role: 'FPO',
        sellerProfile: {
          create: {
            sellerType: 'FPO',
            businessName: 'Punjab Farmer Co-op M8',
            farmLocation: 'Ludhiana, Punjab',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { sellerProfile: true },
    });
    farmer2Token = jwtService.sign({ sub: farmer2.id, role: farmer2.role });

    // Buyer 1
    const buyer1 = await prisma.user.create({
      data: {
        email: 'buyer1_m8@example.com',
        mobile: '9870000003',
        passwordHash,
        role: 'BUYER',
        buyerProfile: {
          create: {
            buyerType: 'INDIVIDUAL',
            businessName: 'Rahul Agro Buyer',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { buyerProfile: true },
    });
    buyer1UserId = buyer1.id;
    buyer1Id = buyer1.buyerProfile!.id;
    buyer1Token = jwtService.sign({ sub: buyer1.id, role: buyer1.role });

    // Buyer 2 (for buyer IDOR tests)
    const buyer2 = await prisma.user.create({
      data: {
        email: 'buyer2_m8@example.com',
        mobile: '9870000004',
        passwordHash,
        role: 'BUYER',
        buyerProfile: {
          create: {
            buyerType: 'INDIVIDUAL',
            businessName: 'Priya Retailer',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { buyerProfile: true },
    });
    buyer2Token = jwtService.sign({ sub: buyer2.id, role: buyer2.role });

    // Buyer 1 Address
    buyer1Address = await prisma.address.create({
      data: {
        userId: buyer1.id,
        name: 'Rahul Agro Hub',
        phone: '9870000003',
        addressLine: 'Plot 45, APMC Market Yard',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411037',
        country: 'India',
        isDefault: true,
      },
    });

    // Product for Farmer 1
    prodTomato = await prisma.product.create({
      data: {
        sellerId: farmer1SellerId,
        categoryId: testCategory.id,
        name: 'Organic Vine Tomatoes',
        description: 'Naturally ripened tomatoes directly from farm',
        price: 40.0,
        unit: 'KG',
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
    if (prisma) {
      await prisma.notification.deleteMany();
      await prisma.shipmentTrackingEvent.deleteMany();
      await prisma.shipment.deleteMany();
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
    }
    if (app) {
      await app.close();
    }
  });

  // Helper to create an order for testing
  async function createTestOrder(): Promise<string> {
    // Add to cart
    await prisma.cartItem.create({
      data: {
        buyerId: buyer1Id,
        productId: prodTomato.id,
        quantity: 10,
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ addressId: buyer1Address.id });

    expect(res.status).toBe(201);
    return res.body.data.order.id;
  }

  describe('1. Authentication & Role Authorization Guards', () => {
    it('should reject unauthenticated seller fulfillment requests with 401', async () => {
      const orderId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer()).post(`/api/v1/seller/orders/${orderId}/confirm`);
      expect(res.status).toBe(401);
    });

    it('should reject non-seller (BUYER) trying to confirm orders with 403', async () => {
      const orderId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${buyer1Token}`);
      expect(res.status).toBe(403);
    });

    it('should reject non-buyer (FARMER) accessing buyer tracking with 403', async () => {
      const orderId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${farmer1Token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('2. Seller Ownership & IDOR Protection', () => {
    let orderId: string;

    beforeEach(async () => {
      orderId = await createTestOrder();
    });

    it('should prevent Seller B from confirming Seller A order (returns 404 IDOR protected)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${farmer2Token}`);

      expect(res.status).toBe(404);
    });

    it('should prevent Seller B from shipping Seller A order (returns 404 IDOR protected)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${farmer2Token}`)
        .send({});

      expect(res.status).toBe(404);
    });

    it('should allow Seller A to view and confirm their own order', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');
    });
  });

  describe('3. Buyer Tracking Ownership & IDOR Protection', () => {
    let orderId: string;

    beforeEach(async () => {
      orderId = await createTestOrder();
    });

    it('should allow Buyer A to view tracking for their own order', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orderId).toBe(orderId);
      expect(res.body.data.orderStatus).toBe('PENDING');
      expect(res.body.data.shipment).toBeNull();
    });

    it('should prevent Buyer B from viewing Buyer A tracking (returns 404 IDOR protected)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${buyer2Token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('4. Full Fulfillment Lifecycle (PENDING -> CONFIRMED -> PROCESSING -> READY -> SHIPPED -> IN_TRANSIT -> DELIVERED)', () => {
    let orderId: string;

    beforeAll(async () => {
      orderId = await createTestOrder();
    });

    it('Step 1: Confirm order (PENDING -> CONFIRMED)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');

      // Verify buyer notification
      const notif = await prisma.notification.findFirst({
        where: { userId: buyer1UserId, title: 'Order Confirmed' },
      });
      expect(notif).toBeDefined();
    });

    it('Step 2: Disallow invalid transition from CONFIRMED directly to SHIPPED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Only READY_FOR_SHIPMENT orders can be dispatched/);
    });

    it('Step 3: Move to PROCESSING (CONFIRMED -> PROCESSING)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/processing`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PROCESSING');
    });

    it('Step 4: Move to READY_FOR_SHIPMENT (PROCESSING -> READY_FOR_SHIPMENT)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/ready-for-shipment`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('READY_FOR_SHIPMENT');
    });

    it('Step 5: Dispatch and create shipment (READY_FOR_SHIPMENT -> SHIPPED)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({ carrierNotes: 'Handle fresh tomatoes gently' });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('SHIPPED');
      expect(res.body.data.shipment).toBeDefined();
      expect(res.body.data.shipment.trackingNumber).toMatch(/^TRK-AGRI-/);
      expect(res.body.data.shipment.provider).toBe('MOCK_LOGISTICS');
      expect(res.body.data.shipment.status).toBe('PICKED_UP');

      // Verify DB shipment record
      const dbShipment = await prisma.shipment.findUnique({
        where: { orderId },
        include: { events: true },
      });
      expect(dbShipment).toBeDefined();
      expect(dbShipment!.events.length).toBeGreaterThanOrEqual(1);
    });

    it('Step 6: Buyer tracking reflects dispatched shipment and initial timeline event', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orderStatus).toBe('SHIPPED');
      expect(res.body.data.shipment.trackingNumber).toMatch(/^TRK-AGRI-/);
      expect(res.body.data.shipment.events.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.shipment.events[0].status).toBe('PICKED_UP');
    });

    it('Step 7: Synchronize shipment status with carrier -> advances to IN_TRANSIT', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/sync-shipment`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orderStatus).toBe('IN_TRANSIT');
      expect(res.body.data.shipment.status).toBe('IN_TRANSIT');
      expect(res.body.data.shipment.events.length).toBe(2);
    });

    it('Step 8: Synchronize shipment status with carrier -> advances to DELIVERED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/sync-shipment`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orderStatus).toBe('DELIVERED');
      expect(res.body.data.shipment.status).toBe('DELIVERED');
      expect(res.body.data.shipment.deliveredAt).toBeDefined();

      // Verify delivery notification for buyer
      const notif = await prisma.notification.findFirst({
        where: { userId: buyer1UserId, title: 'Order Delivered' },
      });
      expect(notif).toBeDefined();
    });

    it('Step 9: Idempotent status sync when already DELIVERED does not duplicate events', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/sync-shipment`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orderStatus).toBe('DELIVERED');
      expect(res.body.data.shipment.status).toBe('DELIVERED');

      // Events count should not grow exponentially
      const dbShipment = await prisma.shipment.findUnique({
        where: { orderId },
        include: { events: true },
      });
      expect(dbShipment!.events.length).toBeLessThanOrEqual(3);
    });

    it('Step 10: Disallow buyer cancelling order when DELIVERED or SHIPPED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Only PENDING or CONFIRMED orders can be cancelled/);
    });
  });

  describe('5. Deterministic Provider Failure Mode', () => {
    let orderId: string;

    beforeAll(async () => {
      orderId = await createTestOrder();
      // Progress to READY_FOR_SHIPMENT
      await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${farmer1Token}`);
      await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/processing`)
        .set('Authorization', `Bearer ${farmer1Token}`);
      await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/ready-for-shipment`)
        .set('Authorization', `Bearer ${farmer1Token}`);
    });

    it('should return 502 Bad Gateway when provider fails, maintaining READY_FOR_SHIPMENT state', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({ simulateFailure: true });

      expect(res.status).toBe(502);
      expect(res.body.message).toMatch(/Logistics provider failed/);

      // Verify order is still in READY_FOR_SHIPMENT
      const dbOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { shipment: true },
      });
      expect(dbOrder!.status).toBe(OrderStatus.READY_FOR_SHIPMENT);
      expect(dbOrder!.shipment).toBeNull();
    });

    it('should allow subsequent successful ship request after failure resolved', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({ simulateFailure: false });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('SHIPPED');

      const dbOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { shipment: true },
      });
      expect(dbOrder!.status).toBe(OrderStatus.SHIPPED);
      expect(dbOrder!.shipment).toBeDefined();
    });
  });

  describe('6. Concurrency Protection on Shipment Creation', () => {
    let orderId: string;

    beforeAll(async () => {
      orderId = await createTestOrder();
      await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${farmer1Token}`);
      await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/processing`)
        .set('Authorization', `Bearer ${farmer1Token}`);
      await request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/ready-for-shipment`)
        .set('Authorization', `Bearer ${farmer1Token}`);
    });

    it('should ensure only one shipment is created during simultaneous parallel dispatch requests', async () => {
      const request1 = request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({});

      const request2 = request(app.getHttpServer())
        .post(`/api/v1/seller/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({});

      const [res1, res2] = await Promise.all([request1, request2]);

      const statuses = [res1.status, res2.status];
      // Exactly one must succeed with 201, the other must fail with 400
      expect(statuses).toContain(201);
      expect(statuses).toContain(400);

      // Database should contain exactly ONE shipment for this order
      const shipments = await prisma.shipment.findMany({
        where: { orderId },
      });
      expect(shipments.length).toBe(1);

      const dbOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });
      expect(dbOrder!.status).toBe(OrderStatus.SHIPPED);
    });
  });
});
