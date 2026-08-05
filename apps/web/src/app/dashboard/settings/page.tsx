'use client';

import React from 'react';
import { Card, CardContent, CardHeader, cn } from '@mizpah-pulse/ui';
import { Settings, Globe, Bell, Shield, Moon, Sun } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configure your MizpahPulse preferences
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo-500" />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Network</h2>
            </div>
          </CardHeader>
          <CardContent>
            <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <option>Stellar Testnet</option>
              <option>Stellar Public</option>
              <option>Stellar Futurenet</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-indigo-500" />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Notifications</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Payment events', 'Contract invocations', 'DEX trades', 'NFT activity'].map(
                (label) => (
                  <label key={label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                  </label>
                ),
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-500" />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Security</h2>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Wallet authentication and API key management
            </p>
            <button className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Manage Security Settings
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-indigo-500" />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Appearance</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">Dark Mode</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
