// The app's own notification sounds (2026-11-12): the Android channels named after the chosen sound, the
// sound on every request, and an older binary without the sound files left on the phone's sound.
type Channel = { id: string; sound?: string | null };

const mockChannels = new Map<string, Channel>();
const mockSetChannel = jest.fn(async (id: string, input: { sound?: string }) => {
  const channel = { id, ...input, sound: mockSoundResolves(input.sound) };
  mockChannels.set(id, channel);
  return channel;
});
const mockDeleteChannel = jest.fn(async (id: string) => {
  mockChannels.delete(id);
});
const mockSchedule = jest.fn(async (_request: unknown) => 'id');
let mockBinaryHasSounds = true;
let mockBundleHasFile = true;

// What Android reports for a channel's sound: `custom` only when the raw resource resolved.
function mockSoundResolves(sound?: string): string {
  if (!sound || sound === 'default') return 'default';
  return mockBinaryHasSounds ? 'custom' : 'default';
}

jest.mock('expo-notifications', () => ({
  setNotificationChannelAsync: (id: string, input: { sound?: string }) => mockSetChannel(id, input),
  deleteNotificationChannelAsync: (id: string) => mockDeleteChannel(id),
  getNotificationChannelsAsync: async () => [...mockChannels.values()],
  scheduleNotificationAsync: (request: unknown) => mockSchedule(request),
  AndroidImportance: { HIGH: 'high', DEFAULT: 'default', MIN: 'min' },
  AndroidNotificationVisibility: { PUBLIC: 'public', PRIVATE: 'private' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('expo-file-system', () => ({
  Paths: { bundle: '/bundle' },
  File: class {
    get exists() {
      return mockBundleHasFile;
    }
  },
}));

import { Platform } from 'react-native';
import type * as OsModule from '@/services/notifications/os';
import type { ScheduleCandidate } from '@/services/notifications/types';
import { useUserStore } from '@/stores/useUserStore';
import { DEFAULT_NOTIFICATION_SOUND, NOTIFICATION_SOUNDS, type NotificationSound } from '@/data/notificationSounds';

const LEGACY = ['default', 'hilulot', 'rosh-chodesh', 'taharah', 'system'];
const SOUND_BASES = ['mitzvot', 'hilulot', 'rosh-chodesh', 'taharah', 'system'];

const candidate: ScheduleCandidate = {
  id: 'shacharit__2026-11-12__0',
  trigger: new Date(Date.now() + 60 * 60_000),
  channel: 'mitzvot',
  title: 'שחרית',
  body: 'הגיע הזמן',
  data: { mitzvahId: 'shacharit', dateKey: '2026-11-12', reminderIndex: 0 },
};

// A fresh module per case, the probe's answer being kept for the process; its user store comes with it.
function freshOs(
  platform: 'android' | 'ios',
  sound?: NotificationSound,
): typeof OsModule & { store: typeof useUserStore } {
  jest.replaceProperty(Platform, 'OS', platform);
  let mod: (typeof OsModule & { store: typeof useUserStore }) | undefined;
  jest.isolateModules(() => {
    const store = require('@/stores/useUserStore').useUserStore as typeof useUserStore;
    if (sound) store.getState().setNotificationSound(sound);
    mod = { ...require('@/services/notifications/os'), store };
  });
  return mod!;
}

type Request = { content: { sound: string }; trigger: { channelId?: string } };
const lastRequest = () => mockSchedule.mock.calls.at(-1)![0] as Request;

beforeEach(() => {
  mockChannels.clear();
  mockSetChannel.mockClear();
  mockDeleteChannel.mockClear();
  mockSchedule.mockClear();
  mockBinaryHasSounds = true;
  mockBundleHasFile = true;
  useUserStore.getState().reset();
});
afterEach(() => jest.restoreAllMocks());

describe('the notification sound setting', () => {
  it('is the bells by default, takes only a known sound and repairs an unknown saved one', () => {
    expect(DEFAULT_NOTIFICATION_SOUND).toBe('bells');
    expect(useUserStore.getState().notificationSound).toBe('bells');
    useUserStore.getState().setNotificationSound('harp');
    expect(useUserStore.getState().notificationSound).toBe('harp');
    useUserStore.getState().setNotificationSound('siren' as never);
    expect(useUserStore.getState().notificationSound).toBe('harp');
    const merge = useUserStore.persist.getOptions().merge!;
    const merged = merge({ notificationSound: 'siren' }, useUserStore.getState()) as { notificationSound: string };
    expect(merged.notificationSound).toBe('bells');
    useUserStore.getState().reset();
    expect(useUserStore.getState().notificationSound).toBe('bells');
  });

  it('ships a file for every sound, wired into the build by the expo-notifications plugin', () => {
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const path = jest.requireActual<typeof import('path')>('path');
    const root = path.join(__dirname, '../../../..');
    const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    const plugin = app.expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-notifications');
    expect(plugin[1].sounds).toEqual(NOTIFICATION_SOUNDS.map((s) => `./assets/sounds/jew365_${s}.wav`));
    for (const file of plugin[1].sounds as string[]) {
      const bytes = fs.readFileSync(path.join(root, file));
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
      expect(bytes.length).toBeLessThan(400_000);
    }
  });
});

describe('Android channels', () => {
  it('names every channel after the chosen sound and removes the older channels', async () => {
    mockChannels.set('default', { id: 'default', sound: 'default' });
    mockChannels.set('hilulot', { id: 'hilulot', sound: 'default' });
    mockChannels.set('system-harp', { id: 'system-harp', sound: 'custom' });
    mockChannels.set('expo_notifications_fallback', { id: 'expo_notifications_fallback' });
    const os = freshOs('android');

    await os.ensureChannels();

    const created = mockSetChannel.mock.calls.map(([id, input]) => [id, input.sound]);
    expect(created.slice(1)).toEqual(SOUND_BASES.map((base) => [`${base}-bells`, 'jew365_bells.wav']));
    expect(created[0][0]).toMatch(/^sound-probe-\d+$/);
    expect([...mockChannels.keys()].sort()).toEqual(
      ['expo_notifications_fallback', ...SOUND_BASES.map((base) => `${base}-bells`)].sort(),
    );
    expect(mockSetChannel.mock.calls[1][1]).toMatchObject({ importance: 'high', vibrationPattern: [0, 250, 250, 250] });

    await os.schedule([candidate]);
    expect(lastRequest().trigger.channelId).toBe('mitzvot-bells');
    expect(lastRequest().content.sound).toBe('jew365_bells.wav');
  });

  it('moves to the channels of a new sound, and the content hash follows, so the schedule is rewritten', async () => {
    const os = freshOs('android');
    await os.ensureChannels();
    const before = os.contentHash(candidate);

    os.store.getState().setNotificationSound('drop');
    await os.ensureChannels();

    expect([...mockChannels.keys()].sort()).toEqual(SOUND_BASES.map((base) => `${base}-drop`).sort());
    expect(os.contentHash(candidate)).not.toBe(before);
    await os.schedule([candidate]);
    expect(lastRequest()).toMatchObject({
      content: { sound: 'jew365_drop.wav' },
      trigger: { channelId: 'mitzvot-drop' },
    });
  });

  it('keeps the original channels and the phone sound on a binary without the sound files', async () => {
    mockBinaryHasSounds = false;
    const os = freshOs('android');

    await os.ensureChannels();

    expect(await os.customSoundsAvailable()).toBe(false);
    expect([...mockChannels.keys()]).toEqual(LEGACY);
    for (const id of LEGACY) expect(mockChannels.get(id)!.sound).toBe('default');
    await os.schedule([candidate]);
    expect(lastRequest()).toMatchObject({ content: { sound: 'default' }, trigger: { channelId: 'default' } });
  });

  it('plays the chosen sound once on its mitzvot channel', async () => {
    const os = freshOs('android', 'call');

    await os.presentSoundPreview();

    expect(lastRequest()).toMatchObject({
      content: { sound: 'jew365_call.wav', data: { kind: 'soundPreview' } },
      trigger: { channelId: 'mitzvot-call' },
    });
  });
});

describe('iOS', () => {
  it('names the chosen file on every request when the bundle has it', async () => {
    const os = freshOs('ios', 'harp');
    await os.ensureChannels();
    await os.schedule([candidate]);
    expect(mockSetChannel).not.toHaveBeenCalled();
    expect(lastRequest().content.sound).toBe('jew365_harp.wav');
  });

  it('keeps the phone sound when the bundle lacks the file', async () => {
    mockBundleHasFile = false;
    const os = freshOs('ios');
    await os.ensureChannels();
    await os.schedule([candidate]);
    expect(lastRequest().content.sound).toBe('default');
  });
});
