import { PrismaClient } from '../apps/api/node_modules/@prisma/client/default.js';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, mobile: true, role: true, status: true }
  });
  console.log('Total users:', users.length);
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
