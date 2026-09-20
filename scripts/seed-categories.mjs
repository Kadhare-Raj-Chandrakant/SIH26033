#!/usr/bin/env node

/**
 * ==============================================================================
 * SIH26033 — Agricultural Categories Seeder
 * ==============================================================================
 * Seeds or updates the standard 10 agricultural categories in PostgreSQL
 * with non-destructive upserts (preserves existing product foreign keys).
 */

import { PrismaClient } from '../apps/api/node_modules/@prisma/client/default.js';

const prisma = new PrismaClient();

export const AGRICULTURAL_CATEGORIES = [
  {
    name: 'Cereals & Grains',
    slug: 'cereals-grains',
    description: 'Staple grains including wheat, paddy rice, maize, barley, and nutritious millets.',
  },
  {
    name: 'Pulses & Legumes',
    slug: 'pulses-legumes',
    description: 'High-protein pulses including chickpeas (chana), pigeon peas (arhar/tur), green gram (moong), and lentils.',
  },
  {
    name: 'Vegetables',
    slug: 'vegetables',
    description: 'Farm-fresh harvest vegetables including tomatoes, onions, potatoes, green vegetables, and root crops.',
  },
  {
    name: 'Fruits',
    slug: 'fruits',
    description: 'Fresh orchard and horticultural fruits including mangoes, bananas, apples, oranges, and seasonal berries.',
  },
  {
    name: 'Oilseeds',
    slug: 'oilseeds',
    description: 'Quality edible and commercial oilseeds including mustard, soybean, groundnut, sunflower, and sesame.',
  },
  {
    name: 'Spices & Condiments',
    slug: 'spices-condiments',
    description: 'Aromatic culinary spices including turmeric, red chili, cumin (jeera), coriander, and black pepper.',
  },
  {
    name: 'Cash & Fibre Crops',
    slug: 'cash-fibre-crops',
    description: 'High-value commercial fibre and industrial crops including raw cotton, jute, and sugarcane.',
  },
  {
    name: 'Plantation & Beverage Crops',
    slug: 'plantation-beverage-crops',
    description: 'Estate plantation commodities including tea, coffee, coconut, arecanut, and natural rubber.',
  },
  {
    name: 'Fodder Crops',
    slug: 'fodder-crops',
    description: 'Nutritious livestock forage and dairy cattle feeds including berseem, lucerne (alfalfa), sorghum fodder, and silage.',
  },
  {
    name: 'Flowers & Medicinal Plants',
    slug: 'flowers-medicinal-plants',
    description: 'Commercial floriculture and therapeutic herbs including marigold, rose, jasmine, tulsi, ashwagandha, and aloe vera.',
  },
];

async function seedCategories() {
  console.log('Seeding 10 Agricultural Categories into database...');

  for (const cat of AGRICULTURAL_CATEGORIES) {
    const result = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
      },
    });
    console.log(`✓ [${result.slug}] ${result.name} (ID: ${result.id})`);
  }

  const total = await prisma.category.count();
  console.log(`\n🎉 Successfully synced categories. Total in database: ${total}`);
  await prisma.$disconnect();
}

seedCategories().catch(async (err) => {
  console.error('Failed to seed categories:', err);
  await prisma.$disconnect();
  process.exit(1);
});
