const mockRequire = jest.fn();
jest.mock('expo', () => ({ requireOptionalNativeModule: (name: string) => mockRequire(name) }));

import { Platform } from 'react-native';
import { BODY_SPAN_MARKER, BODY_SPAN_MODULE, bodySpanSupported } from '../bodySpan';

const setOS = (os: typeof Platform.OS) => Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

describe('bodySpanSupported, the marker of the patched expo-notifications', () => {
  const original = Platform.OS;
  afterEach(() => {
    setOS(original);
    mockRequire.mockReset();
  });

  it('is true on Android when the presenter module carries the marker', () => {
    setOS('android');
    mockRequire.mockReturnValue({ [BODY_SPAN_MARKER]: 1 });
    expect(bodySpanSupported()).toBe(true);
    expect(mockRequire).toHaveBeenCalledWith(BODY_SPAN_MODULE);
  });

  it('is false on a binary without the patch, without the module, or with another marker value', () => {
    setOS('android');
    mockRequire.mockReturnValue({ getPresentedNotificationsAsync: jest.fn() });
    expect(bodySpanSupported()).toBe(false);
    mockRequire.mockReturnValue(null);
    expect(bodySpanSupported()).toBe(false);
    mockRequire.mockReturnValue({ [BODY_SPAN_MARKER]: 2 });
    expect(bodySpanSupported()).toBe(false);
    mockRequire.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(bodySpanSupported()).toBe(false);
  });

  it('is false on the iPhone and the web, whatever the module says', () => {
    mockRequire.mockReturnValue({ [BODY_SPAN_MARKER]: 1 });
    for (const os of ['ios', 'web'] as const) {
      setOS(os);
      expect(bodySpanSupported()).toBe(false);
    }
    expect(mockRequire).not.toHaveBeenCalled();
  });
});
