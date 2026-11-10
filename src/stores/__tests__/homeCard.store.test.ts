import { useUserStore } from '../useUserStore';
import { DEFAULT_MINE } from '@/utils/homeTimes';

describe("home's board in the user store", () => {
  beforeEach(() => useUserStore.getState().reset());

  it('starts on the smart choice, the default Mine, learning on and no pins', () => {
    const s = useUserStore.getState();
    expect(s.homeCardPage).toBeNull();
    expect(s.homeCardMine).toEqual(DEFAULT_MINE);
    expect(s.homeLearn).toBe(true);
    expect(s.zmanPins).toEqual([]);
  });

  it('keeps the page chosen and cleans what it is given', () => {
    const s = useUserStore.getState();
    s.setHomeCardPage('week');
    expect(useUserStore.getState().homeCardPage).toBe('week');
    s.setHomeCardPage('nope' as never);
    expect(useUserStore.getState().homeCardPage).toBeNull();
    s.setHomeCardMine(['pins', 'tehillim', 'toShabbat', 'hilula'] as never);
    expect(useUserStore.getState().homeCardMine).toEqual(['toShabbat', 'hilula', 'tehillim']);
    s.setZmanPins(['plag', 'alot']);
    expect(useUserStore.getState().zmanPins).toEqual(['alot', 'plag']);
    s.setHomeLearn(false);
    useUserStore.getState().reset();
    expect(useUserStore.getState().homeCardPage).toBeNull();
    expect(useUserStore.getState().homeLearn).toBe(true);
  });

  it('merges an older or broken payload to the defaults', () => {
    const merge = useUserStore.persist.getOptions().merge!;
    const merged = merge(
      { homeCardPage: 'x', homeCardMine: 'y', homeLearn: 'z', zmanPins: ['plag', 1] },
      useUserStore.getState(),
    ) as ReturnType<typeof useUserStore.getState>;
    expect(merged.homeCardPage).toBeNull();
    expect(merged.homeCardMine).toEqual(DEFAULT_MINE);
    expect(merged.homeLearn).toBe(true);
    expect(merged.zmanPins).toEqual(['plag']);
  });
});
