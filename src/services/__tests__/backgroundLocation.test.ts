jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-location', () => ({
  getBackgroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
jest.mock('../NotificationScheduler', () => ({ NotificationScheduler: { rebuild: jest.fn(async () => {}) } }));

import { Platform } from 'react-native';
import {
  BACKGROUND_LOCATION_DISTANCE_M,
  BACKGROUND_LOCATION_INTERVAL_MS,
  BACKGROUND_LOCATION_TASK,
  backgroundLocationActive,
  backgroundLocationSupported,
  disableBackgroundLocation,
  enableBackgroundLocation,
  handleBackgroundFix,
  syncBackgroundLocation,
} from '../backgroundLocation';
import { takeScreenHold } from '../externalFlow';
import { CITIES } from '@/data/cities';
import { useUserStore } from '@/stores/useUserStore';
import { at } from '@/testing/zmanim';

const JERUSALEM = CITIES[0];
const TEL_AVIV = CITIES.find((city) => city.cityId === 'tel_aviv') ?? CITIES[1];
const WEEKDAY = at(JERUSALEM, '2026-11-18T10:00');
const SHABBAT = at(JERUSALEM, '2026-11-21T10:00');
const mockLocation = jest.requireMock('expo-location') as Record<string, jest.Mock>;
const mockRebuild = (jest.requireMock('../NotificationScheduler') as { NotificationScheduler: { rebuild: jest.Mock } })
  .NotificationScheduler.rebuild;
const task = (jest.requireMock('expo-task-manager') as { defineTask: jest.Mock }).defineTask.mock.calls[0];
const setPlatform = (os: string) => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });
const follow = (overrides = {}) =>
  useUserStore.setState({
    isOnboarded: true,
    backgroundLocation: true,
    location: JERUSALEM,
    locationStatus: 'ready',
    locationSource: 'gps',
    ...overrides,
  });

beforeEach(() => {
  Object.values(mockLocation).forEach((mock) => typeof mock === 'function' && mock.mockReset());
  mockRebuild.mockClear();
  setPlatform('android');
  useUserStore.getState().reset();
  takeScreenHold();
  mockLocation.getBackgroundPermissionsAsync.mockResolvedValue({ granted: true });
  mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  mockLocation.requestBackgroundPermissionsAsync.mockResolvedValue({ granted: true });
  mockLocation.hasStartedLocationUpdatesAsync.mockResolvedValue(false);
  mockLocation.startLocationUpdatesAsync.mockResolvedValue(undefined);
  mockLocation.stopLocationUpdatesAsync.mockResolvedValue(undefined);
});

afterAll(() => setPlatform('ios'));

describe('the background location task', () => {
  it('is defined when the module loads, under its fixed name', () => {
    expect(task[0]).toBe(BACKGROUND_LOCATION_TASK);
    expect(BACKGROUND_LOCATION_TASK).toBe('jew-365-background-location');
  });

  it('moves the place to the last fix it is handed and rebuilds the schedule', async () => {
    follow();
    const fix = (city: typeof JERUSALEM) => ({ coords: { latitude: city.lat, longitude: city.lng } });
    jest.useFakeTimers({ now: WEEKDAY, doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
    try {
      await task[1]({ data: { locations: [fix(JERUSALEM), fix(TEL_AVIV)] }, error: null });
    } finally {
      jest.useRealTimers();
    }
    expect(useUserStore.getState().location.lat).toBeCloseTo(TEL_AVIV.lat, 1);
    expect(mockRebuild).toHaveBeenCalledTimes(1);
  });

  it('ignores an error and a delivery without a fix', async () => {
    follow();
    await task[1]({ data: { locations: [] }, error: null });
    await task[1]({
      data: { locations: [{ coords: { latitude: TEL_AVIV.lat, longitude: TEL_AVIV.lng } }] },
      error: {},
    });
    expect(useUserStore.getState().location).toBe(JERUSALEM);
    expect(mockRebuild).not.toHaveBeenCalled();
  });
});

describe('handleBackgroundFix', () => {
  const point = { lat: TEL_AVIV.lat, lng: TEL_AVIV.lng };

  it('keeps the place for a fix within a kilometre, with no rebuild', async () => {
    follow();
    expect(await handleBackgroundFix({ lat: JERUSALEM.lat + 0.001, lng: JERUSALEM.lng }, WEEKDAY)).toBe(false);
    expect(useUserStore.getState().location).toBe(JERUSALEM);
    expect(mockRebuild).not.toHaveBeenCalled();
  });

  it.each([
    ['inside a holy block', {}, SHABBAT],
    ['with the setting off', { backgroundLocation: false }, WEEKDAY],
    ['before onboarding', { isOnboarded: false }, WEEKDAY],
    ['for a place picked by hand', { locationSource: 'manual' }, WEEKDAY],
  ])('moves nothing %s', async (_name, overrides, now) => {
    follow(overrides);
    expect(await handleBackgroundFix(point, now)).toBe(false);
    expect(useUserStore.getState().location).toBe(JERUSALEM);
    expect(mockRebuild).not.toHaveBeenCalled();
  });
});

describe('backgroundLocationSupported', () => {
  it('holds on Android when the binary declares the permission', async () => {
    expect(await backgroundLocationSupported()).toBe(true);
  });

  it('fails on a binary whose manifest lacks the permission, where expo-location throws', async () => {
    mockLocation.getBackgroundPermissionsAsync.mockRejectedValue(new Error('not in manifest'));
    expect(await backgroundLocationSupported()).toBe(false);
  });

  it('fails on iOS without asking the binary anything', async () => {
    setPlatform('ios');
    expect(await backgroundLocationSupported()).toBe(false);
    expect(mockLocation.getBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('enableBackgroundLocation', () => {
  it('asks for the permission behind a screen hold, saves the setting and starts the updates', async () => {
    expect(await enableBackgroundLocation()).toBe('on');
    expect(takeScreenHold()).not.toBeNull();
    expect(useUserStore.getState().backgroundLocation).toBe(true);
    expect(mockLocation.startLocationUpdatesAsync).toHaveBeenCalledWith(BACKGROUND_LOCATION_TASK, {
      accuracy: 3,
      timeInterval: BACKGROUND_LOCATION_INTERVAL_MS,
      distanceInterval: BACKGROUND_LOCATION_DISTANCE_M,
    });
    expect(BACKGROUND_LOCATION_INTERVAL_MS).toBe(600_000);
  });

  it('stays off when the permission is refused', async () => {
    mockLocation.requestBackgroundPermissionsAsync.mockResolvedValue({ granted: false });
    expect(await enableBackgroundLocation()).toBe('denied');
    expect(useUserStore.getState().backgroundLocation).toBe(false);
    expect(mockLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('never asks without the foreground permission, nor on a binary without support', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false });
    expect(await enableBackgroundLocation()).toBe('denied');
    mockLocation.getBackgroundPermissionsAsync.mockRejectedValue(new Error('not in manifest'));
    expect(await enableBackgroundLocation()).toBe('unsupported');
    expect(mockLocation.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('turns the setting back off when the updates fail to start', async () => {
    mockLocation.startLocationUpdatesAsync.mockRejectedValue(new Error('no service'));
    expect(await enableBackgroundLocation()).toBe('denied');
    expect(useUserStore.getState().backgroundLocation).toBe(false);
  });
});

describe('disableBackgroundLocation and syncBackgroundLocation', () => {
  it('saves the setting off and stops running updates', async () => {
    follow();
    mockLocation.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
    await disableBackgroundLocation();
    expect(useUserStore.getState().backgroundLocation).toBe(false);
    expect(mockLocation.stopLocationUpdatesAsync).toHaveBeenCalledWith(BACKGROUND_LOCATION_TASK);
  });

  it('starts the updates while the setting is on, the user follows the phone and the permission stands', async () => {
    follow();
    await syncBackgroundLocation();
    expect(mockLocation.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    expect(await backgroundLocationActive()).toBe(true);
  });

  it('starts nothing twice', async () => {
    follow();
    mockLocation.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
    await syncBackgroundLocation();
    expect(mockLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
    expect(mockLocation.stopLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['the setting is off', { backgroundLocation: false }, true],
    ['a place was picked by hand', { locationSource: 'manual' }, true],
    ['onboarding is not done', { isOnboarded: false }, true],
    ['the permission was withdrawn', {}, false],
  ])('stops running updates when %s', async (_name, overrides, granted) => {
    follow(overrides);
    mockLocation.getBackgroundPermissionsAsync.mockResolvedValue({ granted });
    mockLocation.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
    await syncBackgroundLocation();
    expect(mockLocation.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    expect(mockLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('keeps the setting when the permission is withdrawn, and reads as not active', async () => {
    follow();
    mockLocation.getBackgroundPermissionsAsync.mockResolvedValue({ granted: false });
    await syncBackgroundLocation();
    expect(useUserStore.getState().backgroundLocation).toBe(true);
    expect(await backgroundLocationActive()).toBe(false);
  });

  it('touches nothing on a binary without support', async () => {
    follow();
    mockLocation.getBackgroundPermissionsAsync.mockRejectedValue(new Error('not in manifest'));
    await syncBackgroundLocation();
    expect(mockLocation.hasStartedLocationUpdatesAsync).not.toHaveBeenCalled();
  });
});

describe('the wiring a build and a headless launch depend on', () => {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const root = path.resolve(__dirname, '../../..');

  it('is imported by the bundle entry, so the task is defined in a headless launch', () => {
    expect(fs.readFileSync(path.join(root, 'index.js'), 'utf8')).toContain(
      "import './src/services/backgroundLocation';",
    );
  });

  it('asks the Android build for the background permission and no foreground service', () => {
    const plugins = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo.plugins as unknown[];
    const location = plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-location') as [
      string,
      object,
    ];
    expect(location[1]).toMatchObject({
      isAndroidBackgroundLocationEnabled: true,
      isAndroidForegroundServiceEnabled: false,
    });
    expect(location[1]).not.toHaveProperty('isIosBackgroundLocationEnabled');
  });

  it('has a web shim with the same exports', () => {
    const native = jest.requireActual('../backgroundLocation') as object;
    const web = jest.requireActual('../backgroundLocation.web') as object;
    expect(Object.keys(web).sort()).toEqual(Object.keys(native).sort());
  });
});
