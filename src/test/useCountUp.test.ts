import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from '@/hooks/useCountUp';

// Use fake timers + a rAF mock that fires once with a "complete" timestamp
// so progress = 1 and the hook does NOT reschedule (infinite loop prevention).
beforeEach(() => {
  let cbQueue: FrameRequestCallback[] = [];

  // Capture the callback but don't call it immediately — prevents recursion
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cbQueue.push(cb);
    return cbQueue.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

  // Attach flush helper to global so tests can trigger rAF frames
  (globalThis as Record<string, unknown>).__flushRAF = (ts = 99999) => {
    const pending = [...cbQueue];
    cbQueue = [];
    for (const cb of pending) cb(ts);
  };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__flushRAF;
  vi.restoreAllMocks();
});

const flush = (ts = 99999) => {
  act(() => {
    const fn = (globalThis as Record<string, unknown>).__flushRAF;
    if (typeof fn === 'function') fn(ts);
  });
};

describe('useCountUp', () => {
  it('initialises with the target value', () => {
    const { result } = renderHook(() => useCountUp(42));
    // Before any frames fire, state is initialised to target
    expect(typeof result.current).toBe('number');
    expect(result.current).toBe(42);
  });

  it('returns the target value after animation completes (progress = 1)', () => {
    const { result } = renderHook(() => useCountUp(100, 500));
    // Fire with ts=99999 >> duration=500, so progress=1, display=100
    flush();
    expect(result.current).toBe(100);
  });

  it('returns 0 when target is 0', () => {
    const { result } = renderHook(() => useCountUp(0));
    flush();
    expect(result.current).toBe(0);
  });

  it('re-animates when target changes', () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target, 500), {
      initialProps: { target: 50 },
    });
    flush(99999);
    expect(result.current).toBe(50);

    rerender({ target: 200 });
    // Flush with a new, much later timestamp so elapsed >> duration → progress=1
    flush(999999);
    expect(result.current).toBe(200);
  });

  it('returns a number type', () => {
    const { result } = renderHook(() => useCountUp(999));
    flush();
    expect(typeof result.current).toBe('number');
  });

  it('intermediate progress gives value between start and target', () => {
    const { result } = renderHook(() => useCountUp(100, 1000));
    // Fire with ts=500 so elapsed=500, progress=0.5 (start ts will be set to 500)
    // First call sets startTime then immediately reschedules
    flush(500); // sets startTimeRef to 500, progress=0 (elapsed=0), schedules next
    flush(1000); // elapsed=500, progress=0.5, eased ≈ 0.875, display ~= 88
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThanOrEqual(100);
  });
});
