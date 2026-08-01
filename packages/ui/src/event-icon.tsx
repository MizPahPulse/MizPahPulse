import React from 'react';
import { cn } from './cn';
import {
  ArrowLeftRight,
  Coins,
  FileCode,
  Fingerprint,
  Gift,
  Globe,
  Key,
  Layers,
  Send,
  Settings,
  Tags,
  UserPlus,
  Zap,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import type { EventCategory } from '@mizpah-pulse/types';

const categoryIconMap: Record<EventCategory, LucideIcon> = {
  PAYMENT: Send,
  ACCOUNT: UserPlus,
  DEX: ArrowLeftRight,
  NFT: Gift,
  TOKEN: Coins,
  CONTRACT: FileCode,
  SYSTEM: Settings,
  GOVERNANCE: Key,
  LIQUIDITY: Layers,
  UNKNOWN: HelpCircle,
};

const categoryColors: Record<EventCategory, string> = {
  PAYMENT: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950',
  ACCOUNT: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  DEX: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
  NFT: 'text-pink-500 bg-pink-50 dark:bg-pink-950',
  TOKEN: 'text-amber-500 bg-amber-50 dark:bg-amber-950',
  CONTRACT: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950',
  SYSTEM: 'text-slate-500 bg-slate-50 dark:bg-slate-950',
  GOVERNANCE: 'text-teal-500 bg-teal-50 dark:bg-teal-950',
  LIQUIDITY: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950',
  UNKNOWN: 'text-slate-400 bg-slate-50 dark:bg-slate-950',
};

export function EventIcon({ category, className }: { category: EventCategory; className?: string }) {
  const Icon = categoryIconMap[category] ?? HelpCircle;
  return (
    <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', categoryColors[category] || categoryColors.UNKNOWN, className)}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

export { categoryIconMap, categoryColors };
