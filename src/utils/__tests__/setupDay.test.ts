import { CITIES } from '@/data/cities';
import { findMitzvah } from '@/data/mitzvot';
import { at } from '@/testing/zmanim';
import type { UserSettings } from '@/types/mitzvah';
import { SETUP_DAY_MAX_ROWS, restOfDay } from '../setupDay';

const J = CITIES[0];
const settings: UserSettings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
const pick = (...ids: string[]) => ids.map((id) => findMitzvah(id)!);
const idsAt = (wallClock: string, ...ids: string[]) =>
  restOfDay(pick(...ids), J, settings, at(J, wallClock)).map((row) => `${row.mitzvah.id}:${row.open}`);

describe('restOfDay', () => {
  it('lists the windows open now and still to come in the app day, soonest first', () => {
    expect(idsAt('2026-11-18T07:00', 'maariv', 'mincha', 'shacharit')).toEqual([
      'shacharit:true',
      'mincha:false',
      'maariv:false',
    ]);
    // By the afternoon Shacharit's time has passed.
    expect(idsAt('2026-11-18T14:00', 'maariv', 'mincha', 'shacharit')).toEqual(['mincha:true', 'maariv:false']);
  });

  it('keeps a night window after midnight, in the app day of the evening before', () => {
    expect(idsAt('2026-11-19T01:00', 'maariv', 'shacharit')).toEqual(['maariv:true']);
  });

  it('is empty inside a holy block, and never longer than its cap', () => {
    expect(idsAt('2026-11-21T10:00', 'shacharit', 'mincha')).toEqual([]);
    const many = pick('shacharit', 'mincha', 'maariv', 'tefillin', 'krias_shma_shacharit', 'birchot_hashachar');
    const rows = restOfDay([...many, ...pick('krias_shma_al_hamita')], J, settings, at(J, '2026-11-18T06:30'));
    expect(rows.length).toBeLessThanOrEqual(SETUP_DAY_MAX_ROWS);
    expect(restOfDay(many, J, settings, at(J, '2026-11-18T06:30'), 2)).toHaveLength(2);
  });
});
