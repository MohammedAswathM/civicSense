const url = process.env.CIVICSENSE_URL || 'http://localhost:3000';

const response = await fetch(url);
if (!response.ok) {
  throw new Error(`Smoke test failed: ${url} returned ${response.status}`);
}

const html = await response.text();
if (!html.includes('CivicSense')) {
  throw new Error('Smoke test failed: homepage did not include CivicSense');
}

console.log(`Smoke test passed: ${url}`);

export {};
