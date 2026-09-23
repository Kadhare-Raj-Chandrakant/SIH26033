const API_BASE_URL = 'http://localhost:4000/api/v1';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function demoLoginBuyer() {
  const email = 'demobuyer@sih26033.org';
  const password = 'Password@123';

  let loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const json = await loginRes.json();
  const token = json.data?.accessToken || json.accessToken;
  const user = json.data?.user || json.user;

  if (!token) {
    throw new Error('Failed to retrieve buyer authentication token: ' + JSON.stringify(json));
  }
  return { token, user };
}

async function demoLoginSeller(sellerType) {
  const email = sellerType === 'FARMER' ? 'farmer1_demo@sih26033.org' : 'fpo_demo@sih26033.org';
  const password = 'Password@123';

  let loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const json = await loginRes.json();
  const token = json.data?.accessToken || json.accessToken;
  const user = json.data?.user || json.user;

  if (!token) {
    throw new Error('Failed to retrieve seller authentication token: ' + JSON.stringify(json));
  }
  return { token, user };
}

async function run() {
  console.log('Testing Buyer 1-Click Demo Login...');
  const buyerResult = await demoLoginBuyer();
  console.log('✅ Buyer Demo Success:', buyerResult.user);

  await sleep(1000);

  console.log('\nTesting Farmer 1-Click Demo Login...');
  const farmerResult = await demoLoginSeller('FARMER');
  console.log('✅ Farmer Demo Success:', farmerResult.user);

  await sleep(1000);

  console.log('\nTesting FPO 1-Click Demo Login...');
  const fpoResult = await demoLoginSeller('FPO');
  console.log('✅ FPO Demo Success:', fpoResult.user);
}

run().catch(console.error);
