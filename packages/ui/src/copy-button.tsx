'use client';

import React, { useState } from 'react';
import { cn } from './cn';
import { useToast } from './toast';
import { Copy, Check } from 'lucide-react';

export interface CopyButtonProps {
  text: string;
  className?: string;
  label?: string;
}

export function CopyButton({ text, className, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      addToast({
        type: 'success',
        title: 'Copied to clipboard',
        message: label ? `${label} copied` : undefined,
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({
        type: 'error',
        title: 'Copy failed',
        message: 'Clipboard access was denied',
        duration: 3000,
      });
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
        'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
        'dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800',
        className,
      )}
      title={`Copy ${label || text}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {label && <span>{copied ? 'Copied!' : label}</span>}
    </button>
  );
}
