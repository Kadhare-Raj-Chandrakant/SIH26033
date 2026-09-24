import { PrismaClient } from '../apps/api/node_modules/@prisma/client/default.js';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding district column if not exists...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "district" TEXT;`);
    console.log('Column added or already exists!');

    // Also check index
    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Address_state_district_idx" ON "Address"("state", "district");`);
      console.log('Index created!');
    } catch (e) {
      console.log('Index creation notice:', e.message);
    }

    const user = await prisma.user.findUnique({
      where: { email: 'demobuyer@sih26033.org' }
    });
    console.log('User found:', user?.id, user?.email);

    console.log('Trying prisma.address.findMany...');
    const addresses = await prisma.address.findMany({
      where: { userId: user.id }
    });
    console.log('Addresses count:', addresses.length);
    console.log('Addresses:', addresses);

  } catch (err) {
    console.error('PRISMA ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
