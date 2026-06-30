const fs = require('node:fs');
const path = require('node:path');

const envPath = path.join(process.cwd(), '.env.local');
const contents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = new Map(
  contents
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [key, ...rest] = line.split('=');
      return [key, rest.join('=')];
    }),
);

const rows = [
  [
    'Gemini',
    env.get('GEMINI_API_KEY') && env.get('NEXT_PUBLIC_DEMO_MODE') !== 'true' ? 'LIVE' : 'FALLBACK',
    'Mock responses from mockResponses.ts',
  ],
  [
    'Firebase',
    env.get('NEXT_PUBLIC_USE_FIREBASE_EMULATOR') === 'true' ? 'FALLBACK' : 'LIVE',
    'Local Emulator Suite',
  ],
  ['Maps', env.get('NEXT_PUBLIC_GOOGLE_MAPS_KEY') ? 'LIVE' : 'FALLBACK', 'Static list/map fallback'],
  [
    'Phone Auth',
    env.get('NEXT_PUBLIC_USE_FIREBASE_EMULATOR') === 'true' ? 'FALLBACK' : 'LIVE',
    'Emulator OTP',
  ],
];

const green = '\x1b[32m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';

console.log('\nCivicSense environment doctor');
console.log('Integration       Mode       Without it');
console.log('-----------------------------------------------');
for (const [name, mode, fallback] of rows) {
  const color = mode === 'LIVE' ? green : yellow;
  console.log(`${name.padEnd(16)} ${color}${mode.padEnd(10)}${reset} ${fallback}`);
}
console.log('');
