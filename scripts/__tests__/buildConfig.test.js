const fs = require('fs');
const path = require('path');
const eas = require('../../eas.json');
const pkg = require('../../package.json');

const root = path.join(__dirname, '..', '..');

describe('the build profiles', () => {
  it('builds the direct APK for phone processors only, 64-bit and 32-bit ARM', () => {
    const apk = eas.build['production-apk'];
    expect(apk.android).toEqual({
      gradleCommand: ':app:assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a',
    });
    expect(apk.channel).toBe('production');
    expect(apk.autoIncrement).toBe(true);
  });

  it('leaves the Play AAB with every ABI, since Play sends each phone its own', () => {
    expect(eas.build.production.android).toBeUndefined();
    expect(eas.build.production.channel).toBe('production');
  });
});

describe('the expo-notifications patch', () => {
  const [name, file] = Object.entries(pkg.pnpm.patchedDependencies ?? {}).find(([dep]) =>
    dep.startsWith('expo-notifications@'),
  ) ?? [null, null];

  it('is registered for the installed version, so every install (EAS included) applies it', () => {
    expect(name).toBe(`expo-notifications@${require('expo-notifications/package.json').version}`);
    expect(fs.existsSync(path.join(root, file))).toBe(true);
  });

  it('builds expo-notifications from source on Android, since its prebuilt AAR would skip the patch', () => {
    const prebuilt = path.join(path.dirname(require.resolve('expo-notifications/package.json')), 'local-maven-repo');
    expect(fs.existsSync(prebuilt)).toBe(true);
    expect(pkg.expo.autolinking.android.buildFromSource).toContain('expo-notifications');
  });

  it('colours data.bodySpan in the builder and carries the marker the JavaScript reads', () => {
    const { BODY_SPAN_MARKER, BODY_SPAN_VERSION } = jest.requireActual('../../src/services/notifications/bodySpan');
    const patch = fs.readFileSync(path.join(root, file), 'utf8');
    expect(patch).toContain(`+    Constants("${BODY_SPAN_MARKER}" to ${BODY_SPAN_VERSION})`);
    expect(patch).toContain('+    val span = content.body?.optJSONObject("bodySpan") ?: return text');
    expect(patch).toContain('+    builder.setStyle(NotificationCompat.BigTextStyle().bigText(text))');
  });

  it('is applied to the installed package', () => {
    const presenter =
      require.resolve('expo-notifications/android/src/main/java/expo/modules/notifications/notifications/presentation/ExpoNotificationPresentationModule.kt');
    expect(fs.readFileSync(presenter, 'utf8')).toContain('Constants("jew365BodySpan" to 1)');
  });
});
