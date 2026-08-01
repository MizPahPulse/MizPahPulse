'use client';

import React from 'react';
import { Card, CardContent, Badge, cn, StatusDot, EmptyState } from '@mizpah-pulse/ui';
import { Webhook, Plus, Copy, Trash2, RefreshCw } from 'lucide-react';

const webhooks = [
  { id: '1', endpoint: 'https://myapp.com/webhooks/stellar', events: ['PAYMENT', 'DEX_TRADE'], status: 'active', deliveries: 342, lastDelivery: '2s ago' },
  { id: '2', endpoint: 'https://api.defiprotocol.com/hooks', events: ['SOROBAN_INVOKE', 'SOROBAN_EVENT'], status: 'active', deliveries: 128, lastDelivery: '1 min ago' },
  { id: '3', endpoint: 'https://notification.example.com/ingest', events: ['NFT_TRANSFER'], status: 'error', deliveries: 56, lastDelivery: '1 hour ago' },
];

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Webhooks</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure webhook endpoints for real-time event delivery
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25">
          <Plus className="h-4 w-4" />
          New Webhook
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Active Webhooks', value: webhooks.filter((w) => w.status === 'active').length },
          { label: 'Total Delivered', value: webhooks.reduce((s, w) => s + w.deliveries, 0).toLocaleString() },
          { label: 'Success Rate', value: '99.2%' },
        ].map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="text-center">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {webhooks.map((wh) => (
          <Card key={wh.id} padding="md">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950">
                <Webhook className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-slate-900 dark:text-slate-100 truncate">{wh.endpoint}</span>
                  <StatusDot status={wh.status === 'active' ? 'online' : 'error'} />
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {wh.events.map((e) => (
                    <Badge key={e} variant="default" size="sm">{e}</Badge>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {wh.deliveries} deliveries · Last: {wh.lastDelivery}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-800">
                  <Copy className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
