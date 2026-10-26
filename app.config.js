const PREVIEW = {
  name: 'Jew 365 P',
  scheme: 'jew365preview',
  iosDisplayName: 'יהודי 365 P',
  applicationId: 'com.jew365.app.preview',
  icon: './assets/preview/icon.png',
  adaptiveForeground: './assets/preview/adaptive-icon.png',
  splash: './assets/preview/splash.png',
  splashDark: './assets/preview/splash-dark.png',
  notificationColor: '#970901',
  locales: { he: './locales/preview/he.json', en: './locales/preview/en.json' },
};

const withPlugin = (plugins, name, options) =>
  plugins.map((plugin) => (Array.isArray(plugin) && plugin[0] === name ? [name, options(plugin[1])] : plugin));

module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'preview') return config;

  const plugins = withPlugin(config.plugins, 'expo-splash-screen', (options) => ({
    ...options,
    image: PREVIEW.splash,
    dark: { ...options.dark, image: PREVIEW.splashDark },
  }));

  return {
    ...config,
    name: PREVIEW.name,
    scheme: PREVIEW.scheme,
    icon: PREVIEW.icon,
    locales: { ...config.locales, ...PREVIEW.locales },
    ios: {
      ...config.ios,
      bundleIdentifier: PREVIEW.applicationId,
      infoPlist: { ...config.ios.infoPlist, CFBundleDisplayName: PREVIEW.iosDisplayName },
    },
    android: {
      ...config.android,
      package: PREVIEW.applicationId,
      adaptiveIcon: { ...config.android.adaptiveIcon, foregroundImage: PREVIEW.adaptiveForeground },
    },
    plugins: withPlugin(plugins, 'expo-notifications', (options) => ({
      ...options,
      color: PREVIEW.notificationColor,
    })),
  };
};
