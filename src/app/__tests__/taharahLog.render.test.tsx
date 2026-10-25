const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ replace: mockReplace, back: mockBack, canGoBack: () => true, push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

import { Platform } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import TaharahLogScreen from '../taharah/log';
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { chooseGender, chooseMaritalStatus, setTaharahTracking } from '@/stores/taharahOptIn';
import { useTaharahStore } from '@/stores/useTaharahStore';
import { useUserStore } from '@/stores/useUserStore';

const he = (key: string) => translate(key, undefined, 'he', null);
const timeInput = () => screen.getByLabelText(he('taharah.log.time'));

describe('Taharah log', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useTaharahStore.getState().reset();
    chooseGender('female');
    chooseMaritalStatus('married');
    setTaharahTracking(true);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  describe("the onset's time", () => {
    it('opens the number pad on Android', () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      renderWithTheme(<TaharahLogScreen />);
      expect(timeInput().props.keyboardType).toBe('number-pad');
    });

    it.each(['ios', 'web'] as const)('keeps the numbers-and-punctuation keyboard on %s', (os) => {
      jest.replaceProperty(Platform, 'OS', os);
      renderWithTheme(<TaharahLogScreen />);
      expect(timeInput().props.keyboardType).toBe('numbers-and-punctuation');
    });

    it.each([
      ['0830', '08:30'],
      ['21:15', '21:15'],
      ['21.15', '21:15'],
    ])('shows %j typed on the Android number pad as %j', (typed, shown) => {
      jest.replaceProperty(Platform, 'OS', 'android');
      renderWithTheme(<TaharahLogScreen />);
      fireEvent.changeText(timeInput(), typed);
      expect(timeInput()).toHaveDisplayValue(shown);
    });
  });
});
