let mockMirrored = false;
jest.mock('@/hooks/useRowMirrored', () => ({ useRowMirrored: () => mockMirrored }));

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { WindowTimeline } from '../WindowTimeline';
import { renderWithTheme } from '@/testing/render';
import { CITIES } from '@/data/cities';
import { MITZVOT } from '@/data/mitzvot';
import { windowTimeline } from '@/services/notifications/planners/mitzvot';
import { useUserStore } from '@/stores/useUserStore';
import type { ManualNag, Reminder, UserSettings } from '@/types/mitzvah';
import { dayWindow } from '@/utils/buildDayTimeline';
import { clockOf } from '@/utils/clock';
import { ZOOM_LEAD_MIN } from '@/utils/timeline';

const J = CITIES[0];
const SETTINGS: UserSettings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
const MINCHA = MITZVOT.find((m) => m.id === 'mincha')!;
// Wednesday 2026-11-11, a plain weekday in Jerusalem, as a day-level surface holds it.
// Mincha's two reminders before the reminder placement of 2026-11-08 (its start and an hour before its end), so the
// card is exercised with two bells on the axis.
const TWO_REMINDERS: Reminder[] = [
  { anchor: 'start', offsetMin: 0, label: 'זמן תפילת מנחה' },
  { anchor: 'end', offsetMin: -60, label: 'נותרה שעה למנחה', skipIfDone: true },
];
const DAY = new Date(2026, 10, 11);
const WINDOW = dayWindow(MINCHA, DAY, J, SETTINGS)!;
const MIN = 60_000;
const AXIS_WIDTH = 300;

type Handlers = {
  onRemindersChange: jest.Mock;
  onManualNagsChange: jest.Mock;
  onEditReminder: jest.Mock;
  onDeleteReminder: jest.Mock;
  onReset: jest.Mock;
};

function renderTimeline(options: { reminders?: Reminder[]; manualNags?: ManualNag[]; level?: 1 | 2 | 3 | 4 } = {}) {
  const handlers: Handlers = {
    onRemindersChange: jest.fn(),
    onManualNagsChange: jest.fn(),
    onEditReminder: jest.fn(),
    onDeleteReminder: jest.fn(),
    onReset: jest.fn(),
  };
  const reminders = options.reminders ?? TWO_REMINDERS;
  renderWithTheme(
    <WindowTimeline
      mitzvah={MINCHA}
      name="תפילת מנחה"
      window={WINDOW}
      reminders={reminders}
      manualNags={options.manualNags}
      changed={Boolean(options.manualNags) || Boolean(options.reminders)}
      nagLevel={options.level ?? 3}
      location={J}
      settings={SETTINGS}
      {...handlers}
    />,
  );
  fireEvent(screen.getByTestId('timeline-axis'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: AXIS_WIDTH, height: 76 } },
  });
  const timeline = windowTimeline(MINCHA, reminders, DAY, {
    location: J,
    settings: SETTINGS,
    nagLevel: options.level ?? 3,
    manualNags: options.manualNags,
  })!;
  return { handlers, timeline };
}

const press = (testID: string, at = { pageX: 100, pageY: 50 }) => {
  const target = screen.getByTestId(testID);
  fireEvent(target, 'responderGrant', { nativeEvent: at });
  fireEvent(target, 'responderRelease', { nativeEvent: at });
};

const drag = (testID: string, dx: number) => {
  const target = screen.getByTestId(testID);
  fireEvent(target, 'responderGrant', { nativeEvent: { pageX: 100, pageY: 50 } });
  fireEvent(target, 'responderMove', { nativeEvent: { pageX: 100 + dx / 2, pageY: 50 } });
  fireEvent(target, 'responderMove', { nativeEvent: { pageX: 100 + dx, pageY: 50 } });
  fireEvent(target, 'responderRelease', { nativeEvent: { pageX: 100 + dx, pageY: 50 } });
};

describe('WindowTimeline', () => {
  beforeEach(() => {
    mockMirrored = false;
    useUserStore.getState().reset();
  });

  it('draws a dot for every send of the window, with the count, the zone and the window’s clocks', () => {
    const { timeline } = renderTimeline();
    const reminders = timeline.sends.filter((send) => send.type === 'reminder');
    const nags = timeline.sends.filter((send) => send.type === 'nag');
    expect(reminders.length).toBe(TWO_REMINDERS.length);
    // Level 3: the zone's opener, two nags in the zone and the two last-chance points.
    expect(nags.length).toBe(5);
    for (const send of nags)
      expect(screen.getByTestId(`timeline-dot-n${send.type === 'nag' ? send.k : 0}`)).toBeOnTheScreen();
    expect(screen.getByTestId('timeline-count')).toHaveTextContent(`${timeline.sends.length} התראות בזמן הזה`);
    expect(screen.getAllByTestId('timeline-zone')).toHaveLength(1);
    expect(screen.getByText(clockOf(WINDOW.start, J.tz))).toBeOnTheScreen();
    expect(screen.getByText(clockOf(WINDOW.end, J.tz))).toBeOnTheScreen();
    expect(screen.queryByTestId('timeline-manual')).toBeNull();
  });

  it('opens a dot’s values on a tap: its kind, time and the notification it sends, and closes them', () => {
    const { timeline } = renderTimeline();
    const last = timeline.sends[timeline.sends.length - 1];
    expect(last).toMatchObject({ type: 'nag', kind: 'lastChance', lastChance: 'alone', stage: 'red' });
    press(`timeline-dot-n${last.type === 'nag' ? last.k : 0}`);
    const panel = screen.getByTestId('timeline-panel');
    expect(panel).toHaveTextContent(/הזמן האחרון להתחיל/);
    expect(screen.getByTestId('timeline-preview')).toHaveTextContent(
      new RegExp(`❗ נשארו 10 דק' · עד ${clockOf(WINDOW.end, J.tz)}`),
    );
    expect(screen.getByTestId('timeline-preview')).toHaveTextContent(/תפילת מנחה/);
    // A nag has no full editor, only the steps and delete.
    expect(screen.queryByText('עריכה מלאה')).toBeNull();
    fireEvent.press(screen.getByLabelText('סגירת הפרטים'));
    expect(screen.queryByTestId('timeline-panel')).toBeNull();
  });

  it('steps a reminder by five minutes and opens its full editor', () => {
    const { handlers, timeline } = renderTimeline();
    const first = timeline.sends.find((send) => send.type === 'reminder' && send.index === 0)!;
    press(`timeline-dot-r0.${first.type === 'reminder' ? first.occurrence : 0}`);
    fireEvent.press(screen.getByLabelText('5 דקות מאוחר יותר'));
    // The moved reminder drops its rotating bodies, as the reminder editor does; the other stays as it was.
    const { bodyVariants: _variants, ...first0 } = TWO_REMINDERS[0];
    expect(handlers.onRemindersChange).toHaveBeenCalledWith([{ ...first0, offsetMin: 5 }, TWO_REMINDERS[1]]);
    fireEvent.press(screen.getByText('עריכה מלאה'));
    expect(handlers.onEditReminder).toHaveBeenCalledWith(0);
    fireEvent.press(screen.getByText('מחיקה'));
    expect(handlers.onDeleteReminder).toHaveBeenCalledWith(0);
  });

  it('drags a reminder along the axis, and the smart nag follows it while the drag runs', () => {
    const { handlers } = renderTimeline();
    const length = WINDOW.end.getTime() - WINDOW.start.getTime();
    // A tenth of the axis later.
    drag('timeline-dot-r0.0', AXIS_WIDTH / 10);
    const [saved] = handlers.onRemindersChange.mock.calls[0];
    expect(saved[0]).toMatchObject({ anchor: 'start', offsetMin: Math.round(length / 10 / MIN) });
    expect(saved[1]).toBe(TWO_REMINDERS[1]);
    expect(handlers.onManualNagsChange).not.toHaveBeenCalled();
  });

  it('moves the smart nag’s dots with a reminder dragged into the critical zone, before the finger lifts', () => {
    const { handlers } = renderTimeline();
    const nagStarts = () =>
      screen
        .getAllByTestId(/^timeline-dot-n\d+$/)
        .map((dot) => StyleSheet.flatten(dot.props.style).start as string)
        .sort();
    const before = nagStarts();
    const target = screen.getByTestId('timeline-dot-r0.0');
    fireEvent(target, 'responderGrant', { nativeEvent: { pageX: 0, pageY: 50 } });
    // Three quarters of the window on: past the start of the last third, so the zone now opens at this reminder.
    fireEvent(target, 'responderMove', { nativeEvent: { pageX: AXIS_WIDTH * 0.75, pageY: 50 } });
    expect(handlers.onRemindersChange).not.toHaveBeenCalled();
    expect(nagStarts()).not.toEqual(before);
    fireEvent(target, 'responderTerminate', { nativeEvent: {} });
    // A drag the page took over is dropped: nothing is saved and the dots go back.
    expect(handlers.onRemindersChange).not.toHaveBeenCalled();
    expect(nagStarts()).toEqual(before);
  });

  it('in a mirrored (right-to-left) row, reads a drag to the left as later and a tap from the right edge', () => {
    mockMirrored = true;
    const { handlers } = renderTimeline();
    const length = WINDOW.end.getTime() - WINDOW.start.getTime();
    drag('timeline-dot-r0.0', -AXIS_WIDTH / 10);
    expect(handlers.onRemindersChange.mock.calls[0][0][0]).toMatchObject({
      anchor: 'start',
      offsetMin: Math.round(length / 10 / MIN),
    });
    const axis = screen.getByTestId('timeline-axis');
    // A quarter of the way in from the right edge, the start in a mirrored row.
    const locationX = AXIS_WIDTH * 0.75;
    fireEvent(axis, 'responderGrant', { nativeEvent: { pageX: 200, pageY: 40, locationX } });
    fireEvent(axis, 'responderRelease', { nativeEvent: { pageX: 200, pageY: 40, locationX } });
    const added = handlers.onRemindersChange.mock.calls[1][0];
    expect(added[added.length - 1]).toMatchObject({ anchor: 'start', offsetMin: Math.round(length / 4 / MIN) });
  });

  it('drags a nag, which makes every nag of the window the user’s own', () => {
    const { handlers, timeline } = renderTimeline();
    // The first zone nag, a little later: earlier it would come within 10 minutes of the zone's opener.
    const zone = timeline.sends.find((send) => send.type === 'nag' && send.kind === 'zone')!;
    const k = zone.type === 'nag' ? zone.k : 0;
    drag(`timeline-dot-n${k}`, AXIS_WIDTH / 40);
    const [saved] = handlers.onManualNagsChange.mock.calls[0] as [ManualNag[]];
    expect(saved).toHaveLength(5);
    const moved = Math.round((zone.at + (WINDOW.end.getTime() - WINDOW.start.getTime()) / 40) / MIN) * MIN;
    const atOf = (nag: ManualNag) =>
      (nag.anchor === 'start' ? WINDOW.start.getTime() : WINDOW.end.getTime()) + nag.offsetMin * MIN;
    expect(saved.map(atOf)).toContain(moved);
    expect(
      saved
        .filter((nag) => nag.kind === 'lastChance')
        .map((nag) => nag.lastChance)
        .sort(),
    ).toEqual(['alone', 'minyan']);
    expect(handlers.onRemindersChange).not.toHaveBeenCalled();
  });

  it('a tap on a dot that only moves a little is a tap, and a mostly vertical move is the page scroll', () => {
    const { handlers } = renderTimeline();
    const target = screen.getByTestId('timeline-dot-r0.0');
    fireEvent(target, 'responderGrant', { nativeEvent: { pageX: 100, pageY: 50 } });
    fireEvent(target, 'responderMove', { nativeEvent: { pageX: 103, pageY: 90 } });
    fireEvent(target, 'responderRelease', { nativeEvent: { pageX: 103, pageY: 90 } });
    expect(handlers.onRemindersChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('timeline-panel')).toBeNull();
  });

  it('adds a reminder where an empty stretch of the axis is tapped, and opens it', () => {
    const { handlers } = renderTimeline();
    const axis = screen.getByTestId('timeline-axis');
    fireEvent(axis, 'responderGrant', { nativeEvent: { pageX: 150, pageY: 40, locationX: AXIS_WIDTH / 4 } });
    fireEvent(axis, 'responderRelease', { nativeEvent: { pageX: 150, pageY: 40, locationX: AXIS_WIDTH / 4 } });
    const [saved] = handlers.onRemindersChange.mock.calls[0];
    const length = WINDOW.end.getTime() - WINDOW.start.getTime();
    expect(saved).toHaveLength(TWO_REMINDERS.length + 1);
    expect(saved[saved.length - 1]).toEqual({
      anchor: 'start',
      offsetMin: Math.round(length / 4 / MIN),
      label: 'תפילת מנחה',
    });
  });

  it('with nags placed by hand, says so and offers the reset; a nag’s delete saves the rest', () => {
    const manualNags: ManualNag[] = [
      { anchor: 'end', offsetMin: -90, kind: 'zone' },
      { anchor: 'end', offsetMin: -10, kind: 'lastChance', lastChance: 'alone' },
    ];
    const { handlers } = renderTimeline({ manualNags });
    expect(screen.getByTestId('timeline-manual')).toHaveTextContent(/כבר לא מחושבים אוטומטית/);
    press('timeline-dot-n1');
    fireEvent.press(screen.getByText('מחיקה'));
    expect(handlers.onManualNagsChange).toHaveBeenLastCalledWith([manualNags[1]]);
    fireEvent.press(screen.getByText('איפוס ציר ההתראות'));
    expect(handlers.onReset).toHaveBeenCalledTimes(1);
  });

  it('zooms to the critical time and back', () => {
    const { timeline } = renderTimeline();
    fireEvent.press(screen.getByText('זום לזמן הקריטי'));
    const from = new Date(timeline.zone[0].start.getTime() - ZOOM_LEAD_MIN * MIN);
    expect(screen.getByText(clockOf(from, J.tz))).toBeOnTheScreen();
    fireEvent.press(screen.getByText('כל החלון'));
    expect(screen.getByText(clockOf(WINDOW.start, J.tz))).toBeOnTheScreen();
  });

  it('lists every send, closed until opened, each row selecting its dot', () => {
    const { timeline } = renderTimeline();
    expect(screen.queryByTestId('timeline-row-r0.0')).toBeNull();
    fireEvent.press(screen.getByText('ההתראות שיישלחו'));
    for (const send of timeline.sends) {
      const id = send.type === 'reminder' ? `r${send.index}.${send.occurrence}` : `n${send.k}`;
      expect(screen.getByTestId(`timeline-row-${id}`)).toBeOnTheScreen();
    }
    fireEvent.press(screen.getByTestId('timeline-row-r1.0'));
    expect(screen.getByTestId('timeline-panel')).toHaveTextContent(/תזכורת/);
    expect(screen.getByTestId('timeline-dot-r1.0')).toHaveProp('accessibilityState', { selected: true });
  });

  it('draws no dot and says so for a mitzvah with no window ahead', () => {
    renderWithTheme(
      <WindowTimeline
        mitzvah={MINCHA}
        name="תפילת מנחה"
        window={null}
        reminders={TWO_REMINDERS}
        manualNags={undefined}
        nagLevel={3}
        location={J}
        settings={SETTINGS}
        onRemindersChange={jest.fn()}
        onManualNagsChange={jest.fn()}
        onEditReminder={jest.fn()}
        onDeleteReminder={jest.fn()}
        changed={false}
        onReset={jest.fn()}
      />,
    );
    expect(screen.getAllByText('--:--')).toHaveLength(2);
    expect(screen.getByText('אין חלון זמן בימים הקרובים.')).toBeOnTheScreen();
    expect(screen.queryByTestId('timeline-count')).toBeNull();
  });

  describe('the 10-minute rule and what a change leaves', () => {
    it('refuses a step within 10 minutes of another notification and says why, saving nothing', () => {
      const manualNags: ManualNag[] = [
        { anchor: 'end', offsetMin: -30, kind: 'zone' },
        { anchor: 'end', offsetMin: -22, kind: 'zone' },
      ];
      const { handlers } = renderTimeline({ manualNags });
      press('timeline-dot-n1');
      fireEvent.press(screen.getByLabelText('5 דקות מאוחר יותר'));
      expect(handlers.onManualNagsChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('timeline-notice')).toHaveTextContent(/במרחק 10 דקות לפחות/);
    });

    it('holds a dragged dot at its last allowed place, draws the forbidden stretches, and saves only an allowed move', () => {
      const { handlers, timeline } = renderTimeline();
      const target = screen.getByTestId('timeline-dot-r0.0');
      const length = WINDOW.end.getTime() - WINDOW.start.getTime();
      const second = timeline.sends.find((send) => send.type === 'reminder' && send.index === 1)!;
      // Onto the second reminder, which a drag may not come within 10 minutes of.
      const share = (second.at - WINDOW.start.getTime()) / length;
      fireEvent(target, 'responderGrant', { nativeEvent: { pageX: 0, pageY: 50 } });
      fireEvent(target, 'responderMove', { nativeEvent: { pageX: AXIS_WIDTH * share, pageY: 50 } });
      expect(screen.getAllByTestId('timeline-gap').length).toBeGreaterThan(0);
      expect(screen.getByTestId('timeline-notice')).toHaveTextContent(/במרחק 10 דקות לפחות/);
      fireEvent(target, 'responderRelease', { nativeEvent: { pageX: AXIS_WIDTH * share, pageY: 50 } });
      expect(handlers.onRemindersChange).not.toHaveBeenCalled();
      expect(screen.queryAllByTestId('timeline-gap')).toHaveLength(0);
    });

    it('says how many nags the smart nag dropped when a reminder moves into the critical zone', () => {
      const { handlers } = renderTimeline({ level: 4 });
      // Mincha at level 4 from four fifths on: the reminder's 10 minutes push nags out (the probe of 2026-11-05).
      drag('timeline-dot-r0.0', AXIS_WIDTH * 0.85);
      expect(handlers.onRemindersChange).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('timeline-notice')).toHaveTextContent(/הנודניק החכם סידר מחדש/);
    });

    it('says a notification dropped in the quiet hours moved or will not go out', () => {
      const handlers = {
        onRemindersChange: jest.fn(),
        onManualNagsChange: jest.fn(),
        onEditReminder: jest.fn(),
        onDeleteReminder: jest.fn(),
        onReset: jest.fn(),
      };
      renderWithTheme(
        <WindowTimeline
          mitzvah={MINCHA}
          name="תפילת מנחה"
          window={WINDOW}
          reminders={TWO_REMINDERS}
          manualNags={undefined}
          nagLevel={1}
          location={J}
          settings={SETTINGS}
          quietHours={{ before: null, after: 13 * 60 }}
          changed={false}
          {...handlers}
        />,
      );
      fireEvent(screen.getByTestId('timeline-axis'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: AXIS_WIDTH, height: 76 } },
      });
      const axis = screen.getByTestId('timeline-axis');
      // Half way through the window, after 13:00 on the location's clock.
      fireEvent(axis, 'responderGrant', { nativeEvent: { pageX: 150, pageY: 40, locationX: AXIS_WIDTH / 2 } });
      fireEvent(axis, 'responderRelease', { nativeEvent: { pageX: 150, pageY: 40, locationX: AXIS_WIDTH / 2 } });
      expect(handlers.onRemindersChange).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('timeline-notice')).toHaveTextContent(/שעות שקטות/);
    });
  });
});
