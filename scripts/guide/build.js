#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const run = spawnSync(
  'npx',
  ['jest', '--runTestsByPath', 'src/data/__tests__/guide.test.ts', '--testNamePattern', 'guide.web.copy'],
  {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, GUIDE_WRITE: '1' },
  },
);
process.exit(run.status ?? 1);
