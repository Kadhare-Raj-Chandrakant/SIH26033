// scripts/verify-roles.mjs
// Automated verification of role-based API protection

const API_BASE = 'http://localhost:4000/api/v1';

async function main() {
  console.log('--- STARTING ROLE ACCESS VERIFICATION ---');
  let failures = 0;

  async function assertStatus(desc, res, expectedStatus) {
    if (res.status === expectedStatus) {
      console.log(`[PASS] ${desc} (HTTP ${res.status})`);
    } else {
      console.error(`[FAIL] ${desc} — expected ${expectedStatus}, got ${res.status}`);
      failures++;
    }
  }

  // 1. Test Public Endpoints without token
  console.log('\n1. Testing Public Endpoints (Logged-out visitor)...');
  const pubMarket = await fetch(`${API_BASE}/marketplace/products?limit=2`);
  await assertStatus('Public browse products without auth', pubMarket, 200);

  const pubCat = await fetch(`${API_BASE}/categories`);
  await assertStatus('Public browse categories without auth', pubCat, 200);

  // 2. Test Protected Endpoints without token
  console.log('\n2. Testing Protected Endpoints without token (Must return 401)...');
  const noAuthCart = await fetch(`${API_BASE}/cart`);
  await assertStatus('Unauthenticated access to Cart', noAuthCart, 401);

  const noAuthOrders = await fetch(`${API_BASE}/orders`);
  await assertStatus('Unauthenticated access to Orders', noAuthOrders, 401);

  const noAuthSellerOrders = await fetch(`${API_BASE}/seller/orders`);
  await assertStatus('Unauthenticated access to Seller Orders', noAuthSellerOrders, 401);

  const noAuthSellerProducts = await fetch(`${API_BASE}/seller/products`);
  await assertStatus('Unauthenticated access to Seller Products', noAuthSellerProducts, 401);

  // 3. Test Buyer Authentication & Authorization
  console.log('\n3. Testing Buyer Authentication & Role Boundaries...');
  // Log in as Demo Buyer
  let buyerRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demobuyer@sih26033.org', password: 'Password@123' }),
  });
  if (!buyerRes.ok) {
    // Register demo buyer if not existing
    await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demobuyer@sih26033.org',
        password: 'Password@123',
        name: 'Demo Verified Buyer',
        mobile: '9898000001',
        role: 'BUYER',
      }),
    });
    buyerRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demobuyer@sih26033.org', password: 'Password@123' }),
    });
  }
  const buyerData = await buyerRes.json();
  const buyerToken = buyerData.data?.accessToken || buyerData.accessToken;
  console.log(`Buyer token acquired. User Role: ${buyerData.data?.user?.role || buyerData.user?.role}`);

  // Buyer accessing Buyer APIs -> Allowed (200)
  const buyerCart = await fetch(`${API_BASE}/cart`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  await assertStatus('Buyer accessing Buyer Cart API', buyerCart, 200);

  const buyerOrders = await fetch(`${API_BASE}/orders`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  await assertStatus('Buyer accessing Buyer Orders API', buyerOrders, 200);

  // Buyer accessing Farmer APIs -> Forbidden (403)
  const buyerAccessSellerOrders = await fetch(`${API_BASE}/seller/orders`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  await assertStatus('Buyer accessing Farmer Orders API (Must be 403)', buyerAccessSellerOrders, 403);

  const buyerAccessSellerProducts = await fetch(`${API_BASE}/seller/products`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  await assertStatus('Buyer accessing Farmer Products API (Must be 403)', buyerAccessSellerProducts, 403);

  // 4. Test Farmer Authentication & Authorization
  console.log('\n4. Testing Farmer Authentication & Role Boundaries...');
  // Log in as Demo Farmer
  let farmerRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'farmer1_demo@sih26033.org', password: 'Password@123' }),
  });
  if (!farmerRes.ok) {
    await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'farmer1_demo@sih26033.org',
        password: 'Password@123',
        name: 'Ramesh Farmer (Demo)',
        mobile: '9898000002',
        role: 'FARMER',
      }),
    });
    farmerRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'farmer1_demo@sih26033.org', password: 'Password@123' }),
    });
  }
  const farmerData = await farmerRes.json();
  const farmerToken = farmerData.data?.accessToken || farmerData.accessToken;
  console.log(`Farmer token acquired. User Role: ${farmerData.data?.user?.role || farmerData.user?.role}`);

  // Farmer accessing Farmer APIs -> Allowed (200)
  const farmerSellerOrders = await fetch(`${API_BASE}/seller/orders`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  await assertStatus('Farmer accessing Farmer Orders API', farmerSellerOrders, 200);

  const farmerSellerProducts = await fetch(`${API_BASE}/seller/products`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  await assertStatus('Farmer accessing Farmer Products API', farmerSellerProducts, 200);

  // Farmer accessing Buyer APIs -> Forbidden (403)
  const farmerAccessCart = await fetch(`${API_BASE}/cart`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  await assertStatus('Farmer accessing Buyer Cart API (Must be 403)', farmerAccessCart, 403);

  const farmerAccessOrders = await fetch(`${API_BASE}/orders`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  await assertStatus('Farmer accessing Buyer Orders API (Must be 403)', farmerAccessOrders, 403);

  console.log('\n--- VERIFICATION SUMMARY ---');
  if (failures === 0) {
    console.log('ALL API SECURITY & ROLE TESTS PASSED SUCCESSFULLY! (0 failures)');
  } else {
    console.error(`FAILED: ${failures} test(s) failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
