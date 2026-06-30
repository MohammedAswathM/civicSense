'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import CivicMap from '@/components/map/CivicMap';
import { db } from '@/lib/firebase/config';
import type { Issue, IssueCategory } from '@/types/issue';

const FILTER_TABS: Array<{ label: string; emoji: string; value: IssueCategory | 'all' }> = [
  { label: 'All',      emoji: '📍', value: 'all' },
  { label: 'Pothole',  emoji: '🕳️', value: 'pothole' },
  { label: 'Water',    emoji: '💧', value: 'waterlogging' },
  { label: 'Lights',   emoji: '💡', value: 'broken_light' },
  { label: 'Waste',    emoji: '🗑️', value: 'garbage' },
  { label: 'Pipe',     emoji: '🔧', value: 'damaged_pipe' },
];

export default function HomePage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [resolvedThisWeek, setResolvedThisWeek] = useState(0);
  const [activeFilter, setActiveFilter] = useState<IssueCategory | 'all'>('all');

  useEffect(() => {
    const q = query(
      collection(db, 'issues'),
      where('status', 'not-in', ['rejected', 'error_processing']),
      orderBy('createdAt', 'desc'),
      limit(100),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Issue);
      setIssues(next);
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      setResolvedThisWeek(
        next.filter((issue) => issue.status === 'resolved' && timestampMs(issue.resolvedAt) > weekAgo).length,
      );
    });
    return () => unsubscribe();
  }, []);

  const filteredIssues =
    activeFilter === 'all' ? issues : issues.filter((issue) => issue.category === activeFilter);

  return (
    <main className="relative min-h-screen bg-gray-50">
      {/* ─── Fixed Header ─────────────────────────────────── */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4">
          {/* Top row */}
          <div className="flex items-center justify-between py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-civic-blue text-lg">🏙️</span>
              <span className="text-lg font-bold tracking-tight text-gray-900">CivicSense</span>
            </Link>

            <div className="flex items-center gap-3">
              {/* Resolved this week KPI */}
              <div className="hidden items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800 sm:flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                {resolvedThisWeek} resolved this week
              </div>

              {/* Desktop nav */}
              <nav className="hidden items-center gap-1 md:flex">
                {[
                  { href: '/', label: 'Map' },
                  { href: '/dashboard#my-reports', label: 'My Reports' },
                  { href: '/dashboard', label: 'Dashboard' },
                ].map(({ href, label }) => (
                  <Link
                    key={label}
                    href={href}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  >
                    {label}
                  </Link>
                ))}
                <Link
                  href="/official/login"
                  className="ml-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Official Login
                </Link>
              </nav>
            </div>
          </div>

          {/* Filter tabs row */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
            {FILTER_TABS.map(({ label, emoji, value }) => (
              <button
                key={value}
                type="button"
                aria-pressed={activeFilter === value}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all focus:ring-2 focus:ring-civic-blue focus:ring-offset-1 ${
                  activeFilter === value
                    ? 'bg-civic-blue text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-civic-blue hover:text-civic-blue'
                }`}
                onClick={() => setActiveFilter(value)}
              >
                {emoji} {label}
                {activeFilter === value && value !== 'all' && (
                  <span className="ml-0.5 rounded-full bg-white/25 px-1.5 py-0.5 text-xs">
                    {filteredIssues.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ─── Full-bleed Map ───────────────────────────────── */}
      <CivicMap issues={filteredIssues} />

      {/* ─── FAB — Report Issue ───────────────────────────── */}
      <Link
        data-testid="report-fab"
        aria-label="Report civic issue"
        href="/report"
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-civic-blue px-5 py-3.5 font-semibold text-white shadow-lg transition-all hover:bg-civic-blue-dark hover:shadow-xl active:scale-95 focus:ring-2 focus:ring-civic-blue focus:ring-offset-2 md:bottom-6"
      >
        <span className="text-lg leading-none">📸</span>
        <span>Report Issue</span>
      </Link>

      {/* ─── Mobile Bottom Nav ────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-4 border-t border-gray-100 bg-white/95 backdrop-blur-md md:hidden">
        {[
          { href: '/',                    icon: '🗺️', label: 'Map' },
          { href: '/dashboard#my-reports', icon: '📋', label: 'My Reports' },
          { href: '/dashboard',           icon: '📊', label: 'Dashboard' },
          { href: '/official/login',       icon: '👤', label: 'Official' },
        ].map(({ href, icon, label }) => (
          <Link
            key={label}
            href={href}
            className="flex flex-col items-center gap-0.5 px-2 py-2.5 text-gray-500 transition-colors hover:text-civic-blue"
          >
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-[10px] font-semibold">{label}</span>
          </Link>
        ))}
      </nav>

      {/* ─── Demo Mode Banner ─────────────────────────────── */}
      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
        <div className="fixed bottom-16 left-3 z-50 flex items-center gap-1.5 rounded-full bg-civic-blue px-3 py-1.5 text-xs font-semibold text-white shadow-lg md:bottom-3">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300" />
          Demo Mode — mock AI responses
        </div>
      )}
    </main>
  );
}

function timestampMs(value: unknown) {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}
