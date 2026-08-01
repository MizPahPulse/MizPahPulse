import React from 'react';
import { Sidebar, Navbar } from '@/components/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Sidebar />
      <div className="lg:pl-[260px]">
        <Navbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
