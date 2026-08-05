'use client';

import React, { useState } from 'react';
import { Card, CardContent, Badge, cn, EmptyState } from '@mizpah-pulse/ui';
import { Bell, BellOff, CheckCheck, Settings, X } from 'lucide-react';
import { formatTimeAgo } from '@/lib/date-utils';

interface Notification {
  id: string;
  title: string;
  desc: string;
  timestamp: number;
  read: boolean;
  type: string;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Payment Received',
    desc: 'GABC...XYZ received 500 XLM',
    timestamp: Date.now() - 2 * 60_000,
    read: false,
    type: 'PAYMENT',
  },
  {
    id: '2',
    title: 'Contract Invocation',
    desc: 'swap() called on Aqua DEX Router',
    timestamp: Date.now() - 5 * 60_000,
    read: false,
    type: 'CONTRACT',
  },
  {
    id: '3',
    title: 'Token Transfer',
    desc: '1,000 USDC sent to GDEF...UVW',
    timestamp: Date.now() - 15 * 60_000,
    read: true,
    type: 'TOKEN',
  },
  {
    id: '4',
    title: 'DEX Trade',
    desc: 'Trade executed: 500 XLM → 5,000 USDC',
    timestamp: Date.now() - 60 * 60_000,
    read: true,
    type: 'DEX',
  },
  {
    id: '5',
    title: 'NFT Transfer',
    desc: 'NFT #5678 transferred to GKLM...NOP',
    timestamp: Date.now() - 2 * 60 * 60_000,
    read: true,
    type: 'NFT',
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {unreadCount} unread notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
          <button
            className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            aria-label="Notification settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BellOff className="h-10 w-10" />}
            title="All caught up"
            description="No notifications right now. Events matching your preferences will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              padding="md"
              hover
              className={cn(!notif.read && 'border-l-4 border-l-indigo-500')}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleRead(notif.id)}
                  className="mt-0.5"
                  aria-label={notif.read ? 'Mark as unread' : 'Mark as read'}
                >
                  {notif.read ? (
                    <BellOff className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                  ) : (
                    <Bell className="h-5 w-5 text-indigo-500" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        !notif.read
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-500 dark:text-slate-400',
                      )}
                    >
                      {notif.title}
                    </span>
                    <Badge variant="default" size="sm">
                      {notif.type}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{notif.desc}</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {formatTimeAgo(new Date(notif.timestamp))}
                  </span>
                  <button
                    onClick={() => dismiss(notif.id)}
                    className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-800"
                    aria-label={`Dismiss notification: ${notif.title}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
