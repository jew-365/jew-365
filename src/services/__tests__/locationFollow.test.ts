const mockGetForeground = jest.fn();
const mockRequestForeground = jest.fn();
const mockGetCurrentPosition = jest.fn();
const mockGetLastKnown = jest.fn();

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: (...args: unknown[]) => mockGetForeground(...args),
  requestForegroundPermissionsAsync: (...args: unknown[]) => mockRequestForeground(...args),
  getCurrentPositionAsync: (...args: unknown[]) => mockGetCurrentPosition(...args),
  getLastKnownPositionAsync: (...args: unknown[]) => mockGetLastKnown(...args),
  Accuracy: { Balanced: 3, High: 4 },
}));

import { followDeviceLocation } from '../locationFollow';
import { CITIES, findCityById } from '@/data/cities';
import { useUserStore } from '@/stores/useUserStore';

const JERUSALEM = findCityById('jerusalem')!;
const TEL_AVIV = findCityById('tel-aviv')!;
const fix = (lat: number, lng: number) => ({ coords: { latitude: lat, longitude: lng } });

function startAt(source: 'gps' | 'manual', status: 'ready' | 'missing' = 'ready') {
  useUserStore.getState().setLocationState(JERUSALEM, status, source);
}

describe('followDeviceLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserStore.getState().reset();
    mockGetForeground.mockResolvedValue({ granted: true, canAskAgain: true });
    mockGetLastKnown.mockResolvedValue(null);
    mockGetCurrentPosition.mockResolvedValue(fix(TEL_AVIV.lat, TEL_AVIV.lng));
  });

  it('moves a GPS location to where the phone is now, with that city', async () => {
    startAt('gps');
    expect(await followDeviceLocation()).toBe(true);
    const { location, locationSource, locationStatus, inIsrael } = useUserStore.getState();
    expect(location).toMatchObject({ cityId: 'tel-aviv', lat: TEL_AVIV.lat, lng: TEL_AVIV.lng, tz: TEL_AVIV.tz });
    expect({ locationSource, locationStatus, inIsrael }).toEqual({
      locationSource: 'gps',
      locationStatus: 'ready',
      inIsrael: true,
    });
  });

  it('takes a recent last-known fix first and asks for a new one only without it', async () => {
    startAt('gps');
    mockGetLastKnown.mockResolvedValue(fix(TEL_AVIV.lat, TEL_AVIV.lng));
    expect(await followDeviceLocation()).toBe(true);
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
  });

  it('leaves a GPS location alone for a move under a kilometre', async () => {
    startAt('gps');
    const before = useUserStore.getState().location;
    mockGetCurrentPosition.mockResolvedValue(fix(JERUSALEM.lat + 0.004, JERUSALEM.lng));
    expect(await followDeviceLocation()).toBe(false);
    expect(useUserStore.getState().location).toBe(before);
  });

  it('keeps a city the user picked by hand, and never reads the phone for it', async () => {
    startAt('manual');
    expect(await followDeviceLocation()).toBe(false);
    expect(useUserStore.getState().location.cityId).toBe('jerusalem');
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
    expect(mockGetLastKnown).not.toHaveBeenCalled();
  });

  it('replaces the default place nobody confirmed', async () => {
    startAt('manual', 'missing');
    expect(await followDeviceLocation()).toBe(true);
    expect(useUserStore.getState()).toMatchObject({ locationSource: 'gps', locationStatus: 'ready' });
    expect(useUserStore.getState().location.cityId).toBe('tel-aviv');
  });

  it('never asks for the permission, and changes nothing without it', async () => {
    startAt('gps');
    mockGetForeground.mockResolvedValue({ granted: false, canAskAgain: true });
    expect(await followDeviceLocation()).toBe(false);
    expect(mockRequestForeground).not.toHaveBeenCalled();
    expect(useUserStore.getState().location.cityId).toBe('jerusalem');
  });

  it('changes nothing when no fix comes, and never rejects', async () => {
    startAt('gps');
    mockGetCurrentPosition.mockRejectedValue(new Error('no fix'));
    expect(await followDeviceLocation()).toBe(false);
    mockGetForeground.mockRejectedValue(new Error('broken'));
    expect(await followDeviceLocation()).toBe(false);
    expect(useUserStore.getState().location.cityId).toBe('jerusalem');
  });

  it('runs one lookup at a time', async () => {
    startAt('gps');
    const [first, second] = [followDeviceLocation(), followDeviceLocation()];
    expect(first).toBe(second);
    await first;
    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('gives a far fix its own place, not a city it is not in', async () => {
    startAt('gps');
    const farFromEveryCity = { lat: 64.1466, lng: -21.9426 };
    expect(CITIES.some((city) => Math.abs(city.lat - farFromEveryCity.lat) < 1)).toBe(false);
    mockGetCurrentPosition.mockResolvedValue(fix(farFromEveryCity.lat, farFromEveryCity.lng));
    expect(await followDeviceLocation()).toBe(true);
    expect(useUserStore.getState().location).toMatchObject({ cityId: undefined, ...farFromEveryCity });
  });
});
