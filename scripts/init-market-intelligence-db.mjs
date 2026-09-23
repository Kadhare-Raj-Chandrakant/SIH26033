#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '../apps/api/node_modules/@prisma/client/default.js';

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  
  function parseLine(line) {
    const values = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (c === ',' && !inQuote) {
        values.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    values.push(cur.trim());
    return values;
  }

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] !== undefined ? vals[idx] : '';
    });
    rows.push(row);
  }
  return rows;
}

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing Market Intelligence database foundations...');

  // 1. Database schema migration: Add district to Address if not exists
  console.log('1. Verifying Address table schema...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "district" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Address_state_district_idx" ON "Address"("state", "district");
  `);
  console.log('✓ Address table updated with district column and composite index.');

  // 2. Seed registered addresses for demo users
  console.log('2. Seeding registered addresses for demo accounts...');
  const demoAddresses = [
    {
      email: 'farmer1_demo@sih26033.org',
      name: 'Ramesh Patel (Farm Gate)',
      phone: '+91 98230 11223',
      addressLine: 'Plot 42, Dindori Road Agro Cluster',
      city: 'Nashik',
      district: 'Nashik',
      state: 'Maharashtra',
      pincode: '422003',
      type: 'FARM',
    },
    {
      email: 'farmer@example.com',
      name: 'Super Green Farm HQ',
      phone: '+91 98110 33445',
      addressLine: 'Village Alipur, GT Karnal Road',
      city: 'Delhi',
      district: 'North Delhi',
      state: 'Delhi',
      pincode: '110036',
      type: 'FARM',
    },
    {
      email: 'sahyadri.fpo@example.com',
      name: 'Sahyadri Farmers Producer Central Facility',
      phone: '+91 94222 55667',
      addressLine: 'Mohadi Upnagar, Adgaon Shivar',
      city: 'Nashik',
      district: 'Nashik',
      state: 'Maharashtra',
      pincode: '422003',
      type: 'BUSINESS',
    },
    {
      email: 'fpo_demo@sih26033.org',
      name: 'Maharashtra Agro Producer Hub',
      phone: '+91 98500 77889',
      addressLine: 'Market Yard, Gultekdi Complex',
      city: 'Pune',
      district: 'Pune',
      state: 'Maharashtra',
      pincode: '411037',
      type: 'BUSINESS',
    },
    {
      email: 'fpo@example.com',
      name: 'United Farmers Producer Central Office',
      phone: '+91 99100 88990',
      addressLine: 'Narela Mandi Complex',
      city: 'Delhi',
      district: 'North Delhi',
      state: 'Delhi',
      pincode: '110040',
      type: 'BUSINESS',
    },
    {
      email: 'demobuyer@sih26033.org',
      name: 'Demo Buyer Central Sourcing',
      phone: '+91 98200 44556',
      addressLine: 'APMC Sector 19, Vashi',
      city: 'Mumbai',
      district: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400703',
      type: 'BUSINESS',
    },
    {
      email: 'buyer@example.com',
      name: 'Reliance Fresh Institutional Depot',
      phone: '+91 98210 66778',
      addressLine: 'Bandra Kurla Complex, Commercial Depot',
      city: 'Mumbai',
      district: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400051',
      type: 'BUSINESS',
    },
  ];

  for (const addr of demoAddresses) {
    const user = await prisma.user.findUnique({ where: { email: addr.email } });
    if (!user) {
      console.log(`  User ${addr.email} not found, skipping address.`);
      continue;
    }

    // Upsert primary address
    const existing = await prisma.address.findFirst({
      where: { userId: user.id },
    });

    if (existing) {
      await prisma.address.update({
        where: { id: existing.id },
        data: {
          name: addr.name,
          phone: addr.phone,
          addressLine: addr.addressLine,
          city: addr.city,
          district: addr.district,
          state: addr.state,
          pincode: addr.pincode,
          type: addr.type,
          isDefault: true,
        },
      });
      console.log(`  ✓ Updated registered address for ${addr.email} (${addr.district}, ${addr.state})`);
    } else {
      await prisma.address.create({
        data: {
          userId: user.id,
          name: addr.name,
          phone: addr.phone,
          addressLine: addr.addressLine,
          city: addr.city,
          district: addr.district,
          state: addr.state,
          pincode: addr.pincode,
          type: addr.type,
          isDefault: true,
        },
      });
      console.log(`  ✓ Created registered address for ${addr.email} (${addr.district}, ${addr.state})`);
    }
  }

  // 3. Ingest the 36 frozen bulk RFQs
  console.log('3. Ingesting 36 frozen bulk RFQs from fpo_bulk_rfq_demo_dataset_v3.csv...');
  const csvPath = path.resolve('apps/api/src/ai/data/fpo_bulk_rfq_demo_dataset_v3.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Dataset not found at ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const records = parseCsv(csvContent);

  // Get or create a default buyer user for synthetic RFQs
  let institutionalBuyer = await prisma.user.findFirst({
    where: { role: 'BUYER' },
  });

  if (!institutionalBuyer) {
    institutionalBuyer = await prisma.user.create({
      data: {
        email: 'institutional.procurement@sih26033.org',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
        name: 'National Institutional Procurement Network',
        role: 'BUYER',
      },
    });
  }

  // Find Sahyadri, United, and Maharashtra Agro FPOs to link as default/capable FPOs
  const fpos = await prisma.fpoOrganization.findMany();
  const fpoMap = new Map(fpos.map((f) => [f.name.toLowerCase(), f.id]));
  const defaultFpoId = fpos[0]?.id;

  let seededCount = 0;
  for (const row of records) {
    const rfqId = row.rfq_id;
    const commodity = row.commodity;
    const requiredQuantity = parseFloat(row.required_quantity);
    const targetPrice = parseFloat(row.target_price_inr_per_quintal);
    const deliveryCity = row.delivery_city;
    const maxDistanceKm = parseInt(row.max_distance_km, 10);
    const qualityReqs = row.quality_requirements;
    const notes = `[${rfqId}] Buyer: ${row.buyer_name} (${row.buyer_type}). ${row.notes}`;
    const expiresAt = new Date(row.expires_at || Date.now() + 14 * 24 * 3600 * 1000);

    // Map commodity to capable FPO
    let assignedFpoId = defaultFpoId;
    if (['tomato', 'onion', 'potato'].includes(commodity.toLowerCase())) {
      assignedFpoId = fpoMap.get('sahyadri farmers producer co.') || defaultFpoId;
    } else if (['wheat', 'rice', 'mustard'].includes(commodity.toLowerCase())) {
      assignedFpoId = fpoMap.get('united farmers producer co.') || defaultFpoId;
    } else if (['soybean', 'cotton', 'turmeric'].includes(commodity.toLowerCase())) {
      assignedFpoId = fpoMap.get('maharashtra agro producer co.') || defaultFpoId;
    }

    if (!assignedFpoId) {
      console.warn(`No FPO found for ${commodity}, skipping RFQ ${rfqId}`);
      continue;
    }

    // Check if buy request with this note prefix already exists
    const existingReq = await prisma.fpoBuyRequest.findFirst({
      where: {
        fpoId: assignedFpoId,
        commodity: { equals: commodity, mode: 'insensitive' },
        notes: { startsWith: `[${rfqId}]` },
      },
    });

    if (existingReq) {
      await prisma.fpoBuyRequest.update({
        where: { id: existingReq.id },
        data: {
          requiredQuantity,
          targetPrice,
          deliveryCity,
          maxDistanceKm,
          qualityRequirements: qualityReqs,
          notes,
          expiresAt,
          status: 'OPEN',
        },
      });
    } else {
      await prisma.fpoBuyRequest.create({
        data: {
          fpoId: assignedFpoId,
          buyerId: institutionalBuyer.id,
          commodity,
          requiredQuantity,
          targetPrice,
          deliveryCity,
          maxDistanceKm,
          qualityRequirements: qualityReqs,
          notes,
          expiresAt,
          status: 'OPEN',
        },
      });
      seededCount++;
    }
  }

  console.log(`✓ Processed ${records.length} bulk RFQs (created ${seededCount} new, updated existing).`);
  console.log('✅ Market Intelligence database initialization complete!');
}

main()
  .catch((e) => {
    console.error('Initialization error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
