import { PrismaClient } from '../apps/api/node_modules/@prisma/client/default.js';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    take: 5,
    include: {
      shipment: true,
      seller: true,
      buyer: { include: { user: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('Orders found:', orders.length);
  for (const o of orders) {
    console.log({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      buyerEmail: o.buyer?.user?.email,
      sellerFarm: o.seller?.farmLocation,
      shipmentStatus: o.shipment?.status,
      trackingNumber: o.shipment?.trackingNumber,
    });
  }
}

main().finally(() => prisma.$disconnect());
