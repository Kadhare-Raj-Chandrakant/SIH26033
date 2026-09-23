#!/usr/bin/env node

/**
 * ==============================================================================
 * SIH26033 — FPO Organizations & Aggregation Seeder
 * ==============================================================================
 * Seeds the accredited Farmer Producer Organisations (FPOs) into PostgreSQL,
 * ensuring they appear on `/fpo` and `/fpo/[id]` with verified memberships,
 * active crop commitments, and aggregated lots.
 * ==============================================================================
 */

import { PrismaClient } from '../apps/api/node_modules/@prisma/client/default.js';

const prisma = new PrismaClient();

const DEFAULT_HASH = '$argon2id$v=19$m=65536,p=4,t=3$JbaizGinhuzot3cqMzWQmg$2AI+N43I781fgYChTFZ7CfjlTmJ90PJ/lz4xWMZySqo';

const FPOS_DATA = [
  {
    name: 'Sahyadri Farmers Producer Co.',
    registrationNumber: 'FPO-MH-422003',
    legalStructure: 'PRODUCER_COMPANY',
    registrationDate: new Date('2022-04-15'),
    state: 'Maharashtra',
    district: 'Nashik',
    address: 'Plot 42, Vasantrao Naik Krishi Market',
    pincode: '422003',
    contactEmail: 'sahyadri.fpo@example.com',
    contactPhone: '9898110001',
    bankAccountNumber: '91802003847291',
    ifscCode: 'HDFC0001234',
    bankName: 'HDFC Bank Nashik',
    description: 'Leading agricultural cooperative in Western India of over 500 vegetable and fruit growers. Specialized in high-grade export quality tomatoes, onions, and grapes.',
    status: 'ACTIVE',
    adminEmail: 'sahyadri.fpo@example.com',
    adminMobile: '9898110001',
    adminName: 'Sahyadri Agro FPO Admin',
    commodities: [
      { commodity: 'Tomato', quantityQuintals: 150, qualityGrade: 'A', notes: 'Polyhouse fresh hybrid red tomatoes' },
      { commodity: 'Onion', quantityQuintals: 300, qualityGrade: 'A', notes: 'Lasalgaon cured red onions' },
      { commodity: 'Potato', quantityQuintals: 200, qualityGrade: 'Grade 1', notes: 'Cold-storage seed and table potatoes' },
    ],
  },
  {
    name: 'United Farmers Producer Co.',
    registrationNumber: 'FPO-DL-110001',
    legalStructure: 'COOPERATIVE',
    registrationDate: new Date('2021-08-10'),
    state: 'Delhi',
    district: 'North Delhi',
    address: 'Azadpur Mandi Complex, Gate 3',
    pincode: '110033',
    contactEmail: 'fpo@example.com',
    contactPhone: '9898000003',
    bankAccountNumber: '10293847561029',
    ifscCode: 'SBIN0001234',
    bankName: 'State Bank of India',
    description: 'National cooperative aggregation hub linking northern plains grain and oilseed producers directly with modern retail and flour mills.',
    status: 'ACTIVE',
    adminEmail: 'fpo@example.com',
    adminMobile: '9898000003',
    adminName: 'United FPO Manager',
    commodities: [
      { commodity: 'Wheat', quantityQuintals: 500, qualityGrade: 'Sharbati Premium', notes: 'High gluten authentic Sharbati wheat' },
      { commodity: 'Rice', quantityQuintals: 400, qualityGrade: 'Basmati Grade A', notes: 'Aromatic long-grain aged rice' },
      { commodity: 'Mustard', quantityQuintals: 180, qualityGrade: 'Bold Grain', notes: 'High oil content yellow and brown mustard' },
    ],
  },
  {
    name: 'Maharashtra Agro Producer Co.',
    registrationNumber: 'FPO-MH-411001',
    legalStructure: 'PRODUCER_COMPANY',
    registrationDate: new Date('2023-01-20'),
    state: 'Maharashtra',
    district: 'Pune',
    address: 'Market Yard, Gultekdi',
    pincode: '411037',
    contactEmail: 'fpo_demo@sih26033.org',
    contactPhone: '9898000004',
    bankAccountNumber: '50100239485712',
    ifscCode: 'ICIC0000123',
    bankName: 'ICICI Bank Pune',
    description: 'Specialized in pulses, soybean, cotton, and organic turmeric with dedicated warehousing and scientific testing facilities.',
    status: 'ACTIVE',
    adminEmail: 'fpo_demo@sih26033.org',
    adminMobile: '9898000004',
    adminName: 'Maharashtra Agro FPO (Demo)',
    commodities: [
      { commodity: 'Soybean', quantityQuintals: 250, qualityGrade: 'Yellow Bold', notes: 'Cleaned and graded oilseed soybean' },
      { commodity: 'Cotton', quantityQuintals: 320, qualityGrade: 'Medium Staple', notes: 'Direct ginning grade raw seed cotton' },
      { commodity: 'Turmeric', quantityQuintals: 120, qualityGrade: 'High Curcumin (5%)', notes: 'Organically grown finger turmeric' },
    ],
  },
];

async function seedFpos() {
  console.log('🌱 Seeding FPO Organizations into PostgreSQL...');

  // 1. Ensure test farmer exists
  let farmer = await prisma.user.findFirst({ where: { role: 'FARMER' } });
  if (!farmer) {
    farmer = await prisma.user.create({
      data: {
        email: 'farmer@example.com',
        passwordHash: DEFAULT_HASH,
        role: 'FARMER',
        status: 'ACTIVE',
      },
    });
  }

  for (const item of FPOS_DATA) {
    // 1. Ensure FPO Admin User exists
    let admin = await prisma.user.findUnique({ where: { email: item.adminEmail } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          email: item.adminEmail,
          passwordHash: DEFAULT_HASH,
          role: 'FPO',
          mobile: item.adminMobile,
          status: 'ACTIVE',
        },
      });
      console.log(`👤 Created FPO Admin user: ${admin.email}`);
    } else if (admin.role !== 'FPO') {
      await prisma.user.update({
        where: { id: admin.id },
        data: { role: 'FPO' },
      });
    }

    // 2. Ensure SellerProfile exists for this FPO admin
    let seller = await prisma.sellerProfile.findUnique({ where: { userId: admin.id } });
    if (!seller) {
      seller = await prisma.sellerProfile.create({
        data: {
          userId: admin.id,
          sellerType: 'FPO',
          businessName: item.name,
          farmLocation: `${item.district}, ${item.state}`,
          verificationStatus: 'VERIFIED',
        },
      });
    }

    // 3. Upsert FpoOrganization
    const fpo = await prisma.fpoOrganization.upsert({
      where: { registrationNumber: item.registrationNumber },
      update: {
        name: item.name,
        legalStructure: item.legalStructure,
        status: item.status,
        state: item.state,
        district: item.district,
        address: item.address,
        pincode: item.pincode,
        contactEmail: item.contactEmail,
        contactPhone: item.contactPhone,
        bankAccountNumber: item.bankAccountNumber,
        ifscCode: item.ifscCode,
        bankName: item.bankName,
        description: item.description,
        adminId: admin.id,
      },
      create: {
        name: item.name,
        registrationNumber: item.registrationNumber,
        legalStructure: item.legalStructure,
        status: item.status,
        registrationDate: item.registrationDate,
        state: item.state,
        district: item.district,
        address: item.address,
        pincode: item.pincode,
        contactEmail: item.contactEmail,
        contactPhone: item.contactPhone,
        bankAccountNumber: item.bankAccountNumber,
        ifscCode: item.ifscCode,
        bankName: item.bankName,
        description: item.description,
        adminId: admin.id,
      },
    });

    console.log(`✓ FPO [${fpo.registrationNumber}] ${fpo.name} (Status: ${fpo.status})`);

    // 4. Ensure farmer membership
    await prisma.fpoMembership.upsert({
      where: {
        fpoId_farmerId: {
          fpoId: fpo.id,
          farmerId: farmer.id,
        },
      },
      update: {
        status: 'APPROVED',
        shareCapital: 2500.00,
        approvedAt: new Date(),
      },
      create: {
        fpoId: fpo.id,
        farmerId: farmer.id,
        status: 'APPROVED',
        shareCapital: 2500.00,
        joinedAt: new Date(),
        approvedAt: new Date(),
      },
    });

    // 5. Ensure Produce Commitments & Batches
    for (const comm of item.commodities) {
      const existingListing = await prisma.fpoListing.findFirst({
        where: { fpoId: fpo.id, commodity: comm.commodity },
      });

      if (!existingListing) {
        const listing = await prisma.fpoListing.create({
          data: {
            fpoId: fpo.id,
            farmerId: farmer.id,
            commodity: comm.commodity,
            quantityQuintals: comm.quantityQuintals,
            qualityGrade: comm.qualityGrade,
            expectedHarvestDate: new Date(Date.now() + 86400000 * 14),
            notes: comm.notes,
            status: 'COMMITTED',
          },
        });

        // Create sealed aggregation batch for first commodity
        if (comm.commodity === item.commodities[0].commodity) {
          const batchNumber = `BATCH-${item.registrationNumber.slice(-6)}-${comm.commodity.toUpperCase()}`;
          const existingBatch = await prisma.fpoAggregationBatch.findUnique({
            where: { batchNumber },
          });

          if (!existingBatch) {
            const batch = await prisma.fpoAggregationBatch.create({
              data: {
                fpoId: fpo.id,
                batchNumber,
                commodity: comm.commodity,
                totalQuantity: comm.quantityQuintals,
                qualityGrade: comm.qualityGrade,
                status: 'SEALED',
                sealedAt: new Date(),
              },
            });

            await prisma.fpoListing.update({
              where: { id: listing.id },
              data: { batchId: batch.id, status: 'AGGREGATED' },
            });
          }
        }
      }
    }
  }

  const totalFpos = await prisma.fpoOrganization.count({ where: { status: 'ACTIVE' } });
  console.log(`\n🎉 Successfully seeded FPOs. Total Active FPOs in directory: ${totalFpos}`);

  await prisma.$disconnect();
}

seedFpos().catch(async (e) => {
  console.error('❌ Failed to seed FPOs:', e);
  await prisma.$disconnect();
  process.exit(1);
});
