#!/usr/bin/env node
import { Buffer } from 'node:buffer';
import { createSign } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_PACKAGE = 'com.jew365.app';
const DEFAULT_KEY_PATH = join(homedir(), '.store-keys', 'play-service-account.json');
const API_ROOT = process.env.PLAY_API_ROOT ?? 'https://androidpublisher.googleapis.com';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

const USAGE = `Usage: node scripts/store/play.mjs <command> [args] [--package <id>]

Read (never changes anything):
  tracks                      every track with its releases
  track <track>               one track (production, beta, alpha, internal, or a closed-testing track id)
  testers <track>             the Google Groups that may test that track
  listing [language]          store listings (all, or one language such as iw-IL, en-US)
  details                     contact email, phone, website, default language
  bundles                     uploaded app bundles (version codes)
  reviews [--max <n>]         recent reviews (the API keeps the last 7 days of text reviews)

Write (validated only; add --commit to apply, and --not-sent-for-review when Play asks for it):
  reply <reviewId> <text>                                    reply to a review (applies at once, needs --commit)
  upload <file.aab> --track <t> [--status <s>] [--name <n>] [--notes-he <file>] [--notes-en <file>]
  promote --from <t> --to <t> [--status <s>] [--fraction <0-1>]
  rollout <track> (--fraction <0-1> | --halt | --complete)
  testers-set <track> <group@googlegroups.com>[,<group>...]

Status values: draft, inProgress, halted, completed (default completed; inProgress needs --fraction).
Key: PLAY_SERVICE_ACCOUNT_KEY, else ${DEFAULT_KEY_PATH}.`;

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) flags[name] = true;
    else {
      flags[name] = next;
      i++;
    }
  }
  return { positional, flags };
}

const base64url = (value) => Buffer.from(value).toString('base64url');

async function accessToken() {
  const keyPath = process.env.PLAY_SERVICE_ACCOUNT_KEY ?? DEFAULT_KEY_PATH;
  let key;
  try {
    key = JSON.parse(readFileSync(keyPath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read the service account key at ${keyPath} (${error.code ?? error.message})`);
  }
  const tokenUri = key.token_uri ?? 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(
    JSON.stringify({ iss: key.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 }),
  )}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(`Token request failed: ${response.status} ${body.error_description ?? body.error ?? ''}`);
  return body.access_token;
}

function client(token, packageName) {
  const appRoot = `${API_ROOT}/androidpublisher/v3/applications/${encodeURIComponent(packageName)}`;
  async function call(method, path, { json, body, contentType, root = appRoot, query } = {}) {
    const url = new URL(`${root}${path}`);
    for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, String(value));
    const headers = { authorization: `Bearer ${token}` };
    if (json !== undefined) headers['content-type'] = 'application/json';
    if (contentType) headers['content-type'] = contentType;
    const response = await fetch(url, { method, headers, body: json !== undefined ? JSON.stringify(json) : body });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : {};
    if (!response.ok)
      throw new Error(`${method} ${url.pathname} failed: ${response.status} ${parsed.error?.message ?? text}`);
    return parsed;
  }
  return {
    call,
    upload: (path, body, contentType) =>
      call('POST', path, {
        body,
        contentType,
        root: `${API_ROOT}/upload/androidpublisher/v3/applications/${encodeURIComponent(packageName)}`,
        query: { uploadType: 'media' },
      }),
  };
}

async function withEdit(api, flags, work, { write = false } = {}) {
  const { id } = await api.call('POST', '/edits', { json: {} });
  try {
    const result = await work(id);
    if (!write) return result;
    if (!flags.commit) {
      await api.call('POST', `/edits/${id}:validate`);
      return {
        validated: true,
        committed: false,
        note: 'Dry run: the edit is valid. Re-run with --commit to apply it.',
        result,
      };
    }
    const query = flags['not-sent-for-review'] ? { changesNotSentForReview: true } : undefined;
    await api.call('POST', `/edits/${id}:commit`, { query });
    return { validated: true, committed: true, result };
  } finally {
    if (!write || !flags.commit) await api.call('DELETE', `/edits/${id}`).catch(() => {});
  }
}

const required = (value, name) => {
  if (value === undefined || value === true) throw new Error(`Missing ${name}.\n\n${USAGE}`);
  return value;
};

function releaseNotes(flags) {
  const notes = [];
  if (flags['notes-he']) notes.push({ language: 'iw-IL', text: readFileSync(flags['notes-he'], 'utf8').trim() });
  if (flags['notes-en']) notes.push({ language: 'en-US', text: readFileSync(flags['notes-en'], 'utf8').trim() });
  return notes.length ? notes : undefined;
}

function releaseStatus(flags) {
  const status = flags.status ?? (flags.fraction ? 'inProgress' : 'completed');
  if (!['draft', 'inProgress', 'halted', 'completed'].includes(status)) throw new Error(`Unknown status ${status}`);
  const userFraction = flags.fraction ? Number(flags.fraction) : undefined;
  if (userFraction !== undefined && !(userFraction > 0 && userFraction < 1))
    throw new Error('--fraction must be between 0 and 1');
  if (status === 'inProgress' && userFraction === undefined) throw new Error('inProgress needs --fraction');
  return { status, ...(userFraction !== undefined && { userFraction }) };
}

const COMMANDS = {
  tracks: (api, _args, flags) => withEdit(api, flags, (edit) => api.call('GET', `/edits/${edit}/tracks`)),
  track: (api, [track], flags) =>
    withEdit(api, flags, (edit) => api.call('GET', `/edits/${edit}/tracks/${required(track, '<track>')}`)),
  testers: (api, [track], flags) =>
    withEdit(api, flags, (edit) => api.call('GET', `/edits/${edit}/testers/${required(track, '<track>')}`)),
  listing: (api, [language], flags) =>
    withEdit(api, flags, (edit) => api.call('GET', `/edits/${edit}/listings${language ? `/${language}` : ''}`)),
  details: (api, _args, flags) => withEdit(api, flags, (edit) => api.call('GET', `/edits/${edit}/details`)),
  bundles: (api, _args, flags) => withEdit(api, flags, (edit) => api.call('GET', `/edits/${edit}/bundles`)),
  reviews: (api, _args, flags) => api.call('GET', '/reviews', { query: { maxResults: flags.max ?? 50 } }),

  reply: async (api, [reviewId, ...words], flags) => {
    const replyText = required(words.join(' ') || undefined, '<text>');
    required(reviewId, '<reviewId>');
    if (!flags.commit)
      return { committed: false, note: 'Dry run: re-run with --commit to post this reply.', reviewId, replyText };
    return api.call('POST', `/reviews/${reviewId}:reply`, { json: { replyText } });
  },
  upload: (api, [file], flags) => {
    const aab = required(file, '<file.aab>');
    const track = required(flags.track, '--track');
    statSync(aab);
    return withEdit(
      api,
      flags,
      async (edit) => {
        const { versionCode } = await api.upload(
          `/edits/${edit}/bundles`,
          readFileSync(aab),
          'application/octet-stream',
        );
        const release = {
          versionCodes: [String(versionCode)],
          ...releaseStatus(flags),
          releaseNotes: releaseNotes(flags),
        };
        if (flags.name) release.name = flags.name;
        return api.call('PUT', `/edits/${edit}/tracks/${track}`, { json: { track, releases: [release] } });
      },
      { write: true },
    );
  },
  promote: (api, _args, flags) => {
    const from = required(flags.from, '--from');
    const to = required(flags.to, '--to');
    return withEdit(
      api,
      flags,
      async (edit) => {
        const source = await api.call('GET', `/edits/${edit}/tracks/${from}`);
        const latest =
          (source.releases ?? []).find((release) => release.status === 'completed') ?? source.releases?.[0];
        if (!latest) throw new Error(`Track ${from} has no release to promote`);
        const release = {
          name: latest.name,
          versionCodes: latest.versionCodes,
          releaseNotes: latest.releaseNotes,
          ...releaseStatus(flags),
        };
        return api.call('PUT', `/edits/${edit}/tracks/${to}`, { json: { track: to, releases: [release] } });
      },
      { write: true },
    );
  },
  rollout: (api, [track], flags) => {
    required(track, '<track>');
    if (!flags.fraction && !flags.halt && !flags.complete)
      throw new Error('rollout needs --fraction, --halt or --complete');
    return withEdit(
      api,
      flags,
      async (edit) => {
        const current = await api.call('GET', `/edits/${edit}/tracks/${track}`);
        const releases = current.releases ?? [];
        const active = releases.find((release) => release.status === 'inProgress' || release.status === 'halted');
        if (!active) throw new Error(`Track ${track} has no staged rollout`);
        if (flags.halt) active.status = 'halted';
        else if (flags.complete) {
          active.status = 'completed';
          delete active.userFraction;
        } else Object.assign(active, releaseStatus({ fraction: flags.fraction }));
        const kept = flags.complete
          ? releases.filter((release) => release === active || release.status !== 'completed')
          : releases;
        return api.call('PUT', `/edits/${edit}/tracks/${track}`, { json: { track, releases: kept } });
      },
      { write: true },
    );
  },
  'testers-set': (api, [track, groups], flags) => {
    required(track, '<track>');
    const googleGroups = required(groups, '<groups>')
      .split(',')
      .map((group) => group.trim())
      .filter(Boolean);
    return withEdit(
      api,
      flags,
      (edit) => api.call('PUT', `/edits/${edit}/testers/${track}`, { json: { googleGroups } }),
      {
        write: true,
      },
    );
  },
};

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [command, ...args] = positional;
  if (!command || flags.help || !COMMANDS[command]) {
    console.log(USAGE);
    return command && !flags.help ? 1 : 0;
  }
  const api = client(await accessToken(), flags.package ?? DEFAULT_PACKAGE);
  console.log(JSON.stringify(await COMMANDS[command](api, args, flags), null, 2));
  return 0;
}

main().then(
  (code) => (process.exitCode = code),
  (error) => {
    console.error(error.message);
    process.exitCode = 1;
  },
);
