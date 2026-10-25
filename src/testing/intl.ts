export const HIDDEN_INTL_NAMES = ['deleted', 'nameless'] as const;
export type HiddenIntlNames = (typeof HIDDEN_INTL_NAMES)[number];

export function hideIntlDateNames(mode: HiddenIntlNames): () => void {
  const prototype = Intl.DateTimeFormat.prototype;
  const original = Object.getOwnPropertyDescriptor(prototype, 'formatToParts');
  if (!original) throw new Error('Intl.DateTimeFormat.prototype.formatToParts is missing');
  const formatToParts = original.value as Intl.DateTimeFormat['formatToParts'];
  if (mode === 'deleted') {
    delete (prototype as { formatToParts?: unknown }).formatToParts;
  } else {
    Object.defineProperty(prototype, 'formatToParts', {
      ...original,
      value(this: Intl.DateTimeFormat, date?: Date | number) {
        return formatToParts
          .call(this, date)
          .filter((part) => part.type !== 'weekday' && !(part.type === 'month' && !/^\d+$/.test(part.value)));
      },
    });
  }
  return () => {
    Object.defineProperty(prototype, 'formatToParts', original);
  };
}
