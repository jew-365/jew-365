import { Platform } from 'react-native';
import { holdScreenOnReturn } from './externalFlow';
import * as LocalAuthentication from 'expo-local-authentication';

export type LockStatus = 'unlocked' | 'locked' | 'unavailable';

let sessionUnlocked = false;
let inFlight: Promise<boolean> | null = null;

export function lockStatusFor(lockEnabled: boolean, available: boolean, unlocked: boolean): LockStatus {
  if (!lockEnabled) return 'unlocked';
  if (!available) return 'unavailable';
  return unlocked ? 'unlocked' : 'locked';
}

export async function biometricsAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

async function prompt(promptMessage: string): Promise<boolean> {
  try {
    holdScreenOnReturn();
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, disableDeviceFallback: false });
    return result.success;
  } catch {
    return false;
  }
}

export async function authenticate(promptMessage: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  inFlight ??= prompt(promptMessage).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function isAuthenticating(): boolean {
  return inFlight !== null;
}

export function isSessionUnlocked(): boolean {
  return sessionUnlocked;
}

export function markUnlocked(): void {
  sessionUnlocked = true;
}

export function relock(): void {
  sessionUnlocked = false;
}
