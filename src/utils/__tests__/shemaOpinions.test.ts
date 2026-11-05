import { t } from '@/i18n';
import { CITIES } from '@/data/cities';
import { clockOf } from '@/utils/clock';
import { SHEMA_OPINIONS_MITZVAH, shemaOpinionsFor, shemaOpinionsLine } from '@/utils/shemaOpinions';
import { at, zmanimFor } from '@/testing/zmanim';

const JERUSALEM = CITIES[0];
const DAY = new Date(2026, 9, 28);

describe('shemaOpinionsFor', () => {
  it("gives both latest times of the window's day, the earlier the Magen Avraham's", () => {
    const z = zmanimFor(at(JERUSALEM, '2026-10-28T12:00'), JERUSALEM);
    const opinions = shemaOpinionsFor(SHEMA_OPINIONS_MITZVAH, DAY, JERUSALEM, 'GRA')!;
    expect(opinions.ma.getTime()).toBe(z.sofZmanShmaMA.getTime());
    expect(opinions.gra.getTime()).toBe(z.sofZmanShmaGra.getTime());
    expect(opinions.ma.getTime()).toBeLessThan(opinions.gra.getTime());
    expect(opinions.chosen).toBe('GRA');
  });

  it('is null for any other mitzvah', () => {
    expect(shemaOpinionsFor('shacharit', DAY, JERUSALEM, 'GRA')).toBeNull();
  });
});

describe('shemaOpinionsLine', () => {
  const ma = new Date('2026-10-28T06:40:00Z');
  const gra = new Date('2026-10-28T07:16:00Z');
  const tz = JERUSALEM.tz;

  it('marks the chosen opinion', () => {
    expect(shemaOpinionsLine({ ma, gra, chosen: 'GRA' }, tz, t)).toBe(
      `מג״א ${clockOf(ma, tz)} · גר״א ${clockOf(gra, tz)} (בחירתך)`,
    );
    expect(shemaOpinionsLine({ ma, gra, chosen: 'MA' }, tz, t)).toBe(
      `מג״א ${clockOf(ma, tz)} (בחירתך) · גר״א ${clockOf(gra, tz)}`,
    );
  });
});
