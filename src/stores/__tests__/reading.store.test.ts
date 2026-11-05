import { useReadingStore } from '@/stores/useReadingStore';

describe('useReadingStore', () => {
  beforeEach(() => useReadingStore.getState().reset());

  it('adds a read of a text and of a psalm under its day', () => {
    const store = useReadingStore.getState();
    store.addTextRead('2026-11-05', 'birkat_hamazon');
    store.addTextRead('2026-11-05', 'birkat_hamazon');
    store.addPsalmRead('2026-11-05', 23);
    expect(useReadingStore.getState().texts).toEqual({ '2026-11-05': { birkat_hamazon: 2 } });
    expect(useReadingStore.getState().psalms).toEqual({ '2026-11-05': { '23': 1 } });
  });

  it('refuses a psalm outside 1 to 150', () => {
    useReadingStore.getState().addPsalmRead('2026-11-05', 151);
    useReadingStore.getState().addPsalmRead('2026-11-05', 0);
    expect(useReadingStore.getState().psalms).toEqual({});
  });

  it('resets to nothing', () => {
    useReadingStore.getState().addTextRead('2026-11-05', 'nishmat');
    useReadingStore.getState().reset();
    expect(useReadingStore.getState().texts).toEqual({});
  });

  it('keeps only positive whole counts under day keys from a saved payload', () => {
    const { merge, name } = useReadingStore.persist.getOptions();
    expect(name).toBe('reading-store');
    const merged = merge!(
      {
        texts: { '2026-11-05': { nishmat: 2, bad: -1, half: 0.5 }, nope: { nishmat: 1 } },
        psalms: 'broken',
      },
      useReadingStore.getState(),
    );
    expect(merged.texts).toEqual({ '2026-11-05': { nishmat: 2 } });
    expect(merged.psalms).toEqual({});
    expect(merge!(undefined, useReadingStore.getState()).texts).toEqual({});
  });
});
