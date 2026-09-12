import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Category, Product, User, Order } from '@prisma/client';

describe('AdminController & Moderation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let adminUser: User;
  let farmerUser: any;
  let buyerUser: any;

  let adminToken: string;
  let farmerToken: string;
  let buyerToken: string;

  let category: Category;
  let testProduct: Product;
  let testOrder: Order;

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
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Clean up
    await prisma.auditLog.deleteMany();
    await prisma.moderationReport.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.review.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.shipmentTrackingEvent.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.address.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.sellerProfile.deleteMany();
    await prisma.buyerProfile.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await argon2.hash('SecurePassword123!');

    // 1. Create Admin
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@market.gov.in',
        passwordHash,
        role: 'ADMIN',
      },
    });
    adminToken = jwtService.sign({ sub: adminUser.id, role: adminUser.role });

    // 2. Create Farmer Seller
    farmerUser = await prisma.user.create({
      data: {
        email: 'farmer@greenvalley.com',
        mobile: '9876543210',
        passwordHash,
        role: 'FARMER',
        sellerProfile: {
          create: {
            sellerType: 'FARMER',
            businessName: 'Green Valley Farms',
            farmLocation: 'Nashik, Maharashtra',
            verificationStatus: 'PENDING',
          },
        },
      },
      include: { sellerProfile: true },
    });
    farmerToken = jwtService.sign({ sub: farmerUser.id, role: farmerUser.role });

    // 3. Create Buyer
    buyerUser = await prisma.user.create({
      data: {
        email: 'buyer@freshretail.com',
        mobile: '9876543211',
        passwordHash,
        role: 'BUYER',
        buyerProfile: {
          create: {
            buyerType: 'BUSINESS',
            businessName: 'Fresh Retail Ltd',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { buyerProfile: true },
    });
    buyerToken = jwtService.sign({ sub: buyerUser.id, role: buyerUser.role });

    // 4. Create Category & Product
    category = await prisma.category.create({
      data: {
        name: 'Organic Vegetables',
        slug: 'organic-vegetables',
      },
    });

    testProduct = await prisma.product.create({
      data: {
        name: 'Nashik Red Onions',
        description: 'Grade-A export quality red onions directly from Nashik farm.',
        price: 35.0,
        unit: 'KG',
        status: 'ACTIVE',
        location: 'Nashik',
        sellerId: farmerUser.sellerProfile!.id,
        categoryId: category.id,
        inventory: {
          create: {
            availableQuantity: 5000,
            reservedQuantity: 0,
          },
        },
      },
    });

    // 5. Create Order & Payment & Shipment
    testOrder = await prisma.order.create({
      data: {
        orderNumber: 'ORD-TEST-1001',
        buyerId: buyerUser.buyerProfile!.id,
        sellerId: farmerUser.sellerProfile!.id,
        status: 'CONFIRMED',
        totalAmount: 3500.0,
        shippingAddressSnapshot: { city: 'Mumbai', pincode: '400001' },
        items: {
          create: {
            productId: testProduct.id,
            quantity: 100,
            unitPrice: 35.0,
            totalPrice: 3500.0,
          },
        },
        payment: {
          create: {
            amount: 3500.0,
            status: 'COMPLETED',
            providerReference: 'PAY-TXN-998877',
          },
        },
        shipment: {
          create: {
            provider: 'MOCK_LOGISTICS',
            providerShipmentId: 'MOCK-SHP-888',
            trackingNumber: 'TRK-999888',
            status: 'IN_TRANSIT',
            events: {
              create: {
                status: 'IN_TRANSIT',
                location: 'Thane Hub',
                message: 'Shipment arrived at Thane sorting facility',
              },
            },
          },
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // ===========================================================================
  // 1. AUTHORIZATION TESTS
  // ===========================================================================

  describe('Admin Authorization', () => {
    it('1. should reject unauthenticated access with 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/admin/dashboard');
      expect(res.status).toBe(401);
    });

    it('2. should reject FARMER access to admin endpoints with 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${farmerToken}`);
      expect(res.status).toBe(403);
    });

    it('3. should reject BUYER access to admin endpoints with 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(res.status).toBe(403);
    });

    it('4. should allow ADMIN access to admin dashboard with 200 and valid metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(res.body.users.total).toBeGreaterThanOrEqual(3);
      expect(res.body.users.farmers).toBeGreaterThanOrEqual(1);
      expect(res.body.users.buyers).toBeGreaterThanOrEqual(1);
      expect(res.body.users.admins).toBeGreaterThanOrEqual(1);

      expect(res.body).toHaveProperty('marketplace');
      expect(res.body.marketplace.totalProducts).toBeGreaterThanOrEqual(1);
      expect(res.body.marketplace.active).toBeGreaterThanOrEqual(1);

      expect(res.body).toHaveProperty('orders');
      expect(res.body.orders.total).toBeGreaterThanOrEqual(1);

      expect(res.body).toHaveProperty('payments');
      expect(res.body.payments.total).toBeGreaterThanOrEqual(1);

      expect(res.body).toHaveProperty('logistics');
      expect(res.body.logistics.totalShipments).toBeGreaterThanOrEqual(1);

      expect(res.body).toHaveProperty('moderation');
    });
  });

  // ===========================================================================
  // 2. USER MANAGEMENT & SAFE PROJECTIONS
  // ===========================================================================

  describe('User Management', () => {
    it('5. should list users with pagination and ensure passwordHash is never returned', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);

      for (const user of res.body.data) {
        expect(user.passwordHash).toBeUndefined();
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('status');
      }
    });

    it('6. should filter users by role and search string', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users?role=FARMER&search=greenvalley')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].email).toBe('farmer@greenvalley.com');
      expect(res.body.data[0].role).toBe('FARMER');
    });

    it('7. should enforce that account status has actual effect: ACTIVE succeeds, SUSPENDED/DEACTIVATED rejected', async () => {
      // 1. Create a dedicated user
      const tempUser = await prisma.user.create({
        data: {
          email: 'temp-status-test@farmer.com',
          passwordHash: await argon2.hash('TempPassword123!'),
          role: 'FARMER',
          status: 'ACTIVE',
        },
      });
      const tempToken = jwtService.sign({ sub: tempUser.id, role: tempUser.role });

      // ACTIVE works on protected endpoint
      const activeRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(activeRes.status).toBe(200);

      // Admin suspends temp user
      const suspendRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${tempUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED', reason: 'Audit investigation' });
      expect(suspendRes.status).toBe(200);

      // SUSPENDED user's JWT request is rejected with 401
      const suspendedReqRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(suspendedReqRes.status).toBe(401);

      // SUSPENDED user's login attempt is rejected with 401
      const suspendedLoginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'temp-status-test@farmer.com', password: 'TempPassword123!' });
      expect(suspendedLoginRes.status).toBe(401);

      // Admin deactivates temp user
      const deactivateRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${tempUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DEACTIVATED', reason: 'Account deactivated' });
      expect(deactivateRes.status).toBe(200);

      // DEACTIVATED user's JWT request is rejected with 401
      const deactivatedReqRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(deactivatedReqRes.status).toBe(401);

      // Admin self-deactivation remains blocked
      const selfRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${adminUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DEACTIVATED' });
      expect(selfRes.status).toBe(400);

      // Verify audit log was created with admin identity
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'USER_STATUS_UPDATE',
          entityId: tempUser.id,
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.actorUserId).toBe(adminUser.id);
    });
  });

  // ===========================================================================
  // 3. SELLER / FPO MANAGEMENT
  // ===========================================================================

  describe('Seller Management', () => {
    it('8. should list sellers and update verification status with audit log', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/admin/sellers?sellerType=FARMER')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      const sellerId = farmerUser.sellerProfile!.id;
      const verifyRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/sellers/${sellerId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          verificationStatus: 'VERIFIED',
          reason: 'Land revenue record 7/12 extract validated',
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.verificationStatus).toBe('VERIFIED');

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'SELLER_VERIFICATION',
          entityId: sellerId,
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.actorUserId).toBe(adminUser.id);
    });
  });

  // ===========================================================================
  // 4. PRODUCT MODERATION
  // ===========================================================================

  describe('Product Moderation', () => {
    it('9. should view product details and categories', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testProduct.id);
      expect(res.body.name).toBe('Nashik Red Onions');
      expect(res.body.seller.businessName).toBe('Green Valley Farms');
    });

    it('10. should moderate product: valid transition (ACTIVE -> REJECTED) creates audit record', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/products/${testProduct.id}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'REJECTED',
          reason: 'Quality certificate missing for grade claims',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('REJECTED');

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'PRODUCT_MODERATION',
          entityId: testProduct.id,
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.actorUserId).toBe(adminUser.id);
      expect((auditLog?.previousState as any)?.status).toBe('ACTIVE');
      expect((auditLog?.newState as any)?.status).toBe('REJECTED');
    });

    it('11. should reject invalid moderation transitions with 400 Bad Request', async () => {
      // Transition to same status
      const sameRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/products/${testProduct.id}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'REJECTED' });
      expect(sameRes.status).toBe(400);

      // Invalid transition from REJECTED to OUT_OF_STOCK
      const invalidRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/products/${testProduct.id}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'OUT_OF_STOCK' });
      expect(invalidRes.status).toBe(400);
    });

    it('12. should allow re-approving a rejected product (REJECTED -> ACTIVE)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/products/${testProduct.id}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'ACTIVE',
          reason: 'Seller submitted APMC mandi quality certificate',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACTIVE');
    });
  });

  // ===========================================================================
  // 5. ORDERS, PAYMENTS, LOGISTICS VISIBILITY
  // ===========================================================================

  describe('Orders, Payments, and Shipments Visibility', () => {
    it('13. should inspect orders and order details', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/admin/orders?status=CONFIRMED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/admin/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.orderNumber).toBe('ORD-TEST-1001');
      expect(detailRes.body.items.length).toBe(1);
      expect(detailRes.body.payment.status).toBe('COMPLETED');
      expect(detailRes.body.shipment.trackingNumber).toBe('TRK-999888');
    });

    it('14. should inspect payments with safe projections (no secrets)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/payments?status=COMPLETED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const payment = res.body.data[0];
      expect(payment).toHaveProperty('id');
      expect(payment).toHaveProperty('amount');
      expect(payment).toHaveProperty('status');
      expect(payment).toHaveProperty('providerReference');
      expect(payment.secret).toBeUndefined();
      expect(payment.apiKey).toBeUndefined();
    });

    it('15. should inspect shipments and tracking timeline', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/shipments?provider=MOCK_LOGISTICS')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const shipment = res.body.data[0];
      expect(shipment.trackingNumber).toBe('TRK-999888');
      expect(shipment.events.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // 6. REPORT / MODERATION WORKFLOW & AUDIT TRAIL
  // ===========================================================================

  describe('Reports & Audit Logging', () => {
    let reportId: string;

    it('16. should allow authenticated user to submit a moderation report and admin to review it', async () => {
      // 1. Buyer files report
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          targetType: 'PRODUCT',
          targetId: testProduct.id,
          reason: 'Suspicious origin claim',
          description: 'Seller claims Nashik origin but shipping address is Gujarat',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toHaveProperty('id');
      expect(createRes.body.status).toBe('OPEN');
      reportId = createRes.body.id;

      // 2. Admin views report queue
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/admin/reports?status=OPEN')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      const found = listRes.body.data.find((r: any) => r.id === reportId);
      expect(found).toBeDefined();

      // 3. Admin reviews and resolves report
      const reviewRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'RESOLVED',
          resolutionNotes: 'Verified seller logistics routing note via Thane hub; genuine Nashik origin confirmed.',
        });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.status).toBe('RESOLVED');
      expect(reviewRes.body.reviewedBy.id).toBe(adminUser.id);

      // 4. Verify audit log captures the report resolution with authenticated admin ID
      const auditRes = await request(app.getHttpServer())
        .get(`/api/v1/admin/audit-logs?entityType=REPORT&entityId=${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.length).toBe(1);
      expect(auditRes.body.data[0].actorUserId).toBe(adminUser.id);
      expect(auditRes.body.data[0].action).toBe('REPORT_RESOLUTION');
    });

    it('17. should reject reports against nonexistent targets, private order probing, and duplicate spam', async () => {
      // 1. Nonexistent USER
      const fakeUserRes = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          targetType: 'USER',
          targetId: '00000000-0000-0000-0000-000000000000',
          reason: 'Fake user profile',
        });
      expect(fakeUserRes.status).toBe(404);

      // 2. Nonexistent PRODUCT
      const fakeProductRes = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          targetType: 'PRODUCT',
          targetId: '00000000-0000-0000-0000-000000000000',
          reason: 'Fake product listing',
        });
      expect(fakeProductRes.status).toBe(404);

      // 3. Nonexistent SELLER
      const fakeSellerRes = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          targetType: 'SELLER',
          targetId: '00000000-0000-0000-0000-000000000000',
          reason: 'Fake seller profile',
        });
      expect(fakeSellerRes.status).toBe(404);

      // 4. Nonexistent ORDER
      const fakeOrderRes = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          targetType: 'ORDER',
          targetId: '00000000-0000-0000-0000-000000000000',
          reason: 'Fake order report',
        });
      expect(fakeOrderRes.status).toBe(404);

      // 5. Private ORDER probing: A third-party farmer attempting to probe or report an order they are not party to
      const thirdParty = await prisma.user.create({
        data: {
          email: 'thirdparty-prober@farmer.com',
          passwordHash: await argon2.hash('TempPassword123!'),
          role: 'FARMER',
          status: 'ACTIVE',
        },
      });
      const thirdPartyToken = jwtService.sign({ sub: thirdParty.id, role: thirdParty.role });

      const probeRes = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${thirdPartyToken}`)
        .send({
          targetType: 'ORDER',
          targetId: testOrder.id,
          reason: 'Probing private order',
        });
      expect(probeRes.status).toBe(404);

      // 6. Duplicate open report prevention
      const firstRes = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          targetType: 'PRODUCT',
          targetId: testProduct.id,
          reason: 'Initial report for duplicate test',
        });
      expect(firstRes.status).toBe(201);

      const dupRes = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          targetType: 'PRODUCT',
          targetId: testProduct.id,
          reason: 'Duplicate filing attempt',
        });
      expect(dupRes.status).toBe(409);
    });

    it('18. should preserve historical audit log records when an actor user is deleted (SET NULL)', async () => {
      // 1. Create a temporary admin user
      const tempAdmin = await prisma.user.create({
        data: {
          email: 'deletable-admin@test.com',
          passwordHash: await argon2.hash('TempPassword123!'),
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      // 2. Create an audit log record with this admin as actor
      const log = await prisma.auditLog.create({
        data: {
          actorUserId: tempAdmin.id,
          action: 'HISTORICAL_ACTION_TEST',
          entityType: 'PLATFORM_POLICY',
          entityId: 'POL-001',
          reason: 'Testing audit survival on user deletion',
        },
      });
      expect(log.actorUserId).toBe(tempAdmin.id);

      // 3. Delete the admin user
      await prisma.user.delete({ where: { id: tempAdmin.id } });

      // 4. Verify the audit log record STILL EXISTS and was NOT cascade-deleted
      const survivingLog = await prisma.auditLog.findUnique({
        where: { id: log.id },
      });
      expect(survivingLog).toBeDefined();
      expect(survivingLog?.actorUserId).toBeNull();
      expect(survivingLog?.action).toBe('HISTORICAL_ACTION_TEST');
      expect(survivingLog?.reason).toBe('Testing audit survival on user deletion');
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.auditLog.deleteMany();
      await prisma.moderationReport.deleteMany();
      await prisma.cartItem.deleteMany();
      await prisma.orderItem.deleteMany();
      await prisma.review.deleteMany();
      await prisma.payment.deleteMany();
      await prisma.shipmentTrackingEvent.deleteMany();
      await prisma.shipment.deleteMany();
      await prisma.order.deleteMany();
      await prisma.productImage.deleteMany();
      await prisma.inventory.deleteMany();
      await prisma.product.deleteMany();
      await prisma.category.deleteMany();
      await prisma.address.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.sellerProfile.deleteMany();
      await prisma.buyerProfile.deleteMany();
      await prisma.user.deleteMany();
    }
    if (app) {
      await app.close();
    }
  });
});

