jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { useUserStore } from '../useUserStore';
import { createZustandStorage } from '@/services/StorageService';

const user = () => useUserStore.getState();

describe('the rating stamps of the user store', () => {
  beforeEach(() => user().reset());

  it('start as null', () => {
    expect(user().ratingAskedAt).toBeNull();
    expect(user().firstOpenedAt).toBeNull();
  });

  it('are written by their setters, each on its own', () => {
    user().setFirstOpenedAt(1000);
    expect(user().firstOpenedAt).toBe(1000);
    expect(user().ratingAskedAt).toBeNull();

    user().setRatingAskedAt(2000);
    expect(user().ratingAskedAt).toBe(2000);
    expect(user().firstOpenedAt).toBe(1000);
  });

  it('are cleared by reset', () => {
    user().setFirstOpenedAt(1000);
    user().setRatingAskedAt(2000);
    user().reset();
    expect(user().ratingAskedAt).toBeNull();
    expect(user().firstOpenedAt).toBeNull();
  });

  it('merge to null from a payload saved before they existed, and are kept from one that has them', () => {
    const merge = useUserStore.persist.getOptions().merge!;
    const older = merge({ language: 'he', nusach: 'sefard' }, user());
    expect(older.ratingAskedAt).toBeNull();
    expect(older.firstOpenedAt).toBeNull();
    expect(older.nusach).toBe('sefard');

    const saved = merge({ ratingAskedAt: 2000, firstOpenedAt: 1000 }, user());
    expect(saved.ratingAskedAt).toBe(2000);
    expect(saved.firstOpenedAt).toBe(1000);
  });

  it('persist with the rest of the store, so the backup file carries them', () => {
    user().setFirstOpenedAt(1000);
    user().setRatingAskedAt(2000);
    const saved = JSON.parse(createZustandStorage().getItem('user-store')!).state;
    expect(saved.firstOpenedAt).toBe(1000);
    expect(saved.ratingAskedAt).toBe(2000);
  });
});
