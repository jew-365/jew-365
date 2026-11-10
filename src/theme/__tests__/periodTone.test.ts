import { CARD_ALPHA, PERIOD_TONES } from '../periodTone';
import { blendHex, contrastRatio } from '../colors';
import { CITIES } from '@/data/cities';
import { dayFrameFor, skyAt, stripBackdrop } from '@/utils/dayArc';
import { periodTone } from '@/utils/homeTimes';

const J = CITIES[0];
// Where the card sits on the hero's land gradient, as shares of it: its top, middle and bottom.
const CARD_SHARES = [0.05, 0.3, 0.6];

describe("home's period card", () => {
  it.each(['2026-03-20', '2026-06-21', '2026-12-21'])(
    'keeps white text at 4.5:1 on its glass over the land, every 10 minutes of %s in Jerusalem',
    (date) => {
      const day = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8)));
      const f = dayFrameFor(day, J, 'GRA')!;
      const z = Object.fromEntries(f.zmanim.map((x) => [x.id, x.at]));
      const seen = new Set<string>();
      for (let t = f.start.getTime(); t < f.end.getTime(); t += 10 * 60000) {
        const now = new Date(t);
        const tone = periodTone(now, { netz: z.netz, chatzot: z.chatzot, plag: z.plag, tzeit: f.tzeit });
        seen.add(tone);
        const sky = skyAt(f, now);
        for (const share of CARD_SHARES)
          for (const stop of [PERIOD_TONES[tone].from, PERIOD_TONES[tone].to])
            expect(
              contrastRatio(blendHex(stop, stripBackdrop(sky, share), CARD_ALPHA), '#FFFFFF'),
            ).toBeGreaterThanOrEqual(4.5);
      }
      expect([...seen].sort()).toEqual(['dawn', 'evening', 'morning', 'night', 'noon']);
    },
  );

  it('is see-through: the card is drawn below full opacity', () => {
    expect(CARD_ALPHA).toBeLessThan(0.8);
  });
});
