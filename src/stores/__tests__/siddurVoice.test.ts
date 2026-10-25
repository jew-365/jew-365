jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { chooseGender } from '../taharahOptIn';
import { useMitzvotStore } from '../useMitzvotStore';
import { useTaharahStore } from '../useTaharahStore';
import { useUserStore } from '../useUserStore';

const user = () => useUserStore.getState();

describe('useUserStore siddur voice', () => {
  beforeEach(() => {
    user().reset();
  });

  it('starts with no voice, keeps a chosen one and resets to none', () => {
    expect(user().siddurVoice).toBeNull();
    user().setSiddurVoice('female');
    expect(user().siddurVoice).toBe('female');
    user().reset();
    expect(user().siddurVoice).toBeNull();
  });

  it('stays without a voice for a payload saved before the field existed and keeps a saved voice', () => {
    const { merge } = useUserStore.persist.getOptions();
    const current = user();
    expect(merge!({ nusach: 'sefard' }, current).siddurVoice).toBeNull();
    expect(merge!({ siddurVoice: 'female' }, current).siddurVoice).toBe('female');
  });
});

describe('chooseGender and the siddur voice', () => {
  beforeEach(() => {
    user().reset();
    useTaharahStore.getState().reset();
    useMitzvotStore.getState().reset();
  });

  it('sets the voice to the gender on a first answer and on every change', () => {
    chooseGender('female');
    expect(user().siddurVoice).toBe('female');
    chooseGender('male');
    expect(user().siddurVoice).toBe('male');
    chooseGender('female');
    expect(user().siddurVoice).toBe('female');
  });

  it('overwrites a voice chosen in Settings when the gender changes', () => {
    user().setGender('female');
    user().setSiddurVoice('female');
    chooseGender('male');
    expect(user().siddurVoice).toBe('male');
  });

  it('keeps a voice chosen in Settings while the same gender is chosen again', () => {
    chooseGender('female');
    user().setSiddurVoice('male');
    chooseGender('female');
    expect(user().siddurVoice).toBe('male');
    expect(user().gender).toBe('female');
  });

  it('leaves an install that answered before the voice existed without one until its gender changes', () => {
    user().setGender('female');
    chooseGender('female');
    expect(user().siddurVoice).toBeNull();
    chooseGender('male');
    expect(user().siddurVoice).toBe('male');
  });
});
