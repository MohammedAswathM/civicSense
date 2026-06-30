const { spawnSync } = require('node:child_process');

const result = spawnSync('java', ['-version'], { stdio: 'ignore' });

if (result.status !== 0) {
  console.error('Java is required for Firebase Firestore/Storage emulators.');
  console.error('Install a JDK, then rerun npm run test:integration.');
  process.exit(1);
}
