'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, cn, EmptyState, CopyButton } from '@mizpah-pulse/ui';
import { Code, Key, FileText, Globe, Copy, Eye, EyeOff } from 'lucide-react';

const apiKeys = [
  { id: '1', name: 'Production App', key: 'mp_live_xxxxxxxxxxxxx', created: '2 weeks ago', lastUsed: '2 min ago', permissions: ['read', 'write'] },
  { id: '2', name: 'Dev Testing', key: 'mp_test_yyyyyyyyyyyyy', created: '3 days ago', lastUsed: '1 hour ago', permissions: ['read'] },
];

export default function DevelopersPage() {
  const [showKey, setShowKey] = useState<string | null>(null);

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
        {[
          { icon: FileText, label: 'API Docs', desc: 'REST & WebSocket API reference', href: '#' },
          { icon: Globe, label: 'Webhooks Guide', desc: 'Setup webhook integrations', href: '#' },
          { icon: Code, label: 'SDK Examples', desc: 'JavaScript & Python examples', href: '#' },
        ].map((link) => (
          <a key={link.label} href={link.href}>
            <Card padding="lg" hover>
              <link.icon className="mb-3 h-6 w-6 text-indigo-500" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{link.label}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{link.desc}</p>
            </Card>
          </a>
        ))}
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">API Keys</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{apiKey.name}</p>
                  <p className="font-mono text-sm text-slate-500">
                    {showKey === apiKey.id ? apiKey.key : apiKey.key.replace(/./g, '•')}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Created {apiKey.created} · Last used {apiKey.lastUsed}
                  </p>
                </div>
                <button
                  onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {showKey === apiKey.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <CopyButton text={apiKey.key} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
