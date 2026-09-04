import React from 'react';
import { Sidebar, Navbar, BottomNav } from '@/components/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Sidebar />
      <div className="lg:pl-[260px]">
        <Navbar />
        {/* Extra bottom padding on mobile so content clears the fixed tab bar */}
        <main className="p-6 pb-24 lg:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
