'use client';

import React from 'react';
import { Card, CardContent, Badge, cn, EmptyState } from '@mizpah-pulse/ui';
import { Bell, BellOff, Settings } from 'lucide-react';

const notifications = [
  { id: '1', title: 'Payment Received', desc: 'GABC...XYZ received 500 XLM', time: '2 min ago', read: false, type: 'PAYMENT' },
  { id: '2', title: 'Contract Invocation', desc: 'swap() called on Aqua DEX Router', time: '5 min ago', read: false, type: 'CONTRACT' },
  { id: '3', title: 'Token Transfer', desc: '1,000 USDC sent to GDEF...UVW', time: '15 min ago', read: true, type: 'TOKEN' },
  { id: '4', title: 'DEX Trade', desc: 'Trade executed: 500 XLM → 5,000 USDC', time: '1 hour ago', read: true, type: 'DEX' },
  { id: '5', title: 'NFT Transfer', desc: 'NFT #5678 transferred to GKLM...NOP', time: '2 hours ago', read: true, type: 'NFT' },
];

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {notifications.filter((n) => !n.read).length} unread notifications
          </p>
        </div>
        <button className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
          <Settings className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-2">
        {notifications.map((notif) => (
          <Card
            key={notif.id}
            padding="md"
            hover
            className={cn(!notif.read && 'border-l-4 border-l-indigo-500')}
          >
            <div className="flex items-start gap-3">
              {notif.read ? (
                <BellOff className="mt-0.5 h-5 w-5 text-slate-300 dark:text-slate-600" />
              ) : (
                <Bell className="mt-0.5 h-5 w-5 text-indigo-500" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-semibold', !notif.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400')}>
                    {notif.title}
                  </span>
                  <Badge variant="default" size="sm">{notif.type}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{notif.desc}</p>
              </div>
              <span className="flex-shrink-0 text-xs text-slate-400">{notif.time}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
