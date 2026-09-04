'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@mizpah-pulse/ui';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';
import { useTheme } from '@/hooks/use-theme';
import {
  Activity,
  BarChart3,
  Wallet,
  FileCode,
  Bell,
  Search,
  Settings,
  Webhook,
  Zap,
  Menu,
  X,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Home,
  Radio,
} from 'lucide-react';

const SIDEBAR_COLLAPSED_KEY = 'mizpah-pulse:sidebar-collapsed';

function getInitialSidebarState(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  return stored === 'true';
}

const bottomNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/feed', label: 'Live Feed', icon: Activity },
  { href: '/dashboard/search', label: 'Search', icon: Search },
  { href: '/dashboard/wallets', label: 'Wallets', icon: Wallet },
];

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/feed', label: 'Live Feed', icon: Activity },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/wallets', label: 'Wallets', icon: Wallet },
  { href: '/dashboard/contracts', label: 'Contracts', icon: FileCode },
  { href: '/dashboard/search', label: 'Search', icon: Search },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/dashboard/developers', label: 'Developers', icon: Zap },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(getInitialSidebarState);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((p) => {
      const next = !p;
      if (typeof window !== 'undefined') {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      }
      return next;
    });
  }, []);
  const toggleMobile = useCallback(() => setMobileOpen((p) => !p), []);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile toggle */}
      <button
        onClick={toggleMobile}
        className="fixed left-4 top-4 z-50 rounded-lg border border-slate-200 bg-white p-2 shadow-sm lg:hidden dark:border-slate-700 dark:bg-slate-900"
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-950',
          collapsed ? 'w-[72px]' : 'w-[260px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800',
            collapsed && 'justify-center',
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Radio className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <Link href="/" className="text-lg font-bold gradient-text">
              {APP_NAME}
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3" aria-label="Dashboard sections">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200',
                      collapsed && 'justify-center px-2',
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0 transition-colors',
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300',
                      )}
                    />
                    {!collapsed && <span>{item.label}</span>}
                    {isActive && !collapsed && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div
          className={cn(
            'border-t border-slate-100 p-3 dark:border-slate-800',
            collapsed && 'flex flex-col gap-2',
          )}
        >
          <button
            onClick={toggleCollapsed}
            className={cn(
              'mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-900 dark:hover:text-slate-300',
              collapsed && 'justify-center px-2',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
          {!collapsed && (
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Stellar Testnet
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                Monitoring in real-time
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-4">
        <div className="hidden lg:block">
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {APP_DESCRIPTION}
          </h2>
        </div>
        {/* Connection status indicator */}
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connectionStatus === 'online' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          <span className="text-slate-400">
            {connectionStatus === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? (
            <Sun className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Moon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
        <Link
          href="/dashboard/settings"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600" />
      </div>
    </header>
  );
}

/**
 * Bottom navigation for the four primary sections, shown on mobile only
 * (issue #4). The sidebar's hamburger drawer is less ergonomic for thumbs;
 * a fixed tab bar keeps Dashboard / Feed / Search / Wallets one tap away.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium transition-colors',
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
