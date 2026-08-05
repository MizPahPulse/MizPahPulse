export function scrollToTop(behavior: ScrollBehavior = 'smooth'): void { window.scrollTo({ top: 0, behavior }); }
export function scrollToElement(id: string, behavior: ScrollBehavior = 'smooth'): void { document.getElementById(id)?.scrollIntoView({ behavior }); }
export function isScrolledToBottom(threshold = 100): boolean { return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - threshold; }
export function getScrollPosition(): number { return window.scrollY; }
