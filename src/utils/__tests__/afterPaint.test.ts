import { afterPaint } from '../afterPaint';

type IdleScope = {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
};

describe('afterPaint', () => {
  const scope = globalThis as unknown as IdleScope;
  const original = { idle: scope.requestIdleCallback, cancelIdle: scope.cancelIdleCallback };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    scope.requestIdleCallback = original.idle;
    scope.cancelIdleCallback = original.cancelIdle;
    jest.useRealTimers();
  });

  it('does not run in the call that schedules it, nor before the next frame', () => {
    const task = jest.fn();
    afterPaint(task);
    expect(task).not.toHaveBeenCalled();
    jest.advanceTimersByTime(0);
    expect(task).not.toHaveBeenCalled();
  });

  it('runs once after the frame when there is no idle callback', () => {
    scope.requestIdleCallback = undefined;
    const task = jest.fn();
    afterPaint(task);
    jest.advanceTimersByTime(100);
    expect(task).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('waits for the idle callback once the frame has passed', () => {
    const idle: (() => void)[] = [];
    scope.requestIdleCallback = (callback) => idle.push(callback);
    const task = jest.fn();
    afterPaint(task);
    jest.advanceTimersByTime(100);
    expect(idle).toHaveLength(1);
    expect(task).not.toHaveBeenCalled();
    idle[0]();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('never runs a cancelled task, before the frame or while idle', () => {
    scope.requestIdleCallback = undefined;
    const early = jest.fn();
    afterPaint(early).cancel();
    jest.advanceTimersByTime(100);
    expect(early).not.toHaveBeenCalled();

    const idle: (() => void)[] = [];
    scope.requestIdleCallback = (callback) => idle.push(callback);
    scope.cancelIdleCallback = jest.fn();
    const late = jest.fn();
    const handle = afterPaint(late);
    jest.advanceTimersByTime(100);
    handle.cancel();
    idle[0]();
    expect(late).not.toHaveBeenCalled();
    expect(scope.cancelIdleCallback).toHaveBeenCalledTimes(1);
  });
});
