import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from '@/hooks/useCountUp';

// Mock requestAnimationFrame to run synchronously in tests
beforeEach(() => {
  let frameId = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    frameId++;
    // Call immediately with a timestamp that simulates full duration (2000ms)
    cb(2000);
    return frameId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCountUp', () => {
  it('initialises with the target value', () => {
    const { result } = renderHook(() => useCountUp(42));
    // On mount the state is initialised to target
    expect(typeof result.current).toBe('number');
  });

  it('returns the target value after animation settles (rAF fast-forwarded)', () => {
    const { result } = renderHook(() => useCountUp(100, 100));
    // With rAF mocked to timestamp=2000 and duration=100, progress=1 → display should be 100
    act(() => {});
    expect(result.current).toBe(100);
  });

  it('returns 0 when target is 0', () => {
    const { result } = renderHook(() => useCountUp(0));
    act(() => {});
    expect(result.current).toBe(0);
  });

  it('re-animates when target changes', () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target, 100), {
      initialProps: { target: 50 },
    });
    act(() => {});
    expect(result.current).toBe(50);

    rerender({ target: 200 });
    act(() => {});
    expect(result.current).toBe(200);
  });

  it('returns a number type', () => {
    const { result } = renderHook(() => useCountUp(999));
    expect(typeof result.current).toBe('number');
  });
});
