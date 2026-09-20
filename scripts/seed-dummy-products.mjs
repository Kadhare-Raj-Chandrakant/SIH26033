#!/usr/bin/env node

/**
 * ==============================================================================
 * SIH26033 — Safe Dummy Products Seeder
 * ==============================================================================
 * Inserts realistic, clearly labeled dummy agricultural products for local
 * marketplace testing.
 *
 * All records include the tag [SIH26033-TEST-DATA] in the description for
 * clean and surgical future removal.
 */

import { PrismaClient } from '../apps/api/node_modules/@prisma/client/default.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dummy agricultural products into local database...');

  // 1. Fetch categories
  const categories = await prisma.category.findMany();
  const catMap = new Map(categories.map((c) => [c.slug, c.id]));

  // 2. Fetch existing sellers
  const sellers = await prisma.sellerProfile.findMany({
    include: { user: true },
  });

  if (sellers.length === 0) {
    throw new Error('No seller profiles found. Please create or register a seller first.');
  }

  // Find specific sellers or fallback to first available seller
  const rameshPatel = sellers.find((s) => s.user.email === 'ramesh.farmer@example.com') || sellers[0];
  const rameshDemo = sellers.find((s) => s.user.email === 'farmer1_demo@sih26033.org') || sellers[0];
  const fpoDemo = sellers.find((s) => s.user.email === 'fpo_demo@sih26033.org') || sellers[1] || sellers[0];
  const unitedFpo = sellers.find((s) => s.user.email === 'fpo@example.com') || fpoDemo;

  const dummyProducts = [
    {
      name: '[TEST] Fresh Hybrid Tomatoes',
      description: 'Firm, naturally grown ripe red hybrid tomatoes freshly harvested from polyhouse farms. Excellent shelf life and high lycopene content. [SIH26033-TEST-DATA]',
      price: 35.00,
      unit: 'KG',
      location: 'Nashik, Maharashtra',
      categorySlug: 'vegetables',
      sellerId: rameshPatel.id,
      quantity: 500.00,
      imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: '[TEST] Red Onions (Grade A)',
      description: 'Properly cured, high pungency medium-to-large size red onions with dry outer skin. Direct farm gate pricing. [SIH26033-TEST-DATA]',
      price: 28.00,
      unit: 'KG',
      location: 'Lasalgaon, Maharashtra',
      categorySlug: 'vegetables',
      sellerId: rameshPatel.id,
      quantity: 1200.00,
      imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: '[TEST] Nagpur Sweet Oranges (Santra)',
      description: 'Juicy, sweet, and aromatic Nagpur mandarin oranges. Harvested with natural tree ripeness. Ideal for direct consumption and commercial juicing. [SIH26033-TEST-DATA]',
      price: 65.00,
      unit: 'KG',
      location: 'Nagpur, Maharashtra',
      categorySlug: 'fruits',
      sellerId: fpoDemo.id,
      quantity: 800.00,
      imageUrl: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: '[TEST] Farm Fresh Cavendish Bananas',
      description: 'Uniformly graded, spotless Cavendish bananas sourced directly from cooperative farmers in Khandesh. High carbohydrate and potassium profile. [SIH26033-TEST-DATA]',
      price: 32.00,
      unit: 'DOZEN',
      location: 'Jalgaon, Maharashtra',
      categorySlug: 'fruits',
      sellerId: fpoDemo.id,
      quantity: 450.00,
      imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: '[TEST] Sharbati Wheat (Premium Grain)',
      description: 'Golden, heavy grains of authentic Sharbati wheat grown in the fertile black soil of Sehore. High protein and gluten suitable for soft rotis. [SIH26033-TEST-DATA]',
      price: 3200.00,
      unit: 'QUINTAL',
      location: 'Sehore, Madhya Pradesh',
      categorySlug: 'cereals-grains',
      sellerId: rameshDemo.id,
      quantity: 150.00,
      imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: '[TEST] Organic Desi Chana (Chickpeas)',
      description: 'Unpolished, pesticide-free small brown desi chickpeas rich in plant protein and dietary fibre. Cleaned and sorted. [SIH26033-TEST-DATA]',
      price: 85.00,
      unit: 'KG',
      location: 'Bikaner, Rajasthan',
      categorySlug: 'pulses-legumes',
      sellerId: rameshDemo.id,
      quantity: 600.00,
      imageUrl: 'https://images.unsplash.com/photo-1585996656755-3e2840502a96?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: '[TEST] Salem Turmeric Finger (High Curcumin)',
      description: 'Sun-dried Salem variety whole turmeric fingers with 4.5%+ curcumin content. Deep golden color and strong natural aroma. [SIH26033-TEST-DATA]',
      price: 145.00,
      unit: 'KG',
      location: 'Erode, Tamil Nadu',
      categorySlug: 'spices-condiments',
      sellerId: unitedFpo.id,
      quantity: 350.00,
      imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: '[TEST] Raw Medium Staple Cotton (Bales)',
      description: 'Clean, machine-ginned raw white medium staple cotton (28mm). High tensile strength suitable for commercial textile spinning mills. [SIH26033-TEST-DATA]',
      price: 6800.00,
      unit: 'QUINTAL',
      location: 'Rajkot, Gujarat',
      categorySlug: 'cash-fibre-crops',
      sellerId: unitedFpo.id,
      quantity: 80.00,
      imageUrl: 'https://images.unsplash.com/photo-1606041008023-472dfb5e530f?w=800&auto=format&fit=crop&q=80',
    },
  ];

  for (const item of dummyProducts) {
    const categoryId = catMap.get(item.categorySlug);
    if (!categoryId) {
      console.warn(`Category slug ${item.categorySlug} not found in DB. Skipping.`);
      continue;
    }

    // Check if product already exists by name and sellerId
    const existing = await prisma.product.findFirst({
      where: {
        name: item.name,
        sellerId: item.sellerId,
      },
    });

    if (existing) {
      // Ensure inventory exists and is active
      await prisma.inventory.upsert({
        where: { productId: existing.id },
        update: { availableQuantity: item.quantity },
        create: { productId: existing.id, availableQuantity: item.quantity, reservedQuantity: 0 },
      });
      console.log(`✓ Updated existing test product: ${item.name}`);
    } else {
      const product = await prisma.product.create({
        data: {
          name: item.name,
          description: item.description,
          price: item.price,
          unit: item.unit,
          status: 'ACTIVE',
          location: item.location,
          categoryId,
          sellerId: item.sellerId,
          inventory: {
            create: {
              availableQuantity: item.quantity,
              reservedQuantity: 0,
            },
          },
          images: {
            create: [
              {
                url: item.imageUrl,
                cloudinaryId: `test-img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                isPrimary: true,
              },
            ],
          },
        },
      });
      console.log(`✓ Created test product: ${product.name} (ID: ${product.id})`);
    }
  }

  const totalProducts = await prisma.product.count({
    where: { status: 'ACTIVE' },
  });
  console.log(`\n🎉 Dummy products successfully seeded! Total active products in marketplace: ${totalProducts}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Failed to seed dummy products:', err);
  await prisma.$disconnect();
  process.exit(1);
});
