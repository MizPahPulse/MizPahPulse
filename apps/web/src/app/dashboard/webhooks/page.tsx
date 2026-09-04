'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, Badge, cn, StatusDot, EmptyState, Skeleton } from '@mizpah-pulse/ui';
import { Webhook, Plus, Copy, Trash2, X } from 'lucide-react';
import { isValidUrl } from '@/lib/validators';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { formatTimeAgo } from '@/lib/date-utils';

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
  lastDelivery: string | null;
  failedDeliveries: number;
}

interface ApiWebhook {
  id: string;
  endpoint: string;
  events: string[];
  isActive: boolean;
  failedDeliveries: number;
  lastDeliveryAt?: string | null;
  createdAt: string;
  deliveries?: Array<{ id: string; createdAt: string }>;
}

function mapWebhook(w: ApiWebhook): WebhookItem {
  const lastAt = w.lastDeliveryAt ? new Date(w.lastDeliveryAt).getTime() : null;
  return {
    id: w.id,
    endpoint: w.endpoint,
    events: Array.isArray(w.events) ? w.events : [],
    status: w.isActive ? 'active' : 'error',
    deliveries: w.deliveries?.length ?? 0,
    lastDelivery: lastAt ? formatTimeAgo(new Date(lastAt)) : '—',
    failedDeliveries: w.failedDeliveries ?? 0,
  };
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['PAYMENT']);
  const [endpointError, setEndpointError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const data = await apiFetch<ApiWebhook[]>('/api/v1/webhooks');
      setWebhooks(data.map(mapWebhook));
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await apiFetch<ApiWebhook[]>('/api/v1/webhooks', {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setWebhooks(data.map(mapWebhook));
      } catch (err) {
        if (!controller.signal.aborted) {
          setPageError(err instanceof Error ? err.message : 'Failed to load webhooks');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const handleCreate = async () => {
    // Validate the endpoint URL before submitting
    if (!isValidUrl(endpoint)) {
      setEndpointError('Enter a valid https:// webhook endpoint URL');
      return;
    }
    if (selectedEvents.length === 0) {
      setEndpointError('Select at least one event type');
      return;
    }

    setCreating(true);
    setEndpointError(null);
    try {
      const created = await apiFetch<ApiWebhook>('/api/v1/webhooks', {
        method: 'POST',
        body: { endpoint, events: selectedEvents },
      });
      setWebhooks((prev) => [mapWebhook(created), ...prev]);
      setEndpoint('');
      setIsCreating(false);
    } catch (err) {
      setEndpointError(
        err instanceof ApiClientError ? err.message : 'Failed to create webhook. Try again.',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/v1/webhooks/${id}`, { method: 'DELETE' });
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch {
      setPageError('Failed to delete webhook. Try again.');
    }
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

  const activeCount = webhooks.filter((w) => w.status === 'active').length;
  const totalDelivered = webhooks.reduce((s, w) => s + w.deliveries, 0);
  const configuredEvents = webhooks.reduce((s, w) => s + w.events.length, 0);

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

      {pageError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
        >
          <span>{pageError}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadWebhooks()}
              className="font-semibold underline underline-offset-2"
            >
              Retry
            </button>
            <button
              onClick={() => setPageError(null)}
              className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
              onClick={() => void handleCreate()}
              disabled={creating}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create Webhook'}
            </button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Active Webhooks', value: activeCount },
          { label: 'Total Delivered', value: totalDelivered.toLocaleString() },
          { label: 'Configured Events', value: configuredEvents },
        ].map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="text-center">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {loading ? <Skeleton className="mx-auto h-8 w-16" /> : stat.value}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="md">
              <div className="flex items-center gap-4">
                <Skeleton variant="circular" className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : webhooks.length === 0 ? (
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
                    {wh.failedDeliveries > 0 && (
                      <span className="text-red-500"> · {wh.failedDeliveries} failed</span>
                    )}
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
                    onClick={() => void handleDelete(wh.id)}
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
