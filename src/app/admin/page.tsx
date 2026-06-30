'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, onSnapshot, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import type { Issue } from '@/types/issue';
import type { Official } from '@/types/user';

export default function AdminPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [officials, setOfficials] = useState<Record<string, Official>>({});
  const [loading, setLoading] = useState(true);
  const [reassigning, setReassigning] = useState<string | null>(null);

  useEffect(() => {
    let stopIssues: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/official/login'); return; }
      const storedOfficialId = localStorage.getItem('civicsense.officialId');
      const officialSnap = storedOfficialId
        ? await getDoc(doc(db, 'officials', storedOfficialId))
        : await getDoc(doc(db, 'officials', user.uid));
      const officialData = officialSnap.data() as Official | undefined;
      if (!officialSnap.exists() || officialData?.role !== 'admin') {
        router.replace('/official/login');
        return;
      }
      const officialDocs = await getDocs(collection(db, 'officials'));
      const officialMap: Record<string, Official> = {};
      officialDocs.forEach((d) => { officialMap[d.id] = { id: d.id, ...d.data() } as Official; });
      setOfficials(officialMap);
      const q = query(collection(db, 'issues'), where('status', '==', 'assigned'), where('slaDeadline', '<', Timestamp.now()));
      stopIssues = onSnapshot(q, (snapshot) => {
        const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Issue);
        rows.sort((a, b) => overdueHours(b) - overdueHours(a));
        setIssues(rows);
        setLoading(false);
      });
    });
    return () => { stopAuth(); stopIssues?.(); };
  }, [router]);

  async function reassign(issue: Issue, newOfficialId: string) {
    setReassigning(issue.id);
    try {
      await updateDoc(doc(db, 'issues', issue.id), { assignedOfficialId: newOfficialId, updatedAt: Timestamp.now() });
    } finally {
      setReassigning(null);
    }
  }

  const officerOptions = Object.values(officials).filter((o) => o.role === 'officer');

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ─── Header ─────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Escalation Control</h1>
            <p className="text-sm text-gray-500">Issues past SLA deadline requiring immediate action</p>
          </div>
          {issues.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm font-bold text-red-700">{issues.length} overdue</span>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 pb-24">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-2xl shimmer" />)}
          </div>
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
            <div className="text-5xl">✅</div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">No Escalations</h2>
            <p className="mt-2 text-gray-500">All assigned issues are within SLA. Well done!</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_100px_140px_160px_120px] items-center border-b border-gray-50 bg-gray-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <span>Issue</span>
              <span>Overdue</span>
              <span>Ward</span>
              <span>Assigned To</span>
              <span>Action</span>
            </div>

            {/* Table rows */}
            {issues.map((issue, index) => (
              <div
                key={issue.id}
                className={`grid grid-cols-[1fr_100px_140px_160px_120px] items-center gap-3 px-5 py-4 transition-colors hover:bg-gray-50/50 ${index < issues.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                {/* Issue info */}
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-900">{issue.publicTrackingId}</p>
                  <p className="mt-0.5 text-xs capitalize text-gray-500">
                    {categoryIcon(issue.category)} {String(issue.category || 'other').replace(/_/g, ' ')}
                  </p>
                </div>

                {/* Overdue badge */}
                <div>
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                    {Math.ceil(overdueHours(issue))}h
                  </span>
                </div>

                {/* Ward */}
                <p className="text-sm text-gray-700">{issue.ward || '—'}</p>

                {/* Current assignee */}
                <p className="text-sm text-gray-700">{officials[issue.assignedOfficialId]?.name || 'Unassigned'}</p>

                {/* Reassign dropdown */}
                <div>
                  <select
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm focus:border-civic-blue focus:outline-none focus:ring-2 focus:ring-civic-blue/20 disabled:opacity-60"
                    defaultValue=""
                    disabled={reassigning === issue.id}
                    onChange={(e) => { if (e.target.value) reassign(issue, e.target.value); }}
                  >
                    <option value="" disabled>Reassign…</option>
                    {officerOptions
                      .filter((o) => o.id !== issue.assignedOfficialId)
                      .map((officer) => (
                        <option key={officer.id} value={officer.id}>{officer.name}</option>
                      ))
                    }
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function overdueHours(issue: Issue) {
  if (!issue.slaDeadline?.toDate) return 0;
  return Math.max(0, (Date.now() - issue.slaDeadline.toDate().getTime()) / 36e5);
}

function categoryIcon(category: string) {
  return ({ pothole: '🕳️', waterlogging: '💧', broken_light: '💡', garbage: '🗑️', damaged_pipe: '🔧', fallen_tree: '🌳', sewage: '🚽', vandalism: '🖊️', other: '❓' }[category] || '❓');
}
