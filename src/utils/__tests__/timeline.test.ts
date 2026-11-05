import {
  ZOOM_LEAD_MIN,
  clampToWindow,
  nagsEdited,
  reminderAt,
  reminderDraggable,
  reminderMovedTo,
  shareOf,
  timeAtShare,
  timelineView,
} from '../timeline';
import { manualNagAt } from '../nagging';
import type { Reminder } from '@/types/mitzvah';

const MIN = 60_000;
// 13:00 to 17:00 in Jerusalem (UTC+2 on 2026-11-11).
const start = new Date('2026-11-11T11:00:00Z');
const end = new Date('2026-11-11T15:00:00Z');
const window = { start, end };
const minutes = (n: number) => new Date(start.getTime() + n * MIN);
const TZ = 'Asia/Jerusalem';

describe('the timeline rules', () => {
  it('holds an instant to the window on a whole minute', () => {
    expect(clampToWindow(minutes(30.4).getTime(), window)).toEqual(minutes(30));
    expect(clampToWindow(minutes(-20).getTime(), window)).toEqual(start);
    expect(clampToWindow(minutes(300).getTime(), window)).toEqual(end);
  });

  it('drags a reminder counted from an edge, and a set time only in a window under a day', () => {
    const r = (anchor: Reminder['anchor']): Reminder => ({ anchor, offsetMin: 0, label: 'x' });
    expect(reminderDraggable(r('start'), window)).toBe(true);
    expect(reminderDraggable(r('end'), window)).toBe(true);
    expect(reminderDraggable(r('clock'), window)).toBe(true);
    expect(reminderDraggable(r('followUp'), window)).toBe(false);
    expect(reminderDraggable(r('blockExit'), window)).toBe(false);
    const long = { start, end: new Date(start.getTime() + 3 * 24 * 60 * MIN) };
    expect(reminderDraggable(r('clock'), long)).toBe(false);
    expect(reminderDraggable(r('start'), long)).toBe(true);
  });

  it('moves a reminder keeping its anchor, and drops its rotating bodies', () => {
    const fromStart: Reminder = {
      anchor: 'start',
      offsetMin: 0,
      label: 'a',
      bodyVariants: ['a', 'b'],
      skipIfDone: true,
    };
    expect(reminderMovedTo(fromStart, minutes(45), window, TZ)).toEqual({
      anchor: 'start',
      offsetMin: 45,
      label: 'a',
      skipIfDone: true,
    });
    const beforeEnd: Reminder = { anchor: 'end', offsetMin: -60, label: 'b' };
    expect(reminderMovedTo(beforeEnd, minutes(200), window, TZ)).toEqual({ anchor: 'end', offsetMin: -40, label: 'b' });
    // Past the end it holds at the end.
    expect(reminderMovedTo(beforeEnd, minutes(260), window, TZ).offsetMin).toBe(0);
    const clock: Reminder = { anchor: 'clock', offsetMin: 14 * 60, label: 'c' };
    // 15:30 on the location's clock.
    expect(reminderMovedTo(clock, minutes(150), window, TZ)).toEqual({ ...clock, offsetMin: 15 * 60 + 30 });
  });

  it('adds a reminder counted from the nearer edge', () => {
    expect(reminderAt(minutes(50), window, 'שם')).toEqual({ anchor: 'start', offsetMin: 50, label: 'שם' });
    expect(reminderAt(minutes(230), window, 'שם')).toEqual({ anchor: 'end', offsetMin: -10, label: 'שם' });
  });

  it('turns the window’s nags into the user’s own with one moved or left out', () => {
    const nags = [
      { at: minutes(100).getTime(), kind: 'zone' as const },
      { at: minutes(220).getTime(), kind: 'lastChance' as const, lastChance: 'minyan' as const },
      { at: minutes(230).getTime(), kind: 'lastChance' as const, lastChance: 'alone' as const },
    ];
    const moved = nagsEdited(nags, window, nags[0].at, minutes(130));
    expect(moved.map((nag) => manualNagAt(nag, window))).toEqual([minutes(130), minutes(220), minutes(230)]);
    expect(moved[1]).toEqual({ anchor: 'end', offsetMin: -20, kind: 'lastChance', lastChance: 'minyan' });
    const left = nagsEdited(nags, window, nags[1].at, null);
    expect(left.map((nag) => manualNagAt(nag, window))).toEqual([minutes(100), minutes(230)]);
  });

  it('zooms from before the zone to the end, and reads shares both ways', () => {
    const zone = [{ start: minutes(160), end }];
    expect(timelineView(window, zone, false)).toBe(window);
    expect(timelineView(window, [], true)).toBe(window);
    expect(timelineView(window, zone, true)).toEqual({ start: minutes(160 - ZOOM_LEAD_MIN), end });
    expect(timelineView(window, [{ start: minutes(10), end }], true).start).toEqual(start);
    // A zone at the window's start (a night mitzvah's, to chatzot) ends the zoom half an hour after it.
    expect(timelineView(window, [{ start, end: minutes(90) }], true)).toEqual({
      start,
      end: minutes(90 + ZOOM_LEAD_MIN),
    });
    expect(shareOf(minutes(60).getTime(), window)).toBe(0.25);
    expect(shareOf(minutes(-60).getTime(), window)).toBe(-0.25);
    expect(timeAtShare(0.5, window)).toEqual(minutes(120));
    expect(timeAtShare(1.5, window)).toEqual(end);
  });
});
