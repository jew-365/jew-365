const mockCheck = jest.fn();
const mockFetch = jest.fn(async () => ({ isNew: true }));
const mockReload = jest.fn(async () => {});
const mockUpdates: { isEnabled: boolean; updateId: string | null; createdAt: Date | null; channel?: string | null } = {
  isEnabled: true,
  updateId: 'running-id',
  createdAt: new Date('2026-10-08T12:00:00.000Z'),
};

jest.mock('expo-updates', () => ({
  get isEnabled() {
    return mockUpdates.isEnabled;
  },
  get channel() {
    return mockUpdates.channel ?? null;
  },
  get updateId() {
    return mockUpdates.updateId;
  },
  get createdAt() {
    return mockUpdates.createdAt;
  },
  checkForUpdateAsync: () => mockCheck(),
  fetchUpdateAsync: () => mockFetch(),
  reloadAsync: () => mockReload(),
}));

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.17' } } }));

import {
  appVersionLabel,
  downloadNewUpdate,
  isUpdateApplied,
  onProductionChannel,
  reloadIntoUpdate,
} from '../appUpdates';

const globals = globalThis as { __DEV__?: boolean };
const AVAILABLE = { isAvailable: true, manifest: { id: 'u1', createdAt: '2026-10-08T14:00:00.000Z' } };
const OLDER = '2026-10-08T11:00:00.000Z';
const NEWER = '2026-10-08T14:00:00.000Z';

beforeEach(() => {
  mockCheck.mockReset();
  mockFetch.mockClear();
  mockReload.mockClear();
  mockUpdates.isEnabled = true;
  mockUpdates.updateId = 'running-id';
  mockUpdates.createdAt = new Date('2026-10-08T12:00:00.000Z');
  globals.__DEV__ = false;
});
afterEach(() => {
  globals.__DEV__ = true;
});

describe('downloadNewUpdate', () => {
  it('returns null in development without asking the server', async () => {
    globals.__DEV__ = true;
    mockCheck.mockResolvedValue(AVAILABLE);

    await expect(downloadNewUpdate()).resolves.toBeNull();
    expect(mockCheck).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns null while updates are disabled', async () => {
    mockUpdates.isEnabled = false;
    mockCheck.mockResolvedValue(AVAILABLE);

    await expect(downloadNewUpdate()).resolves.toBeNull();
    expect(mockCheck).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns null and does not fetch when the server has nothing newer', async () => {
    mockCheck.mockResolvedValue({ isAvailable: false, manifest: undefined, reason: 'noUpdateAvailableOnServer' });

    await expect(downloadNewUpdate()).resolves.toBeNull();
    expect(mockCheck).toHaveBeenCalledTimes(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('downloads and returns the id and creation time of an available update', async () => {
    mockCheck.mockResolvedValue(AVAILABLE);

    await expect(downloadNewUpdate()).resolves.toEqual({ id: 'u1', createdAt: '2026-10-08T14:00:00.000Z' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('reads an embedded-shaped manifest by its commit time', async () => {
    mockCheck.mockResolvedValue({ isAvailable: true, manifest: { id: 'e1', commitTime: Date.parse(NEWER) } });

    await expect(downloadNewUpdate()).resolves.toEqual({ id: 'e1', createdAt: NEWER });
  });
});

describe('isUpdateApplied', () => {
  it('is true for the running update itself', () => {
    expect(isUpdateApplied({ updateId: 'running-id' })).toBe(true);
    expect(isUpdateApplied({ updateId: 'running-id', updateCreatedAt: NEWER })).toBe(true);
  });

  it('is true for an older update once a newer one runs, false for a newer one', () => {
    expect(isUpdateApplied({ updateId: 'u1', updateCreatedAt: OLDER })).toBe(true);
    expect(isUpdateApplied({ updateId: 'u1', updateCreatedAt: '2026-10-08T12:00:00.000Z' })).toBe(true);
    expect(isUpdateApplied({ updateId: 'u1', updateCreatedAt: NEWER })).toBe(false);
  });

  it('is false for another update without a creation time to compare', () => {
    expect(isUpdateApplied({ updateId: 'u1' })).toBe(false);
    expect(isUpdateApplied({})).toBe(false);
    expect(isUpdateApplied({ updateId: 'u1', updateCreatedAt: 'not a date' })).toBe(false);
  });

  it('does not treat a missing id as applied while updates are disabled', () => {
    mockUpdates.updateId = null;
    mockUpdates.createdAt = null;
    expect(isUpdateApplied({})).toBe(false);
    expect(isUpdateApplied({ updateId: 'u1', updateCreatedAt: OLDER })).toBe(false);
  });
});

describe('reloadIntoUpdate', () => {
  it('reloads and swallows a failure', async () => {
    await expect(reloadIntoUpdate()).resolves.toBeUndefined();
    expect(mockReload).toHaveBeenCalledTimes(1);

    mockReload.mockRejectedValueOnce(new Error('reload refused'));
    await expect(reloadIntoUpdate()).resolves.toBeUndefined();
    expect(mockReload).toHaveBeenCalledTimes(2);
  });
});

describe('appVersionLabel', () => {
  const original = process.env.EXPO_PUBLIC_UPDATE_NUMBER;
  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_UPDATE_NUMBER;
    else process.env.EXPO_PUBLIC_UPDATE_NUMBER = original;
  });

  it('joins the version and the update number', () => {
    process.env.EXPO_PUBLIC_UPDATE_NUMBER = '3';
    expect(appVersionLabel()).toBe('1.0.17-3');

    delete process.env.EXPO_PUBLIC_UPDATE_NUMBER;
    expect(appVersionLabel()).toBe('1.0.17-0');
  });
});

describe('onProductionChannel', () => {
  afterEach(() => {
    mockUpdates.channel = null;
  });

  it.each([
    ['production', true],
    ['preview', false],
    ['development', false],
    [null, false],
  ] as const)('reads the channel %s as production: %s', (channel, expected) => {
    mockUpdates.channel = channel;
    expect(onProductionChannel()).toBe(expected);
  });
});
