import React from 'react';
import { cn } from './cn';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };

export function Avatar({ src, alt = '', fallback, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn('rounded-full object-cover', sizeStyles[size], className)}
      />
    );
  }

  const initials = fallback
    ? fallback.slice(0, 2).toUpperCase()
    : alt
      ? alt.slice(0, 2).toUpperCase()
      : '?';

  return (
    <span
      role="img"
      aria-label={alt || fallback || 'Avatar'}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-semibold text-white',
        sizeStyles[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
