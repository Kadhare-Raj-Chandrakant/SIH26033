async function testAuth() {
  const users = [
    { email: 'demobuyer@sih26033.org', password: 'Password@123', label: 'Buyer Demo (Quick Button 1)' },
    { email: 'farmer1_demo@sih26033.org', password: 'Password@123', label: 'Farmer Demo (Quick Button 2)' },
    { email: 'fpo_demo@sih26033.org', password: 'Password@123', label: 'FPO Demo (Quick Button 3)' },
    { email: 'farmer@example.com', password: 'Password@123', label: 'Farmer Example' },
    { email: 'fpo@example.com', password: 'Password@123', label: 'FPO Example' }
  ];

  for (const u of users) {
    const res = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, password: u.password })
    });
    const data = await res.json();
    console.log(`[${u.label}] -> HTTP ${res.status} | Success: ${data.success} | Role: ${data.data?.user?.role} | Token: ${data.data?.accessToken?.slice(0, 20)}...`);
  }
}

testAuth().catch(console.error);
