export function range(start: number, end: number): number[] { return Array.from({ length: end - start }, (_, i) => start + i); }
export function clamp(value: number, min: number, max: number): number { return Math.min(Math.max(value, min), max); }
export function between(value: number, min: number, max: number): boolean { return value >= min && value <= max; }
