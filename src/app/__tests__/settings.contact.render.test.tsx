const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn() }),
    useLocalSearchParams: () => ({}),
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
  };
});
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: { rebuild: jest.fn(async () => {}), cancelAll: jest.fn(async () => {}) },
  requestNotificationPermissions: jest.fn(async () => true),
  syncNotificationPermissionStatus: jest.fn(async () => true),
}));
jest.mock('@/services/ContactService', () => ({
  ...(jest.requireActual('@/services/ContactService') as object),
  isContactConfigured: jest.fn(() => true),
  sendContactMessage: jest.fn(async () => {}),
}));

import * as fs from 'fs';
import * as path from 'path';
import { Linking, Platform } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import SettingsScreen from '../(tabs)/settings';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import {
  CONTACT_EMAIL,
  ContactError,
  contactMailUrl,
  isContactConfigured,
  sendContactMessage,
} from '@/services/ContactService';
import { appVersionLabel } from '@/services/appUpdates';
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';

const he = (key: string, options?: Record<string, unknown>) => translate(key, options, 'he', null);
const en = (key: string) => translate(key, undefined, 'en', null);
const mockSend = jest.mocked(sendContactMessage);
const mockConfigured = jest.mocked(isContactConfigured);

async function openContactSection() {
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByText(he('settings.contact')));
}

const field = (key: string) => screen.getByLabelText(he(key));

function linkTitles() {
  const cards = screen.UNSAFE_getAllByType(Card).filter((card) => card.props.divided);
  expect(cards).toHaveLength(1);
  return within(cards[0])
    .UNSAFE_getAllByType(ListRow)
    .map((row) => row.props.title);
}

const send = async () => {
  await act(async () => {
    fireEvent.press(screen.getByText(he('settings.contactSend')));
  });
};

describe('Settings contact', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, profileName: 'Avraham Sason', profilePhone: '050-1234567' });
    jest.clearAllMocks();
    mockConfigured.mockReturnValue(true);
  });

  it('is closed until opened, and is its own section', async () => {
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    expect(screen.queryByText(he('settings.contactSend'))).toBeNull();

    fireEvent.press(screen.getByText(he('settings.contact')));
    expect(screen.getByText(he('settings.contactHint'))).toBeOnTheScreen();
    expect(screen.getByText(he('settings.contactSend'))).toBeOnTheScreen();
    expect(screen.getByText(he('settings.contactPrivacy'))).toBeOnTheScreen();
  });

  it('is titled about and contact, with the version first and the links last', async () => {
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    expect(screen.getByText('אודות ויצירת קשר')).toBeOnTheScreen();
    expect(screen.getByText(he('settings.contactSummary'))).toBeOnTheScreen();
    expect(en('settings.contact')).toBe('About and contact');

    fireEvent.press(screen.getByText(he('settings.contact')));

    expect(screen.getByText(he('settings.version', { version: appVersionLabel() }))).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^settings-anchor-/).map((node) => node.props.testID)).toEqual([
      'settings-anchor-version',
      'settings-anchor-contact',
      'settings-anchor-links',
    ]);
    const tree = JSON.stringify(screen.toJSON());
    const position = (id: string) => tree.indexOf(`"testID":"settings-anchor-${id}"`);
    expect(position('version')).toBeGreaterThan(-1);
    expect(position('contact')).toBeGreaterThan(position('version'));
    expect(position('links')).toBeGreaterThan(position('contact'));
    expect(
      within(screen.getByTestId('settings-anchor-contact')).getByLabelText(he('settings.contactMessage')),
    ).toBeOnTheScreen();
    expect(within(screen.getByTestId('settings-anchor-links')).getByText(he('settings.links'))).toBeOnTheScreen();
    expect(linkTitles()).toEqual([
      he('guide.title'),
      he('settings.linkSupport'),
      he('settings.linkPrivacy'),
      he('settings.linkStore.ios'),
      he('settings.linkChok'),
    ]);
    expect(screen.getByLabelText(he('settings.contactMessage'))).toBeOnTheScreen();
  });

  it('fills the name and phone from the profile and leaves the message empty', async () => {
    await openContactSection();

    expect(field('settings.profileName').props.value).toBe('Avraham Sason');
    expect(field('settings.profilePhone').props.value).toBe('050-1234567');
    expect(field('settings.contactMessage').props.value).toBe('');
  });

  it('takes the profile drafts typed in this visit', async () => {
    useUserStore.setState({ profileName: '', profilePhone: '' });
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    fireEvent.press(screen.getByText(he('settings.profile')));
    fireEvent.changeText(screen.getByPlaceholderText(he('settings.profileNamePlaceholder')), 'New Name');
    fireEvent.press(screen.getByText(he('settings.contact')));

    expect(field('settings.profileName').props.value).toBe('New Name');
  });

  it('sends the three fields, clears the message and confirms', async () => {
    await openContactSection();
    fireEvent.changeText(field('settings.contactMessage'), 'Please add Kiddush');
    await send();

    expect(mockSend).toHaveBeenCalledWith(
      { name: 'Avraham Sason', phone: '050-1234567', message: 'Please add Kiddush' },
      'he',
    );
    expect(screen.getByText(he('settings.contactSent'))).toBeOnTheScreen();
    expect(field('settings.contactMessage').props.value).toBe('');
    expect(useUserStore.getState().profileName).toBe('Avraham Sason');
  });

  it.each([
    ['message', 'settings.contactMessage', ''],
    ['name', 'settings.profileName', '  '],
    ['phone', 'settings.profilePhone', ''],
  ])('refuses to send without a %s', async (_name, key, value) => {
    await openContactSection();
    fireEvent.changeText(field('settings.contactMessage'), 'Hello');
    fireEvent.changeText(field(key), value);
    await send();

    expect(mockSend).not.toHaveBeenCalled();
    expect(screen.getByText(he('settings.contactMissing'))).toBeOnTheScreen();
  });

  it('refuses a phone number that is not one', async () => {
    await openContactSection();
    fireEvent.changeText(field('settings.contactMessage'), 'Hello');
    fireEvent.changeText(field('settings.profilePhone'), '123');
    await send();

    expect(mockSend).not.toHaveBeenCalled();
    expect(screen.getByText(he('settings.contactPhoneInvalid'))).toBeOnTheScreen();
  });

  it.each([
    ['offline', 'settings.contactOffline'],
    ['busy', 'settings.contactBusy'],
    ['rejected', 'settings.contactFailed'],
  ] as const)('keeps the message and explains a %s failure', async (reason, key) => {
    mockSend.mockRejectedValueOnce(new ContactError(reason));
    await openContactSection();
    fireEvent.changeText(field('settings.contactMessage'), 'Hello');
    await send();

    expect(screen.getByText(he(key))).toBeOnTheScreen();
    expect(field('settings.contactMessage').props.value).toBe('Hello');
  });

  it('sends once while a send is in flight', async () => {
    let finish: () => void = () => {};
    mockSend.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    await openContactSection();
    fireEvent.changeText(field('settings.contactMessage'), 'Hello');
    await send();

    expect(screen.getByText(he('settings.contactSending'))).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByText(he('settings.contactSending')));
    });
    expect(mockSend).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    expect(screen.getByText(he('settings.contactSent'))).toBeOnTheScreen();
  });

  it('opens the mail app on the developer address', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await openContactSection();
    fireEvent.press(screen.getByText(CONTACT_EMAIL));

    expect(openURL).toHaveBeenCalledWith(contactMailUrl());
    openURL.mockRestore();
  });

  it('shows only the email while no form is configured', async () => {
    mockConfigured.mockReturnValue(false);
    await openContactSection();

    expect(screen.queryByText(he('settings.contactSend'))).toBeNull();
    expect(screen.queryByLabelText(he('settings.contactMessage'))).toBeNull();
    expect(screen.getByText(CONTACT_EMAIL)).toBeOnTheScreen();
    expect(screen.getByText(he('settings.linkSupport'))).toBeOnTheScreen();
  });
});

describe('Settings about and contact links', () => {
  const SITE = 'https://jew-365.github.io/jew-365/';
  const APP_STORE = 'https://apps.apple.com/app/id6825802248';
  const PLAY = 'https://play.google.com/store/apps/details?id=com.jew365.app';
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true });
    jest.clearAllMocks();
    mockConfigured.mockReturnValue(true);
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    openURL.mockRestore();
  });

  async function openAbout(language: 'he' | 'en') {
    useUserStore.setState({ language });
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    fireEvent.press(screen.getByText(translate('settings.contact', undefined, language, null)));
  }

  it.each([
    ['he', 'settings.linkSupport', SITE],
    ['en', 'settings.linkSupport', SITE],
    ['he', 'settings.linkPrivacy', `${SITE}privacy/`],
    ['en', 'settings.linkPrivacy', `${SITE}privacy/en/`],
    ['he', 'settings.linkStore.ios', APP_STORE],
    ['en', 'settings.linkStore.ios', APP_STORE],
  ] as const)('in %s, %s opens %s', async (language, key, url) => {
    await openAbout(language);
    fireEvent.press(screen.getByText(translate(key, undefined, language, null)));

    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith(url);
  });

  it.each(['he', 'en'] as const)(
    'in %s, the Chok LeYisrael row opens the credit sheet and no link until the license link is pressed',
    async (language) => {
      const tr = (key: string) => translate(key, undefined, language, null);
      await openAbout(language);
      expect(screen.queryByText(tr('chok.creditTitle'))).toBeNull();

      fireEvent.press(screen.getByText(tr('settings.linkChok')));

      expect(openURL).not.toHaveBeenCalled();
      expect(screen.getByText(tr('chok.creditTitle'))).toBeOnTheScreen();
      expect(screen.getByText(tr('chok.credit'))).toBeOnTheScreen();
      expect(screen.getByText(tr('chok.shareAlike'))).toBeOnTheScreen();
      expect(screen.getByRole('link', { name: tr('chok.license') })).toBeOnTheScreen();

      fireEvent.press(screen.getByRole('link', { name: tr('chok.license') }));

      expect(openURL).toHaveBeenCalledTimes(1);
      expect(openURL).toHaveBeenCalledWith(tr('chok.licenseUrl'));
    },
  );

  it('closes the credit sheet from its own button', async () => {
    await openAbout('he');
    fireEvent.press(screen.getByText(he('settings.linkChok')));
    expect(screen.getByText(he('chok.creditTitle'))).toBeOnTheScreen();

    fireEvent.press(screen.getByText(he('common.close')));

    expect(screen.queryByText(he('chok.creditTitle'))).toBeNull();
    expect(openURL).not.toHaveBeenCalled();
  });

  it('opens Google Play on Android', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await openAbout('he');
      fireEvent.press(screen.getByText(he('settings.linkStore.android')));

      expect(openURL).toHaveBeenCalledWith(PLAY);
      expect(screen.queryByText(he('settings.linkStore.ios'))).toBeNull();
    } finally {
      restore.restore();
    }
  });

  it('has no store row on web', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'web');
    try {
      await openAbout('he');

      expect(linkTitles()).toEqual([
        he('guide.title'),
        he('settings.linkSupport'),
        he('settings.linkPrivacy'),
        he('settings.linkChok'),
      ]);
      expect(screen.queryByText(he('settings.linkStore.android'))).toBeNull();
      expect(screen.queryByText(he('settings.linkStore.ios'))).toBeNull();
    } finally {
      restore.restore();
    }
  });

  it('opens the user guide from the first row of the links card', async () => {
    await openAbout('he');
    expect(linkTitles()[0]).toBe(he('guide.title'));
    fireEvent.press(screen.getByText(he('guide.title')));

    expect(mockPush).toHaveBeenCalledWith('/guide');
    expect(openURL).not.toHaveBeenCalled();
  });
});

describe('About and contact in the public pages', () => {
  const page = (file: string) => fs.readFileSync(path.join(__dirname, '..', '..', '..', 'docs', file), 'utf8');

  it('names the section by its Settings label', () => {
    const faq = page('index.html');
    const policy = page('privacy/index.html');
    const policyEn = page('privacy/en/index.html');
    const testers = page('testers/index.html');

    expect(faq).toContain(`הגדרות ← ${he('settings.contact')}`);
    expect(policy).toContain(`בהגדרות ← ${he('settings.contact')} `);
    expect(policyEn).toContain(`under Settings → ${en('settings.contact')} `);
    expect(testers).toContain(`הגדרות ← ${he('settings.contact')}`);

    for (const hebrew of [faq, policy, testers]) {
      expect(hebrew).not.toContain('← יצירת קשר');
      expect(hebrew).not.toContain('״יצירת קשר״');
    }
    expect(policyEn).not.toContain('Contact us');
  });
});
