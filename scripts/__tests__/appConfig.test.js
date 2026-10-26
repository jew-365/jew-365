const fs = require('fs');
const path = require('path');
const appJson = require('../../app.json');
const appConfig = require('../../app.config.js');

const ROOT = path.join(__dirname, '..', '..');
const production = appJson.expo;
const PREVIEW_ID = 'com.jew365.app.preview';
const PREVIEW_ASSETS = ['icon', 'adaptive-icon', 'splash', 'splash-dark'];

const clone = (value) => JSON.parse(JSON.stringify(value));
const pluginOptions = (config, name) => config.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === name)[1];
const exists = (relative) => fs.existsSync(path.join(ROOT, relative));

const originalVariant = process.env.APP_VARIANT;

afterEach(() => {
  if (originalVariant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = originalVariant;
});

function configFor(variant) {
  if (variant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = variant;
  return appConfig({ config: clone(production) });
}

function withoutPreviewFields(config) {
  const rest = clone(config);
  for (const key of ['name', 'scheme', 'icon']) delete rest[key];
  delete rest.locales.he;
  delete rest.locales.en;
  delete rest.ios.bundleIdentifier;
  delete rest.ios.infoPlist.CFBundleDisplayName;
  delete rest.android.package;
  delete rest.android.adaptiveIcon.foregroundImage;
  const splash = pluginOptions(rest, 'expo-splash-screen');
  delete splash.image;
  delete splash.dark.image;
  delete pluginOptions(rest, 'expo-notifications').color;
  return rest;
}

function readHeader(relative) {
  const buf = fs.readFileSync(path.join(ROOT, relative));
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), depth: buf[24], colorType: buf[25] };
}

describe('app.config.js without the preview variant', () => {
  it.each([undefined, 'production', 'development', ''])(
    'returns the app.json config itself for APP_VARIANT=%p',
    (variant) => {
      if (variant === undefined) delete process.env.APP_VARIANT;
      else process.env.APP_VARIANT = variant;
      const config = clone(production);
      expect(appConfig({ config })).toBe(config);
      expect(config).toEqual(production);
    },
  );
});

describe('app.config.js with APP_VARIANT=preview', () => {
  it('names the app Jew 365 P and gives it its own scheme, package and bundle id', () => {
    const preview = configFor('preview');
    expect(preview.name).toBe('Jew 365 P');
    expect(preview.scheme).toBe('jew365preview');
    expect(preview.android.package).toBe(PREVIEW_ID);
    expect(preview.ios.bundleIdentifier).toBe(PREVIEW_ID);
    expect(preview.ios.infoPlist.CFBundleDisplayName).toBe('יהודי 365 P');
    expect(preview.ios.infoPlist.CFBundleDisplayName).toBe(
      require('../../locales/preview/he.json').ios.CFBundleDisplayName,
    );
    expect(production.ios.infoPlist.CFBundleDisplayName).toBe('יהודי 365');
    expect(production.android.package).toBe('com.jew365.app');
    expect(production.ios.bundleIdentifier).toBe('com.jew365.app');
    expect(production.scheme).toBe('jew365');
  });

  it('points the icons, the splash and the native strings at the preview files', () => {
    const preview = configFor('preview');
    expect(preview.icon).toBe('./assets/preview/icon.png');
    expect(preview.android.adaptiveIcon).toEqual({
      ...production.android.adaptiveIcon,
      foregroundImage: './assets/preview/adaptive-icon.png',
    });
    expect(pluginOptions(preview, 'expo-splash-screen')).toEqual({
      ...pluginOptions(production, 'expo-splash-screen'),
      image: './assets/preview/splash.png',
      dark: { ...pluginOptions(production, 'expo-splash-screen').dark, image: './assets/preview/splash-dark.png' },
    });
    expect(preview.locales).toEqual({ he: './locales/preview/he.json', en: './locales/preview/en.json' });
  });

  it("colours the notification with the preview mark's red ink", () => {
    const { color, ...rest } = pluginOptions(configFor('preview'), 'expo-notifications');
    const { color: productionColor, ...productionRest } = pluginOptions(production, 'expo-notifications');
    expect(rest).toEqual(productionRest);
    expect(color).not.toBe(productionColor);
    const mark = fs.readFileSync(path.join(ROOT, 'design/jew365-concepts/vector/mark-o-preview.svg'), 'utf8');
    expect(mark).toContain(`stroke="${color}"`);
  });

  it('changes nothing else: every other key equals production', () => {
    expect(withoutPreviewFields(configFor('preview'))).toEqual(withoutPreviewFields(production));
    const preview = configFor('preview');
    expect(preview.slug).toBe(production.slug);
    expect(preview.owner).toBe(production.owner);
    expect(preview.version).toBe(production.version);
    expect(preview.updates).toEqual(production.updates);
    expect(preview.runtimeVersion).toEqual(production.runtimeVersion);
    expect(preview.extra.eas.projectId).toBe(production.extra.eas.projectId);
    expect(preview.android.permissions).toEqual(production.android.permissions);
  });

  it('leaves the config it is given untouched', () => {
    process.env.APP_VARIANT = 'preview';
    const config = clone(production);
    const preview = appConfig({ config });
    expect(preview).not.toBe(config);
    expect(config).toEqual(production);
  });

  it('names only assets and locale files that exist', () => {
    const preview = configFor('preview');
    const paths = [
      preview.icon,
      preview.android.adaptiveIcon.foregroundImage,
      preview.android.adaptiveIcon.monochromeImage,
      pluginOptions(preview, 'expo-splash-screen').image,
      pluginOptions(preview, 'expo-splash-screen').dark.image,
      pluginOptions(preview, 'expo-notifications').icon,
      ...Object.values(preview.locales),
    ];
    expect(paths).toHaveLength(8);
    for (const relative of paths) expect([relative, exists(relative)]).toEqual([relative, true]);
  });
});

describe('preview locales', () => {
  it.each([
    ['he', 'יהודי 365 P'],
    ['en', 'Jew 365 P'],
  ])('%s has the keys of the main file and differs only in the display names', (language, name) => {
    const main = require(`../../locales/${language}.json`);
    const preview = require(`../../locales/preview/${language}.json`);
    expect(Object.keys(preview.ios)).toEqual(Object.keys(main.ios));
    expect(Object.keys(preview.android)).toEqual(Object.keys(main.android));
    expect(preview.ios.CFBundleDisplayName).toBe(name);
    expect(preview.android.app_name).toBe(name);
    expect(preview.ios.CFBundleDisplayName).not.toBe(main.ios.CFBundleDisplayName);
    const rest = (locale) => {
      const copy = clone(locale);
      delete copy.ios.CFBundleDisplayName;
      delete copy.android.app_name;
      return copy;
    };
    expect(rest(preview)).toEqual(rest(main));
  });
});

describe('preview PNG assets', () => {
  it.each(PREVIEW_ASSETS)('%s.png has the size and colour type of its production file', (name) => {
    expect(readHeader(`assets/preview/${name}.png`)).toEqual(readHeader(`assets/${name}.png`));
  });
});
