jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});
jest.mock('@/i18n/deviceLanguage', () => ({ deviceLanguage: jest.fn(() => 'en') }));

import { deviceLanguage } from '@/i18n/deviceLanguage';
import { useUserStore } from '../useUserStore';

const user = () => useUserStore.getState();
const mockDeviceLanguage = jest.mocked(deviceLanguage);

describe('the user store language', () => {
  afterEach(() => mockDeviceLanguage.mockReturnValue('en'));

  it('starts in the language of the device on a fresh install', () => {
    expect(user().language).toBe('en');
  });

  it('takes the language of the device again on reset', () => {
    user().setLanguage('he');
    user().reset();
    expect(user().language).toBe('en');

    mockDeviceLanguage.mockReturnValue('he');
    user().setLanguage('en');
    user().reset();
    expect(user().language).toBe('he');
  });

  it('keeps a stored language on hydrate, whatever the device says', () => {
    const merge = useUserStore.persist.getOptions().merge!;
    expect(merge({ language: 'he' }, user()).language).toBe('he');
    expect(merge({ language: 'en' }, user()).language).toBe('en');
  });
});
