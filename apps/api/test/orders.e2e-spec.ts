import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Category, Product, ProductStatus, Address, OrderStatus } from '@prisma/client';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

describe('OrdersController & Purchasing Workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let buyer1Token: string;
  let buyer1Id: string;
  let buyer2Token: string;
  let buyer2Id: string;
  let farmer1Token: string;
  let farmer1SellerId: string;
  let farmer2Token: string;
  let farmer2SellerId: string;

  let testCategory: Category;
  let prodTomato: Product;
  let prodWheat: Product;
  let prodLimitedStock: Product;

  let buyer1Address: Address;
  let buyer2Address: Address;

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

    // Clean up
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
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await argon2.hash('SecretPass123!');

    // Create Category
    testCategory = await prisma.category.create({
      data: { name: 'Agriculture Grains & Veggies', slug: 'agri-grains-veggies' },
    });

    // Create Farmer 1
    const farmer1 = await prisma.user.create({
      data: {
        email: 'farmer1_orders_e2e@example.com',
        mobile: '9860000001',
        passwordHash,
        role: 'FARMER',
        sellerProfile: {
          create: {
            sellerType: 'FARMER',
            businessName: 'Nashik Organic Farms',
            farmLocation: 'Nashik, MH',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { sellerProfile: true },
    });
    farmer1SellerId = farmer1.sellerProfile!.id;
    farmer1Token = jwtService.sign({ sub: farmer1.id, role: farmer1.role });

    // Create Farmer 2 (Second seller for multi-seller testing)
    const farmer2 = await prisma.user.create({
      data: {
        email: 'farmer2_orders_e2e@example.com',
        mobile: '9860000002',
        passwordHash,
        role: 'FPO',
        sellerProfile: {
          create: {
            sellerType: 'FPO',
            businessName: 'Punjab Grain Producers Co-op',
            farmLocation: 'Ludhiana, PB',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { sellerProfile: true },
    });
    farmer2SellerId = farmer2.sellerProfile!.id;
    farmer2Token = jwtService.sign({ sub: farmer2.id, role: farmer2.role });

    // Create Buyer 1
    const buyer1 = await prisma.user.create({
      data: {
        email: 'buyer1_orders_e2e@example.com',
        mobile: '9860000003',
        passwordHash,
        role: 'BUYER',
        buyerProfile: {
          create: {
            businessName: 'Fresh Mart Retails',
            buyerType: 'BUSINESS',
          },
        },
      },
      include: { buyerProfile: true },
    });
    buyer1Id = buyer1.id;
    buyer1Token = jwtService.sign({ sub: buyer1.id, role: buyer1.role });

    // Create Buyer 2
    const buyer2 = await prisma.user.create({
      data: {
        email: 'buyer2_orders_e2e@example.com',
        mobile: '9860000004',
        passwordHash,
        role: 'BUYER',
        buyerProfile: {
          create: {
            businessName: 'Daily Needs Consumer',
            buyerType: 'INDIVIDUAL',
          },
        },
      },
      include: { buyerProfile: true },
    });
    buyer2Id = buyer2.id;
    buyer2Token = jwtService.sign({ sub: buyer2.id, role: buyer2.role });

    // Create Shipping Address for Buyer 1
    buyer1Address = await prisma.address.create({
      data: {
        userId: buyer1Id,
        name: 'Warehouse Receiving Bay 4',
        phone: '+919860000003',
        addressLine: 'Plot 45, APMC Market Yard',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411037',
        country: 'India',
        isDefault: true,
      },
    });

    // Create Shipping Address for Buyer 2
    buyer2Address = await prisma.address.create({
      data: {
        userId: buyer2Id,
        name: 'John Resident',
        phone: '+919860000004',
        addressLine: 'Flat 302, Palm Residency',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India',
        isDefault: true,
      },
    });

    // Create Products
    // Product 1 from Farmer 1: Tomatoes (₹50/kg, 100 kg available)
    prodTomato = await prisma.product.create({
      data: {
        sellerId: farmer1SellerId,
        categoryId: testCategory.id,
        name: 'Organic Vine Tomatoes',
        description: 'Vine ripened organic tomatoes',
        price: 50.0,
        unit: 'KG',
        status: ProductStatus.ACTIVE,
        inventory: {
          create: {
            availableQuantity: 100,
            reservedQuantity: 0,
          },
        },
        images: {
          create: {
            url: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337',
            cloudinaryId: 'c_tomatoes',
            isPrimary: true,
          },
        },
      },
    });

    // Product 2 from Farmer 2: Wheat (₹30/kg, 200 kg available)
    prodWheat = await prisma.product.create({
      data: {
        sellerId: farmer2SellerId,
        categoryId: testCategory.id,
        name: 'Sharbati Golden Wheat',
        description: 'Premium Sharbati wheat grain',
        price: 30.0,
        unit: 'KG',
        status: ProductStatus.ACTIVE,
        inventory: {
          create: {
            availableQuantity: 200,
            reservedQuantity: 0,
          },
        },
      },
    });

    // Product 3 from Farmer 1: Limited Stock (₹100/box, exactly 1 available for concurrency race)
    prodLimitedStock = await prisma.product.create({
      data: {
        sellerId: farmer1SellerId,
        categoryId: testCategory.id,
        name: 'Exotic Saffron Box',
        description: 'Limited edition saffron',
        price: 500.0,
        unit: 'BOX',
        status: ProductStatus.ACTIVE,
        inventory: {
          create: {
            availableQuantity: 1,
            reservedQuantity: 0,
          },
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Address Management & Validation', () => {
    it('1.1 should list addresses for authenticated buyer', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(buyer1Address.id);
      expect(res.body.data[0].city).toBe('Pune');
    });

    it('1.2 should create a new address for authenticated buyer', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({
          name: 'Branch Office',
          phone: '+919860000099',
          addressLine: 'Sector 17, Vashi',
          city: 'Navi Mumbai',
          state: 'Maharashtra',
          pincode: '400703',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.city).toBe('Navi Mumbai');
    });
  });

  describe('2. Order Creation & Snapshots', () => {
    it('2.1 should reject order creation if cart is empty', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ addressId: buyer1Address.id })
        .expect(400);

      expect(res.body.message).toContain('cart is empty');
    });

    it('2.2 should reject order creation if address does not belong to buyer (IDOR)', async () => {
      // Add item to cart first
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: prodTomato.id, quantity: 10 })
        .expect(201);

      // Attempt checkout using Buyer 2 address
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ addressId: buyer2Address.id })
        .expect(400);

      expect(res.body.message).toContain('Shipping address not found or does not belong to buyer');
    });

    let _createdOrderId: string;

    it('2.3 should successfully create order with price & address snapshots and clear cart', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ addressId: buyer1Address.id })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.orders.length).toBe(1);

      const order = res.body.data.orders[0];
      _createdOrderId = order.id;

      expect(order.orderNumber).toMatch(/^ORD-/);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.totalAmount).toBe(500); // 10 kg * ₹50 = 500
      expect(order.items.length).toBe(1);
      expect(order.items[0].quantity).toBe(10);
      expect(order.items[0].unitPrice).toBe(50);
      expect(order.items[0].totalPrice).toBe(500);

      // Verify immutable shipping address snapshot
      expect(order.shippingAddressSnapshot).toBeDefined();
      expect(order.shippingAddressSnapshot.name).toBe(buyer1Address.name);
      expect(order.shippingAddressSnapshot.city).toBe('Pune');
      expect(order.shippingAddressSnapshot.pincode).toBe('411037');

      // Verify inventory reservation: available decreased by 10, reserved increased by 10
      const inventory = await prisma.inventory.findUnique({
        where: { productId: prodTomato.id },
      });
      expect(inventory!.availableQuantity.toNumber()).toBe(90);
      expect(inventory!.reservedQuantity.toNumber()).toBe(10);

      // Verify buyer cart is cleared
      const cartRes = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(200);

      expect(cartRes.body.data.itemCount).toBe(0);
    });

    it('2.4 price manipulation immunity: order uses DB price, client cannot inject price', async () => {
      // Add wheat to cart
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: prodWheat.id, quantity: 5 })
        .expect(201);

      // 1. Attempt to inject price/total in order payload is rejected by ValidationPipe
      const rejectRes = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({
          addressId: buyer1Address.id,
          price: 1.0,
          totalAmount: 5.0,
        } as any)
        .expect(400);

      expect(rejectRes.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('should not exist')]),
      );

      // 2. Legitimate order checkout reads authoritative DB price (5 * ₹30 = ₹150)
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ addressId: buyer1Address.id })
        .expect(201);

      const order = res.body.data.orders[0];
      expect(order.totalAmount).toBe(150); // 5 * ₹30 = 150 (authoritative DB price)
      expect(order.items[0].unitPrice).toBe(30);
    });
  });

  describe('3. Multi-Seller Checkout Transaction', () => {
    it('3.1 should partition multi-seller cart into vendor-scoped orders within one transaction', async () => {
      // Buyer 1 adds 4 kg Tomatoes (Farmer 1) and 10 kg Wheat (Farmer 2)
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: prodTomato.id, quantity: 4 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: prodWheat.id, quantity: 10 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ addressId: buyer1Address.id })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(2); // Two vendor-scoped orders created!
      expect(res.body.data.orders.length).toBe(2);

      const order1 = res.body.data.orders.find((o: any) => o.sellerId === farmer1SellerId);
      const order2 = res.body.data.orders.find((o: any) => o.sellerId === farmer2SellerId);

      expect(order1).toBeDefined();
      expect(order1.items[0].productId).toBe(prodTomato.id);
      expect(order1.totalAmount).toBe(200); // 4 * 50 = 200

      expect(order2).toBeDefined();
      expect(order2.items[0].productId).toBe(prodWheat.id);
      expect(order2.totalAmount).toBe(300); // 10 * 30 = 300

      expect(res.body.data.totalAmount).toBe(500); // 200 + 300
    });
  });

  describe('4. Buyer Order History & Detail (IDOR Protection)', () => {
    let testOrder: any;

    beforeAll(async () => {
      const ordersRes = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(200);

      testOrder = ordersRes.body.data.orders[0];
    });

    it('4.1 should retrieve paginated order history for authenticated buyer', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/orders?page=1&limit=5')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.meta.page).toBe(1);
      expect(res.body.data.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('4.2 Buyer 2 cannot view Buyer 1 order history', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${buyer2Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.orders.length).toBe(0); // Buyer 2 has not placed orders yet
    });

    it('4.3 Buyer 1 can view own single order detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testOrder.id);
      expect(res.body.data.shippingAddressSnapshot).toBeDefined();
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.seller).toBeDefined();
    });

    it('4.4 Buyer 2 cannot view Buyer 1 order detail (IDOR Protection)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${buyer2Token}`)
        .expect(404);

      expect(res.body.message).toContain('Order not found or does not belong to you');
    });
  });

  describe('5. Seller Order Visibility Scoping', () => {
    it('5.1 Farmer 1 can only see orders containing Farmer 1 products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/seller/orders')
        .set('Authorization', `Bearer ${farmer1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);

      // Verify every order belongs to Farmer 1
      for (const order of res.body.data.orders) {
        for (const item of order.items) {
          expect(item.productId).not.toBe(prodWheat.id); // Wheat belongs to Farmer 2
        }
      }

      // Verify buyer password and sensitive info are NOT leaked
      expect(res.body.data.orders[0].buyer.passwordHash).toBeUndefined();
    });

    it('5.2 Farmer 2 can only see orders containing Farmer 2 products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/seller/orders')
        .set('Authorization', `Bearer ${farmer2Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);

      // Verify every order belongs to Farmer 2
      for (const order of res.body.data.orders) {
        for (const item of order.items) {
          expect(item.productId).toBe(prodWheat.id);
          expect(item.productId).not.toBe(prodTomato.id); // Tomato belongs to Farmer 1
        }
      }
    });

    it('5.3 Buyer cannot access seller orders endpoint (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/seller/orders')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(403);
    });
  });

  describe('6. Order Cancellation & Inventory Restoration', () => {
    let orderToCancelId: string;

    beforeAll(async () => {
      // Place a fresh order with 5 kg Tomatoes to cancel
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: prodTomato.id, quantity: 5 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ addressId: buyer1Address.id })
        .expect(201);

      orderToCancelId = res.body.data.orders[0].id;
    });

    it('6.1 Buyer 2 cannot cancel Buyer 1 order (IDOR Protection)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderToCancelId}/cancel`)
        .set('Authorization', `Bearer ${buyer2Token}`)
        .expect(404);

      expect(res.body.message).toContain('Order not found or does not belong to you');
    });

    it('6.2 Buyer 1 can cancel PENDING order and restore inventory atomically', async () => {
      // Record stock before cancel
      const beforeInv = await prisma.inventory.findUnique({
        where: { productId: prodTomato.id },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderToCancelId}/cancel`)
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(OrderStatus.CANCELLED);

      // Verify inventory restoration: available increased by 5, reserved decreased by 5
      const afterInv = await prisma.inventory.findUnique({
        where: { productId: prodTomato.id },
      });

      expect(afterInv!.availableQuantity.toNumber()).toBe(
        beforeInv!.availableQuantity.toNumber() + 5,
      );
      expect(afterInv!.reservedQuantity.toNumber()).toBe(
        beforeInv!.reservedQuantity.toNumber() - 5,
      );
    });

    it('6.3 Duplicate cancellation attempt should be rejected safely', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderToCancelId}/cancel`)
        .set('Authorization', `Bearer ${buyer1Token}`)
        .expect(400);

      expect(res.body.message).toContain('cannot be cancelled in status CANCELLED');
    });
  });

  describe('7. Concurrency & Integrity (Overselling Race Condition)', () => {
    it('7.1 two buyers racing for the last 1 stock unit: only one succeeds, other fails safely', async () => {
      // Verify prodLimitedStock has exactly 1 available stock
      const initialStock = await prisma.inventory.findUnique({
        where: { productId: prodLimitedStock.id },
      });
      expect(initialStock!.availableQuantity.toNumber()).toBe(1);

      // Buyer 1 adds 1 saffron box to cart
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: prodLimitedStock.id, quantity: 1 })
        .expect(201);

      // Buyer 2 adds 1 saffron box to cart
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer2Token}`)
        .send({ productId: prodLimitedStock.id, quantity: 1 })
        .expect(201);

      // Fire simultaneous checkout requests for Buyer 1 and Buyer 2
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${buyer1Token}`)
          .send({ addressId: buyer1Address.id }),
        request(app.getHttpServer())
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${buyer2Token}`)
          .send({ addressId: buyer2Address.id }),
      ]);

      const statusCodes = [res1.status, res2.status];
      expect(statusCodes).toContain(201); // Exactly one succeeded
      expect(statusCodes).toContain(400); // Exactly one failed safely

      const failedRes = res1.status === 400 ? res1 : res2;
      expect(failedRes.body.message).toContain('Insufficient available stock');

      // Final inventory check: available must be exactly 0, reserved must be 1. Never negative!
      const finalStock = await prisma.inventory.findUnique({
        where: { productId: prodLimitedStock.id },
      });
      expect(finalStock!.availableQuantity.toNumber()).toBe(0);
      expect(finalStock!.reservedQuantity.toNumber()).toBe(1);
    });
  });
});
