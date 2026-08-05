'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, Badge, cn, SearchInput, StatusDot, EmptyState, Spinner } from '@mizpah-pulse/ui';
import { ContractInvokeModal } from '@/components/ContractInvokeModal';
import { useWallet } from '@/context/WalletContext';
import { FileCode, Zap, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

interface ContractActivity {
  id: string;
  contractId: string;
  name: string;
  invocations: number;
  lastCalled: string;
  status: 'active' | 'error' | 'idle';
}

// PulseContract ID — deployed on Stellar Testnet
const DEPLOYED_CONTRACT_ID = process.env.NEXT_PUBLIC_PULSE_CONTRACT_ID || 'CC4HXCVIOPUOS2UJFLTM6WP2ESNSWM4BGJ26XR4SRRVB74TOZMC7EE2C';

// Fallback sample data shown when the API (or its database) is unavailable
const mockContracts: ContractActivity[] = [
  { id: 'pulse', contractId: DEPLOYED_CONTRACT_ID, name: 'PulseContract (Deployed)', invocations: 0, lastCalled: '—', status: 'active' },
  { id: '2', contractId: 'CB3XDEF1234567890ABCDEFGHIJKLMNOPQRSTUVW', name: 'Aqua DEX Router', invocations: 654, lastCalled: '5s ago', status: 'active' },
  { id: '3', contractId: 'CD9YGHI1234567890ABCDEFGHIJKLMNOPQRSTUVW', name: 'BLND Lending Pool', invocations: 421, lastCalled: '1 min ago', status: 'active' },
  { id: '4', contractId: 'CE2ZJKL1234567890ABCDEFGHIJKLMNOPQRSTUVW', name: 'NFT Marketplace', invocations: 298, lastCalled: '30s ago', status: 'error' },
];

const statusIcon = {
  active: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  error: <AlertTriangle className="h-4 w-4 text-red-500" />,
  idle: <Zap className="h-4 w-4 text-slate-400" />,
};

export default function ContractsPage() {
  const { isConnected } = useWallet();
  const [search, setSearch] = useState('');
  const [invokeContractId, setInvokeContractId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<ContractActivity[]>(mockContracts);
  const [loading, setLoading] = useState(true);

  // Load real contract activity from the API, falling back to sample data
  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/contracts')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !body?.data || !Array.isArray(body.data)) return;
        const apiContracts: ContractActivity[] = body.data
          .filter((c: { contractId: string | null }) => !!c.contractId)
          .slice(0, 19) // keep room for the deployed Pulse contract row
          .map((c: { contractId: string; eventCount: number }) => ({
            id: c.contractId,
            contractId: c.contractId,
            name: c.contractId === DEPLOYED_CONTRACT_ID ? 'PulseContract (Deployed)' : `Contract ${c.contractId.slice(0, 6)}…`,
            invocations: c.eventCount,
            lastCalled: '—',
            status: c.eventCount > 0 ? 'active' : 'idle',
          }));
        // Always surface the deployed PulseContract, even before its first event lands in the DB
        const hasPulse = apiContracts.some((c) => c.contractId === DEPLOYED_CONTRACT_ID);
        if (!hasPulse) {
          apiContracts.unshift({
            id: 'pulse',
            contractId: DEPLOYED_CONTRACT_ID,
            name: 'PulseContract (Deployed)',
            invocations: 0,
            lastCalled: '—',
            status: 'active',
          });
        }
        setContracts(apiContracts);
      })
      .catch(() => {
        // API unavailable — keep sample data
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = contracts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contractId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Smart Contracts</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Monitor Soroban smart contract activity in real-time
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Tracked Contracts', value: loading ? '…' : contracts.length },
          { label: 'Active (24h)', value: loading ? '…' : contracts.filter((c) => c.status === 'active').length },
          { label: 'Total Invocations', value: loading ? '…' : contracts.reduce((s, c) => s + c.invocations, 0).toLocaleString() },
        ].map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="text-center">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search by contract name or ID..." className="w-full sm:w-96" />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon={<FileCode className="h-10 w-10" />} title="No contracts found" description="Try a different search term" />
        ) : (
          filtered.map((c) => (
            <Card key={c.id} padding="md" hover>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950">
                  <FileCode className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</span>
                    {statusIcon[c.status]}
                    {c.id === 'pulse' && isConnected && (
                      <Badge variant="success" size="sm">Deployed</Badge>
                    )}
                  </div>
                  <p className="font-mono text-xs text-slate-500">{c.contractId.slice(0, 12)}...{c.contractId.slice(-8)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{c.invocations.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">{c.lastCalled}</p>
                </div>
                {isConnected && (
                  <button
                    onClick={() => setInvokeContractId(c.contractId)}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-400 dark:hover:bg-indigo-900"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Invoke
                  </button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Contract Invocation Modal */}
      {invokeContractId && (
        <ContractInvokeModal
          contractId={invokeContractId}
          isOpen={!!invokeContractId}
          onClose={() => setInvokeContractId(null)}
        />
      )}
    </div>
  );
}
