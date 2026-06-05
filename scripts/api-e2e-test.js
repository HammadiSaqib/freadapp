// Simple API E2E test for dev server endpoints
// Usage: node scripts/api-e2e-test.js

(async () => {
  try {
    const base = process.env.BASE_URL || 'http://localhost:8080';

    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@creditrepairpro.com', password: 'demo123' }),
    });
    const loginJson = await loginRes.json();
    console.log('Login status:', loginRes.status);
    console.log('Login body:', loginJson);

    const token = loginJson.token || (loginJson.data && loginJson.data.token);
    if (!token) {
      console.error('No token in login response');
      process.exit(1);
    }

    const headers = { Authorization: `Bearer ${token}` };

    const profileRes = await fetch(`${base}/api/auth/profile`, { headers });
    const profileJson = await profileRes.json();
    console.log('Profile status:', profileRes.status);
    console.log('Profile body:', profileJson);

    const subscriptionRes = await fetch(`${base}/api/billing/subscription`, { headers });
    const subscriptionJson = await subscriptionRes.json();
    console.log('Subscription status:', subscriptionRes.status);
    console.log('Subscription body:', subscriptionJson);

    console.log('API E2E test completed');
    process.exit(0);
  } catch (err) {
    console.error('API E2E test failed:', err);
    process.exit(1);
  }
})();