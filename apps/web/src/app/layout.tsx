import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MizpahPulse — Stellar Blockchain Intelligence',
    template: '%s | MizpahPulse',
  },
  description:
    'Real-time blockchain intelligence platform for the Stellar ecosystem. Monitor payments, smart contracts, DEX activity, NFTs, and more.',
  keywords: ['Stellar', 'blockchain', 'intelligence', 'monitoring', 'Soroban', 'crypto', 'web3'],
  authors: [{ name: 'MizpahPulse' }],
  openGraph: {
    title: 'MizpahPulse — Stellar Blockchain Intelligence',
    description: 'Real-time blockchain intelligence for the Stellar ecosystem.',
    type: 'website',
    siteName: 'MizpahPulse',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-slate-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
