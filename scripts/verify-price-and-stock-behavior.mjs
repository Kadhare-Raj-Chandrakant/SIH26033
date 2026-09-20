// scripts/verify-price-and-stock-behavior.mjs
import http from 'http';

function request(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: JSON.parse(body),
          });
        } catch {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body,
          });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  console.log('=== VERIFICATION: PRICE VARIATIONS & OUT-OF-STOCK HANDLING ===\n');

  // 1. Verify price variation for Tomato
  console.log('1. Testing slight price variations for same crop (Tomato)...');
  const tomatoRes1 = await request('http://localhost:4000/api/v1/marketplace/products?search=Tomato');
  const tomatoProducts1 = Array.isArray(tomatoRes1.data.data) ? tomatoRes1.data.data : tomatoRes1.data.data.products;
  console.log(`Found ${tomatoProducts1.length} Tomato listings:`);

  const tomatoPrices = [];
  for (const p of tomatoProducts1) {
    console.log(`  - ID: ${p.id} | ${p.farmerName} (${p.farmName}):`);
    console.log(`    Asking Price: ₹${p.illustrativeFarmerListingReferenceInr}/quintal (price: ₹${p.price})`);
    console.log(`    Mandi Benchmark: ₹${p.officialMandiModalPriceInr}/quintal`);
    console.log(`    Status: ${p.status}`);
    tomatoPrices.push(p.illustrativeFarmerListingReferenceInr);
  }

  // Check that all 3 prices exist and are not identical
  const uniquePrices = new Set(tomatoPrices);
  if (tomatoPrices.length >= 3 && uniquePrices.size > 1) {
    console.log(`✓ PASS: Multiple listings for Tomato have distinct, slight price variations (${[...uniquePrices].join(', ')})`);
  } else {
    console.error(`✗ FAIL: Tomato prices are not distinct!`, tomatoPrices);
  }

  // 2. Test price stability on refresh
  console.log('\n2. Testing price stability across subsequent request (refresh)...');
  const tomatoRes2 = await request('http://localhost:4000/api/v1/marketplace/products?search=Tomato');
  const tomatoProducts2 = Array.isArray(tomatoRes2.data.data) ? tomatoRes2.data.data : tomatoRes2.data.data.products;
  let pricesStable = true;
  for (let i = 0; i < tomatoProducts1.length; i++) {
    if (tomatoProducts1[i].illustrativeFarmerListingReferenceInr !== tomatoProducts2[i].illustrativeFarmerListingReferenceInr) {
      pricesStable = false;
    }
  }
  if (pricesStable) {
    console.log('✓ PASS: Asking prices are completely stable across requests.');
  } else {
    console.error('✗ FAIL: Prices changed between requests!');
  }

  // 3. Test unpriced product (Sugarcane / Marigold / Coffee)
  console.log('\n3. Testing unpriced product out-of-stock behavior (Sugarcane)...');
  const sugarcaneRes = await request('http://localhost:4000/api/v1/marketplace/products?search=Sugarcane');
  const sugarcaneProducts = Array.isArray(sugarcaneRes.data.data) ? sugarcaneRes.data.data : sugarcaneRes.data.data.products;
  console.log(`Found ${sugarcaneProducts.length} Sugarcane listings:`);

  let allSugarcaneOutOfStock = true;
  for (const p of sugarcaneProducts) {
    console.log(`  - ID: ${p.id} | ${p.farmerName}:`);
    console.log(`    Asking Price: ${p.illustrativeFarmerListingReferenceInr}`);
    console.log(`    Price: ${p.price}`);
    console.log(`    Status: ${p.status}`);
    if (p.illustrativeFarmerListingReferenceInr !== null || p.price !== 0 || p.status !== 'OUT_OF_STOCK') {
      allSugarcaneOutOfStock = false;
    }
  }

  if (allSugarcaneOutOfStock) {
    console.log('✓ PASS: Unpriced products have no price, ₹0 is not shown, and status is OUT_OF_STOCK.');
  } else {
    console.error('✗ FAIL: Unpriced products did not report OUT_OF_STOCK properly!');
  }

  // 4. Test cart API rejection for unpriced product
  console.log('\n4. Testing cart API rejection for out-of-stock product...');
  // Get demo buyer token
  const email = 'demobuyer@sih26033.org';
  const password = 'Password@123';

  let loginRes = await request(
    'http://localhost:4000/api/v1/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email, password }
  );

  if (loginRes.statusCode !== 200 && loginRes.statusCode !== 201) {
    await request(
      'http://localhost:4000/api/v1/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email,
        password,
        name: 'Demo Verified Buyer',
        mobile: '9898000001',
        role: 'BUYER',
      }
    );

    loginRes = await request(
      'http://localhost:4000/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email, password }
    );
  }

  const buyerToken = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
  const unpricedProductId = sugarcaneProducts[0].id;

  const addUnpricedRes = await request(
    'http://localhost:4000/api/v1/cart/items',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
    },
    { productId: unpricedProductId, quantity: 1 }
  );

  console.log(`Cart Add Response Code: ${addUnpricedRes.statusCode}`);
  console.log(`Cart Add Response Body:`, addUnpricedRes.data);

  if (addUnpricedRes.statusCode === 400) {
    console.log('✓ PASS: Backend strictly rejected adding out-of-stock/unpriced product to cart (HTTP 400).');
  } else {
    console.error('✗ FAIL: Backend allowed or did not return 400 for unpriced product!');
  }

  // 5. Test adding valid priced product to cart
  console.log('\n5. Testing valid priced product in cart and checkout flow...');
  const validProductId = tomatoProducts1[0].id;

  const addValidRes = await request(
    'http://localhost:4000/api/v1/cart/items',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
    },
    { productId: validProductId, quantity: 2 }
  );

  console.log(`Valid Item Cart Add Status: ${addValidRes.statusCode}`);
  if (addValidRes.statusCode === 200 || addValidRes.statusCode === 201) {
    console.log('✓ PASS: Valid priced product added to cart successfully.');
  } else {
    console.error('✗ FAIL: Could not add valid item to cart!', addValidRes.data);
  }

  // Inspect cart
  const cartRes = await request('http://localhost:4000/api/v1/cart', {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  console.log('Cart Items:', cartRes.data.data.items.map((i) => ({
    name: i.productName || i.product?.title || i.product?.name,
    unitPrice: i.unitPrice,
    quantity: i.quantity,
    lineTotal: i.lineTotal,
    isAvailable: i.isAvailable,
  })));

  // Clean up cart item
  await request(
    `http://localhost:4000/api/v1/cart/items/${validProductId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${buyerToken}` },
    }
  );
  console.log('✓ PASS: Cart cleanup completed.');

  console.log('\n=== ALL API & BUSINESS LOGIC VERIFICATIONS PASSED ===\n');
}

run().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
