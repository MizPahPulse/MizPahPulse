export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-3xl text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-extrabold tracking-tight">
            <span className="gradient-text">MizpahPulse</span>
          </h1>
        </div>
        <p className="mb-4 text-xl text-slate-600 dark:text-slate-400">
          The heartbeat of on-chain activity on Stellar
        </p>
        <p className="mb-12 text-slate-500 dark:text-slate-500">
          Real-time blockchain intelligence for payments, smart contracts, DEX, NFTs, and more.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="/feed"
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25"
          >
            View Live Feed
          </a>
          <a
            href="/analytics"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Analytics Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
