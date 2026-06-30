'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Issue } from '@/types/issue';

const STAT_CARDS = [
  { key: 'monthIssues',   label: 'This Month',       icon: '📋', color: 'from-blue-500 to-blue-600' },
  { key: 'resolvedWeek',  label: 'Resolved This Week', icon: '✅', color: 'from-green-500 to-emerald-600' },
  { key: 'avgResolution', label: 'Avg. Resolution',  icon: '⏱️', color: 'from-amber-500 to-orange-500' },
  { key: 'openIssues',    label: 'Currently Open',   icon: '🔴', color: 'from-red-500 to-rose-600' },
] as const;

export default function DashboardPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [myIds, setMyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'), limit(300));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIssues(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Issue));
      setLoading(false);
    });
    const mine = JSON.parse(localStorage.getItem('myReports') || '[]') as Array<{ publicId?: string; publicTrackingId?: string }>;
    setMyIds(mine.map((item) => item.publicId || item.publicTrackingId || '').filter(Boolean));
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => computeStats(issues), [issues]);
  const wards = useMemo(() => computeWardRows(issues), [issues]);
  const mine = issues.filter((issue) => myIds.includes(issue.publicTrackingId));

  const statValues = {
    monthIssues:   stats.monthIssues,
    resolvedWeek:  stats.resolvedWeek,
    avgResolution: stats.avgResolution,
    openIssues:    stats.openIssues,
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ─── Header ─────────────────────────── */}
      <div className="border-b border-gray-100 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Public Dashboard</h1>
            <p className="mt-0.5 text-sm text-gray-500">Real-time civic issue analytics for Coimbatore</p>
          </div>
          <Link href="/map" className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            🗺️ Map
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 pb-24 space-y-6">
        {/* ─── Stats Cards ────────────────────── */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map(({ key, label, icon, color }) => (
            <div key={key} className={`stat-card bg-gradient-to-br ${color} text-white`}>
              <p className="text-3xl font-black">
                {loading ? (
                  <span className="inline-block h-8 w-16 rounded shimmer opacity-50" />
                ) : (
                  statValues[key]
                )}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/90">{label}</p>
              <span className="absolute right-4 top-4 text-3xl opacity-20">{icon}</span>
            </div>
          ))}
        </section>

        {/* ─── Ward Performance Table ─────────── */}
        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-50 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-900">Ward Performance</h2>
            <p className="text-sm text-gray-500">Sorted by SLA compliance rate</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-50 bg-gray-50/70 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-6 py-3">Ward</th>
                  <th className="px-4 py-3">Open</th>
                  <th className="px-4 py-3">Resolved</th>
                  <th className="px-4 py-3">% SLA</th>
                  <th className="px-4 py-3">Avg Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-6 py-4"><div className="h-4 rounded shimmer" /></td>
                      ))}
                    </tr>
                  ))
                ) : wards.length ? (
                  wards.map((ward, index) => (
                    <tr key={ward.name} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{ward.name}</span>
                          {index === 0 && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">🏆 Best</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`font-semibold ${ward.open > 0 ? 'text-red-600' : 'text-gray-400'}`}>{ward.open}</span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-green-700">{ward.resolvedMonth}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full ${ward.withinSla >= 80 ? 'bg-green-500' : ward.withinSla >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${ward.withinSla}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${ward.withinSla >= 80 ? 'text-green-700' : ward.withinSla >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {ward.withinSla}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{ward.avgResolution}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No ward data yet — submit a report to get started!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── Predictive Hotspots ──────────────── */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">🔥 High Activity Areas</h2>
              <p className="mt-0.5 text-sm text-gray-500">Wards with highest open issue concentration</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {(loading ? Array.from({ length: 3 }) : wards.filter((w) => w.open > 0).slice(0, 3)).map((ward, index) => (
              loading ? (
                <div key={index} className="h-24 rounded-2xl shimmer" />
              ) : ward ? (
                <div key={(ward as typeof wards[0]).name} className="rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-gray-900">{(ward as typeof wards[0]).name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${index === 0 ? 'bg-red-100 text-red-700' : index === 1 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      #{index + 1}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-black text-gray-900">{(ward as typeof wards[0]).open}</p>
                      <p className="text-xs text-gray-400">open issues</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">{(ward as typeof wards[0]).resolvedMonth} resolved</p>
                      <p className="text-xs text-gray-400">this month</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${index === 0 ? 'bg-red-400' : index === 1 ? 'bg-amber-400' : 'bg-blue-400'}`}
                      style={{ width: `${Math.min(100, ((ward as typeof wards[0]).open / Math.max(...wards.map((w) => w.open), 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : null
            ))}
            {!loading && wards.filter((w) => w.open > 0).length === 0 && (
              <div className="col-span-3 rounded-2xl bg-green-50 p-6 text-center text-green-700">
                <div className="text-3xl">🎉</div>
                <p className="mt-2 font-semibold">No active hotspots! All wards are clear.</p>
              </div>
            )}
          </div>
        </section>

        {/* ─── Your Contributions ──────────────── */}
        <section id="my-reports" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Your Contributions</h2>
          <p className="mt-0.5 text-sm text-gray-500">Your anonymous reporting activity</p>

          {mine.length === 0 ? (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
              <div className="text-4xl">📋</div>
              <p className="mt-3 font-semibold text-gray-600">No reports yet</p>
              <p className="mt-1 text-sm text-gray-400">Reports you submit will appear here anonymously</p>
              <Link href="/report" className="mt-4 inline-block rounded-xl bg-civic-blue px-5 py-2.5 font-semibold text-white hover:bg-civic-blue-dark transition-colors">
                Report an Issue
              </Link>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'Reported', value: mine.length, color: 'text-civic-blue' },
                  { label: 'Resolved', value: mine.filter((i) => i.status === 'resolved').length, color: 'text-green-600' },
                  { label: 'Civic Score', value: mine.filter((i) => i.status !== 'rejected').length * 10, color: 'text-amber-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="mt-0.5 text-xs font-semibold text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* Badges */}
              {mine.filter((i) => i.status === 'resolved').length >= 3 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">🏅 Active Reporter</span>
                  {mine.filter((i) => i.status === 'resolved').length >= 5 && (
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">🌟 Impact Maker</span>
                  )}
                </div>
              )}

              {/* Report list */}
              <div className="mt-4 space-y-2">
                {mine.map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/track/${issue.publicTrackingId}`}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 hover:border-civic-blue hover:bg-civic-blue-light transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{CATEGORY_ICONS[issue.category] || '❓'}</span>
                      <div>
                        <p className="font-mono text-sm font-semibold text-gray-800">{issue.publicTrackingId}</p>
                        <p className="text-xs text-gray-400 capitalize">{String(issue.category || 'other').replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <StatusBadge status={issue.status} />
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

/* ─── Status Badge ───────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_classification: 'bg-gray-100 text-gray-600',
    assigned:               'bg-red-100 text-red-700',
    in_progress:            'bg-amber-100 text-amber-700',
    pending_verification:   'bg-blue-100 text-blue-700',
    resolved:               'bg-green-100 text-green-700',
    escalated:              'bg-gray-900 text-white',
    rejected:               'bg-gray-100 text-gray-500',
    merged:                 'bg-purple-100 text-purple-700',
  };
  const labels: Record<string, string> = {
    pending_classification: 'Classifying…',
    assigned: 'Open', in_progress: 'In Progress', pending_verification: 'Pending',
    resolved: '✅ Resolved', escalated: '⚠ Escalated', rejected: 'Rejected', merged: 'Merged',
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

/* ─── Helpers ─────────────────────────────────────── */
const CATEGORY_ICONS: Record<string, string> = {
  pothole: '🕳️', waterlogging: '💧', broken_light: '💡', garbage: '🗑️',
  damaged_pipe: '🔧', fallen_tree: '🌳', sewage: '🚽', vandalism: '🖊️', other: '❓',
};

function computeStats(issues: Issue[]) {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const resolved = issues.filter((i) => i.status === 'resolved' && timestampMs(i.resolvedAt));
  const avgMs = resolved.reduce((sum, i) => sum + (timestampMs(i.resolvedAt) - timestampMs(i.createdAt)), 0) / Math.max(1, resolved.length);
  return {
    monthIssues:   issues.filter((i) => timestampMs(i.createdAt) > startMonth).length,
    resolvedWeek:  issues.filter((i) => i.status === 'resolved' && timestampMs(i.resolvedAt) > startWeek).length,
    avgResolution: resolved.length ? `${Math.round(avgMs / 36e5)}h` : 'N/A',
    openIssues:    issues.filter((i) => ['assigned', 'in_progress', 'pending_verification'].includes(i.status)).length,
  };
}

function computeWardRows(issues: Issue[]) {
  const groups = new Map<string, Issue[]>();
  for (const issue of issues) {
    const ward = issue.ward || 'Ward pending';
    groups.set(ward, [...(groups.get(ward) || []), issue]);
  }
  return [...groups.entries()]
    .map(([name, rows]) => {
      const resolved = rows.filter((i) => i.status === 'resolved');
      const within = resolved.filter((i) => timestampMs(i.resolvedAt) <= timestampMs(i.slaDeadline)).length;
      return {
        name,
        open: rows.filter((i) => ['assigned', 'in_progress', 'pending_verification'].includes(i.status)).length,
        resolvedMonth: resolved.length,
        withinSla: resolved.length ? Math.round((within / resolved.length) * 100) : 0,
        avgResolution: resolved.length
          ? `${Math.round(resolved.reduce((s, i) => s + (timestampMs(i.resolvedAt) - timestampMs(i.createdAt)), 0) / resolved.length / 36e5)}h`
          : 'N/A',
      };
    })
    .sort((a, b) => b.withinSla - a.withinSla);
}

function timestampMs(value: unknown) {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}
