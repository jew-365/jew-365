jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import {
  MENS_MITZVOT,
  chooseGender,
  chooseMaritalStatus,
  chooseNusach,
  resetTaharahTracking,
  setTaharahTracking,
  taharahOffered,
} from '../taharahOptIn';
import { useMitzvotStore } from '../useMitzvotStore';
import { useTaharahStore } from '../useTaharahStore';
import { useUserStore } from '../useUserStore';
import { findMitzvah } from '@/data/mitzvot';
import { rulesFor } from '@/data/taharahPresets';
import { taharahStorage } from '@/services/TaharahStorage';

const taharah = () => useTaharahStore.getState();
const user = () => useUserStore.getState();
const enabled = (id: string) => Boolean(useMitzvotStore.getState().activeMitzvot[id]?.enabled);

describe('taharahOptIn', () => {
  beforeEach(() => {
    user().reset();
    taharah().reset();
    useMitzvotStore.getState().reset();
  });

  describe('chooseGender', () => {
    it('stores the gender and flips the taharah role while tracking is on', () => {
      user().setTaharahEnabled(true);

      chooseGender('male');
      expect(user().gender).toBe('male');
      expect(taharah().settings.role).toBe('husband');

      chooseGender('female');
      expect(user().gender).toBe('female');
      expect(taharah().settings.role).toBe('woman');
    });

    it('leaves the taharah store alone while tracking is off', () => {
      taharah().setRole('husband');

      chooseGender('female');

      expect(user().gender).toBe('female');
      expect(taharah().settings.role).toBe('husband');
    });

    it("switches the registered men's mitzvot off for a woman and leaves the prayers on", () => {
      expect(MENS_MITZVOT).toEqual(['tefillin', 'kiddush_levana']);
      const mens = MENS_MITZVOT.filter((id) => findMitzvah(id));
      expect(mens).toEqual(['tefillin', 'kiddush_levana']);
      expect(mens.map(enabled)).toEqual(mens.map(() => true));
      chooseGender('female');
      expect(mens.map(enabled)).toEqual(mens.map(() => false));
      expect(['shacharit', 'mincha', 'maariv', 'krias_shma_shacharit'].map(enabled)).toEqual([true, true, true, true]);
    });

    it('keeps the defaults for a man answering for the first time', () => {
      useMitzvotStore.getState().setEnabled('tefillin', false);
      chooseGender('male');
      expect(enabled('tefillin')).toBe(false);
      expect(enabled('shacharit')).toBe(true);
    });

    it("restores the registered men's mitzvot when the answer changes from woman to man", () => {
      const mens = MENS_MITZVOT.filter((id) => findMitzvah(id));
      expect(mens).toEqual(['tefillin', 'kiddush_levana']);
      chooseGender('female');
      chooseGender('male');
      expect(mens.map(enabled)).toEqual(mens.map(() => true));
    });

    it("never writes a men's mitzvah the registry lacks", () => {
      chooseGender('female');
      chooseGender('male');
      expect(Object.keys(useMitzvotStore.getState().activeMitzvot).filter((id) => !findMitzvah(id))).toEqual([]);
    });

    it('leaves tefillin off on the way back to man when its reminders were emptied', () => {
      chooseGender('female');
      useMitzvotStore.getState().setReminders('tefillin', []);
      chooseGender('male');
      expect(enabled('tefillin')).toBe(false);
    });

    it('re-choosing the same gender never touches the library', () => {
      chooseGender('female');
      useMitzvotStore.getState().setEnabled('tefillin', true);
      chooseGender('female');
      expect(enabled('tefillin')).toBe(true);
    });

    it('keeps gold for a man answering for the first time', () => {
      chooseGender('male');
      expect(user().theme).toBe('gold');
    });

    it('switches gold to pink for a woman answering for the first time', () => {
      chooseGender('female');
      expect(user().theme).toBe('pink');
    });

    it('stays inside the dark class: a woman on dark gets plum and a man on plum gets dark', () => {
      user().setTheme('dark');
      chooseGender('female');
      expect(user().theme).toBe('plum');

      chooseGender('male');
      expect(user().theme).toBe('dark');
    });

    it('moves a light palette that is not gold or pink to pink for a woman', () => {
      user().setTheme('purple');
      chooseGender('female');
      expect(user().theme).toBe('pink');
    });

    it('lets the user pick any palette after the answer and re-choosing the same gender keeps it', () => {
      chooseGender('female');
      user().setTheme('blue');

      chooseGender('female');

      expect(user().theme).toBe('blue');
    });

    it('a later change of gender sets the palette again', () => {
      chooseGender('female');
      user().setTheme('blue');

      chooseGender('male');

      expect(user().theme).toBe('gold');
    });
  });

  describe('taharahOffered', () => {
    it('is offered only to a married user who answered the gender question', () => {
      expect(taharahOffered({ gender: 'female', maritalStatus: 'married' })).toBe(true);
      expect(taharahOffered({ gender: 'male', maritalStatus: 'married' })).toBe(true);
      expect(taharahOffered({ gender: null, maritalStatus: 'married' })).toBe(false);
      expect(taharahOffered({ gender: 'female', maritalStatus: 'single' })).toBe(false);
      expect(taharahOffered({ gender: 'female', maritalStatus: null })).toBe(false);
      expect(taharahOffered({ gender: null, maritalStatus: null })).toBe(false);
    });
  });

  describe('chooseMaritalStatus', () => {
    it('stores the status', () => {
      chooseMaritalStatus('married');
      expect(user().maritalStatus).toBe('married');

      chooseMaritalStatus('single');
      expect(user().maritalStatus).toBe('single');
    });

    it('choosing single while tracking is on switches tracking off and keeps the taharah log', () => {
      user().setGender('female');
      user().setMaritalStatus('married');
      setTaharahTracking(true);
      taharah().addEvent({ type: 'onset', onah: { abs: 740000, kind: 'night' } });
      taharah().setRule('ohrZarua', true);
      expect(user().taharahEnabled).toBe(true);

      chooseMaritalStatus('single');

      expect(user().taharahEnabled).toBe(false);
      expect(user().maritalStatus).toBe('single');
      expect(taharah().events.length).toBe(1);
      expect(taharah().settings.rules.ohrZarua).toBe(true);
      expect(taharah().settings.role).toBe('woman');
    });

    it('choosing married leaves tracking as it is', () => {
      user().setGender('female');
      user().setMaritalStatus('married');
      setTaharahTracking(true);

      chooseMaritalStatus('married');
      expect(user().taharahEnabled).toBe(true);

      setTaharahTracking(false);
      chooseMaritalStatus('married');
      expect(user().taharahEnabled).toBe(false);
    });
  });

  describe('setTaharahTracking', () => {
    it('switching on sets the role from the gender and the preset from the nusach', () => {
      user().setGender('male');
      user().setMaritalStatus('married');
      user().setNusach('sefard');

      setTaharahTracking(true);

      expect(user().taharahEnabled).toBe(true);
      expect(taharah().settings.role).toBe('husband');
      expect(taharah().settings.preset).toBe('chassidic');
      expect(taharah().settings.rules).toEqual(rulesFor('chassidic'));
    });

    it('switching on as a woman with the default nusach keeps ashkenaz', () => {
      user().setGender('female');
      user().setMaritalStatus('married');

      setTaharahTracking(true);

      expect(taharah().settings.role).toBe('woman');
      expect(taharah().settings.preset).toBe('ashkenaz');
    });

    it('switching on keeps a preset the user already worked on', () => {
      taharah().setPreset('chabad');
      taharah().addEvent({ type: 'onset', onah: { abs: 740000, kind: 'night' } });
      user().setGender('female');
      user().setMaritalStatus('married');
      user().setNusach('edot_hamizrach');

      setTaharahTracking(true);

      expect(taharah().settings.preset).toBe('chabad');
      expect(taharah().settings.role).toBe('woman');
    });

    it.each([
      ['no marital status', 'female', null],
      ['a single status', 'female', 'single'],
      ['no gender', null, 'married'],
    ] as const)('switching on is ignored with %s', (_label, gender, maritalStatus) => {
      user().setGender(gender);
      user().setMaritalStatus(maritalStatus);
      user().setNusach('chabad');

      setTaharahTracking(true);

      expect(user().taharahEnabled).toBe(false);
      expect(taharah().settings).toEqual(useTaharahStore.getInitialState().settings);
    });

    it('switching off touches only the user store', () => {
      user().setGender('female');
      user().setMaritalStatus('married');
      setTaharahTracking(true);
      taharah().setRole('husband');

      setTaharahTracking(false);

      expect(user().taharahEnabled).toBe(false);
      expect(taharah().settings.role).toBe('husband');
    });

    it('switching off is never ignored', () => {
      user().setTaharahEnabled(true);

      setTaharahTracking(false);

      expect(user().taharahEnabled).toBe(false);
    });
  });

  describe('chooseNusach', () => {
    const ushpizin = () => useMitzvotStore.getState().activeMitzvot.ushpizin;

    it('stamps Ushpizin when a Chabad user moves to a nusach that offers it, so earlier nights are no misses', () => {
      const now = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-02T10:00:00Z'));
      try {
        chooseNusach('chabad');
        expect(ushpizin()).toEqual({ enabled: true });

        chooseNusach('ashkenaz');
        expect(ushpizin()).toEqual({ enabled: true, enabledAt: Date.parse('2026-11-02T10:00:00Z') });

        now.mockReturnValue(Date.parse('2026-11-09T10:00:00Z'));
        chooseNusach('sefard');
        expect(ushpizin()?.enabledAt).toBe(Date.parse('2026-11-02T10:00:00Z'));
      } finally {
        now.mockRestore();
      }
    });

    it('leaves a switched-off Ushpizin off and unstamped after a move from Chabad', () => {
      chooseNusach('chabad');
      useMitzvotStore.getState().setEnabled('ushpizin', false);
      chooseNusach('edot_hamizrach');
      expect(ushpizin()?.enabled).toBe(false);
      expect(ushpizin()?.enabledAt).toBeUndefined();
    });

    it('adopts the matching preset while tracking is on and the store is untouched', () => {
      user().setTaharahEnabled(true);

      chooseNusach('chabad');

      expect(user().nusach).toBe('chabad');
      expect(taharah().settings.preset).toBe('chabad');
      expect(taharah().settings.rules).toEqual(rulesFor('chabad'));
    });

    it('follows a second nusach choice while the store stays untouched', () => {
      user().setTaharahEnabled(true);

      chooseNusach('chabad');
      chooseNusach('edot_hamizrach');

      expect(taharah().settings.preset).toBe('sephardi_ovadia');
    });

    it('keeps the preset once an event is recorded', () => {
      user().setTaharahEnabled(true);
      taharah().addEvent({ type: 'onset', onah: { abs: 740000, kind: 'night' } });

      chooseNusach('chabad');

      expect(user().nusach).toBe('chabad');
      expect(taharah().settings.preset).toBe('ashkenaz');
    });

    it('keeps a hand-edited rule', () => {
      user().setTaharahEnabled(true);
      taharah().setRule('ohrZarua', true);

      chooseNusach('chabad');

      expect(taharah().settings.preset).toBe('ashkenaz');
      expect(taharah().settings.rules.ohrZarua).toBe(true);
    });

    it('leaves the taharah store alone while tracking is off', () => {
      chooseNusach('chabad');

      expect(user().nusach).toBe('chabad');
      expect(taharah().settings.preset).toBe('ashkenaz');
    });
  });

  describe('resetTaharahTracking', () => {
    it('returns tracking to before it was switched on and leaves the rest of the app alone', () => {
      chooseGender('female');
      chooseMaritalStatus('married');
      chooseNusach('edot_hamizrach');
      setTaharahTracking(true);
      taharah().addEvent({ type: 'onset', onah: { abs: 740000, kind: 'night' } });
      taharah().setRule('ohrZarua', true);
      taharah().setLeads({ hefsekLeadMin: 30 });
      taharah().setLockEnabled(false);
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      resetTaharahTracking();

      expect(user().taharahEnabled).toBe(false);
      expect(taharah().events).toEqual([]);
      expect(taharah().settings.preset).toBe('ashkenaz');
      expect(taharah().settings.rules).toEqual(rulesFor('ashkenaz'));
      expect(taharah().hefsekLeadMin).toBe(90);
      expect(taharah().lockEnabled).toBe(true);
      expect(taharahStorage.getString('taharah-store') ?? '').not.toContain('onset');
      expect(user().gender).toBe('female');
      expect(user().maritalStatus).toBe('married');
      expect(user().nusach).toBe('edot_hamizrach');
    });

    it('lets tracking start again from the nusach preset afterwards', () => {
      chooseGender('female');
      chooseMaritalStatus('married');
      chooseNusach('edot_hamizrach');
      setTaharahTracking(true);
      taharah().setPreset('chabad');
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      resetTaharahTracking();
      setTaharahTracking(true);

      expect(user().taharahEnabled).toBe(true);
      expect(taharah().settings.preset).toBe('sephardi_ovadia');
    });
  });
});
