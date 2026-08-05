'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * useCountUp — Animate a number counting up from 0 to the target value.
 *
 * @param target - The target number to count up to
 * @param duration - Animation duration in ms (default 1000)
 * @param enabled - Whether the animation is active (default true)
 * @returns The current animated value
 */
export function useCountUp(target: number, duration = 1000, enabled = true): number {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || target === 0) {
      setCurrent(target);
      return;
    }

    const startValue = current;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = startValue + (target - startValue) * eased;

      setCurrent(Math.round(value));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // Only re-run when target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, enabled]);

  return current;
}
