'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  cn,
  CopyButton,
  EmptyState,
  Skeleton,
} from '@mizpah-pulse/ui';
import {
  Check,
  Code,
  FileText,
  Globe,
  Key,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { formatTimeAgo } from '@/lib/date-utils';

interface ApiKeyRecord {
  id: string;
  name: string;
  network: 'live' | 'test';
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  maskedKey: string;
}

interface CreatedKey extends ApiKeyRecord {
  key: string;
}

const QUICK_LINKS = [
  {
    icon: FileText,
    label: 'API Docs',
    desc: 'REST & WebSocket API reference',
    href: 'https://github.com/MizPahPulse/MizPahPulse/blob/main/README.md',
  },
  {
    icon: Globe,
    label: 'Webhooks Guide',
    desc: 'Setup webhook integrations',
    href: 'https://github.com/MizPahPulse/MizPahPulse/blob/main/docs/webhooks.md',
  },
  {
    icon: Code,
    label: 'Live Feed',
    desc: 'Stream events over SSE',
    href: '/dashboard/feed',
  },
];

const PERMISSION_OPTIONS = [
  { value: 'read', label: 'Read', desc: 'Query events, stats, and assets' },
  { value: 'write', label: 'Write', desc: 'Manage webhooks and subscriptions' },
];

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [network, setNetwork] = useState<'live' | 'test'>('live');
  const [permissions, setPermissions] = useState<string[]>(['read']);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [createdSecret, setCreatedSecret] = useState<CreatedKey | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ApiKeyRecord[]>('/api/v1/api-keys');
      setKeys(data);
    } catch {
      setError('Could not load API keys. The API may be unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const togglePermission = (value: string) => {
    setPermissions((prev) => {
      if (prev.includes(value)) {
        // Keep at least one permission selected.
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== value);
      }
      return [...prev, value];
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Give the key a name so you can recognize it later.');
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      const created = await apiFetch<CreatedKey>('/api/v1/api-keys', {
        method: 'POST',
        body: {
          name: name.trim(),
          network,
          permissions,
        },
      });
      setCreatedSecret(created);
      setKeys((prev) => [
        {
          id: created.id,
          name: created.name,
          network: created.network,
          permissions: created.permissions,
          isActive: true,
          lastUsedAt: null,
          createdAt: created.createdAt,
          maskedKey: created.maskedKey,
        },
        ...prev,
      ]);
      setName('');
      setPermissions(['read']);
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to create API key. Please try again.',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (apiKey: ApiKeyRecord) => {
    setRevokingId(apiKey.id);
    try {
      await apiFetch(`/api/v1/api-keys/${apiKey.id}`, { method: 'DELETE' });
      setKeys((prev) => prev.filter((k) => k.id !== apiKey.id));
    } catch {
      // Keep the row and surface the failure inline.
      window.alert(`Failed to revoke "${apiKey.name}". Please try again.`);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Developers</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          API keys, documentation, and integration resources
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            target={link.href.startsWith('http') ? '_blank' : undefined}
            rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
          >
            <Card padding="lg" hover>
              <link.icon className="mb-3 h-6 w-6 text-indigo-500" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{link.label}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{link.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">API Keys</h2>
            </div>
            <button
              onClick={() => {
                setShowForm((v) => !v);
                setFormError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showForm ? 'Cancel' : 'Create key'}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* One-time secret reveal (shown exactly once after creation). */}
          {createdSecret && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    <Check className="h-4 w-4" />
                    Key created — copy it now, it won&apos;t be shown again
                  </p>
                  <p className="mt-1 font-mono text-sm break-all text-emerald-900 dark:text-emerald-200">
                    {createdSecret.key}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <CopyButton text={createdSecret.key} label="Copy key" />
                  <button
                    onClick={() => setCreatedSecret(null)}
                    aria-label="Dismiss created key"
                    className="rounded-md p-1.5 text-emerald-700 transition-colors hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create form */}
          {showForm && (
            <form
              onSubmit={handleCreate}
              className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="api-key-name"
                    className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    Key name
                  </label>
                  <input
                    id="api-key-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Production App"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="api-key-network"
                    className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    Network
                  </label>
                  <select
                    id="api-key-network"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value as 'live' | 'test')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="live">Live (mp_live_…)</option>
                    <option value="test">Test (mp_test_…)</option>
                  </select>
                </div>
              </div>

              <fieldset className="mt-4">
                <legend className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Permissions
                </legend>
                <div className="flex flex-wrap gap-2">
                  {PERMISSION_OPTIONS.map((option) => {
                    const selected = permissions.includes(option.value);
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => togglePermission(option.value)}
                        aria-pressed={selected}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                          selected
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400',
                        )}
                      >
                        {option.label}
                        <span className="ml-1 hidden font-normal opacity-70 sm:inline">
                          — {option.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {formError && (
                <p role="alert" className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={creating}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? 'Creating…' : 'Create API key'}
              </button>
            </form>
          )}

          {error && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/50">
              <p className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                <ShieldAlert className="h-4 w-4" /> {error}
              </p>
              <button
                onClick={() => void loadKeys()}
                className="text-xs font-semibold text-red-700 underline underline-offset-2 dark:text-red-300"
              >
                Retry
              </button>
            </div>
          )}

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800"
                >
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))
            ) : keys.length === 0 ? (
              <EmptyState
                icon={<Key className="h-6 w-6 text-indigo-400" />}
                title="No API keys yet"
                description="Create a key to start querying the MizPahPulse API."
              />
            ) : (
              keys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
                    <Key className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {apiKey.name}
                      </p>
                      <Badge variant={apiKey.network === 'live' ? 'success' : 'warning'}>
                        {apiKey.network}
                      </Badge>
                      {apiKey.permissions.map((permission) => (
                        <Badge key={permission} variant="default">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-0.5 font-mono text-sm text-slate-500 dark:text-slate-400">
                      {apiKey.maskedKey}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Created {formatTimeAgo(apiKey.createdAt)} · Last used{' '}
                      {apiKey.lastUsedAt ? formatTimeAgo(apiKey.lastUsedAt) : 'never'}
                    </p>
                  </div>
                  <button
                    onClick={() => void handleRevoke(apiKey)}
                    disabled={revokingId === apiKey.id}
                    aria-label={`Revoke ${apiKey.name}`}
                    className="flex-shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950"
                  >
                    {revokingId === apiKey.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
