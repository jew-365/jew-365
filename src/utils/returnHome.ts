// The owner's call of 2026-11-10: the app always opens on home, never on the screen it was left on. A return
// after at least this long away unwinds every pushed screen and selects the home tab. A shorter absence (a
// permission dialog, the share sheet, a glance at another app) keeps the screen, because those pause the app too.
export const RETURN_HOME_AFTER_MS = 60 * 1000;
// The return waits this long, so a notification tap handled with the same return can win over it.
export const RETURN_HOME_DELAY_MS = 300;
// A notification tap that opened a screen within this long before the return keeps that screen.
export const NOTIFICATION_WINS_MS = 3000;

export function shouldReturnHome(awayMs: number, onboarded: boolean, quiet: boolean): boolean {
  return onboarded && !quiet && awayMs >= RETURN_HOME_AFTER_MS;
}
