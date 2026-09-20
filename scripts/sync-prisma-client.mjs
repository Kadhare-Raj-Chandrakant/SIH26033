import fs from 'fs';
import path from 'path';

const prismaClientSrc = path.resolve('apps/api/node_modules/.prisma/client');
const prismaClientDest = path.resolve('node_modules/.prisma/client');

const atPrismaClientSrc = path.resolve('apps/api/node_modules/@prisma/client');
const atPrismaClientDest = path.resolve('node_modules/@prisma/client');

if (fs.existsSync(prismaClientSrc)) {
  fs.mkdirSync(path.dirname(prismaClientDest), { recursive: true });
  fs.cpSync(prismaClientSrc, prismaClientDest, { recursive: true, force: true });
  console.log('✓ Synced .prisma/client from apps/api to root node_modules');
}

if (fs.existsSync(atPrismaClientSrc)) {
  fs.mkdirSync(path.dirname(atPrismaClientDest), { recursive: true });
  fs.cpSync(atPrismaClientSrc, atPrismaClientDest, { recursive: true, force: true });
  console.log('✓ Synced @prisma/client from apps/api to root node_modules');
}
