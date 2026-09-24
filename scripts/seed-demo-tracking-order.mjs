import { PrismaClient, OrderStatus, ShipmentStatus, PaymentStatus } from '../apps/api/node_modules/@prisma/client/default.js';

const prisma = new PrismaClient();

async function main() {
  const buyerUser = await prisma.user.findUnique({
    where: { email: 'demobuyer@sih26033.org' },
    include: { buyerProfile: true },
  });

  const sellerUser = await prisma.user.findUnique({
    where: { email: 'demo.producer@sih26033.org' },
    include: { sellerProfile: true },
  });

  if (!buyerUser?.buyerProfile || !sellerUser?.sellerProfile) {
    console.error('Buyer or seller profile not found');
    return;
  }

  // Ensure seller has farmLocation
  await prisma.sellerProfile.update({
    where: { id: sellerUser.sellerProfile.id },
    data: {
      businessName: 'Sahyadri Farmers Producer Collective',
      farmLocation: 'Lasalgaon, Nashik',
    },
  });

  const product = await prisma.product.findFirst({
    where: { sellerId: sellerUser.sellerProfile.id },
  }) || await prisma.product.findFirst();

  const orderNumber = `ORD-AGRI-${Date.now().toString().slice(-6)}`;

  // Create active shipment order
  const order = await prisma.order.create({
    data: {
      orderNumber,
      buyerId: buyerUser.buyerProfile.id,
      sellerId: sellerUser.sellerProfile.id,
      status: OrderStatus.IN_TRANSIT,
      totalAmount: 145000,
      paymentStatus: PaymentStatus.CONFIRMED,
      shippingAddressSnapshot: {
        name: 'Maharashtra State Warehousing Terminal',
        phone: '9898000001',
        addressLine: 'Sector 19, APMC Grain & Onion Complex',
        city: 'Vashi',
        district: 'Thane',
        state: 'Maharashtra',
        pincode: '400705',
        country: 'India',
      },
      items: {
        create: [
          {
            productId: product?.id,
            quantity: 50,
            unitPrice: 2900,
            totalPrice: 145000,
          },
        ],
      },
      shipment: {
        create: {
          provider: 'Aroha Freight Express Network',
          trackingNumber: 'TRK-IN-AGR-8842',
          status: ShipmentStatus.IN_TRANSIT,
          estimatedDeliveryAt: new Date(Date.now() + 24 * 3600 * 1000),
          shippedAt: new Date(Date.now() - 4 * 3600 * 1000),
          events: {
            create: [
              {
                status: ShipmentStatus.CREATED,
                location: 'Lasalgaon Mandi Yard Gate 2',
                message: 'Consignment manifest generated & weighbridge calibrated',
                occurredAt: new Date(Date.now() - 5 * 3600 * 1000),
              },
              {
                status: ShipmentStatus.PICKED_UP,
                location: 'Nashik Aggregation Cold Hub',
                message: 'Lot quality certified, loaded on 16-wheel climate container',
                occurredAt: new Date(Date.now() - 3 * 3600 * 1000),
              },
              {
                status: ShipmentStatus.IN_TRANSIT,
                location: 'Samruddhi Mahamarg Checkpoint 4 (Igatpuri)',
                message: 'Toll barrier cleared, average speed 58 km/h. On schedule.',
                occurredAt: new Date(Date.now() - 1 * 3600 * 1000),
              },
            ],
          },
        },
      },
    },
    include: {
      shipment: { include: { events: true } },
    },
  });

  console.log('Successfully created demo test order:');
  console.log(`Order ID: ${order.id}`);
  console.log(`Order Number: ${order.orderNumber}`);
  console.log(`Shipment Tracking: ${order.shipment?.trackingNumber}`);
  console.log(`URL to test: http://localhost:3000/orders/${order.id}`);
}

main().finally(() => prisma.$disconnect());
