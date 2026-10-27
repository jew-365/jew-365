type MockHeading = { trueHeading: number; magHeading: number; accuracy: number };

const mockBack = jest.fn();
const mockRemove = jest.fn();
let mockHeadingCallback: ((heading: MockHeading) => void) | null = null;
const mockWatch = jest.fn(async (callback: (heading: MockHeading) => void) => {
  mockHeadingCallback = callback;
  return { remove: mockRemove };
});
const mockPermission = jest.fn();
const mockRequest = jest.fn();
const mockPosition = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack, canGoBack: () => true }),
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  watchHeadingAsync: (callback: (heading: MockHeading) => void) => mockWatch(callback),
  getForegroundPermissionsAsync: () => mockPermission(),
  requestForegroundPermissionsAsync: () => mockRequest(),
  getCurrentPositionAsync: () => mockPosition(),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light' },
}));

import { Linking, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { act, fireEvent, screen } from '@testing-library/react-native';
import CompassScreen, { radarRadius, signedOffset } from '../compass';
import { CITIES } from '@/data/cities';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { arrowAngle, bearingTo } from '@/utils/compass';

const JERUSALEM = CITIES[0];
const NEW_YORK = CITIES.find((city) => city.cityId === 'new-york') ?? CITIES[1];
const PERMISSION = 'אפשר גישה למיקום';
const CALIBRATE = 'המצפן לא מכויל. הזז את המכשיר בתנועת שמונה';
const LESS_EXACT = 'הכיוון לפי צפון מגנטי, פחות מדויק';
const NEEDS_PERMISSION = 'כדי להציג את הכיוון צריך גישה למיקום';
const WAITING = 'ממתין לחיישן הכיוון…';
const NO_SENSOR = 'המצפן זמין רק במכשיר עם חיישן כיוון';

const rotation = (testID: string): string => {
  const style = [screen.getByTestId(testID).props.style].flat(Infinity).find((entry) => entry?.transform);
  return style.transform[0].rotate;
};

const heading = async (value: MockHeading) => {
  await act(async () => {
    mockHeadingCallback?.(value);
  });
};

const renderScreen = async () => {
  const view = renderWithTheme(<CompassScreen />);
  await act(async () => {});
  return view;
};

describe('Compass screen', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ location: NEW_YORK, inIsrael: false });
    mockHeadingCallback = null;
    mockRemove.mockClear();
    mockWatch.mockClear();
    mockRequest.mockReset();
    mockBack.mockClear();
    mockPermission.mockResolvedValue({ granted: true, canAskAgain: true });
    mockRequest.mockResolvedValue({ granted: false, canAskAgain: false });
    mockPosition.mockReset();
    mockPosition.mockRejectedValue(new Error('no fix'));
    jest.mocked(Haptics.impactAsync).mockClear();
  });

  it('names the saved city and offers the permission button without location permission', async () => {
    mockPermission.mockResolvedValue({ granted: false, canAskAgain: true });
    await renderScreen();
    expect(screen.getByText(NEEDS_PERMISSION)).toBeOnTheScreen();
    expect(screen.queryByText(NO_SENSOR)).toBeNull();
    expect(mockWatch).not.toHaveBeenCalled();
    expect(screen.queryByTestId('compass-dial')).toBeNull();
    expect(screen.getByText(`לפי ${NEW_YORK.name}`)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: PERMISSION })).toBeOnTheScreen();
    expect(screen.getByText(`${Math.round(bearingTo(NEW_YORK))}°`)).toBeOnTheScreen();
    expect(screen.getByText(/^9\d{3}$/)).toBeOnTheScreen();
    expect(screen.queryByText(/^סובב /)).toBeNull();
  });

  it('says which way to turn and how far, and turns the target and north on the radar', async () => {
    await renderScreen();
    const bearing = bearingTo(NEW_YORK);
    await heading({ trueHeading: bearing - 34, magHeading: 0, accuracy: 3 });
    expect(screen.getByText('סובב 34° ימינה')).toBeOnTheScreen();
    expect(Number.parseFloat(rotation('compass-arrow'))).toBeCloseTo(34, 5);
    await heading({ trueHeading: bearing + 20, magHeading: 0, accuracy: 3 });
    expect(screen.getByText('סובב 20° שמאלה')).toBeOnTheScreen();
    expect(screen.getByText(/ ק״מ עד הכותל$/)).toBeOnTheScreen();
    expect(screen.getByText(/° מהצפון · צפון־מזרח$/)).toBeOnTheScreen();
  });

  it('places a near Kotel inside the inner rings and a far one on the outer ring', () => {
    expect(radarRadius(0)).toBe(0);
    expect(radarRadius(200)).toBeCloseTo(150, 5);
    expect(radarRadius(9000)).toBeCloseTo(150, 5);
    expect(radarRadius(5)).toBeLessThan(radarRadius(20));
    expect(signedOffset(350)).toBe(-10);
    expect(signedOffset(10)).toBe(10);
  });

  it('turns the dial against the heading and the arrow by bearing less heading', async () => {
    await renderScreen();
    await heading({ trueHeading: 90, magHeading: 80, accuracy: 3 });
    const bearing = bearingTo(NEW_YORK);
    expect(rotation('compass-dial')).toBe('-90deg');
    expect(Number.parseFloat(rotation('compass-arrow'))).toBeCloseTo(arrowAngle(bearing, 90), 5);
    await heading({ trueHeading: 350, magHeading: 340, accuracy: 3 });
    expect(Number.parseFloat(rotation('compass-arrow'))).toBeCloseTo(arrowAngle(bearing, 350), 5);
  });

  it('reads the magnetic heading with a less exact line when the true one is missing', async () => {
    await renderScreen();
    await heading({ trueHeading: 200, magHeading: 100, accuracy: 3 });
    expect(screen.queryByText(LESS_EXACT)).toBeNull();
    await heading({ trueHeading: -1, magHeading: 100, accuracy: 3 });
    expect(screen.getByText(LESS_EXACT)).toBeOnTheScreen();
    expect(rotation('compass-dial')).toBe('-100deg');
  });

  it('shows the calibration hint at accuracy 0 and 1 only', async () => {
    await renderScreen();
    await heading({ trueHeading: 10, magHeading: 10, accuracy: 0 });
    expect(screen.getByText(CALIBRATE)).toBeOnTheScreen();
    await heading({ trueHeading: 10, magHeading: 10, accuracy: 1 });
    expect(screen.getByText(CALIBRATE)).toBeOnTheScreen();
    await heading({ trueHeading: 10, magHeading: 10, accuracy: 2 });
    expect(screen.queryByText(CALIBRATE)).toBeNull();
  });

  it('gives one light haptic when facing within 5 degrees, and again only after leaving', async () => {
    await renderScreen();
    const bearing = bearingTo(NEW_YORK);
    await heading({ trueHeading: bearing + 20, magHeading: 0, accuracy: 3 });
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    await heading({ trueHeading: bearing + 4, magHeading: 0, accuracy: 3 });
    await heading({ trueHeading: bearing + 2, magHeading: 0, accuracy: 3 });
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(screen.getByText('אתה פונה לכותל')).toBeOnTheScreen();
    await heading({ trueHeading: bearing + 30, magHeading: 0, accuracy: 3 });
    await heading({ trueHeading: bearing - 3, magHeading: 0, accuracy: 3 });
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
  });

  it('holds the facing state until the angle passes 10 degrees', async () => {
    await renderScreen();
    const bearing = bearingTo(NEW_YORK);
    await heading({ trueHeading: bearing + 3, magHeading: 0, accuracy: 3 });
    await heading({ trueHeading: bearing + 8, magHeading: 0, accuracy: 3 });
    await heading({ trueHeading: bearing + 4, magHeading: 0, accuracy: 3 });
    expect(screen.getByText('אתה פונה לכותל')).toBeOnTheScreen();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    await heading({ trueHeading: bearing + 11, magHeading: 0, accuracy: 3 });
    expect(screen.queryByText('אתה פונה לכותל')).toBeNull();
    await heading({ trueHeading: bearing + 7, magHeading: 0, accuracy: 3 });
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    await heading({ trueHeading: bearing + 5, magHeading: 0, accuracy: 3 });
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
  });

  it('takes one GPS fix when permission is granted and names it instead of the city', async () => {
    mockPermission.mockResolvedValue({ granted: true, canAskAgain: true });
    mockPosition.mockResolvedValue({ coords: { latitude: 32.0853, longitude: 34.7818 } });
    await renderScreen();
    expect(mockPosition).toHaveBeenCalledTimes(1);
    expect(screen.getByText('לפי המיקום הנוכחי שלך')).toBeOnTheScreen();
    expect(screen.getByText('129°')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: PERMISSION })).toBeNull();
  });

  it('starts the heading subscription and shows the dial once the button grants the permission', async () => {
    mockPermission.mockResolvedValueOnce({ granted: false, canAskAgain: true });
    mockPermission.mockResolvedValue({ granted: true, canAskAgain: true });
    mockRequest.mockResolvedValue({ granted: true, canAskAgain: true });
    await renderScreen();
    expect(mockWatch).not.toHaveBeenCalled();
    expect(screen.queryByTestId('compass-dial')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: PERMISSION }));
    });
    expect(mockWatch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(NEEDS_PERMISSION)).toBeNull();
    await heading({ trueHeading: 90, magHeading: 90, accuracy: 3 });
    expect(rotation('compass-dial')).toBe('-90deg');
  });

  it('requests the permission from the button, then fixes the position', async () => {
    mockRequest.mockResolvedValue({ granted: true, canAskAgain: true });
    mockPermission.mockResolvedValueOnce({ granted: false, canAskAgain: true });
    mockPermission.mockResolvedValue({ granted: true, canAskAgain: true });
    mockPosition.mockResolvedValue({ coords: { latitude: JERUSALEM.lat, longitude: JERUSALEM.lng } });
    await renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: PERMISSION }));
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockPosition).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: PERMISSION })).toBeNull();
  });

  it('opens the system settings from the button once the permission is blocked for good', async () => {
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    mockPermission.mockResolvedValue({ granted: false, canAskAgain: false });
    await renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: PERMISSION }));
    });
    expect(open).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });

  it('removes the heading subscription on blur', async () => {
    const view = await renderScreen();
    view.unmount();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('keeps the dial in a waiting state while no heading has arrived', async () => {
    await renderScreen();
    expect(screen.getByText(WAITING)).toBeOnTheScreen();
    expect(screen.getByTestId('compass-dial')).toBeOnTheScreen();
    expect(screen.queryByText(NO_SENSOR)).toBeNull();
    await heading({ trueHeading: 10, magHeading: 10, accuracy: 3 });
    expect(screen.queryByText(WAITING)).toBeNull();
  });

  it('shows the unavailable notice when the subscription itself fails', async () => {
    mockWatch.mockRejectedValueOnce(new Error('no sensor'));
    await renderScreen();
    expect(screen.getByText(NO_SENSOR)).toBeOnTheScreen();
    expect(screen.queryByTestId('compass-dial')).toBeNull();
  });

  it('survives a subscription that throws when removed', async () => {
    mockRemove.mockImplementationOnce(() => {
      throw new Error('unauthorized');
    });
    const view = await renderScreen();
    expect(() => view.unmount()).not.toThrow();
  });

  it('shows the notice on the web without subscribing', async () => {
    const platform = jest.replaceProperty(Platform, 'OS', 'web');
    await renderScreen();
    expect(screen.getByText(NO_SENSOR)).toBeOnTheScreen();
    expect(mockWatch).not.toHaveBeenCalled();
    platform.restore();
  });

  it('words the screen in English', async () => {
    useUserStore.setState({ language: 'en' });
    await renderScreen();
    expect(screen.getByText('Prayer compass')).toBeOnTheScreen();
    expect(screen.getByText(`Based on ${NEW_YORK.nameEn}`)).toBeOnTheScreen();
    expect(screen.getByText('54°')).toBeOnTheScreen();
  });
});
