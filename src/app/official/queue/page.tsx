'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import TicketCard from '@/components/official/TicketCard';
import { auth, db } from '@/lib/firebase/config';
import type { Issue } from '@/types/issue';
import type { Official } from '@/types/user';

export default function OfficialQueuePage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Issue[]>([]);
  const [official, setOfficial] = useState<Official | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifs, setUnreadNotifs] = useState<{ id: string; message: string }[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    let stopIssues: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/official/login'); return; }

      const storedOfficialId = localStorage.getItem('civicsense.officialId');
      const officialId = storedOfficialId || user.uid;

      // Try to load official by stored ID first, fall back to phone number lookup
      let officialData: Official | null = null;
      if (storedOfficialId) {
        const snap = await getDoc(doc(db, 'officials', storedOfficialId));
        if (snap.exists()) officialData = snap.data() as Official;
      }
      if (!officialData && user.phoneNumber) {
        const phoneQuery = query(collection(db, 'officials'), where('phone', '==', user.phoneNumber));
        const results = await getDocs(phoneQuery);
        if (!results.empty) officialData = results.docs[0].data() as Official;
      }
      if (!officialData) {
        router.replace('/official/login');
        return;
      }

      setOfficial(officialData);
      localStorage.setItem('civicsense.officialId', officialId);
      localStorage.setItem('civicsense.officialRole', officialData.role);

      const q = query(
        collection(db, 'issues'),
        where('assignedOfficialId', '==', officialId),
        where('status', 'in', ['assigned', 'in_progress', 'pending_verification']),
      );
      stopIssues = onSnapshot(q, (snapshot) => {
        const next = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Issue);
        next.sort((a, b) => deadlineMs(a) - deadlineMs(b));
        setTickets(next);
        setLoading(false);
      });
    });
    return () => { stopAuth(); stopIssues?.(); };
  }, [router]);

  // Listen to escalation notifications for this official
  useEffect(() => {
    const storedId = localStorage.getItem('civicsense.officialId');
    if (!storedId) return;
    const q = query(
      collection(db, `notifications/${storedId}/items`),
      where('read', '==', false),
    );
    return onSnapshot(q, (snap) => {
      setUnreadNotifs(snap.docs.map((d) => ({ id: d.id, message: String(d.data().message || '') })));
    });
  }, []);

  const overdue = tickets.filter((t) => t.slaDeadline?.toDate && t.slaDeadline.toDate().getTime() < Date.now());
  const urgent  = tickets.filter((t) => {
    if (!t.slaDeadline?.toDate) return false;
    const h = (t.slaDeadline.toDate().getTime() - Date.now()) / 36e5;
    return h >= 0 && h < 24;
  });

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ─── Header ─────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Assigned Queue
            </h1>
            {official && (
              <p className="text-xs text-gray-500">{official.name} · {official.ward} · {official.department}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {overdue.length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                🚨 {overdue.length} overdue
              </span>
            )}
            {urgent.length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                ⚠️ {urgent.length} urgent
              </span>
            )}
            {/* Escalation notifications bell */}
            {unreadNotifs.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  aria-label={`${unreadNotifs.length} unread escalation notifications`}
                  className="relative flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 hover:bg-purple-200 transition-colors"
                  onClick={() => setShowNotifs((v) => !v)}
                >
                  🔔 {unreadNotifs.length} escalation{unreadNotifs.length > 1 ? 's' : ''}
                </button>
                {showNotifs && (
                  <div className="absolute right-0 top-8 z-50 w-80 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Escalation Alerts</p>
                    <div className="space-y-2">
                      {unreadNotifs.map((n) => (
                        <div key={n.id} className="flex items-start gap-2 rounded-xl border border-purple-100 bg-purple-50 p-3">
                          <span className="mt-0.5 text-base">🔔</span>
                          <div className="flex-1">
                            <p className="text-xs text-gray-700">{n.message}</p>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-gray-400 hover:text-gray-600"
                            onClick={async () => {
                              const storedId = localStorage.getItem('civicsense.officialId');
                              if (storedId) {
                                await updateDoc(doc(db, `notifications/${storedId}/items`, n.id), { read: true });
                              }
                            }}
                          >
                            ✓
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <Link href="/" className="text-sm font-medium text-civic-blue hover:underline">Public map</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 pb-24">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-52 rounded-2xl shimmer" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
            <div className="text-5xl">🎉</div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">Queue Clear!</h2>
            <p className="mt-2 text-gray-500">No assigned tickets. Check back later.</p>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="mb-6 flex flex-wrap gap-3">
              {[
                { label: 'Total Assigned', value: tickets.length, color: 'bg-blue-50 text-blue-700' },
                { label: 'Overdue', value: overdue.length, color: overdue.length > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-400' },
                { label: '< 24h Left', value: urgent.length, color: urgent.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-xl px-4 py-2 text-sm font-semibold ${color}`}>
                  {value} {label}
                </div>
              ))}
            </div>

            {/* Ticket grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function deadlineMs(issue: Issue) {
  if (!issue.slaDeadline?.toDate) return Number.POSITIVE_INFINITY;
  return issue.slaDeadline.toDate().getTime();
}
