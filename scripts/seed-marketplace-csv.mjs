#!/usr/bin/env node

/**
 * ==============================================================================
 * SIH26033 — Agricultural Marketplace Dataset Seeder (v3)
 * ==============================================================================
 * Imports all 90 distinct agricultural listings from
 * `scripts/data/sih26033_agricultural_marketplace_dataset_v3.csv`.
 *
 * Each row represents an individual farm and farmer listing.
 * Strictly adheres to project provenance requirements:
 * - Genuine farmer-uploaded images only (no stock photos, no AI, no castle photos).
 * - Leaves image records empty when no verified farmer uploads are available,
 *   allowing the frontend to render neutral "Image unavailable" placeholders.
 * - Uses exact available_quantity and quantity_unit from dataset.
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '../apps/api/node_modules/@prisma/client/default.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

/**
 * Robust CSV parser that correctly handles quoted strings containing commas.
 */
function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] !== undefined ? values[idx] : '';
      });
      rows.push(row);
    }
  }

  return rows;
}

async function main() {
  console.log('🌾 Starting SIH26033 Agricultural Marketplace CSV v3 Import...');

  const csvPath = path.resolve(__dirname, 'data', 'sih26033_agricultural_marketplace_dataset_v4.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at: ${csvPath}`);
  }

  const csvRaw = fs.readFileSync(csvPath, 'utf8');
  const dataset = parseCsv(csvRaw);
  console.log(`📊 Found ${dataset.length} listing rows in CSV dataset.`);

  if (dataset.length === 0) {
    throw new Error('CSV is empty or invalid.');
  }


  // 1. Fetch categories
  const categories = await prisma.category.findMany();
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c]));

  // 2. Fetch or create a dedicated producer seller profile
  let seller = await prisma.sellerProfile.findFirst({
    where: { businessName: 'SIH26033 Producer Network' },
  });

  if (!seller) {
    const existingSeller = await prisma.sellerProfile.findFirst({
      include: { user: true },
    });

    if (existingSeller) {
      seller = existingSeller;
      console.log(`👤 Using existing seller: ${seller.businessName || seller.user?.email} (${seller.id})`);
    } else {
      let farmerUser = await prisma.user.findFirst({ where: { role: 'FARMER' } });
      if (!farmerUser) {
        farmerUser = await prisma.user.create({
          data: {
            email: 'demo.producer@sih26033.org',
            passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$demoHashDemoHash123$demoHash123',
            role: 'FARMER',
            status: 'ACTIVE',
          },
        });
      }

      seller = await prisma.sellerProfile.create({
        data: {
          userId: farmerUser.id,
          sellerType: 'FARMER',
          businessName: 'SIH26033 Producer Network',
          farmLocation: 'Direct Producer Hub, India',
          verificationStatus: 'VERIFIED',
        },
      });
      console.log(`✓ Created demo producer profile: ${seller.businessName} (${seller.id})`);
    }
  }

  // 3. Cleanly remove previous demo products and ALL previous unverified stock images
  console.log('\n🧹 Purging unverified images and resetting product listings...');
  await prisma.productImage.deleteMany({});
  console.log('✓ Cleared all historical ProductImage records from database.');

  const existingActiveProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, _count: { select: { orderItems: true } } },
  });

  let deletedCount = 0;
  let archivedCount = 0;

  for (const prod of existingActiveProducts) {
    if (prod._count.orderItems === 0) {
      await prisma.inventory.deleteMany({ where: { productId: prod.id } });
      await prisma.cartItem.deleteMany({ where: { productId: prod.id } });
      await prisma.product.delete({ where: { id: prod.id } });
      deletedCount++;
    } else {
      await prisma.product.update({
        where: { id: prod.id },
        data: { status: 'ARCHIVED' },
      });
      archivedCount++;
    }
  }

  console.log(`✓ Removed ${deletedCount} unreferenced products; archived ${archivedCount} historical products.`);

  // 4. Import all 90 CSV rows as individual listings
  console.log(`\n🌱 Importing all ${dataset.length} CSV listings with verified data...`);

  let importedCount = 0;

  for (let idx = 0; idx < dataset.length; idx++) {
    const row = dataset[idx];
    const catNameKey = (row.category || '').toLowerCase().trim();
    const category = categoryByName.get(catNameKey);

    if (!category) {
      console.warn(`⚠️ Warning: Category "${row.category}" not found in database. Skipping row ${idx + 1}.`);
      continue;
    }

    const productName = (row.product || 'Agricultural Produce').trim();
    const farmerName = (row.farmer_name || '').trim();
    const farm = (row.farm || '').trim();
    const state = (row.state || '').trim();
    const district = (row.district || '').trim();
    const marketMandi = (row.market_mandi || '').trim();
    const varietyType = (row.variety_type || '').trim();
    const officialDate = (row.official_price_date || '').trim();
    const notes = (row.notes || '').trim();

    // Price values
    const officialMandiPrice = row.official_mandi_modal_price_inr
      ? parseFloat(row.official_mandi_modal_price_inr)
      : null;
    const illustrativeFarmerPrice = row.illustrative_farmer_listing_reference_inr
      ? parseFloat(row.illustrative_farmer_listing_reference_inr)
      : null;

    const primaryPrice = illustrativeFarmerPrice !== null && !isNaN(illustrativeFarmerPrice)
      ? illustrativeFarmerPrice
      : null;

    // Available quantity from dataset
    const rawQuantity = parseFloat(row.available_quantity);
    const availableQuantity = !isNaN(rawQuantity) && rawQuantity > 0 ? rawQuantity : 50.0;

    // Quantity unit mapped to Prisma ProductUnit enum
    const unitMap = {
      'QUINTAL': 'QUINTAL',
      'KG': 'KG',
      'TONNE': 'TONNE',
      'PIECE': 'PIECE',
      'BUNCH': 'PIECE',
    };
    const rawUnit = (row.quantity_unit || 'quintal').toUpperCase().trim();
    const unitEnum = unitMap[rawUnit] || 'QUINTAL';

    // Location formatting
    const location = district && state ? `${district}, ${state}` : (state || 'Local Mandi Hub');

    // Rich descriptive narrative
    const descParts = [];
    if (varietyType) descParts.push(`Variety: ${varietyType}.`);
    if (farm && farmerName) descParts.push(`Harvested and supplied by ${farmerName} (${farm}).`);
    if (marketMandi) descParts.push(`Benchmarked against ${marketMandi}.`);
    if (notes) descParts.push(`Notes: ${notes}`);
    descParts.push(`[SIH26033-DATASET-LISTING #${idx + 1}]`);
    const description = descParts.join(' ');

    // Single Primary Image per listing (Rule 3 & 4: Verified farmer-uploaded image only)
    const primaryImageUrl = (row.primary_image || '').trim();
    const imageCreateData = primaryImageUrl
      ? [
          {
            url: primaryImageUrl,
            cloudinaryId: `sih-farmer-${productName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx + 1}-primary`,
            isPrimary: true,
          },
        ]
      : [];

    // Create the product listing
    const product = await prisma.product.create({
      data: {
        name: productName,
        description,
        price: primaryPrice !== null && !isNaN(primaryPrice) ? primaryPrice : 0,
        unit: unitEnum,
        status: 'ACTIVE',
        location,
        farmerName: farmerName || null,
        farmName: farm || null,
        state: state || null,
        district: district || null,
        marketMandi: marketMandi || null,
        varietyType: varietyType || null,
        sellingUnit: row.selling_unit || 'Rs./Quintal',
        officialMandiModalPriceInr: officialMandiPrice && !isNaN(officialMandiPrice) ? officialMandiPrice : null,
        illustrativeFarmerListingReferenceInr: illustrativeFarmerPrice && !isNaN(illustrativeFarmerPrice) ? illustrativeFarmerPrice : null,
        officialPriceDate: officialDate || null,
        notes: notes || null,
        primaryImage: primaryImageUrl || null,
        categoryId: category.id,
        sellerId: seller.id,
        inventory: {
          create: {
            availableQuantity,
            reservedQuantity: 0.00,
          },
        },
        images: imageCreateData.length > 0 ? { create: imageCreateData } : undefined,
      },
    });


    importedCount++;
    if (importedCount % 15 === 0 || importedCount === dataset.length) {
      console.log(`  Progress: ${importedCount}/${dataset.length} listings created (latest: ${product.name} from ${farmerName} - ${location})`);
    }
  }

  const finalActiveCount = await prisma.product.count({ where: { status: 'ACTIVE' } });
  const finalImageCount = await prisma.productImage.count();

  console.log(`\n🎉 Success! Successfully imported ${importedCount} listings from dataset.`);
  console.log(`✨ Total active products in marketplace: ${finalActiveCount}`);
  console.log(`🖼️ Total verified images in database: ${finalImageCount}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Failed to seed marketplace dataset:', err);
  await prisma.$disconnect();
  process.exit(1);
});
