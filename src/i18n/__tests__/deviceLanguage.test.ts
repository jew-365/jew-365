jest.mock('react-native/Libraries/Settings/Settings', () => ({ __esModule: true, default: { get: jest.fn() } }));

import { I18nManager, Platform, Settings } from 'react-native';
import { deviceLanguage } from '../deviceLanguage';

type OS = 'ios' | 'android' | 'web';

function onPlatform(os: OS) {
  jest.replaceProperty(Platform, 'OS', os);
}

function localeIdentifier(identifier: string | undefined) {
  jest
    .spyOn(I18nManager, 'getConstants')
    .mockReturnValue({ isRTL: false, doLeftAndRightSwapInRTL: true, localeIdentifier: identifier });
}

function appleLanguages(value: unknown) {
  jest.spyOn(Settings, 'get').mockImplementation((key: string) => (key === 'AppleLanguages' ? value : undefined));
}

function navigatorWith(value: unknown) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });
  return () => {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else delete (globalThis as { navigator?: unknown }).navigator;
  };
}

describe('deviceLanguage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('on iOS', () => {
    beforeEach(() => onPlatform('ios'));

    it('reads Hebrew from the first of the preferred languages', () => {
      appleLanguages(['he-IL', 'en-US']);
      localeIdentifier('en_US');
      expect(deviceLanguage()).toBe('he');
    });

    it('reads English from the first of the preferred languages, whatever follows', () => {
      appleLanguages(['en-US', 'he-IL']);
      localeIdentifier('he_IL');
      expect(deviceLanguage()).toBe('en');
    });

    it('reads the legacy Hebrew code iw as Hebrew', () => {
      appleLanguages(['iw']);
      expect(deviceLanguage()).toBe('he');
    });

    it('falls back to the locale identifier without preferred languages', () => {
      appleLanguages(undefined);
      localeIdentifier('he_IL');
      expect(deviceLanguage()).toBe('he');
    });

    it('falls back to the locale identifier for an empty list or an empty first entry', () => {
      appleLanguages([]);
      localeIdentifier('fr_FR');
      expect(deviceLanguage()).toBe('en');
      appleLanguages(['']);
      expect(deviceLanguage()).toBe('en');
    });

    it('reads any other language as English', () => {
      appleLanguages(['fr-FR']);
      expect(deviceLanguage()).toBe('en');
    });

    it('answers Hebrew when the read throws', () => {
      jest.spyOn(Settings, 'get').mockImplementation(() => {
        throw new Error('no settings');
      });
      localeIdentifier('en_US');
      expect(deviceLanguage()).toBe('he');
    });

    it('answers Hebrew when nothing is readable', () => {
      appleLanguages(undefined);
      localeIdentifier(undefined);
      expect(deviceLanguage()).toBe('he');
    });
  });

  describe('on Android', () => {
    beforeEach(() => {
      onPlatform('android');
      appleLanguages(['en-US']);
    });

    it('reads Hebrew from the locale identifier', () => {
      localeIdentifier('he_IL');
      expect(deviceLanguage()).toBe('he');
    });

    it('reads the legacy Hebrew code iw as Hebrew', () => {
      localeIdentifier('iw_IL');
      expect(deviceLanguage()).toBe('he');
    });

    it('reads any other language as English', () => {
      localeIdentifier('fr_FR');
      expect(deviceLanguage()).toBe('en');
    });

    it('never asks the iOS settings', () => {
      localeIdentifier('he_IL');
      deviceLanguage();
      expect(Settings.get).not.toHaveBeenCalled();
    });

    it('answers Hebrew when the read throws', () => {
      jest.spyOn(I18nManager, 'getConstants').mockImplementation(() => {
        throw new Error('no constants');
      });
      expect(deviceLanguage()).toBe('he');
    });

    it('answers Hebrew when nothing is readable', () => {
      localeIdentifier('');
      expect(deviceLanguage()).toBe('he');
    });
  });

  describe('on web', () => {
    let restoreNavigator: () => void = () => undefined;

    beforeEach(() => onPlatform('web'));
    afterEach(() => restoreNavigator());

    it('reads Hebrew from the first of navigator.languages', () => {
      restoreNavigator = navigatorWith({ languages: ['he'], language: 'en-US' });
      expect(deviceLanguage()).toBe('he');
    });

    it('reads English from the first of navigator.languages', () => {
      restoreNavigator = navigatorWith({ languages: ['en-GB', 'he'], language: 'he' });
      expect(deviceLanguage()).toBe('en');
    });

    it('falls back to navigator.language', () => {
      restoreNavigator = navigatorWith({ language: 'he-IL' });
      expect(deviceLanguage()).toBe('he');
    });

    it('answers Hebrew when the read throws', () => {
      restoreNavigator = navigatorWith({
        get languages(): string[] {
          throw new Error('no languages');
        },
      });
      expect(deviceLanguage()).toBe('he');
    });

    it('answers Hebrew when nothing is readable', () => {
      restoreNavigator = navigatorWith(undefined);
      expect(deviceLanguage()).toBe('he');
      restoreNavigator();
      restoreNavigator = navigatorWith({});
      expect(deviceLanguage()).toBe('he');
    });
  });
});
