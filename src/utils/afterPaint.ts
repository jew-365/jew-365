type Cancelable = { cancel(): void };

type IdleScope = {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function afterPaint(task: () => void): Cancelable {
  const scope = globalThis as unknown as IdleScope;
  let cancelled = false;
  let idleHandle: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const run = () => {
    idleHandle = null;
    timer = null;
    if (!cancelled) task();
  };
  const frame = requestAnimationFrame(() => {
    if (cancelled) return;
    if (scope.requestIdleCallback) idleHandle = scope.requestIdleCallback(run);
    else timer = setTimeout(run, 0);
  });
  return {
    cancel() {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (idleHandle !== null) scope.cancelIdleCallback?.(idleHandle);
      if (timer !== null) clearTimeout(timer);
    },
  };
}
