export function randomId(length = 8): string { return Array.from(crypto.getRandomValues(new Uint8Array(length)), b => b.toString(16).padStart(2,'0')).join(''); }
export function randomInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
