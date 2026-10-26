#!/usr/bin/env node
const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');
const { expo } = require('../app.json');

const PAGE = 50;
const NUMBERED = /^"?\d+\.\d+\.\d+-(\d+):/;
const MESSAGE_FLAGS = ['--message', '-m'];
const WHATS_NEW_SOURCE = path.join(__dirname, '..', 'src', 'data', 'guide.ts');
const WHATS_NEW_LABEL = /\blabel:\s*'(\d+\.\d+\.\d+-\d+)'/g;
const SKIP_WHATS_NEW = '--skip-whats-new';
const ROLLBACK = /^Rollback to /;

function nextUpdateNumber(messages) {
  const numbers = messages
    .map((message) => NUMBERED.exec(message)?.[1])
    .filter(Boolean)
    .map(Number);
  return (numbers.length ? Math.max(...numbers) : messages.length) + 1;
}

function messageAt(args) {
  return args.findIndex((arg) => MESSAGE_FLAGS.includes(arg) || arg.startsWith('--message='));
}

function messageOf(args) {
  const at = messageAt(args);
  if (at === -1) return null;
  return args[at].includes('=') ? args[at].slice('--message='.length) : (args[at + 1] ?? null);
}

function whatsNewLabels(source) {
  return [...source.matchAll(WHATS_NEW_LABEL)].map((match) => match[1]);
}

function requireWhatsNew(channel, label, args, labels) {
  const rest = args.filter((arg) => arg !== SKIP_WHATS_NEW);
  if (rest.length !== args.length) {
    if (!ROLLBACK.test(messageOf(rest) ?? '')) {
      throw new Error(`${SKIP_WHATS_NEW} is only for a rollback: its --message must start with "Rollback to ".`);
    }
    return rest;
  }
  if (channel === 'production' && !labels.includes(label)) {
    throw new Error(
      `WHATS_NEW in src/data/guide.ts has no entry for ${label}. Add { label: '${label}', date, items } at the top of WHATS_NEW, run pnpm guide:build, and publish again.`,
    );
  }
  return rest;
}

function labelMessage(args, label) {
  const at = messageAt(args);
  if (at === -1 || (!args[at].includes('=') && args[at + 1] === undefined)) {
    throw new Error('Pass --message "<what changed>"; it is stored after the update number.');
  }
  const labeled = [...args];
  if (args[at].includes('=')) labeled[at] = `--message=${label}: ${args[at].slice('--message='.length)}`;
  else labeled[at + 1] = `${label}: ${args[at + 1]}`;
  return labeled;
}

function eas(args, options = {}) {
  const [command, prefix] =
    process.platform === 'win32'
      ? [process.execPath, [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js')]]
      : ['npx', []];
  return spawnSync(command, [...prefix, 'eas-cli', ...args], { encoding: 'utf8', ...options });
}

function publishedMessages(branch, runtimeVersion) {
  const messages = [];
  for (let offset = 0; ; offset += PAGE) {
    const list = eas([
      'update:list',
      '--branch',
      branch,
      '--runtime-version',
      runtimeVersion,
      '--limit',
      String(PAGE),
      '--offset',
      String(offset),
      '--json',
    ]);
    if (list.status !== 0) {
      if (/Could not find branch/.test(list.stderr)) return messages;
      throw new Error(`eas update:list failed:\n${list.stderr || list.error}`);
    }
    const page = JSON.parse(list.stdout).currentPage;
    messages.push(...page.map((update) => update.message ?? ''));
    if (page.length < PAGE) return messages;
  }
}

function main(argv = process.argv.slice(2)) {
  const [channel, ...rest] = argv.filter((arg) => arg !== '--');
  if (!channel)
    throw new Error('Usage: node scripts/publish-update.js <channel> --message "<what changed>" [eas update flags]');
  const number = nextUpdateNumber(publishedMessages(channel, expo.version));
  const label = `${expo.version}-${number}`;
  const publishArgs = requireWhatsNew(channel, label, rest, whatsNewLabels(fs.readFileSync(WHATS_NEW_SOURCE, 'utf8')));
  const args = labelMessage(publishArgs, label);
  process.stdout.write(`Publishing ${label} to ${channel}\n`);
  const update = eas(['update', '--channel', channel, '--clear-cache', ...args], {
    stdio: 'inherit',
    env: updateEnv(channel, number),
  });
  return update.status ?? 1;
}

function updateEnv(channel, number, env = process.env) {
  const next = { ...env, EXPO_PUBLIC_UPDATE_NUMBER: String(number) };
  if (channel === 'preview') next.APP_VARIANT = 'preview';
  else delete next.APP_VARIANT;
  return next;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = { nextUpdateNumber, labelMessage, whatsNewLabels, requireWhatsNew, main };
