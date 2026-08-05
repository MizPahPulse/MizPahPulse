export function trackPageView(path: string): void { if (typeof window !== 'undefined') { console.debug(`[Analytics] Page view: ${path}`); } }
export function trackEvent(category: string, action: string, label?: string): void { if (typeof window !== 'undefined') { console.debug(`[Analytics] ${category}/${action}${label ? '/' + label : ''}`); } }
