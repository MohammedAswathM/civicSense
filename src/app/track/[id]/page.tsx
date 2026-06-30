'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { arrayUnion, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Issue, StatusHistoryEntry } from '@/types/issue';

const FLOW = [
  'pending_classification',
  'pending_deduplication',
  'pending_routing',
  'assigned',
  'in_progress',
  'pending_verification',
  'pending_citizen_confirmation',
  'resolved',
];

const CATEGORY_ICONS: Record<string, string> = {
  pothole: '🕳️', waterlogging: '💧', broken_light: '💡', garbage: '🗑️',
  damaged_pipe: '🔧', fallen_tree: '🌳', sewage: '🚽', vandalism: '🖊️', other: '❓',
};

export default function TrackPage({ params }: { params: { id: string } }) {
  const [issue, setIssue] = useState<(Issue & { id: string; rejectionReason?: string }) | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [responseBusy, setResponseBusy] = useState(false);
  const [responseError, setResponseError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'issues'), where('publicTrackingId', '==', params.id));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) { setNotFound(true); setIssue(null); return; }
        setNotFound(false);
        const first = snapshot.docs[0];
        setIssue({ id: first.id, ...first.data() } as Issue & { id: string; rejectionReason?: string });
      },
      () => setNotFound(true),
    );
    return () => unsubscribe();
  }, [params.id]);

  const timeline = useMemo(() => buildTimeline(issue), [issue]);
  const slaPercent = useMemo(() => computeSlaPercent(issue), [issue]);

  async function sendCitizenResponse(fixed: boolean) {
    if (!issue) return;
    setResponseBusy(true);
    setResponseError('');
    try {
      await updateDoc(doc(db, 'issues', issue.id), {
        status: fixed ? 'resolved' : 'disputed',
        citizenRespondedAt: serverTimestamp(),
        statusHistory: arrayUnion({
          status: fixed ? 'resolved' : 'disputed',
          timestamp: new Date(),
          changedBy: 'citizen',
          note: fixed ? 'Citizen confirmed fix.' : 'Citizen disputed the fix.',
        }),
        updatedAt: serverTimestamp(),
        ...(fixed ? { resolvedAt: serverTimestamp() } : {}),
      });
    } catch (error) {
      setResponseError(error instanceof Error ? error.message : 'Could not submit your response.');
    } finally {
      setResponseBusy(false);
    }
  }

  if (notFound && !issue) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-4 py-8">
        <Link href="/" className="text-sm font-medium text-civic-blue hover:underline">← Back to map</Link>
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">🔍</div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Report not found</h1>
          <p className="mt-2 text-gray-500">No report with ID &ldquo;{params.id}&rdquo; exists. Check the tracking ID and try again.</p>
          <Link href="/report" className="mt-5 inline-block rounded-xl bg-civic-blue px-5 py-3 font-semibold text-white hover:bg-civic-blue-dark">
            Report an Issue
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ─── Sticky Header ──────────────── */}
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/map" className="text-sm font-medium text-civic-blue hover:underline">← Map</Link>
          <p className="text-sm font-semibold text-gray-500">Issue Tracker</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 pb-24">
        {!issue ? (
          <div className="space-y-4">
            <div className="h-8 w-48 rounded-xl shimmer" />
            <div className="h-32 rounded-2xl shimmer" />
            <div className="h-48 rounded-2xl shimmer" />
          </div>
        ) : (
          <div className="animate-fade-in space-y-4">
            {/* ─── ID + Status header ───── */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-mono text-2xl font-bold tracking-wider text-gray-900">{issue.publicTrackingId}</h1>
                <p className="mt-1 text-sm text-gray-500">{issue.address}</p>
              </div>
              <StatusBadge status={issue.status} />
            </div>

            {/* ─── Issue Summary Card ───── */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex gap-4">
                {issue.photoUrls?.[0] && (
                  <img
                    src={issue.photoUrls[0]}
                    alt={`${issue.publicTrackingId} issue`}
                    className="h-24 w-24 shrink-0 rounded-xl object-cover ring-1 ring-gray-100"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-lg font-semibold text-gray-900">
                    <span>{CATEGORY_ICONS[issue.category] || '❓'}</span>
                    {issue.status === 'pending_classification' ? (
                      <span className="flex items-center gap-2 text-gray-500">
                        <svg className="h-4 w-4 animate-ring-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Classifying…
                      </span>
                    ) : (
                      <span className="capitalize">{String(issue.category || 'other').replace(/_/g, ' ')}</span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {issue.ward ? `${issue.ward}` : issue.status === 'pending_routing' ? '🔄 Routing…' : 'Ward pending'}
                  </p>
                  {issue.textDescription && (
                    <p className="mt-2 text-sm text-gray-700">&ldquo;{issue.textDescription}&rdquo;</p>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-50 pt-4 text-xs font-semibold text-gray-500">
                <span>👥 {Math.max(1, issue.corroborationCount || 0)} reporter{issue.corroborationCount > 1 ? 's' : ''}</span>
                {issue.severity && <span>🔴 Severity {issue.severity}/5</span>}
                {issue.credibilityWeight > 1 && <span>⭐ Credibility {issue.credibilityWeight?.toFixed(1)}</span>}
                {issue.upvoteCount > 0 && <span>▲ {issue.upvoteCount} upvotes</span>}
              </div>
            </div>

            {/* ─── SLA Progress ─────────── */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">SLA Progress</p>
                <p className={`text-lg font-bold ${slaColor(issue)}`}>{formatSLADisplay(issue)}</p>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${slaBarColor(issue)}`}
                  style={{ width: `${slaPercent}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                {issue.status === 'resolved' ? 'Issue resolved ✅' : `Deadline: ${formatDeadline(issue)}`}
              </p>
            </div>

            {/* ─── Special State Cards ──── */}
            {issue.status === 'rejected' && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 animate-fade-in">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 text-2xl">❌</span>
                  <div>
                    <p className="font-semibold text-red-900">Report Rejected</p>
                    <p className="mt-1 text-sm text-red-700">{issue.rejectionReason || 'This photo was not accepted as a valid civic issue. Please ensure the photo clearly shows the problem.'}</p>
                  </div>
                </div>
              </div>
            )}

            {issue.status === 'merged' && issue.canonicalThreadId && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 animate-fade-in">
                <p className="font-semibold text-purple-900">🔗 Merged Report</p>
                <p className="mt-1 text-sm text-purple-700">
                  This report was merged with a nearby duplicate.{' '}
                  <Link className="font-semibold underline" href={`/track/${issue.canonicalThreadId}`}>
                    View canonical issue →
                  </Link>
                </p>
              </div>
            )}

            {issue.status === 'pending_citizen_confirmation' && (
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 animate-fade-in">
                <p className="text-lg font-bold text-blue-900">Is your issue fixed? 🔧</p>
                <p className="mt-1 text-sm text-blue-600">An official has submitted resolution evidence. Please confirm.</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    disabled={responseBusy}
                    className="rounded-xl bg-green-500 py-3 font-semibold text-white hover:bg-green-600 disabled:opacity-60 transition-colors focus:ring-2 focus:ring-green-500"
                    onClick={() => sendCitizenResponse(true)}
                  >
                    ✓ Yes, it&apos;s fixed
                  </button>
                  <button
                    disabled={responseBusy}
                    className="rounded-xl bg-red-500 py-3 font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition-colors focus:ring-2 focus:ring-red-500"
                    onClick={() => sendCitizenResponse(false)}
                  >
                    ✗ Not fixed
                  </button>
                </div>
                {responseError && <p className="mt-2 text-sm text-red-700">{responseError}</p>}
              </div>
            )}

            {/* ─── Timeline ─────────────── */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">Status Timeline</h2>
              <ol className="mt-4 space-y-0">
                {timeline.map((entry, index) => (
                  <li key={`${entry.status}-${index}`} className="flex gap-4">
                    {/* Dot + line */}
                    <div className="flex flex-col items-center">
                      <span className={`mt-0.5 shrink-0 ${
                        entry.current
                          ? 'h-4 w-4 rounded-full bg-civic-blue ring-4 ring-civic-blue/20 animate-pulse'
                          : entry.done
                          ? 'h-4 w-4 rounded-full bg-civic-blue'
                          : 'h-4 w-4 rounded-full border-2 border-gray-300 bg-white'
                      }`} />
                      {index < timeline.length - 1 && (
                        <span className={`mt-1 mb-1 w-0.5 flex-1 min-h-[32px] rounded ${entry.done ? 'bg-civic-blue/30' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    {/* Content */}
                    <div className={`mb-4 flex-1 ${entry.done ? 'opacity-100' : 'opacity-40'}`}>
                      <p className={`font-semibold ${entry.current ? 'text-civic-blue' : entry.done ? 'text-gray-900' : 'text-gray-400'}`}>
                        {statusLabel(entry.status)}
                      </p>
                      <p className="text-xs text-gray-400">{entry.date} — {entry.changedBy}</p>
                      {entry.note && <p className="mt-0.5 text-xs text-gray-500 italic">{entry.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ─── Status Badge ──────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_classification: 'bg-gray-100 text-gray-700',
    assigned:               'bg-red-100 text-red-800',
    in_progress:            'bg-amber-100 text-amber-800',
    pending_verification:   'bg-blue-100 text-blue-800',
    resolved:               'bg-green-100 text-green-800',
    escalated:              'bg-gray-900 text-white',
    rejected:               'bg-gray-200 text-gray-600',
    merged:                 'bg-purple-100 text-purple-800',
    disputed:               'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {statusLabel(status)}
    </span>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────── */
function buildTimeline(issue: Issue | null) {
  if (!issue) return [];
  const history = issue.statusHistory || [];
  const currentIndex = Math.max(FLOW.indexOf(issue.status), 0);
  return FLOW.map((status, index) => {
    const real = history.find((entry) => entry.status === status);
    return {
      status,
      done: index <= currentIndex,
      current: status === issue.status,
      date: real ? formatTimestamp(real.timestamp) : '[pending]',
      changedBy: displayActor(real?.changedBy),
      note: real?.note || '',
    };
  });
}

function computeSlaPercent(issue: Issue | null): number {
  if (!issue) return 0;
  if (issue.status === 'resolved') return 100;
  if (!issue.slaDeadline?.toDate) return 0;
  const created = timestampMs(issue.createdAt);
  const deadline = issue.slaDeadline.toDate().getTime();
  const now = Date.now();
  if (created === 0 || deadline <= created) return 50;
  const total = deadline - created;
  const elapsed = now - created;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

function formatSLADisplay(issue: Issue) {
  if (issue.status === 'resolved') return '✅ Resolved';
  if (!issue.slaDeadline?.toDate) return 'SLA pending';
  const ms = issue.slaDeadline.toDate().getTime() - Date.now();
  const absHours = Math.ceil(Math.abs(ms) / 36e5);
  if (ms < 0) return `${absHours}h overdue`;
  if (absHours < 24) return `${absHours}h remaining`;
  return `${Math.ceil(absHours / 24)}d remaining`;
}

function formatDeadline(issue: Issue) {
  if (!issue.slaDeadline?.toDate) return '—';
  return issue.slaDeadline.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function slaColor(issue: Issue) {
  if (issue.status === 'resolved') return 'text-green-600';
  if (!issue.slaDeadline?.toDate) return 'text-gray-500';
  const hours = (issue.slaDeadline.toDate().getTime() - Date.now()) / 36e5;
  if (hours < 0) return 'text-red-600';
  if (hours < 24) return 'text-red-500';
  if (hours < 72) return 'text-amber-500';
  return 'text-green-600';
}

function slaBarColor(issue: Issue) {
  if (issue.status === 'resolved') return 'bg-green-500';
  if (!issue.slaDeadline?.toDate) return 'bg-gray-300';
  const hours = (issue.slaDeadline.toDate().getTime() - Date.now()) / 36e5;
  if (hours < 0) return 'bg-red-500';
  if (hours < 24) return 'bg-red-400';
  if (hours < 72) return 'bg-amber-400';
  return 'bg-green-500';
}

function statusLabel(status: string) {
  return ({
    pending_classification:  'Classifying…',
    pending_deduplication:   'Checking Duplicates',
    pending_routing:         'Routing…',
    assigned:                'Open',
    in_progress:             'In Progress',
    pending_verification:    'Pending Verification',
    pending_citizen_confirmation: 'Awaiting Your Confirmation',
    resolved:                '✅ Resolved',
    escalated:               '⚠ Escalated',
    rejected:                'Rejected',
    merged:                  'Merged',
    disputed:                'Disputed',
    error_processing:        'Processing Error',
  }[status] || status);
}

function displayActor(actor?: string) {
  if (!actor || actor === 'system') return 'System';
  if (actor === 'citizen') return 'You (Citizen)';
  if (actor.includes('agent') || actor === 'ai') return 'AI Agent';
  return 'Ward Official';
}

function formatTimestamp(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  if (value instanceof Date) return value.toLocaleString();
  return new Date().toLocaleString();
}

function timestampMs(value: unknown) {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}
