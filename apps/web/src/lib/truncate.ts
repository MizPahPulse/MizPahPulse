export function truncateText(text: string, maxLength: number): string { return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text; }
export function truncateWords(text: string, maxWords: number): string { const words = text.split(/\s+/); return words.length > maxWords ? words.slice(0, maxWords).join(' ') + '...' : text; }
