const fs = require('fs');
const path = require('path');
const { AndroidConfig, XML, withDangerousMod } = require('expo/config-plugins');

// Expo writes `locales.he` to values-b+he, but Android resolves a Hebrew device through the legacy
// code `iw`, so the launcher and Settings fell back to the English app name. A config `iw` locale
// would also add an iw.lproj to the iOS build, hence an Android-only copy.
const LEGACY_HEBREW_DIR = 'values-b+iw';

async function writeLegacyHebrewStrings(projectRoot, hebrewLocalePath) {
  const { ios, android, ...shared } = JSON.parse(
    await fs.promises.readFile(path.join(projectRoot, hebrewLocalePath), 'utf8'),
  );
  const stringsPath = path.join(
    await AndroidConfig.Paths.getResourceFolderAsync(projectRoot),
    LEGACY_HEBREW_DIR,
    'strings.xml',
  );
  await XML.writeXMLAsync({
    path: stringsPath,
    xml: {
      resources: Object.entries({ ...shared, ...android }).map(([name, value]) => ({
        string: { $: { name }, _: `"${value}"` },
      })),
    },
  });
  return stringsPath;
}

module.exports = function withAndroidLegacyHebrewLocale(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const hebrew = modConfig.locales?.he;
      if (typeof hebrew === 'string') await writeLegacyHebrewStrings(modConfig.modRequest.projectRoot, hebrew);
      return modConfig;
    },
  ]);
};

module.exports.writeLegacyHebrewStrings = writeLegacyHebrewStrings;
