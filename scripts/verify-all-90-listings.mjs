import { PrismaClient } from '../apps/api/node_modules/@prisma/client/default.js';

const prisma = new PrismaClient();

async function verify() {
  console.log('====================================================');
  console.log('SIH26033 — Comprehensive 90 Listings Image Audit');
  console.log('====================================================\n');

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: {
      category: true,
      inventory: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Total active products retrieved: ${products.length}`);
  if (products.length !== 90) {
    throw new Error(`Expected 90 products, got ${products.length}`);
  }

  // 1. Check unique primaryImage per listing
  const allImages = products.map(p => p.primaryImage);
  const uniqueImages = new Set(allImages);

  console.log(`Unique primaryImage values: ${uniqueImages.size} / 90`);

  // 2. Check each crop has 3 distinct photos
  const cropMap = {};
  for (const p of products) {
    if (!cropMap[p.name]) {
      cropMap[p.name] = [];
    }
    cropMap[p.name].push({
      id: p.id,
      farmer: p.farmerName,
      farm: p.farmName,
      location: `${p.district}, ${p.state}`,
      price: p.illustrativeFarmerListingReferenceInr ? `₹${p.illustrativeFarmerListingReferenceInr}` : 'Price on request',
      stock: `${p.inventory?.availableQuantity} ${p.unit}`,
      primaryImage: p.primaryImage
    });
  }

  console.log(`\nUnique crops count: ${Object.keys(cropMap).length} (expected 30)\n`);

  let duplicateCrops = 0;
  let missingImages = 0;
  let httpFailed = 0;

  for (const [crop, listings] of Object.entries(cropMap)) {
    if (listings.length !== 3) {
      console.error(`❌ Crop ${crop} has ${listings.length} listings instead of 3`);
    }
    const cropImages = listings.map(l => l.primaryImage);
    const cropUniqueImages = new Set(cropImages);
    if (cropUniqueImages.size !== 3) {
      console.error(`❌ Crop ${crop} has duplicate images:`, cropImages);
      duplicateCrops++;
    }

    for (const l of listings) {
      if (!l.primaryImage) {
        missingImages++;
      } else {
        // Test HTTP load from frontend server
        const fullUrl = `http://localhost:3000${l.primaryImage}`;
        try {
          const res = await fetch(fullUrl);
          if (res.status !== 200) {
            console.error(`❌ Image failed to load [HTTP ${res.status}]: ${fullUrl}`);
            httpFailed++;
          }
        } catch (e) {
          console.error(`❌ Fetch error on ${fullUrl}: ${e.message}`);
          httpFailed++;
        }
      }
    }
  }

  console.log('----------------------------------------------------');
  console.log(`Audit Summary:`);
  console.log(`• Total Listings Verified   : ${products.length}`);
  console.log(`• Unique Images Assigned    : ${uniqueImages.size} / 90`);
  console.log(`• Duplicate Crops Found     : ${duplicateCrops}`);
  console.log(`• Missing Images            : ${missingImages}`);
  console.log(`• HTTP Load Failures (404)  : ${httpFailed}`);
  console.log('----------------------------------------------------');

  // Verify Rose listings specifically
  console.log('\n🌹 Rose Listings Verification:');
  cropMap['Rose']?.forEach((r, idx) => {
    console.log(`  Listing ${idx + 1}: ${r.farmer} (${r.farm}) -> ${r.primaryImage}`);
  });

  if (duplicateCrops === 0 && uniqueImages.size === 90 && httpFailed === 0) {
    console.log('\n✅ ALL 90 LISTINGS PASSED COMPREHENSIVE VERIFICATION!');
  } else {
    console.error('\n❌ VERIFICATION FAILED. Review errors above.');
    process.exit(1);
  }

  await prisma.$disconnect();
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
