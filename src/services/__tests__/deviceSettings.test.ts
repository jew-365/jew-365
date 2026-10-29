const mockSendIntent = jest.fn(async (_action: string) => {});
const mockOpenSettings = jest.fn(async () => {});
const mockPlatform: { OS: string; Version: number; constants: { Manufacturer?: string } } = {
  OS: 'android',
  Version: 34,
  constants: { Manufacturer: 'samsung' },
};
const mockRequire = jest.fn((_name: string): unknown => null);
const mockStatus = jest.fn(async (): Promise<number> => 2);

jest.mock('react-native', () => ({
  get Platform() {
    return mockPlatform;
  },
  Linking: {
    sendIntent: (action: string) => mockSendIntent(action),
    openSettings: () => mockOpenSettings(),
  },
}));
jest.mock('expo', () => ({ requireOptionalNativeModule: (name: string) => mockRequire(name) }));
jest.mock('expo-background-task', () => ({
  getStatusAsync: () => mockStatus(),
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
}));

import {
  backgroundRefreshStatus,
  hasPowerSettingsModule,
  isIgnoringBatteryOptimizations,
  isSamsungDevice,
  openBatteryOptimizationSettings,
  openSamsungNeverSleeping,
  openUnusedAppRestrictions,
  requestIgnoreBatteryOptimizations,
  supportsBatteryOptimizationSettings,
  supportsUnusedAppRestrictions,
  unusedAppRestrictionsStatus,
} from '../deviceSettings';

const BATTERY_LIST = 'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS';

const native = {
  isIgnoringBatteryOptimizations: jest.fn(async () => true),
  requestIgnoreBatteryOptimizations: jest.fn(async () => true),
  openSamsungNeverSleeping: jest.fn(async () => true),
  unusedAppRestrictionsStatus: jest.fn(async () => 'enabled'),
  openUnusedAppRestrictions: jest.fn(async () => true),
};

beforeEach(() => {
  mockPlatform.OS = 'android';
  mockPlatform.Version = 34;
  mockPlatform.constants = { Manufacturer: 'samsung' };
  mockSendIntent.mockReset();
  mockSendIntent.mockImplementation(async () => {});
  mockOpenSettings.mockReset();
  mockOpenSettings.mockImplementation(async () => {});
  mockStatus.mockReset();
  mockStatus.mockImplementation(async () => 2);
  native.isIgnoringBatteryOptimizations.mockReset().mockResolvedValue(true);
  native.requestIgnoreBatteryOptimizations.mockReset().mockResolvedValue(true);
  native.openSamsungNeverSleeping.mockReset().mockResolvedValue(true);
  native.unusedAppRestrictionsStatus.mockReset().mockResolvedValue('enabled');
  native.openUnusedAppRestrictions.mockReset().mockResolvedValue(true);
  mockRequire.mockReset();
  mockRequire.mockImplementation(() => native);
});

describe('openBatteryOptimizationSettings', () => {
  it('is offered on Android only', () => {
    expect(supportsBatteryOptimizationSettings()).toBe(true);
  });

  it('opens the battery optimisation list, not the permission dialog', async () => {
    await expect(openBatteryOptimizationSettings()).resolves.toBe(true);
    expect(mockSendIntent).toHaveBeenCalledWith(BATTERY_LIST);
    expect(mockOpenSettings).not.toHaveBeenCalled();
  });

  it('falls back to the app settings page when the ROM has no such screen', async () => {
    mockSendIntent.mockImplementation(async () => {
      throw new Error('No Activity found to handle Intent');
    });

    await expect(openBatteryOptimizationSettings()).resolves.toBe(false);
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('never rejects, so a dead intent cannot bubble into the UI', async () => {
    mockSendIntent.mockImplementation(async () => {
      throw new Error('boom');
    });
    mockOpenSettings.mockImplementation(async () => {
      throw new Error('also boom');
    });

    await expect(openBatteryOptimizationSettings()).resolves.toBe(false);
  });
});

describe('isIgnoringBatteryOptimizations', () => {
  it('returns the native answer', async () => {
    await expect(isIgnoringBatteryOptimizations()).resolves.toBe(true);
  });

  it('returns null when the native call rejects', async () => {
    native.isIgnoringBatteryOptimizations.mockRejectedValue(new Error('boom'));
    await expect(isIgnoringBatteryOptimizations()).resolves.toBeNull();
  });

  it('returns null without the module', async () => {
    mockRequire.mockImplementation(() => null);
    await expect(isIgnoringBatteryOptimizations()).resolves.toBeNull();
  });

  it('returns null on iOS without asking for the module', async () => {
    mockPlatform.OS = 'ios';
    await expect(isIgnoringBatteryOptimizations()).resolves.toBeNull();
    expect(mockRequire).not.toHaveBeenCalled();
  });
});

describe('requestIgnoreBatteryOptimizations', () => {
  it('opens the system dialog and stops there', async () => {
    await expect(requestIgnoreBatteryOptimizations()).resolves.toBe(true);
    expect(mockSendIntent).not.toHaveBeenCalled();
  });

  it('falls back to the battery list when the dialog does not open', async () => {
    native.requestIgnoreBatteryOptimizations.mockResolvedValue(false);
    await expect(requestIgnoreBatteryOptimizations()).resolves.toBe(false);
    expect(mockSendIntent).toHaveBeenCalledWith(BATTERY_LIST);
  });

  it('falls back to the battery list when the native call rejects', async () => {
    native.requestIgnoreBatteryOptimizations.mockRejectedValue(new Error('boom'));
    await expect(requestIgnoreBatteryOptimizations()).resolves.toBe(false);
    expect(mockSendIntent).toHaveBeenCalledWith(BATTERY_LIST);
  });

  it('falls back to the battery list without the module', async () => {
    mockRequire.mockImplementation(() => null);
    await expect(requestIgnoreBatteryOptimizations()).resolves.toBe(false);
    expect(mockSendIntent).toHaveBeenCalledWith(BATTERY_LIST);
  });

  it('ends on the app settings page when the list is missing too', async () => {
    mockRequire.mockImplementation(() => null);
    mockSendIntent.mockImplementation(async () => {
      throw new Error('no screen');
    });
    await expect(requestIgnoreBatteryOptimizations()).resolves.toBe(false);
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });
});

describe('isSamsungDevice', () => {
  it('matches the manufacturer case-insensitively', () => {
    mockPlatform.constants = { Manufacturer: 'samsung' };
    expect(isSamsungDevice()).toBe(true);
    mockPlatform.constants = { Manufacturer: 'Samsung' };
    expect(isSamsungDevice()).toBe(true);
  });

  it('is false for other makers, a missing maker and iOS', () => {
    mockPlatform.constants = { Manufacturer: 'Google' };
    expect(isSamsungDevice()).toBe(false);
    mockPlatform.constants = {};
    expect(isSamsungDevice()).toBe(false);
    mockPlatform.OS = 'ios';
    mockPlatform.constants = { Manufacturer: 'samsung' };
    expect(isSamsungDevice()).toBe(false);
  });
});

describe('openSamsungNeverSleeping', () => {
  it('opens the list through the module', async () => {
    await expect(openSamsungNeverSleeping()).resolves.toBe(true);
    expect(mockOpenSettings).not.toHaveBeenCalled();
  });

  it('opens the app settings when the list does not open', async () => {
    native.openSamsungNeverSleeping.mockResolvedValue(false);
    await expect(openSamsungNeverSleeping()).resolves.toBe(false);
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('opens the app settings without the module', async () => {
    mockRequire.mockImplementation(() => null);
    await expect(openSamsungNeverSleeping()).resolves.toBe(false);
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });
});

describe('hasPowerSettingsModule', () => {
  it('is true on Android with the module linked', () => {
    expect(hasPowerSettingsModule()).toBe(true);
  });

  it('is false when the binary has no module', () => {
    mockRequire.mockImplementation(() => null);
    expect(hasPowerSettingsModule()).toBe(false);
  });

  it('is false off Android', () => {
    mockPlatform.OS = 'ios';
    expect(hasPowerSettingsModule()).toBe(false);
  });
});

describe('supportsUnusedAppRestrictions', () => {
  it('needs Android 11 or later', () => {
    mockPlatform.Version = 29;
    expect(supportsUnusedAppRestrictions()).toBe(false);
    mockPlatform.Version = 30;
    expect(supportsUnusedAppRestrictions()).toBe(true);
    mockPlatform.OS = 'ios';
    expect(supportsUnusedAppRestrictions()).toBe(false);
  });
});

describe('unusedAppRestrictionsStatus', () => {
  it('returns the native status', async () => {
    await expect(unusedAppRestrictionsStatus()).resolves.toBe('enabled');
  });

  it('returns null below Android 11 without calling the module', async () => {
    mockPlatform.Version = 29;
    await expect(unusedAppRestrictionsStatus()).resolves.toBeNull();
    expect(native.unusedAppRestrictionsStatus).not.toHaveBeenCalled();
  });

  it('returns null when the native call rejects', async () => {
    native.unusedAppRestrictionsStatus.mockRejectedValue(new Error('boom'));
    await expect(unusedAppRestrictionsStatus()).resolves.toBeNull();
  });
});

describe('openUnusedAppRestrictions', () => {
  it('opens the page through the module', async () => {
    await expect(openUnusedAppRestrictions()).resolves.toBe(true);
    expect(mockOpenSettings).not.toHaveBeenCalled();
  });

  it('opens the app settings when the page does not open or the module is missing', async () => {
    native.openUnusedAppRestrictions.mockResolvedValue(false);
    await expect(openUnusedAppRestrictions()).resolves.toBe(false);
    mockRequire.mockImplementation(() => null);
    await expect(openUnusedAppRestrictions()).resolves.toBe(false);
    expect(mockOpenSettings).toHaveBeenCalledTimes(2);
  });
});

describe('backgroundRefreshStatus', () => {
  it('maps the iOS status', async () => {
    mockPlatform.OS = 'ios';
    mockStatus.mockResolvedValue(2);
    await expect(backgroundRefreshStatus()).resolves.toBe('available');
    mockStatus.mockResolvedValue(1);
    await expect(backgroundRefreshStatus()).resolves.toBe('restricted');
    mockStatus.mockRejectedValue(new Error('boom'));
    await expect(backgroundRefreshStatus()).resolves.toBeNull();
  });

  it('is null on Android without asking', async () => {
    await expect(backgroundRefreshStatus()).resolves.toBeNull();
    expect(mockStatus).not.toHaveBeenCalled();
  });
});

describe('app.json', () => {
  it('requests the battery exemption permission', () => {
    const config = require('../../../app.json');
    expect(config.expo.android.permissions).toContain('REQUEST_IGNORE_BATTERY_OPTIMIZATIONS');
  });
});
