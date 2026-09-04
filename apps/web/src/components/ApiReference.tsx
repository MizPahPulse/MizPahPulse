'use client';

import React, { useMemo, useState } from 'react';
import spec from '@/lib/api-spec.json';
import { Card, CardHeader, cn } from '@mizpah-pulse/ui';
import { BookOpen, ChevronDown, KeyRound, Loader2, Play } from 'lucide-react';

interface SpecParam {
  name: string;
  in: string;
  type: string;
  required: boolean;
  description: string;
}

interface SpecEndpoint {
  tag: string;
  method: string;
  path: string;
  summary: string;
  auth: string;
  params: SpecParam[];
  sample: string;
}

interface ApiSpec {
  version: string;
  baseUrl: string;
  auth: string;
  endpoints: SpecEndpoint[];
}

const SPEC = spec as unknown as ApiSpec;

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  POST: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  PATCH: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

/** Pretty-print a stored sample (samples are valid JSON strings or raw text). */
function prettySample(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

interface TryItState {
  running: boolean;
  status: number | null;
  body: string;
  error: string | null;
}

export function ApiReference() {
  const groups = useMemo(() => {
    const byTag = new Map<string, SpecEndpoint[]>();
    for (const ep of SPEC.endpoints) {
      const list = byTag.get(ep.tag) ?? [];
      list.push(ep);
      byTag.set(ep.tag, list);
    }
    return [...byTag.entries()];
  }, []);

  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              API Reference
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            v{SPEC.version} — all endpoints under <code className="font-mono">{SPEC.baseUrl}</code>.
            See the README{' '}
            <a
              href="https://github.com/MizPahPulse/MizPahPulse/blob/main/README.md#-api-reference"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 underline dark:text-indigo-400"
            >
              API table
            </a>{' '}
            for the full contract.
          </p>
        </CardHeader>
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
        <KeyRound className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
        <p>{SPEC.auth}</p>
      </div>

      {groups.map(([tag, endpoints]) => (
        <section key={tag} aria-label={tag}>
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            {tag}
          </h3>
          <div className="space-y-3">
            {endpoints.map((ep) => (
              <EndpointCard
                key={`${ep.method}-${ep.path}`}
                ep={ep}
                open={expanded === `${ep.method}-${ep.path}`}
                onToggle={() =>
                  setExpanded((cur) =>
                    cur === `${ep.method}-${ep.path}` ? null : `${ep.method}-${ep.path}`,
                  )
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function EndpointCard({
  ep,
  open,
  onToggle,
}: {
  ep: SpecEndpoint;
  open: boolean;
  onToggle: () => void;
}) {
  const pathParams = ep.params.filter((p) => p.in === 'path');
  const queryParams = ep.params.filter((p) => p.in === 'query');

  return (
    <Card padding="md">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex-shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-bold',
              METHOD_COLORS[ep.method] ??
                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
            )}
          >
            {ep.method}
          </span>
          <div className="min-w-0">
            <code className="block truncate font-mono text-sm text-slate-900 dark:text-slate-100">
              {ep.path}
            </code>
            <span className="block text-xs text-slate-500 dark:text-slate-400">{ep.summary}</span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 flex-shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          {ep.params.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                Parameters
              </h4>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                    <th className="py-1.5 pr-3 font-medium">Name</th>
                    <th className="py-1.5 pr-3 font-medium">In</th>
                    <th className="py-1.5 pr-3 font-medium">Type</th>
                    <th className="py-1.5 pr-3 font-medium">Required</th>
                    <th className="py-1.5 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ep.params.map((p) => (
                    <tr
                      key={`${p.in}-${p.name}`}
                      className="border-b border-slate-50 last:border-0 dark:border-slate-900"
                    >
                      <td className="py-1.5 pr-3 font-mono text-slate-800 dark:text-slate-200">
                        {p.name}
                      </td>
                      <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{p.in}</td>
                      <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{p.type}</td>
                      <td className="py-1.5 pr-3">
                        {p.required ? (
                          <span className="font-medium text-red-500">yes</span>
                        ) : (
                          <span className="text-slate-400">no</span>
                        )}
                      </td>
                      <td className="py-1.5 text-slate-600 dark:text-slate-300">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
              Sample response
            </h4>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-emerald-300">
              {prettySample(ep.sample)}
            </pre>
          </div>

          {ep.method === 'GET' && (
            <TryIt ep={ep} pathParams={pathParams} queryParams={queryParams} />
          )}
        </div>
      )}
    </Card>
  );
}

function TryIt({
  ep,
  pathParams,
  queryParams,
}: {
  ep: SpecEndpoint;
  pathParams: SpecParam[];
  queryParams: SpecParam[];
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<TryItState>({
    running: false,
    status: null,
    body: '',
    error: null,
  });

  const setValue = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const run = async () => {
    setState({ running: true, status: null, body: '', error: null });
    try {
      let path = ep.path;
      for (const p of pathParams) {
        const raw = (values[p.name] ?? '').trim();
        if (!raw) throw new Error(`Path parameter "${p.name}" is required`);
        path = path.replace(`{${p.name}}`, encodeURIComponent(raw));
      }
      const url = new URL(path, 'http://localhost:3000');
      for (const q of queryParams) {
        const raw = (values[q.name] ?? '').trim();
        if (raw) url.searchParams.set(q.name, raw);
      }
      const res = await fetch(url.pathname + url.search);
      const text = await res.text();
      let body = text;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // keep raw text (SSE, plain errors, etc.)
      }
      setState({ running: false, status: res.status, body, error: null });
    } catch (err) {
      setState({
        running: false,
        status: null,
        body: '',
        error: err instanceof Error ? err.message : 'Request failed',
      });
    }
  };

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
        <Play className="h-3.5 w-3.5" />
        Try it out
      </h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {[...pathParams, ...queryParams].map((p) => (
          <label key={`${p.in}-${p.name}`} className="block text-xs">
            <span className="mb-1 block text-slate-500 dark:text-slate-400">
              {p.name}
              {p.required ? ' *' : ''}
            </span>
            <input
              value={values[p.name] ?? ''}
              onChange={(e) => setValue(p.name, e.target.value)}
              placeholder={p.in === 'path' ? `value for {${p.name}}` : p.description}
              className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
        ))}
      </div>
      <button
        onClick={run}
        disabled={state.running}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {state.running ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        {state.running ? 'Running…' : 'Run request'}
      </button>

      {state.error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.status !== null && (
        <div className="mt-3">
          <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
            HTTP{' '}
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
              {state.status}
            </span>
          </p>
          <pre
            data-testid="try-it-response"
            className="max-h-56 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100"
          >
            {state.body}
          </pre>
        </div>
      )}
    </div>
  );
}
