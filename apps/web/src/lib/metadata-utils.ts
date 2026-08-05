export function buildPageTitle(title: string): string { return `${title} | MizPahPulse`; }
export function updateDocumentTitle(title: string): void { if (typeof document !== 'undefined') document.title = buildPageTitle(title); }
