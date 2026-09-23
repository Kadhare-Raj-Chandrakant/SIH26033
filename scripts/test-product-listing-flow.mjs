import { PrismaClient } from 'file:///c:/Users/Shrey/OneDrive/Desktop/SIH26033/apps/api/node_modules/.prisma/client/index.js';

const API_BASE = 'http://localhost:4000/api/v1';
const prisma = new PrismaClient();

async function main() {
  console.log('===============================================================');
  console.log('STARTING COMPLETE MANUAL PRODUCT LISTING E2E INTEGRATION TEST');
  console.log('===============================================================\n');

  // Pre-test cleanup of any previous test runs
  await prisma.inventory.deleteMany({ where: { product: { name: { contains: 'E2E Nashik' } } } });
  await prisma.productImage.deleteMany({ where: { product: { name: { contains: 'E2E Nashik' } } } });
  await prisma.product.deleteMany({ where: { name: { contains: 'E2E Nashik' } } });

  // Step 1: Login as farmer1_demo
  console.log('1. Authenticating as demo farmer (farmer1_demo@sih26033.org)...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'farmer1_demo@sih26033.org',
      password: 'Password@123',
    }),
  });

  if (!loginRes.ok) {
    const err = await loginRes.text();
    throw new Error(`Farmer login failed: ${loginRes.status} ${err}`);
  }

  const loginJson = await loginRes.json();
  const farmerToken = loginJson.data?.accessToken || loginJson.accessToken;
  const farmerUser = loginJson.data?.user || loginJson.user;
  console.log(`   ✓ Authenticated as ${farmerUser.email} (ID: ${farmerUser.id}, Role: ${farmerUser.role})`);

  // Step 2: Fetch Categories
  console.log('2. Fetching active categories...');
  const catRes = await fetch(`${API_BASE}/categories`);
  const catJson = await catRes.json();
  const categories = Array.isArray(catJson) ? catJson : (catJson.data || []);
  const vegCategory = categories.find((c) => c.name.toLowerCase().includes('vegetable')) || categories[0];
  console.log(`   ✓ Selected category: ${vegCategory.name} (${vegCategory.id})`);

  // Step 3: Test Validation Failures
  console.log('3. Testing backend validation rules...');
  
  // 3a: Zero quantity
  const zeroQtyRes = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      name: 'Zero Qty Test',
      description: 'Testing zero stock validation',
      categoryId: vegCategory.id,
      price: 1500,
      unit: 'QUINTAL',
      initialQuantity: 0,
    }),
  });
  console.log(`   - Zero quantity rejection status: ${zeroQtyRes.status} (Expected 400)`);
  if (zeroQtyRes.status !== 400) throw new Error('Expected 400 for initialQuantity: 0');

  // 3b: Zero price
  const zeroPriceRes = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      name: 'Zero Price Test',
      description: 'Testing zero price validation',
      categoryId: vegCategory.id,
      price: 0,
      unit: 'QUINTAL',
      initialQuantity: 50,
    }),
  });
  console.log(`   - Zero price rejection status: ${zeroPriceRes.status} (Expected 400)`);
  if (zeroPriceRes.status !== 400) throw new Error('Expected 400 for price: 0');

  // 3c: Invalid category
  const badCatRes = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      name: 'Bad Category Test',
      description: 'Testing bad category validation',
      categoryId: '00000000-0000-0000-0000-000000000000',
      price: 1500,
      unit: 'QUINTAL',
      initialQuantity: 50,
    }),
  });
  console.log(`   - Invalid category rejection status: ${badCatRes.status} (Expected 400)`);
  if (badCatRes.status !== 400) throw new Error('Expected 400 for invalid categoryId');
  console.log('   ✓ All validation constraints strictly enforced by backend.');

  // Step 4: Create Valid Product Listing
  console.log('4. Creating valid manual product listing...');
  const createRes = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      name: 'E2E Nashik Red Onion Test',
      description: 'Harvested directly from Nashik farm for test verification. Climate-controlled storage.',
      categoryId: vegCategory.id,
      varietyType: 'Garwa Hybrid',
      notes: 'Grade A Export Quality',
      price: 1950,
      unit: 'QUINTAL',
      initialQuantity: 120,
      primaryImage: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Product creation failed: ${createRes.status} ${err}`);
  }

  const createProductJson = await createRes.json();
  const createdProduct = createProductJson.data || createProductJson;
  const productId = createdProduct.id;
  console.log(`   ✓ Created Product ID: ${productId}`);
  console.log(`   ✓ Resolved Origin: State=${createdProduct.state}, District=${createdProduct.district}, Location=${createdProduct.location}`);
  console.log(`   ✓ Farmer/Farm: Farmer=${createdProduct.farmerName}, Farm=${createdProduct.farmName}`);
  console.log(`   ✓ Illustrative Reference Price: ₹${createdProduct.illustrativeFarmerListingReferenceInr}/Quintal`);

  // Step 5: Verify Database State
  console.log('5. Verifying database state for product & inventory...');
  const dbProduct = await prisma.product.findUnique({
    where: { id: productId },
    include: { inventory: true, images: true, category: true, seller: true },
  });

  if (!dbProduct) throw new Error('Product not found in database!');
  if (!dbProduct.inventory) throw new Error('Inventory not created for product!');
  if (Number(dbProduct.inventory.availableQuantity) !== 120) {
    throw new Error(`Expected inventory 120, got ${dbProduct.inventory.availableQuantity}`);
  }
  console.log(`   ✓ DB Verification passed: Available Stock = ${dbProduct.inventory.availableQuantity} ${dbProduct.unit}`);

  // Step 6: Verify Seller Listings Endpoint
  console.log('6. Verifying product in seller listing endpoint (GET /api/v1/seller/products)...');
  const sellerListRes = await fetch(`${API_BASE}/seller/products`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  const sellerProductsJson = await sellerListRes.json();
  const sellerProducts = sellerProductsJson.data || sellerProductsJson;
  const foundInSeller = Array.isArray(sellerProducts) ? sellerProducts.find((p) => p.id === productId) : null;
  if (!foundInSeller) throw new Error('Created product not returned in /seller/products!');
  console.log(`   ✓ Found in seller listings: '${foundInSeller.name}', Stock: ${foundInSeller.inventory?.availableQuantity} ${foundInSeller.unit}`);

  // Step 7: Verify Public Marketplace Visibility
  console.log('7. Verifying public marketplace visibility (GET /api/v1/marketplace/products)...');
  const marketRes = await fetch(`${API_BASE}/marketplace/products?search=E2E+Nashik+Red+Onion+Test`);
  const marketJson = await marketRes.json();
  const marketProducts = Array.isArray(marketJson.data)
    ? marketJson.data
    : (marketJson.data?.products || marketJson.products || []);
  const foundInMarket = marketProducts.find((p) => p.id === productId);
  if (!foundInMarket) throw new Error('Created product not returned in public marketplace search!');
  console.log(`   ✓ Found in public marketplace: '${foundInMarket.name}', Status: ${foundInMarket.status}, Available Qty: ${foundInMarket.availableQuantity}`);

  // Step 8: Verify Market Intelligence Landed-Cost Participation
  console.log('8. Verifying buyer landed-cost intelligence participation (POST /api/v1/ai/marketplace-landed-cost)...');
  const landedRes = await fetch(`${API_BASE}/ai/marketplace-landed-cost`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      buyerDestination: {
        state: 'Maharashtra',
        city: 'Mumbai',
        district: 'Mumbai',
      },
      productIds: [productId],
      quantityQuintals: 20,
    }),
  });

  if (!landedRes.ok) {
    const err = await landedRes.text();
    throw new Error(`Marketplace landed cost evaluation failed: ${landedRes.status} ${err}`);
  }

  const landedJson = await landedRes.json();
  const landedData = landedJson.data || landedJson;
  const evaluatedProduct = (landedData.products || landedData.rankedProducts)?.find((p) => p.productId === productId);
  if (!evaluatedProduct) {
    console.error('Landed data response:', JSON.stringify(landedData, null, 2));
    throw new Error('Newly created product was not evaluated in landed-cost intelligence!');
  }
  console.log(`   ✓ Landed-cost successfully computed for buyer in Mumbai:`);
  console.log(`     • Product Price: ₹${evaluatedProduct.productPricePerQuintal}/Q`);
  console.log(`     • Road Distance: ${evaluatedProduct.roadDistanceKm} km (${evaluatedProduct.originState}, ${evaluatedProduct.originDistrict} -> Mumbai)`);
  console.log(`     • Freight: ₹${evaluatedProduct.costBreakdown?.freightPerQuintal}/Q`);
  console.log(`     • Total Logistics Charges: ₹${evaluatedProduct.logisticsCostPerQuintal}/Q`);
  console.log(`     • Final Landed Cost: ₹${evaluatedProduct.totalLandedCostPerQuintal}/Q`);

  // Step 9: Verify Ownership Security Isolation
  console.log('9. Verifying ownership security isolation (unauthorized access rejection)...');
  // Login as second farmer
  const login2Res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'farmer@example.com',
      password: 'Password@123',
    }),
  });
  const login2Json = await login2Res.json();
  const attackerToken = login2Json.data?.accessToken || login2Json.accessToken;

  // Try unauthorized update
  const unauthUpdateRes = await fetch(`${API_BASE}/products/${productId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${attackerToken}`,
    },
    body: JSON.stringify({ price: 100 }),
  });
  console.log(`   - Unauthorized product update status: ${unauthUpdateRes.status} (Expected 403)`);
  if (unauthUpdateRes.status !== 403) throw new Error('Expected 403 for unauthorized product update');

  // Try unauthorized inventory update
  const unauthInvRes = await fetch(`${API_BASE}/products/${productId}/inventory`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${attackerToken}`,
    },
    body: JSON.stringify({ availableQuantity: 9999 }),
  });
  console.log(`   - Unauthorized inventory update status: ${unauthInvRes.status} (Expected 403)`);
  if (unauthInvRes.status !== 403) throw new Error('Expected 403 for unauthorized inventory update');

  // Try unauthorized delete
  const unauthDeleteRes = await fetch(`${API_BASE}/products/${productId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${attackerToken}` },
  });
  console.log(`   - Unauthorized delete status: ${unauthDeleteRes.status} (Expected 403)`);
  if (unauthDeleteRes.status !== 403) throw new Error('Expected 403 for unauthorized delete');
  console.log('   ✓ Security isolation confirmed: Other sellers cannot edit, update stock, or delete foreign products.');

  // Step 10: Authorized Owner Product Update & Inventory Update
  console.log('10. Verifying authorized owner update and stock modification...');
  const updateRes = await fetch(`${API_BASE}/products/${productId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({
      price: 2150,
      notes: 'Grade A+ Export Super Quality',
    }),
  });
  if (!updateRes.ok) throw new Error(`Owner update failed: ${updateRes.status}`);
  const updateProdJson = await updateRes.json();
  const updatedProd = updateProdJson.data || updateProdJson;
  console.log(`   ✓ Product updated by owner: Price=₹${updatedProd.price}, Notes='${updatedProd.notes}'`);

  const updateInvRes = await fetch(`${API_BASE}/products/${productId}/inventory`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
    },
    body: JSON.stringify({ availableQuantity: 180 }),
  });
  if (!updateInvRes.ok) throw new Error(`Owner inventory update failed: ${updateInvRes.status}`);
  const updateInvJson = await updateInvRes.json();
  const updatedInv = updateInvJson.data || updateInvJson;
  console.log(`   ✓ Stock updated by owner: Available Stock=${updatedInv.availableQuantity}`);

  // Step 11: Authorized Product Delete & Cleanup
  console.log('11. Verifying authorized product delete...');
  const deleteRes = await fetch(`${API_BASE}/products/${productId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  if (!deleteRes.ok) throw new Error(`Owner delete failed: ${deleteRes.status}`);
  console.log('   ✓ Product deleted successfully.');

  const checkDb = await prisma.product.findUnique({ where: { id: productId } });
  const checkInv = await prisma.inventory.findUnique({ where: { productId } });
  if (checkDb || checkInv) {
    throw new Error('Product or inventory was not completely removed after deletion!');
  }
  console.log('   ✓ Database cleanup verified: Product and Inventory removed.');

  console.log('\n===============================================================');
  console.log('ALL MANUAL PRODUCT LISTING E2E INTEGRATION CHECKS PASSED (11/11)');
  console.log('===============================================================');
}

main()
  .catch((err) => {
    console.error('E2E TEST FAILURE:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
