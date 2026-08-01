import React from 'react';
import { cn } from './cn';
import { CopyButton } from './copy-button';

export function TruncatedKey({
  publicKey,
  prefix = 6,
  suffix = 4,
  className,
  showCopy = true,
}: {
  publicKey: string;
  prefix?: number;
  suffix?: number;
  className?: string;
  showCopy?: boolean;
}) {
  const truncated =
    publicKey.length > prefix + suffix + 3
      ? `${publicKey.slice(0, prefix)}...${publicKey.slice(-suffix)}`
      : publicKey;

  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono text-sm', className)}>
      <span className="text-slate-700 dark:text-slate-300">{truncated}</span>
      {showCopy && <CopyButton text={publicKey} />}
    </span>
  );
}
