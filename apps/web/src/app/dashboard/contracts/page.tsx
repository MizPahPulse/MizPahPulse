'use client';

import React, { useState } from 'react';
import { Card, CardContent, Badge, cn, SearchInput, StatusDot, EmptyState } from '@mizpah-pulse/ui';
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

// Deployed PulseContract ID on Stellar Testnet
// Update this after deploying the contract via scripts/deploy-contract.ts
const DEPLOYED_CONTRACT_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

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
  const filtered = mockContracts.filter(
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
          { label: 'Tracked Contracts', value: mockContracts.length },
          { label: 'Active (24h)', value: mockContracts.filter((c) => c.status === 'active').length },
          { label: 'Total Invocations', value: mockContracts.reduce((s, c) => s + c.invocations, 0).toLocaleString() },
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
