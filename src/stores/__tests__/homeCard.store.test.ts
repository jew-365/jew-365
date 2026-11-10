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
    s.setZmanPinned('plag', true);
    s.setZmanPinned('alot', true);
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

  it('the first starred time joins Mine when it has room, and never pushes out a choice', () => {
    const s = useUserStore.getState();
    s.setHomeCardMine(['toShabbat']);
    s.setZmanPinned('plag', true);
    expect(useUserStore.getState().homeCardMine).toEqual(['toShabbat', 'pins']);
    s.setHomeCardMine(['toShabbat', 'hilula', 'tehillim']);
    s.setZmanPinned('plag', false);
    s.setZmanPinned('alot', true);
    expect(useUserStore.getState().homeCardMine).toEqual(['toShabbat', 'hilula', 'tehillim']);
    s.setHomeCardMine(['toShabbat']);
    s.setZmanPinned('plag', true);
    expect(useUserStore.getState().homeCardMine).toEqual(['toShabbat']);
  });

  describe('the times sheet', () => {
    const state = () => useUserStore.getState();

    it('adds and removes a time the circle never shows', () => {
      state().setZmanShown('minchaKetana', true);
      expect(state().addedZmanim).toEqual(['minchaKetana']);
      expect(state().hiddenZmanim).toEqual([]);
      state().setZmanShown('minchaKetana', false);
      expect(state().addedZmanim).toEqual([]);
    });

    it('a star shows its time: a hidden zman comes back, an added time is added', () => {
      state().setZmanShown('plag', false);
      state().setZmanPinned('plag', true);
      expect(state().hiddenZmanim).toEqual([]);
      state().setZmanPinned('sofShmaMga', true);
      expect(state().addedZmanim).toEqual(['sofShmaMga']);
      expect(state().zmanPins).toEqual(['plag', 'sofShmaMga']);
    });

    it('a time taken off the carousel loses its star', () => {
      state().setZmanPinned('plag', true);
      state().setZmanPinned('minchaKetana', true);
      state().setZmanShown('plag', false);
      state().setZmanShown('minchaKetana', false);
      expect(state().zmanPins).toEqual([]);
    });

    it('keeps the last zman of the circle, and a change that changes nothing keeps the state', () => {
      useUserStore.setState({
        hiddenZmanim: [
          'alot',
          'misheyakir',
          'netz',
          'sofShma',
          'sofTfila',
          'chatzot',
          'minchaGedola',
          'plag',
          'shkia',
          'tzeit',
        ],
      });
      const before = state();
      state().setZmanShown('chatzotLayla', false);
      expect(state()).toBe(before);
      state().setZmanShown('alot', true);
      expect(state().hiddenZmanim).not.toContain('alot');
    });

    it('merges a saved payload: unknown added times dropped, stars of hidden or missing times dropped', () => {
      const merge = useUserStore.persist.getOptions().merge!;
      const merged = merge(
        {
          hiddenZmanim: ['plag'],
          addedZmanim: ['minchaKetana', 'x'],
          zmanPins: ['plag', 'alot', 'minchaKetana', 'sofShmaGra'],
        },
        state(),
      ) as ReturnType<typeof useUserStore.getState>;
      expect(merged.addedZmanim).toEqual(['minchaKetana']);
      expect(merged.zmanPins).toEqual(['alot', 'minchaKetana']);
      state().reset();
      expect(state().addedZmanim).toEqual([]);
    });
  });
});
