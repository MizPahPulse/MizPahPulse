import type { EventCategory } from '@mizpah-pulse/types';

export function getCategoryColor(category: EventCategory | string): string {
  const colors: Record<string, string> = {
    PAYMENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    DEX: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
    CONTRACT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400',
    NFT: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400',
    TOKEN: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    ACCOUNT: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
    LIQUIDITY: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400',
    GOVERNANCE: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400',
  };
  return colors[category] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
}

export function getCategoryIcon(category: EventCategory | string): string {
  const icons: Record<string, string> = {
    PAYMENT: '↗', DEX: '⇄', CONTRACT: '◇', NFT: '◆',
    TOKEN: '○', ACCOUNT: '⊕', LIQUIDITY: '≈', GOVERNANCE: '⚖',
  };
  return icons[category] || '•';
}
