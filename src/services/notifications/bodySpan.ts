import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

// The marker the patched expo-notifications puts on its presenter module (patches/expo-notifications.patch): a binary
// built with the patch colours `data.bodySpan` of a notification's body, any other binary ignores it. The JavaScript
// reaches binaries of both kinds over the air, so it asks the binary, never assumes.
export const BODY_SPAN_MODULE = 'ExpoNotificationPresenter';
export const BODY_SPAN_MARKER = 'jew365BodySpan';
export const BODY_SPAN_VERSION = 1;

// Whether this binary's Android notification builder draws a body span in its colour. Never throws.
export function bodySpanSupported(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    const presenter = requireOptionalNativeModule<Record<string, unknown>>(BODY_SPAN_MODULE);
    return presenter?.[BODY_SPAN_MARKER] === BODY_SPAN_VERSION;
  } catch {
    return false;
  }
}
