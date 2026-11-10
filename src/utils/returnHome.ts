// The owner's call of 2026-11-10: the app always opens on home, never on the screen it was left on. Every return
// from the background unwinds every pushed screen and selects the home tab, except a return from something the
// app itself opened outside it (a permission dialog, the system settings, the share sheet, the file picker, a
// link; [../services/externalFlow.ts]), which keeps the screen for up to HOLD_MAX_MS, so the user lands back
// where that flow started.
export const HOLD_MAX_MS = 10 * 60 * 1000;
// A hold counts for an absence only when it was set this long before the app left at most; an older one is stale
// (a link that never opened).
export const HOLD_LEAD_MS = 30 * 1000;
// The return waits this long, so a notification tap handled with the same return can win over it.
export const RETURN_HOME_DELAY_MS = 300;
// A notification tap that opened a screen within this long before the return keeps that screen.
export const NOTIFICATION_WINS_MS = 3000;

// Whether a hold set at `heldAt` covers an absence that began at `awayAt` and lasted `awayMs`.
export const holdCovers = (heldAt: number | null, awayAt: number, awayMs: number): boolean =>
  heldAt !== null && heldAt >= awayAt - HOLD_LEAD_MS && awayMs < HOLD_MAX_MS;

export function shouldReturnHome(onboarded: boolean, quiet: boolean, held: boolean): boolean {
  return onboarded && !quiet && !held;
}
