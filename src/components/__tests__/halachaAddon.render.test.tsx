const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/services/halachaFiles', () => ({
  ...jest.requireActual('@/services/halachaFiles'),
  readHalachaScheduleSync: (pack: 'kitzur' | 'ben_ish_chai' | 'rambam') =>
    require('@/testing/halacha').publishedHalachaSchedule(pack),
}));
jest.mock('@/services/HalachaContentService', () => ({
  ...jest.requireActual('@/services/HalachaContentService'),
  checkHalachaUpdate: jest.fn(async () => {}),
  prepareHalachaDownload: jest.fn(async () => null),
}));

import React from 'react';
import { act, fireEvent, renderHook, screen } from '@testing-library/react-native';
import { HalachaAddonCard } from '@/components/HalachaAddonCard';
import { HalachaEnablePrompt } from '@/components/HalachaEnablePrompt';
import { LearningRow, useLearningRows } from '@/components/LearningRows';
import { CITIES } from '@/data/cities';
import { halachaYomitOn } from '@/data/halachaContent';
import { prepareHalachaDownload } from '@/services/HalachaContentService';
import { HALACHA_STORES, resetHalachaStores } from '@/stores/useHalachaStore';
import { selectActive, useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { installHalachaFixture } from '@/testing/halacha';
import { renderWithTheme } from '@/testing/render';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { at } from '@/testing/zmanim';
import { appDay } from '@/utils/locationDay';

const JERUSALEM = CITIES[0];
const NOW = at(JERUSALEM, '2026-11-18T12:00');

beforeEach(() => {
  mockPush.mockReset();
  jest.mocked(prepareHalachaDownload).mockClear();
  resetHalachaStores();
  useMitzvotStore.getState().reset();
  useUserStore.getState().reset();
  useUserStore.setState({ location: JERUSALEM, inIsrael: true, nusach: 'ashkenaz', language: 'he', isOnboarded: true });
});

describe('the halacha add-on card', () => {
  it('offers the download of the track it is given, by its book', () => {
    renderWithTheme(<HalachaAddonCard track="ben_ish_chai" />);
    expect(screen.getByText('תוסף ההלכה: בן איש חי')).toBeOnTheScreen();
    expect(screen.getByText('הורדה')).toBeOnTheScreen();
  });

  it("shows, in English, the Kitzur's English beside an installed Kitzur, and not before", () => {
    useUserStore.setState({ language: 'en' });
    const { rerender } = renderWithTheme(<HalachaAddonCard track="kitzur" />);
    expect(screen.queryByText('Halacha add-on: Kitzur Shulchan Aruch in English')).toBeNull();
    act(() => void installHalachaFixture('kitzur'));
    rerender(<HalachaAddonCard track="kitzur" />);
    expect(screen.getByText('Halacha add-on: Kitzur Shulchan Aruch')).toBeOnTheScreen();
    expect(screen.getByText('Halacha add-on: Kitzur Shulchan Aruch in English')).toBeOnTheScreen();
  });
});

describe('the enable prompt after a first download', () => {
  it('names the book and switches both halacha mitzvot on, each with its reminder', () => {
    renderWithTheme(<HalachaEnablePrompt />);
    expect(screen.queryByText('משנה תורה לרמב״ם הותקן')).toBeNull();
    act(() => HALACHA_STORES.rambam.getState().setEnablePrompt(true));
    expect(screen.getByText('משנה תורה לרמב״ם הותקן')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('כן'));
    expect(selectActive('halacha_yomit')(useMitzvotStore.getState()).enabled).toBe(true);
    expect(selectActive('hilchot_hachag')(useMitzvotStore.getState()).enabled).toBe(true);
    expect(HALACHA_STORES.rambam.getState().enablePrompt).toBe(false);
  });

  it('leaves the mitzvot off on no', () => {
    renderWithTheme(<HalachaEnablePrompt />);
    act(() => HALACHA_STORES.kitzur.getState().setEnablePrompt(true));
    fireEvent.press(screen.getByText('לא'));
    expect(selectActive('halacha_yomit')(useMitzvotStore.getState()).enabled).toBe(false);
    expect(HALACHA_STORES.kitzur.getState().enablePrompt).toBe(false);
  });
});

describe('the learning rows of the two halacha mitzvot', () => {
  const rowsAt = () =>
    renderHook(() => useLearningRows(NOW), {
      wrapper: ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>,
    });
  const row = (rows: LearningRow[], id: string) => rows.find((entry) => entry.id === id)!;

  it("offer the download of the user's track, sharing one flow", async () => {
    const { result } = rowsAt();
    const yomit = row(result.current.rows, 'halacha_yomit');
    expect(yomit.title).toBe('הלכה יומית');
    expect(yomit.caption).toBe('תוסף להורדה · כ־0.6 MB');
    expect(yomit.installed).toBe(false);
    expect(row(result.current.rows, 'hilchot_hachag').caption).toBe('תוסף להורדה · כ־0.6 MB');
    await act(async () => yomit.onPress());
    expect(prepareHalachaDownload).toHaveBeenCalledWith('kitzur');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("follow the user's chosen track", () => {
    useUserStore.setState({ halachaTrack: 'rambam' });
    const { result } = rowsAt();
    expect(row(result.current.rows, 'halacha_yomit').caption).toBe('תוסף להורדה · כ־2.4 MB');
  });

  it("name the day's portion once installed, and open the reader", () => {
    installHalachaFixture('kitzur');
    const day = halachaYomitOn(appDay(NOW, JERUSALEM), 'ashkenaz', true)!;
    const { result } = rowsAt();
    const yomit = row(result.current.rows, 'halacha_yomit');
    expect(yomit.caption).toBe(`קיצור שולחן ערוך · ${day.portion.label.he}`);
    yomit.onPress();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/siddur/[id]', params: { id: 'halacha_yomit' } });
    // 8 Kislev 5787: no festival's period yet (Chanukah's opens on 11 Kislev).
    expect(row(result.current.rows, 'hilchot_hachag').caption).toBe('אין כרגע לימוד לקראת חג');
  });
});
