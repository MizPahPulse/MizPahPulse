export function cacheBustUrl(url: string): string { const sep = url.includes('?') ? '&' : '?'; return url + sep + '_cb=' + Date.now(); }
