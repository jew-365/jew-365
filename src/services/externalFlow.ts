import { Linking } from 'react-native';

// What the app opens outside itself marks a hold first, so the return from it keeps the screen instead of going
// home (the root layout's return to home, [../utils/returnHome.ts]). Every link and settings jump goes through
// openExternalUrl() and openSystemSettings(); a permission request, the share sheet and the file picker call
// holdScreenOnReturn() themselves.
let heldAt: number | null = null;

export function holdScreenOnReturn(now = Date.now()): void {
  heldAt = now;
}

// The hold, read once: the next return consumes it.
export function takeScreenHold(): number | null {
  const held = heldAt;
  heldAt = null;
  return held;
}

export function openExternalUrl(url: string): Promise<void> {
  holdScreenOnReturn();
  return Linking.openURL(url).catch(() => {});
}

export function openSystemSettings(): Promise<void> {
  holdScreenOnReturn();
  return Linking.openSettings().catch(() => {});
}
