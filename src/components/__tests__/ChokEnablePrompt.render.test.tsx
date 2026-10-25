jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { Modal } from 'react-native';
import { act, cleanupAsync, fireEvent, screen } from '@testing-library/react-native';
import { ChokEnablePrompt } from '../ChokEnablePrompt';
import { QuietBlockContext } from '../ShabbatScreen';
import { CHOK_LEYISRAEL } from '@/data/mitzvot';
import { useChokStore } from '@/stores/useChokStore';
import { effectiveReminders, useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { installChokFixture } from '@/testing/chok';
import { findBackdrop, renderWithTheme } from '@/testing/render';
import type { HolyBlock } from '@/types/zmanim';

const NOW = 1_800_000_000_000;
const ONLY_DATE = [
  'nextTick',
  'queueMicrotask',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
] as const;
const QUIET_BLOCK: HolyBlock = {
  start: new Date('2026-10-09T15:00:00Z'),
  end: new Date('2026-10-10T16:00:00Z'),
  days: ['2026-10-10'],
  kind: 'shabbat',
};
const TITLE = 'חק לישראל הותקן';
const BODY = 'האם להפעיל התראות ומעקב אחרי המצווה?';

const chok = () => useMitzvotStore.getState().activeMitzvot.chok_leyisrael;

describe('ChokEnablePrompt', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
    useChokStore.getState().reset();
    installChokFixture();
  });

  afterEach(async () => {
    await cleanupAsync();
    jest.useRealTimers();
    useChokStore.getState().reset();
  });

  it('shows nothing while no download raised it', () => {
    renderWithTheme(<ChokEnablePrompt />);
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('asks with the Hebrew copy and yes / no buttons once a first download raised it', () => {
    useChokStore.getState().setEnablePrompt(true);
    renderWithTheme(<ChokEnablePrompt />);
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
    expect(screen.getByText(BODY)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'כן' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'לא' })).toBeOnTheScreen();
  });

  it('appears when the download ends after it mounted', () => {
    renderWithTheme(<ChokEnablePrompt />);
    expect(screen.queryByText(TITLE)).toBeNull();
    act(() => useChokStore.getState().setEnablePrompt(true));
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
  });

  it('"כן" switches the mitzvah on with its default 09:00 reminder and stamps enabledAt', () => {
    useChokStore.getState().setEnablePrompt(true);
    renderWithTheme(<ChokEnablePrompt />);
    fireEvent.press(screen.getByRole('button', { name: 'כן' }));
    expect(chok()).toEqual({ enabled: true, enabledAt: NOW });
    expect(effectiveReminders('chok_leyisrael')).toEqual(CHOK_LEYISRAEL.defaultReminders);
    expect(effectiveReminders('chok_leyisrael')[0]).toMatchObject({ anchor: 'clock', offsetMin: 540 });
    expect(useChokStore.getState().enablePrompt).toBe(false);
    expect(screen.queryByText(TITLE)).toBeNull();
  });

  it('"לא" leaves the mitzvah off and the question does not come back', async () => {
    useChokStore.getState().setEnablePrompt(true);
    renderWithTheme(<ChokEnablePrompt />);
    fireEvent.press(screen.getByRole('button', { name: 'לא' }));
    expect(chok().enabled).toBe(false);
    expect(chok().enabledAt).toBeUndefined();
    expect(useChokStore.getState().enablePrompt).toBe(false);
    expect(screen.queryByText(TITLE)).toBeNull();
    await cleanupAsync();
    renderWithTheme(<ChokEnablePrompt />);
    expect(screen.queryByText(TITLE)).toBeNull();
  });

  it('a backdrop tap closes it like "לא"', () => {
    useChokStore.getState().setEnablePrompt(true);
    renderWithTheme(<ChokEnablePrompt />);
    fireEvent.press(findBackdrop());
    expect(useChokStore.getState().enablePrompt).toBe(false);
    expect(chok().enabled).toBe(false);
  });

  it('Android back closes it like "לא"', () => {
    useChokStore.getState().setEnablePrompt(true);
    renderWithTheme(<ChokEnablePrompt />);
    act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());
    expect(useChokStore.getState().enablePrompt).toBe(false);
    expect(chok().enabled).toBe(false);
  });

  it('waits out a holy block and asks once it ends', () => {
    useChokStore.getState().setEnablePrompt(true);
    const view = renderWithTheme(
      <QuietBlockContext.Provider value={QUIET_BLOCK}>
        <ChokEnablePrompt />
      </QuietBlockContext.Provider>,
    );
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(useChokStore.getState().enablePrompt).toBe(true);
    view.rerender(
      <QuietBlockContext.Provider value={null}>
        <ChokEnablePrompt />
      </QuietBlockContext.Provider>,
    );
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
  });

  it('asks in English', () => {
    useUserStore.setState({ language: 'en' });
    useChokStore.getState().setEnablePrompt(true);
    renderWithTheme(<ChokEnablePrompt />);
    expect(screen.getByText('Chok LeYisrael is installed')).toBeOnTheScreen();
    expect(screen.getByText('Turn on reminders and tracking for this mitzvah?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'No' })).toBeOnTheScreen();
  });
});
