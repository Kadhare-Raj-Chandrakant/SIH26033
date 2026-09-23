import { PrismaClient } from '../apps/api/node_modules/@prisma/client/default.js';

const prisma = new PrismaClient();

// Genuine Argon2id hash for 'Password@123'
const VALID_HASH = '$argon2id$v=19$m=65536,t=3,p=4$w+GAIx9h5d1WapN51j0wGg$5OjfqaNIDyc2/vMdspJpViI9PRvqEtDIDILV/CXNBvw';

async function main() {
  console.log('Synchronizing authentic Argon2 password hashes for demo users...');

  // 1. Ensure Buyer demo user exists
  const buyer = await prisma.user.upsert({
    where: { email: 'demobuyer@sih26033.org' },
    update: {
      passwordHash: VALID_HASH,
      role: 'BUYER',
      status: 'ACTIVE',
    },
    create: {
      email: 'demobuyer@sih26033.org',
      passwordHash: VALID_HASH,
      role: 'BUYER',
      mobile: '9898000001',
      status: 'ACTIVE',
      buyerProfile: {
        create: {
          businessName: 'Demo Verified Buyer',
        },
      },
    },
  });
  console.log('✓ Buyer demo user ready:', buyer.email);

  // 2. Ensure Farmer demo user exists
  const farmer = await prisma.user.upsert({
    where: { email: 'farmer1_demo@sih26033.org' },
    update: {
      passwordHash: VALID_HASH,
      role: 'FARMER',
      status: 'ACTIVE',
    },
    create: {
      email: 'farmer1_demo@sih26033.org',
      passwordHash: VALID_HASH,
      role: 'FARMER',
      mobile: '9898000002',
      status: 'ACTIVE',
      sellerProfile: {
        create: {
          sellerType: 'FARMER',
          businessName: 'Ramesh Farmer (Demo)',
          farmLocation: 'Nashik, Maharashtra',
          verificationStatus: 'VERIFIED',
        },
      },
    },
  });
  console.log('✓ Farmer demo user ready:', farmer.email);

  // 3. Ensure FPO demo user exists
  const fpo = await prisma.user.upsert({
    where: { email: 'fpo_demo@sih26033.org' },
    update: {
      passwordHash: VALID_HASH,
      role: 'FPO',
      status: 'ACTIVE',
    },
    create: {
      email: 'fpo_demo@sih26033.org',
      passwordHash: VALID_HASH,
      role: 'FPO',
      mobile: '9898000003',
      status: 'ACTIVE',
      sellerProfile: {
        create: {
          sellerType: 'FPO',
          businessName: 'Maharashtra Agro FPO (Demo)',
          farmLocation: 'Pune, Maharashtra',
          verificationStatus: 'VERIFIED',
        },
      },
    },
  });
  console.log('✓ FPO demo user ready:', fpo.email);

  // Also update other standard test emails if present
  const standardUsers = ['farmer@example.com', 'fpo@example.com', 'sahyadri.fpo@example.com'];
  for (const email of standardUsers) {
    await prisma.user.updateMany({
      where: { email },
      data: { passwordHash: VALID_HASH },
    });
  }
  console.log('✓ Standard test users password hashes aligned to Password@123');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
