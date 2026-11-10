const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/services/halachaFiles', () => ({
  ...jest.requireActual('@/services/halachaFiles'),
  readHalachaScheduleSync: (pack: import('@/types/halacha').HalachaBook) =>
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
import { dailyPortionOn, halachaYomitOn } from '@/data/halachaContent';
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

  it('offers the Chofetz Chaim, and in English its translation once it is installed', () => {
    renderWithTheme(<HalachaAddonCard track="chafetz_chaim" />);
    expect(screen.getByText('תוסף ההלכה: ספר חפץ חיים')).toBeOnTheScreen();
    expect(screen.getByText(/^ספר חפץ חיים יורד פעם אחת/)).toBeOnTheScreen();
    screen.unmount();
    useUserStore.setState({ language: 'en' });
    installHalachaFixture('chafetz_chaim');
    renderWithTheme(<HalachaAddonCard track="chafetz_chaim" />);
    expect(screen.getByText('Halacha add-on: Sefer Chofetz Chaim in English')).toBeOnTheScreen();
  });

  it('offers Shemirat HaLashon, and in English its translation once it is installed', () => {
    renderWithTheme(<HalachaAddonCard track="shemirat_halashon" />);
    expect(screen.getByText('תוסף ההלכה: ספר שמירת הלשון')).toBeOnTheScreen();
    expect(screen.getByText(/^ספר שמירת הלשון יורד פעם אחת/)).toBeOnTheScreen();
    screen.unmount();
    useUserStore.setState({ language: 'en' });
    installHalachaFixture('shemirat_halashon');
    renderWithTheme(<HalachaAddonCard track="shemirat_halashon" />);
    expect(screen.getByText('Halacha add-on: Sefer Shemirat HaLashon in English')).toBeOnTheScreen();
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

  it('names the Chofetz Chaim and switches only the laws of lashon hara on', () => {
    renderWithTheme(<HalachaEnablePrompt />);
    act(() => HALACHA_STORES.chafetz_chaim.getState().setEnablePrompt(true));
    expect(screen.getByText('ספר חפץ חיים הותקן')).toBeOnTheScreen();
    expect(screen.getByText('להפעיל תזכורות ומעקב להלכות לשון הרע היומיות?')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('כן'));
    expect(selectActive('lashon_hara')(useMitzvotStore.getState()).enabled).toBe(true);
    expect(selectActive('halacha_yomit')(useMitzvotStore.getState()).enabled).toBe(false);
    expect(HALACHA_STORES.chafetz_chaim.getState().enablePrompt).toBe(false);
  });

  it('names Shemirat HaLashon and switches only its mitzvah on', () => {
    renderWithTheme(<HalachaEnablePrompt />);
    act(() => HALACHA_STORES.shemirat_halashon.getState().setEnablePrompt(true));
    expect(screen.getByText('ספר שמירת הלשון הותקן')).toBeOnTheScreen();
    expect(screen.getByText('להפעיל תזכורות ומעקב ללימוד היומי בשמירת הלשון?')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('כן'));
    expect(selectActive('shemirat_halashon')(useMitzvotStore.getState()).enabled).toBe(true);
    expect(selectActive('lashon_hara')(useMitzvotStore.getState()).enabled).toBe(false);
    expect(HALACHA_STORES.shemirat_halashon.getState().enablePrompt).toBe(false);
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

  it('offer the Chofetz Chaim on the lashon hara row, its own download, then its portion in the reader', async () => {
    installHalachaFixture('kitzur');
    const { result, rerender } = rowsAt();
    let lashonHara = row(result.current.rows, 'lashon_hara');
    expect(lashonHara.title).toBe('הלכות לשון הרע');
    expect(lashonHara.caption).toBe('תוסף להורדה · כ־0.2 MB');
    await act(async () => lashonHara.onPress());
    expect(prepareHalachaDownload).toHaveBeenCalledWith('chafetz_chaim');
    act(() => void installHalachaFixture('chafetz_chaim'));
    rerender({});
    lashonHara = row(result.current.rows, 'lashon_hara');
    expect(lashonHara.caption).toBe(dailyPortionOn('chafetz_chaim', appDay(NOW, JERUSALEM), true)!.portion.label.he);
    lashonHara.onPress();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/siddur/[id]', params: { id: 'lashon_hara' } });
  });

  it('offer Shemirat HaLashon on its own row, its own download, then its portion in the reader', async () => {
    installHalachaFixture('chafetz_chaim');
    const { result, rerender } = rowsAt();
    let shemirat = row(result.current.rows, 'shemirat_halashon');
    expect(shemirat.title).toBe('שמירת הלשון');
    expect(shemirat.caption).toBe('תוסף להורדה · כ־0.3 MB');
    await act(async () => shemirat.onPress());
    expect(prepareHalachaDownload).toHaveBeenCalledWith('shemirat_halashon');
    act(() => void installHalachaFixture('shemirat_halashon'));
    rerender({});
    shemirat = row(result.current.rows, 'shemirat_halashon');
    expect(shemirat.caption).toBe(dailyPortionOn('shemirat_halashon', appDay(NOW, JERUSALEM), true)!.portion.label.he);
    shemirat.onPress();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/siddur/[id]', params: { id: 'shemirat_halashon' } });
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
