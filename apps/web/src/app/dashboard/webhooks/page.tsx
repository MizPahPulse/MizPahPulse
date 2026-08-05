'use client';

import React, { useState } from 'react';
import { Card, Badge, cn, StatusDot, EmptyState } from '@mizpah-pulse/ui';
import { Webhook, Plus, Copy, Trash2, X } from 'lucide-react';
import { isValidUrl } from '@/lib/validators';

const EVENT_OPTIONS = [
  'PAYMENT',
  'DEX_TRADE',
  'SOROBAN_INVOKE',
  'SOROBAN_EVENT',
  'NFT_TRANSFER',
  'TOKEN_TRANSFER',
];

interface WebhookItem {
  id: string;
  endpoint: string;
  events: string[];
  status: 'active' | 'error';
  deliveries: number;
  lastDelivery: string;
}

const INITIAL_WEBHOOKS: WebhookItem[] = [
  {
    id: '1',
    endpoint: 'https://myapp.com/webhooks/stellar',
    events: ['PAYMENT', 'DEX_TRADE'],
    status: 'active',
    deliveries: 342,
    lastDelivery: '2s ago',
  },
  {
    id: '2',
    endpoint: 'https://api.defiprotocol.com/hooks',
    events: ['SOROBAN_INVOKE', 'SOROBAN_EVENT'],
    status: 'active',
    deliveries: 128,
    lastDelivery: '1 min ago',
  },
  {
    id: '3',
    endpoint: 'https://notification.example.com/ingest',
    events: ['NFT_TRANSFER'],
    status: 'error',
    deliveries: 56,
    lastDelivery: '1 hour ago',
  },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>(INITIAL_WEBHOOKS);
  const [isCreating, setIsCreating] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['PAYMENT']);
  const [endpointError, setEndpointError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleCreate = () => {
    // Validate the endpoint URL before adding
    if (!isValidUrl(endpoint)) {
      setEndpointError('Enter a valid https:// webhook endpoint URL');
      return;
    }
    if (selectedEvents.length === 0) {
      setEndpointError('Select at least one event type');
      return;
    }

    const newWebhook: WebhookItem = {
      id: String(Date.now()),
      endpoint,
      events: selectedEvents,
      status: 'active',
      deliveries: 0,
      lastDelivery: '—',
    };
    setWebhooks((prev) => [newWebhook, ...prev]);
    setEndpoint('');
    setEndpointError(null);
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const handleCopy = async (endpointUrl: string) => {
    try {
      await navigator.clipboard.writeText(endpointUrl);
      setCopyStatus(endpointUrl);
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus(null);
    }
  };

  const toggleEvent = (evt: string) => {
    setSelectedEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt],
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Webhooks</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure webhook endpoints for real-time event delivery
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreating(true);
            setEndpointError(null);
          }}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25"
        >
          <Plus className="h-4 w-4" />
          New Webhook
        </button>
      </div>

      {/* Create webhook form */}
      {isCreating && (
        <Card padding="lg" className="border-indigo-200 dark:border-indigo-800">
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Create Webhook Endpoint
            </h2>
            <button
              onClick={() => setIsCreating(false)}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              aria-label="Close create form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="webhook-endpoint"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Endpoint URL
              </label>
              <input
                id="webhook-endpoint"
                type="url"
                value={endpoint}
                onChange={(e) => {
                  setEndpoint(e.target.value);
                  if (endpointError) setEndpointError(null);
                }}
                placeholder="https://your-app.com/webhooks/stellar"
                className={cn(
                  'mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors dark:bg-slate-950 dark:text-slate-100',
                  endpointError
                    ? 'border-red-400 focus:border-red-500 dark:border-red-800'
                    : 'border-slate-200 focus:border-indigo-500 dark:border-slate-700',
                )}
                aria-invalid={!!endpointError}
                aria-describedby={endpointError ? 'webhook-endpoint-error' : undefined}
              />
              {endpointError && (
                <p id="webhook-endpoint-error" className="mt-1 text-xs text-red-500" role="alert">
                  {endpointError}
                </p>
              )}
            </div>

            <div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Event types
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {EVENT_OPTIONS.map((evt) => {
                  const selected = selectedEvents.includes(evt);
                  return (
                    <button
                      key={evt}
                      onClick={() => toggleEvent(evt)}
                      aria-pressed={selected}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        selected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400',
                      )}
                    >
                      {evt}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleCreate}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-700"
            >
              Create Webhook
            </button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Active Webhooks', value: webhooks.filter((w) => w.status === 'active').length },
          {
            label: 'Total Delivered',
            value: webhooks.reduce((s, w) => s + w.deliveries, 0).toLocaleString(),
          },
          { label: 'Configured Events', value: webhooks.reduce((s, w) => s + w.events.length, 0) },
        ].map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="text-center">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stat.value}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {webhooks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Webhook className="h-10 w-10" />}
            title="No webhooks configured"
            description="Create your first webhook endpoint to start receiving blockchain events"
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <Card key={wh.id} padding="md">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950">
                  <Webhook className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-sm text-slate-900 dark:text-slate-100">
                      {wh.endpoint}
                    </span>
                    <StatusDot status={wh.status === 'active' ? 'online' : 'error'} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {wh.events.map((e) => (
                      <Badge key={e} variant="default" size="sm">
                        {e}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {wh.deliveries} deliveries · Last: {wh.lastDelivery}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy(wh.endpoint)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-800"
                    aria-label={`Copy endpoint URL${copyStatus === wh.endpoint ? ' (copied)' : ''}`}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
                    aria-label={`Delete webhook ${wh.endpoint}`}
                  >
                    <Trash2 className="h-4 w-4" />
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
