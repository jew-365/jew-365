// The app's own notification sounds (2026-11-12): twelve sounds, one chosen for each stage of a reminder,
// the Android channels named after their sound, the sound on every request, and a binary that holds only
// some of the files (or none) left on what it holds.
type Channel = { id: string; name?: string; sound?: string | null };

const mockChannels = new Map<string, Channel>();
const mockSetChannel = jest.fn(async (id: string, input: { name?: string; sound?: string }) => {
  const channel = { id, ...input, sound: mockSoundResolves(input.sound) };
  mockChannels.set(id, channel);
  return channel;
});
const mockDeleteChannel = jest.fn(async (id: string) => {
  mockChannels.delete(id);
});
const mockSchedule = jest.fn(async (_request: unknown) => 'id');
// The sound files the binary holds; the first preview build held the first four.
let mockFiles = new Set<string>();

// What Android reports for a channel's sound: `custom` only when the raw resource resolved.
function mockSoundResolves(sound?: string): string {
  return sound && mockFiles.has(sound) ? 'custom' : 'default';
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
    mockName: string;
    constructor(_dir: string, mockName: string) {
      this.mockName = mockName;
    }
    get exists() {
      return mockFiles.has(this.mockName);
    }
  },
}));

import { Platform } from 'react-native';
import type * as OsModule from '@/services/notifications/os';
import type { ScheduleCandidate } from '@/services/notifications/types';
import { useUserStore } from '@/stores/useUserStore';
import {
  DEFAULT_NOTIFICATION_SOUNDS,
  NOTIFICATION_SOUNDS,
  SOUND_GROUPS,
  effectiveSound,
  notificationSoundFile,
  notificationSoundsOf,
  type NotificationSound,
} from '@/data/notificationSounds';
import type { TimeStage } from '@/utils/timeLeft';

const ALL_FILES = NOTIFICATION_SOUNDS.map(notificationSoundFile);
const FIRST_FOUR = ['bells', 'call', 'harp', 'drop'].map((s) => notificationSoundFile(s as NotificationSound));
const LEGACY = ['default', 'hilulot', 'rosh-chodesh', 'taharah', 'system'];
const OTHER_BASES = ['hilulot', 'rosh-chodesh', 'taharah', 'system'];

// One instant for every fixture, so two candidates differ only where a case makes them.
const TRIGGER = new Date(Date.now() + 60 * 60_000);
const candidate = (stage?: TimeStage, channel: ScheduleCandidate['channel'] = 'mitzvot'): ScheduleCandidate => ({
  id: `shacharit__2026-11-12__${stage ?? 'plain'}`,
  trigger: TRIGGER,
  channel,
  title: 'שחרית',
  body: 'הגיע הזמן',
  ...(stage ? { stage } : {}),
  data: { mitzvahId: 'shacharit', dateKey: '2026-11-12', reminderIndex: 0 },
});

type Os = typeof OsModule & { store: typeof useUserStore };
// A fresh module per case, the probe's answer being kept for the process; its user store comes with it.
function freshOs(platform: 'android' | 'ios', choice: Partial<typeof DEFAULT_NOTIFICATION_SOUNDS> = {}): Os {
  jest.replaceProperty(Platform, 'OS', platform);
  let mod: Os | undefined;
  jest.isolateModules(() => {
    const store = require('@/stores/useUserStore').useUserStore as typeof useUserStore;
    for (const [role, sound] of Object.entries(choice)) store.getState().setNotificationSound(role as never, sound);
    mod = { ...require('@/services/notifications/os'), store };
  });
  return mod!;
}

type Request = { content: { sound: string; body: string }; trigger: { channelId?: string } };
const requests = () => mockSchedule.mock.calls.map(([request]) => request as Request);
const lastRequest = () => requests().at(-1)!;

beforeEach(() => {
  mockChannels.clear();
  mockSetChannel.mockClear();
  mockDeleteChannel.mockClear();
  mockSchedule.mockClear();
  mockFiles = new Set(ALL_FILES);
  useUserStore.getState().reset();
});
afterEach(() => jest.restoreAllMocks());

describe('the sound choice', () => {
  it('defaults to the bells, the kalimba before the last and the music box last', () => {
    expect(DEFAULT_NOTIFICATION_SOUNDS).toEqual({ regular: 'bells', soon: 'kalimba', last: 'music_box' });
    expect(useUserStore.getState().notificationSounds).toEqual(DEFAULT_NOTIFICATION_SOUNDS);
  });

  it('sets one role at a time, refuses an unknown sound and comes back to the defaults on reset', () => {
    const before = useUserStore.getState();
    useUserStore.getState().setNotificationSound('last', 'bowl');
    expect(useUserStore.getState().notificationSounds).toEqual({ ...DEFAULT_NOTIFICATION_SOUNDS, last: 'bowl' });
    const after = useUserStore.getState();
    useUserStore.getState().setNotificationSound('soon', 'siren' as never);
    useUserStore.getState().setNotificationSound('last', 'bowl');
    expect(useUserStore.getState()).toBe(after);
    expect(after).not.toBe(before);
    useUserStore.getState().reset();
    expect(useUserStore.getState().notificationSounds).toEqual(DEFAULT_NOTIFICATION_SOUNDS);
  });

  it('repairs a saved choice, and reads the first preview build’s one sound as the regular one', () => {
    const merge = useUserStore.persist.getOptions().merge!;
    const read = (saved: object) =>
      (merge(saved, useUserStore.getState()) as { notificationSounds: unknown; notificationSound?: unknown })
        .notificationSounds;
    expect(read({ notificationSound: 'harp' })).toEqual({ ...DEFAULT_NOTIFICATION_SOUNDS, regular: 'harp' });
    expect(read({ notificationSounds: { regular: 'dew', soon: 'siren' } })).toEqual({
      ...DEFAULT_NOTIFICATION_SOUNDS,
      regular: 'dew',
    });
    expect(read({})).toEqual(DEFAULT_NOTIFICATION_SOUNDS);
    expect(merge({ notificationSound: 'harp' }, useUserStore.getState())).not.toHaveProperty('notificationSound');
    expect(notificationSoundsOf('nonsense')).toEqual(DEFAULT_NOTIFICATION_SOUNDS);
  });

  it('falls back to the role’s default, then to any sound the binary holds', () => {
    const choice = { regular: 'piano', soon: 'glass', last: 'bowl' } as const;
    const firstFour = new Set<NotificationSound>(['bells', 'call', 'harp', 'drop']);
    expect(effectiveSound(choice, 'regular', new Set(NOTIFICATION_SOUNDS))).toBe('piano');
    expect(effectiveSound(choice, 'regular', firstFour)).toBe('bells');
    expect(effectiveSound(choice, 'last', firstFour)).toBe('bells');
    expect(effectiveSound(choice, 'last', new Set())).toBeNull();
  });

  it('ships a quiet file for every sound, wired into the build by the expo-notifications plugin', () => {
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const path = jest.requireActual<typeof import('path')>('path');
    const root = path.join(__dirname, '../../../..');
    const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    const plugin = app.expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-notifications');
    expect(plugin[1].sounds).toEqual(NOTIFICATION_SOUNDS.map((s) => `./assets/sounds/jew365_${s}.wav`));
    expect(SOUND_GROUPS.flatMap((group) => group.sounds).sort()).toEqual([...NOTIFICATION_SOUNDS].sort());
    for (const file of plugin[1].sounds as string[]) {
      const bytes = fs.readFileSync(path.join(root, file));
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
      expect(bytes.length).toBeLessThan(400_000);
    }
    // The eight gentle sounds peak well below full scale.
    for (const sound of SOUND_GROUPS[1].sounds) {
      const bytes = fs.readFileSync(path.join(root, 'assets/sounds', notificationSoundFile(sound)));
      let peak = 0;
      for (let i = 44; i + 1 < bytes.length; i += 2) peak = Math.max(peak, Math.abs(bytes.readInt16LE(i)));
      expect(peak / 32768).toBeLessThan(0.62);
    }
  });
});

describe('Android channels', () => {
  it('names a channel after each sound in use and removes every other one of the app', async () => {
    mockChannels.set('default', { id: 'default', sound: 'default' });
    mockChannels.set('hilulot', { id: 'hilulot', sound: 'default' });
    mockChannels.set('system-harp', { id: 'system-harp', sound: 'custom' });
    mockChannels.set('expo_notifications_fallback', { id: 'expo_notifications_fallback' });
    const os = freshOs('android');

    await os.ensureChannels();

    expect([...mockChannels.keys()].sort()).toEqual(
      [
        'expo_notifications_fallback',
        'mitzvot-bells',
        'mitzvot-kalimba',
        'mitzvot-music_box',
        ...OTHER_BASES.map((base) => `${base}-bells`),
      ].sort(),
    );
    expect(mockChannels.get('mitzvot-kalimba')).toMatchObject({
      name: 'מצוות · קלימבה',
      sound: 'custom',
      importance: 'high',
      vibrationPattern: [0, 250, 250, 250],
    });
    expect(mockChannels.get('hilulot-bells')).toMatchObject({ name: 'הילולות צדיקים · פעמונים' });
  });

  it('sends each stage of a reminder with its own sound, and every notice with the regular one', async () => {
    const os = freshOs('android');
    await os.ensureChannels();
    await os.schedule([
      candidate(),
      candidate('green'),
      candidate('orange'),
      candidate('red'),
      candidate(undefined, 'system'),
    ]);

    expect(requests().map((r) => [r.trigger.channelId, r.content.sound])).toEqual([
      ['mitzvot-bells', 'jew365_bells.wav'],
      ['mitzvot-bells', 'jew365_bells.wav'],
      ['mitzvot-kalimba', 'jew365_kalimba.wav'],
      ['mitzvot-music_box', 'jew365_music_box.wav'],
      ['system-bells', 'jew365_bells.wav'],
    ]);
  });

  it('shares one channel between two stages that chose the same sound', async () => {
    const os = freshOs('android', { soon: 'bells' });
    await os.ensureChannels();
    expect([...mockChannels.keys()].filter((id) => id.startsWith('mitzvot-')).sort()).toEqual([
      'mitzvot-bells',
      'mitzvot-music_box',
    ]);
  });

  it('moves to the channels of a new choice, and the content hash follows, so the schedule is rewritten', async () => {
    const os = freshOs('android');
    await os.ensureChannels();
    const before = os.contentHash(candidate('red'));
    const plain = os.contentHash(candidate());

    os.store.getState().setNotificationSound('last', 'bowl');
    await os.ensureChannels();

    expect(mockChannels.has('mitzvot-music_box')).toBe(false);
    expect(mockChannels.has('mitzvot-bowl')).toBe(true);
    expect(os.contentHash(candidate('red'))).not.toBe(before);
    expect(os.contentHash(candidate())).toBe(plain);
  });

  it('on a binary with the first four files only, offers those and plays the defaults of what it holds', async () => {
    mockFiles = new Set(FIRST_FOUR);
    const os = freshOs('android', { regular: 'piano' });

    expect([...(await os.availableSounds())]).toEqual(['bells', 'call', 'harp', 'drop']);
    await os.ensureChannels();

    // No channel is ever created with a sound the binary lacks: it would play the phone's default forever.
    for (const [id, input] of mockSetChannel.mock.calls) {
      if (!id.startsWith('sound-probe-')) expect(FIRST_FOUR).toContain(input.sound);
    }
    await os.schedule([candidate('orange')]);
    expect(lastRequest()).toMatchObject({
      content: { sound: 'jew365_bells.wav' },
      trigger: { channelId: 'mitzvot-bells' },
    });
  });

  it('keeps the original channels and the phone sound on a binary without any of the files', async () => {
    mockFiles = new Set();
    const os = freshOs('android');

    await os.ensureChannels();

    expect(await os.customSoundsAvailable()).toBe(false);
    expect([...mockChannels.keys()]).toEqual(LEGACY);
    for (const id of LEGACY) expect(mockChannels.get(id)!.sound).toBe('default');
    await os.schedule([candidate('red')]);
    expect(lastRequest()).toMatchObject({ content: { sound: 'default' }, trigger: { channelId: 'default' } });
  });

  it('plays a role’s sound once on the mitzvot channel of that sound', async () => {
    const os = freshOs('android', { last: 'chime' });

    await os.presentSoundPreview('last');

    expect(lastRequest()).toMatchObject({
      content: { sound: 'jew365_chime.wav', body: '❗ ההתראה האחרונה: פעמוני רוח', data: { kind: 'soundPreview' } },
      trigger: { channelId: 'mitzvot-chime' },
    });
  });
});

describe('iOS', () => {
  it('names each stage’s file on its request when the bundle has it', async () => {
    const os = freshOs('ios', { soon: 'glass' });
    await os.ensureChannels();
    await os.schedule([candidate(), candidate('orange')]);
    expect(mockSetChannel).not.toHaveBeenCalled();
    expect(requests().map((r) => r.content.sound)).toEqual(['jew365_bells.wav', 'jew365_glass.wav']);
  });

  it('keeps the phone sound when the bundle lacks the files', async () => {
    mockFiles = new Set();
    const os = freshOs('ios');
    await os.ensureChannels();
    await os.schedule([candidate('red')]);
    expect(lastRequest().content.sound).toBe('default');
  });
});
