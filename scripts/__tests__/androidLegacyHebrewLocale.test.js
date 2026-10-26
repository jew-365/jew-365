const fs = require('fs');
const os = require('os');
const path = require('path');
const { AndroidConfig } = require('expo/config-plugins');
const appConfig = require('../../app.json');
const { writeLegacyHebrewStrings } = require('../withAndroidLegacyHebrewLocale');

const REPO = path.join(__dirname, '..', '..');

function projectWith(locales) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jew365-iw-'));
  fs.mkdirSync(path.join(root, 'android', 'app', 'src', 'main', 'res'), { recursive: true });
  for (const [file, body] of Object.entries(locales)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(body, path.join(root, file));
  }
  return root;
}

const resFile = (root, dir) => path.join(root, 'android', 'app', 'src', 'main', 'res', dir, 'strings.xml');

async function expoHebrewStrings(root, file) {
  await AndroidConfig.Locales.setLocalesAsync({ locales: { he: file } }, { projectRoot: root });
  const written = resFile(root, 'values-b+he');
  for (let tries = 0; !fs.existsSync(written) || !fs.readFileSync(written, 'utf8'); tries += 1) {
    if (tries > 200) throw new Error(`Expo never wrote ${written}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return fs.readFileSync(written, 'utf8');
}

describe('Android legacy Hebrew locale', () => {
  it('runs right after the backup rules plugin', () => {
    const plugins = appConfig.expo.plugins;
    expect(plugins).toContain('./scripts/withAndroidLegacyHebrewLocale');
    expect(plugins.indexOf('./scripts/withAndroidLegacyHebrewLocale')).toBe(
      plugins.indexOf('./scripts/withAndroidBackupRules') + 1,
    );
  });

  it.each([
    ['production', './locales/he.json', 'יהודי 365'],
    ['preview', './locales/preview/he.json', 'יהודי 365 P'],
  ])('writes the %s Hebrew app name to values-b+iw exactly as Expo writes values-b+he', async (_, file, name) => {
    const root = projectWith({ [file]: path.join(REPO, file) });
    try {
      expect(await writeLegacyHebrewStrings(root, file)).toBe(resFile(root, 'values-b+iw'));
      const legacy = fs.readFileSync(resFile(root, 'values-b+iw'), 'utf8');
      expect(legacy).toContain(`<string name="app_name">"${name}"</string>`);
      expect(legacy).not.toMatch(/CFBundleDisplayName|NS\w+UsageDescription/);
      expect(legacy).toBe(await expoHebrewStrings(root, file));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
