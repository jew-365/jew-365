/**
 * @jest-environment node
 */
const { Buffer } = require('buffer');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'store', 'play.mjs');
const APP = '/androidpublisher/v3/applications/com.jew365.app';

let server;
let base;
let home;
let keyFile;
let keyJson;
let publicKey;
let requests;

beforeAll(async () => {
  const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  publicKey = pair.publicKey;
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      requests.push({ method: req.method, url: req.url, authorization: req.headers.authorization, body });
      const reply = (status, json) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(json === undefined ? '' : JSON.stringify(json));
      };
      if (req.url === '/token') return reply(200, { access_token: 'mock-token' });
      if (req.method === 'POST' && req.url === `${APP}/edits`) return reply(200, { id: 'e1' });
      if (req.method === 'GET' && req.url === `${APP}/edits/e1/tracks`)
        return reply(200, { tracks: [{ track: 'alpha' }] });
      if (req.method === 'DELETE' && req.url === `${APP}/edits/e1`) return reply(204);
      return reply(404, { error: { message: `unexpected ${req.method} ${req.url}` } });
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  keyJson = JSON.stringify({
    client_email: 'play-cli-test@example.iam.gserviceaccount.com',
    private_key: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }),
    token_uri: `${base}/token`,
  });
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'play-cli-'));
  keyFile = path.join(home, 'key.json');
  fs.writeFileSync(keyFile, keyJson);
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(home, { recursive: true, force: true });
});

beforeEach(() => {
  requests = [];
});

function run(args, env = {}) {
  const inherited = Object.fromEntries(
    ['PATH', 'SYSTEMROOT', 'TEMP', 'TMP'].filter((name) => process.env[name]).map((name) => [name, process.env[name]]),
  );
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], {
      env: { ...inherited, HOME: home, USERPROFILE: home, PLAY_API_ROOT: base, ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

const base64 = (text) => Buffer.from(text).toString('base64');
const trackReads = () => requests.filter((request) => request.url !== '/token').map((r) => `${r.method} ${r.url}`);

describe('play.mjs credentials', () => {
  it('signs the token request with the key from PLAY_SERVICE_ACCOUNT_KEY_B64 and reads with its token', async () => {
    const result = await run(['tracks'], { PLAY_SERVICE_ACCOUNT_KEY_B64: base64(keyJson) });
    expect(result.stderr).toBe('');
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ tracks: [{ track: 'alpha' }] });

    const token = requests.find((request) => request.url === '/token');
    const assertion = new URLSearchParams(token.body).get('assertion');
    const [header, payload, signature] = assertion.split('.');
    expect(
      crypto.verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, 'base64url')),
    ).toBe(true);
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString()).iss).toBe(
      'play-cli-test@example.iam.gserviceaccount.com',
    );
    expect(trackReads()).toEqual([`POST ${APP}/edits`, `GET ${APP}/edits/e1/tracks`, `DELETE ${APP}/edits/e1`]);
    expect(requests.filter((r) => r.url !== '/token').every((r) => r.authorization === 'Bearer mock-token')).toBe(true);
  });

  it('prefers PLAY_SERVICE_ACCOUNT_KEY_B64 over the key file', async () => {
    const result = await run(['tracks'], {
      PLAY_SERVICE_ACCOUNT_KEY_B64: base64(keyJson),
      PLAY_SERVICE_ACCOUNT_KEY: path.join(home, 'missing.json'),
    });
    expect(result.code).toBe(0);
  });

  it('still reads the key file named by PLAY_SERVICE_ACCOUNT_KEY', async () => {
    const result = await run(['tracks'], { PLAY_SERVICE_ACCOUNT_KEY: keyFile });
    expect(result.stderr).toBe('');
    expect(result.code).toBe(0);
    expect(requests.some((request) => request.url === '/token')).toBe(true);
  });

  it('sends no credentials and asks for no token with PLAY_AUTH=proxy, with no key anywhere', async () => {
    const result = await run(['tracks'], { PLAY_AUTH: 'proxy' });
    expect(result.stderr).toBe('');
    expect(result.code).toBe(0);
    expect(requests.some((request) => request.url === '/token')).toBe(false);
    expect(requests.every((request) => request.authorization === undefined)).toBe(true);
    expect(trackReads()).toHaveLength(3);
  });

  it('names the base64 variable without printing what it decodes to', async () => {
    const result = await run(['tracks'], { PLAY_SERVICE_ACCOUNT_KEY_B64: base64('secret-material') });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('PLAY_SERVICE_ACCOUNT_KEY_B64 is not the base64 of a JSON key');
    expect(result.stderr).not.toContain('secret-material');
    expect(requests).toEqual([]);
  });

  it('never prints the content of a key file that is not JSON', async () => {
    const broken = path.join(home, 'broken.json');
    fs.writeFileSync(broken, 'secret-material');
    const result = await run(['tracks'], { PLAY_SERVICE_ACCOUNT_KEY: broken });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('not a JSON key');
    expect(result.stderr).not.toContain('secret-material');
  });

  it('refuses a key without client_email or private_key', async () => {
    const result = await run(['tracks'], { PLAY_SERVICE_ACCOUNT_KEY_B64: base64('{"type":"service_account"}') });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('lacks client_email or private_key');
    expect(requests).toEqual([]);
  });
});

describe('PLAY_READ_ONLY', () => {
  const writes = [
    ['reply', 'r1', 'thanks'],
    ['upload', 'app.aab', '--track', 'alpha'],
    ['promote', '--from', 'alpha', '--to', 'beta'],
    ['rollout', 'production', '--halt'],
    ['testers-set', 'alpha', 'group@googlegroups.com'],
  ];

  it.each(writes)('refuses %s before any request, even with --commit', async (...args) => {
    const result = await run([...args, '--commit'], {
      PLAY_SERVICE_ACCOUNT_KEY_B64: base64(keyJson),
      PLAY_READ_ONLY: '1',
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(`${args[0]} would change Google Play, and PLAY_READ_ONLY is set`);
    expect(requests).toEqual([]);
  });

  it('still runs a read', async () => {
    const result = await run(['tracks'], { PLAY_SERVICE_ACCOUNT_KEY_B64: base64(keyJson), PLAY_READ_ONLY: 'true' });
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).tracks).toHaveLength(1);
  });
});
