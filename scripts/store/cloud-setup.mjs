#!/usr/bin/env node
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { accessSync, appendFileSync, constants, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ASC_VERSION = '5.17.0';
const ASC_BUILDS = {
  x64: { asset: 'linux_amd64', sha256: 'b3dea1087f3c031b1c2fcdae7404db40e3a97c893f8f4b0752800005f61ade42' },
  arm64: { asset: 'linux_arm64', sha256: '60e24781fac466f187f21c1ba3c3703643daf1dc97df892509f1ed81a6197668' },
};
const SYSTEM_BIN = '/usr/local/bin';
const USER_BIN = join(homedir(), '.local', 'bin');

const writable = (dir) => {
  try {
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

const versionOf = (binary) => {
  try {
    return execFileSync(binary, ['--version'], { encoding: 'utf8' });
  } catch {
    return '';
  }
};

async function install(binary) {
  const build = ASC_BUILDS[process.arch];
  if (!build) throw new Error(`no asc ${ASC_VERSION} build for linux/${process.arch}`);
  const url = `https://github.com/rorkai/App-Store-Connect-CLI/releases/download/${ASC_VERSION}/asc_${ASC_VERSION}_${build.asset}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`downloading ${url} failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== build.sha256)
    throw new Error(`asc ${ASC_VERSION} checksum mismatch: expected ${build.sha256}, got ${digest}`);
  const partial = `${binary}.partial`;
  writeFileSync(partial, bytes, { mode: 0o755 });
  renameSync(partial, binary);
}

async function main() {
  if (process.env.CLAUDE_CODE_REMOTE !== 'true') return;
  if (process.platform !== 'linux') throw new Error(`cloud sessions run on Linux, not ${process.platform}`);
  const dir = writable(SYSTEM_BIN) ? SYSTEM_BIN : USER_BIN;
  mkdirSync(dir, { recursive: true });
  const binary = join(dir, 'asc');
  if (!versionOf(binary).startsWith(ASC_VERSION)) await install(binary);
  execFileSync(binary, ['telemetry', 'disable'], { stdio: 'ignore' });
  if (dir === USER_BIN && process.env.CLAUDE_ENV_FILE)
    appendFileSync(process.env.CLAUDE_ENV_FILE, `export PATH="${USER_BIN}:$PATH"\n`);
  console.log(
    `asc ${ASC_VERSION} is ready at ${binary} with telemetry off. Store reads in a cloud session: section 0.5 of .claude/skills/store-console/SKILL.md.`,
  );
}

main().catch((error) => {
  console.error(`cloud-setup: ${error.message}`);
  process.exitCode = 1;
});
