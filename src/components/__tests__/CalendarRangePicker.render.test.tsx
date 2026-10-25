import { useState } from 'react';
import { DateTime } from 'luxon';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { CalendarRangePicker, DateRange, RANGE_MAX_YEARS, nextRange, rangeMaxKey } from '../CalendarRangePicker';
import { renderWithTheme } from '@/testing/render';
import { THEMES, THEME_NAMES } from '@/theme/colors';
import { useUserStore } from '@/stores/useUserStore';
import { formatDate } from '@/i18n';

const TODAY = '2026-10-28';
const NONE: DateRange = { start: null, end: null };

const day = (key: string) => screen.getByTestId(`calendar-day-${key}`);
const dayOrNull = (key: string) => screen.queryByTestId(`calendar-day-${key}`);

function Harness({ onChange }: { onChange: (next: DateRange) => void }) {
  const [value, setValue] = useState<DateRange>(NONE);
  return (
    <CalendarRangePicker
      value={value}
      todayKey={TODAY}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

describe('CalendarRangePicker', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he' });
  });

  it("opens on today's month with only that month's days", () => {
    renderWithTheme(<CalendarRangePicker value={NONE} todayKey={TODAY} onChange={jest.fn()} />);

    expect(screen.getByText('אוקטובר 2026')).toBeOnTheScreen();
    expect(day('2026-10-01')).toBeOnTheScreen();
    expect(day('2026-10-31')).toBeOnTheScreen();
    expect(dayOrNull('2026-09-30')).toBeNull();
    expect(dayOrNull('2026-11-01')).toBeNull();
    for (const label of ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
  });

  it('shows the Hebrew day under each day', () => {
    renderWithTheme(<CalendarRangePicker value={NONE} todayKey={TODAY} onChange={jest.fn()} />);

    expect(within(day('2026-10-28')).getByText('28')).toBeOnTheScreen();
    expect(within(day('2026-10-28')).getByText('17')).toBeOnTheScreen();
    expect(within(day('2026-10-31')).getByText('31')).toBeOnTheScreen();
    expect(within(day('2026-10-31')).getByText('20')).toBeOnTheScreen();
    screen.unmount();

    useUserStore.setState({ language: 'en' });
    renderWithTheme(<CalendarRangePicker value={NONE} todayKey={TODAY} onChange={jest.fn()} />);
    expect(screen.getByText('October 2026')).toBeOnTheScreen();
    expect(within(day('2026-10-28')).getByText('17')).toBeOnTheScreen();
  });

  it('names each day by weekday and date', () => {
    renderWithTheme(<CalendarRangePicker value={NONE} todayKey={TODAY} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'יום רביעי · 28 אוקטובר' })).toBe(day('2026-10-28'));
    screen.unmount();

    useUserStore.setState({ language: 'en' });
    renderWithTheme(<CalendarRangePicker value={NONE} todayKey={TODAY} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Wednesday · Oct 28' })).toBe(day('2026-10-28'));
  });

  it('disables the days before today', () => {
    const onChange = jest.fn();
    renderWithTheme(<CalendarRangePicker value={NONE} todayKey={TODAY} onChange={onChange} />);

    expect(day('2026-10-27')).toBeDisabled();
    expect(day('2026-10-27')).toHaveStyle({ opacity: 0.5 });
    expect(day('2026-10-01')).toBeDisabled();
    expect(day('2026-10-01')).toHaveStyle({ opacity: 0.5 });
    expect(day('2026-10-28')).not.toBeDisabled();

    fireEvent.press(day('2026-10-27'));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.press(day('2026-10-28'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ start: '2026-10-28', end: null });
  });

  it('rings today only', () => {
    renderWithTheme(<CalendarRangePicker value={NONE} todayKey={TODAY} onChange={jest.fn()} />);

    expect(day('2026-10-28')).toHaveStyle({ borderWidth: 2, borderColor: THEMES.gold.goldText });
    expect(day('2026-10-29')).toHaveStyle({ borderWidth: 0 });
  });

  it('takes the start on the first tap and the end on the second, shading the days between', () => {
    const onChange = jest.fn();
    renderWithTheme(<Harness onChange={onChange} />);

    fireEvent.press(day('2026-10-29'));
    fireEvent.press(day('2026-10-31'));

    expect(onChange.mock.calls).toEqual([
      [{ start: '2026-10-29', end: null }],
      [{ start: '2026-10-29', end: '2026-10-31' }],
    ]);
    expect(day('2026-10-29')).toBeSelected();
    expect(day('2026-10-29')).toHaveStyle({ backgroundColor: THEMES.gold.gold });
    expect(within(day('2026-10-29')).getByText('29')).toHaveStyle({ color: THEMES.gold.onGold });
    expect(day('2026-10-31')).toBeSelected();
    expect(day('2026-10-31')).toHaveStyle({ backgroundColor: THEMES.gold.gold });
    expect(day('2026-10-30')).toBeSelected();
    expect(day('2026-10-30')).toHaveStyle({ backgroundColor: THEMES.gold.goldWashStrong });
    expect(day('2026-10-28')).not.toBeSelected();
    expect(day('2026-10-28')).toHaveStyle({ backgroundColor: 'transparent' });
  });

  it.each(THEME_NAMES)(
    '%s: shades the days between the ends with goldWashStrong, the Hebrew day in textSub',
    (name) => {
      useUserStore.setState({ theme: name });
      renderWithTheme(
        <CalendarRangePicker
          value={{ start: '2026-10-29', end: '2026-10-31' }}
          todayKey={TODAY}
          onChange={jest.fn()}
        />,
      );
      expect(day('2026-10-29')).toHaveStyle({ backgroundColor: THEMES[name].gold });
      expect(within(day('2026-10-29')).getByText('18')).toHaveStyle({ color: THEMES[name].onGold });
      expect(day('2026-10-30')).toHaveStyle({ backgroundColor: THEMES[name].goldWashStrong });
      expect(within(day('2026-10-30')).getByText('30')).toHaveStyle({ color: THEMES[name].text });
      expect(within(day('2026-10-30')).getByText('19')).toHaveStyle({ color: THEMES[name].textSub });
      expect(day('2026-10-28')).toHaveStyle({ backgroundColor: 'transparent' });
      expect(within(day('2026-10-28')).getByText('17')).toHaveStyle({ color: THEMES[name].textSub });
    },
  );

  it('restarts the range with nextRange before the start and after a full range', () => {
    expect(nextRange(NONE, '2026-10-29')).toEqual({ start: '2026-10-29', end: null });
    expect(nextRange({ start: '2026-10-29', end: null }, '2026-10-29')).toEqual({
      start: '2026-10-29',
      end: '2026-10-29',
    });
    expect(nextRange({ start: '2026-10-29', end: null }, '2026-10-30')).toEqual({
      start: '2026-10-29',
      end: '2026-10-30',
    });
    expect(nextRange({ start: '2026-10-29', end: null }, '2026-10-28')).toEqual({ start: '2026-10-28', end: null });
    expect(nextRange({ start: '2026-10-29', end: '2026-10-31' }, '2026-11-02')).toEqual({
      start: '2026-11-02',
      end: null,
    });
  });

  it("pages forward and back, never before today's month", () => {
    renderWithTheme(<CalendarRangePicker value={NONE} todayKey={TODAY} onChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'ספטמבר 2026' })).toBeDisabled();

    fireEvent.press(screen.getByRole('button', { name: 'נובמבר 2026' }));
    expect(screen.getByText('נובמבר 2026')).toBeOnTheScreen();
    expect(within(day('2026-11-15')).getByText('15')).toBeOnTheScreen();
    expect(within(day('2026-11-15')).getByText('5')).toBeOnTheScreen();
    expect(dayOrNull('2026-10-28')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'אוקטובר 2026' }));
    expect(screen.getByText('אוקטובר 2026')).toBeOnTheScreen();
    expect(day('2026-10-28')).toBeOnTheScreen();
  });

  it('stops two years from today', () => {
    expect(RANGE_MAX_YEARS).toBe(2);
    expect(rangeMaxKey(TODAY)).toBe('2028-10-28');
    expect(rangeMaxKey('2028-02-29')).toBe('2030-02-28');

    renderWithTheme(<CalendarRangePicker value={NONE} todayKey={TODAY} onChange={jest.fn()} />);
    for (let i = 0; i < 24; i++) {
      const next = formatDate(DateTime.fromISO('2026-10-01').plus({ months: i + 1 }), 'LLLL yyyy', 'he');
      fireEvent.press(screen.getByRole('button', { name: next }));
    }

    expect(screen.getByText('אוקטובר 2028')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'נובמבר 2028' })).toBeDisabled();
    expect(day('2028-10-28')).not.toBeDisabled();
    expect(day('2028-10-29')).toBeDisabled();
  });

  it("opens on the month of a later start, else on today's month", () => {
    renderWithTheme(
      <CalendarRangePicker value={{ start: '2026-12-10', end: '2026-12-12' }} todayKey={TODAY} onChange={jest.fn()} />,
    );
    expect(screen.getByText('דצמבר 2026')).toBeOnTheScreen();
    screen.unmount();

    renderWithTheme(
      <CalendarRangePicker value={{ start: '2026-09-01', end: '2026-11-05' }} todayKey={TODAY} onChange={jest.fn()} />,
    );
    expect(screen.getByText('אוקטובר 2026')).toBeOnTheScreen();
    expect(day('2026-10-28')).toBeSelected();
    expect(day('2026-10-01')).toBeDisabled();
    expect(day('2026-10-01')).toHaveStyle({ backgroundColor: THEMES.gold.goldWashStrong });
  });
});
