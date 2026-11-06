import { IANAZone } from 'luxon';
import { Luxon as KosherLuxon } from 'kosher-zmanim';

// Luxon asks Intl.DateTimeFormat#formatToParts for a zone's offset on every zoned DateTime it builds,
// converts or compares: one notification plan made about 24,000 such calls. Hermes answers each one
// slowly enough that a plan built at launch, or by the hourly background task while the app opened,
// held the splash screen for half a minute (2026-11-06). An offset changes only at a transition, so
// it is cached per zone and hour: an hour whose first and last millisecond share an offset holds no
// transition (two transitions within one hour do not exist) and is read once; an hour that holds
// one is never cached and every instant in it is asked as before.
const HOUR_MS = 60 * 60_000;
const BUCKET_LIMIT = 20_000;
const STRADDLES = null;

type OffsetZone = { name: string; isValid: boolean; offset(ts: number): number };
type OffsetPrototype = OffsetZone & { [CACHED]?: true };

const CACHED = Symbol.for('jew365.zoneOffsetCache');

export function cacheZoneOffsets(prototype: OffsetPrototype): void {
  if (prototype[CACHED]) return;
  const original = prototype.offset;
  const zones = new Map<string, Map<number, number | typeof STRADDLES>>();
  prototype.offset = function offset(this: OffsetZone, ts: number): number {
    if (!Number.isFinite(ts) || !this.isValid) return original.call(this, ts);
    let buckets = zones.get(this.name);
    if (!buckets) zones.set(this.name, (buckets = new Map()));
    const bucket = Math.floor(ts / HOUR_MS);
    let value = buckets.get(bucket);
    if (value === undefined) {
      const first = original.call(this, bucket * HOUR_MS);
      const last = original.call(this, (bucket + 1) * HOUR_MS - 1);
      value = first === last ? first : STRADDLES;
      if (buckets.size >= BUCKET_LIMIT) buckets.clear();
      buckets.set(bucket, value);
    }
    return value === STRADDLES ? original.call(this, ts) : value;
  };
  prototype[CACHED] = true;
}

cacheZoneOffsets(IANAZone.prototype as unknown as OffsetPrototype);
cacheZoneOffsets(KosherLuxon.IANAZone.prototype as unknown as OffsetPrototype);
