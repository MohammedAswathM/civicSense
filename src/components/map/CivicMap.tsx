'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { arrayUnion, doc, increment, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Issue } from '@/types/issue';

const CATEGORY_ICONS: Record<string, string> = {
  pothole: '🕳️',
  waterlogging: '💧',
  broken_light: '💡',
  garbage: '🗑️',
  damaged_pipe: '🔧',
  fallen_tree: '🌳',
  sewage: '🚽',
  vandalism: '🖊️',
  other: '❓',
};

const STATUS_COLORS: Record<string, string> = {
  in_progress: '#FF8800',
  resolved: '#057A55',
  escalated: '#1C1C1E',
};

export default function CivicMap({ issues }: { issues: Issue[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [selected, setSelected] = useState<Issue | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const hasMapsKey = Boolean(apiKey);
  const bounds = useMemo(() => coordinateBounds(issues), [issues]);

  useEffect(() => {
    if (!hasMapsKey || !mapRef.current || !apiKey) return;
    const loader = new Loader({ apiKey, version: 'weekly', libraries: ['places', 'geometry'] });
    let markers: Array<{ setMap(m: unknown): void }> = [];
    let map: unknown = null;

    loader
      .load()
      .then((google) => {
        if (!mapRef.current) return;
        map = new google.maps.Map(mapRef.current, {
          center: centerOf(issues),
          zoom: 13,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          styles: mapStyles,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        });

        markers = issues.map((issue) => {
          const marker = new google.maps.Marker({
            position: { lat: issue.gpsLat, lng: issue.gpsLng },
            map: map!,
            title: `${issue.publicTrackingId} — ${String(issue.category || 'other').replace('_', ' ')}`,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: statusColor(issue.status),
              fillOpacity: 0.95,
              strokeColor: '#ffffff',
              strokeWeight: 2.5,
              scale: markerScale(issue.credibilityWeight),
            },
          });
          marker.addListener('click', () => setSelected(issue));
          return marker;
        });
      })
      .catch(() => setMapFailed(true));

    return () => {
      markers.forEach((m) => m.setMap(null));
    };
  }, [apiKey, hasMapsKey, issues]);

  if (!hasMapsKey || mapFailed) {
    return (
      <section className="min-h-screen px-4 pb-24 pt-36">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="text-lg">⚠️</span>
            <span>Map view requires a Google Maps API key — showing list view</span>
          </div>
          {/* Fallback canvas map */}
          <div className="relative h-[420px] overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 to-slate-100 shadow-inner">
            <div className="absolute inset-0 grid grid-cols-12 grid-rows-8 opacity-10">
              {Array.from({ length: 96 }).map((_, i) => (
                <div key={i} className="border border-gray-400" />
              ))}
            </div>
            {issues.map((issue) => {
              const point = project(issue.gpsLat, issue.gpsLng, bounds);
              return (
                <button
                  key={issue.id}
                  type="button"
                  aria-label={`Open ${issue.publicTrackingId}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-110 focus:ring-2 focus:ring-white"
                  style={{ left: `${point.x}%`, top: `${point.y}%`, backgroundColor: statusColor(issue.status) }}
                  onClick={() => setSelected(issue)}
                >
                  {CATEGORY_ICONS[issue.category] || '❓'}
                </button>
              );
            })}
            {!issues.length && (
              <div className="flex h-full items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl">🗺️</div>
                  <p className="mt-2 text-sm font-medium">No issues to display</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {issues.map((issue) => <IssueCard key={issue.id} issue={issue} onSelect={setSelected} />)}
          </div>
        </div>
        {selected && <BottomSheet issue={selected} onClose={() => setSelected(null)} />}
      </section>
    );
  }

  return (
    <>
      <div ref={mapRef} className="h-screen w-full pt-28" aria-label="Civic issue map" />
      {selected && <BottomSheet issue={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

/* ─── Bottom Sheet ──────────────────────────────────────────── */
function BottomSheet({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
        role="presentation"
      />
      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg p-3 animate-slide-up">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl">
          <button
            type="button"
            aria-label="Close issue popup"
            className="absolute right-5 top-5 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 focus:ring-2 focus:ring-civic-blue"
            onClick={onClose}
          >
            ×
          </button>
          <IssueCard issue={issue} />
        </div>
      </div>
    </>
  );
}

/* ─── Issue Card ────────────────────────────────────────────── */
function IssueCard({ issue, onSelect }: { issue: Issue; onSelect?: (i: Issue) => void }) {
  const [upvoted, setUpvoted] = useState(() => {
    if (typeof window === 'undefined') return false;
    const voterId = localStorage.getItem('civicsense.voterId') || '';
    return issue.upvotedByIds?.includes(voterId) ?? false;
  });

  async function handleUpvote(e: React.MouseEvent) {
    e.stopPropagation();
    const voterId = localStorage.getItem('civicsense.voterId') || crypto.randomUUID();
    localStorage.setItem('civicsense.voterId', voterId);
    if (upvoted || issue.upvotedByIds?.includes(voterId)) return;
    setUpvoted(true);
    await updateDoc(doc(db, 'issues', issue.id), {
      upvoteCount: increment(1),
      upvotedByIds: arrayUnion(voterId),
    });
  }

  return (
    <article
      className={`rounded-xl border border-gray-100 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={onSelect ? () => onSelect(issue) : undefined}
    >
      {/* Row 1: category + SLA */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-semibold text-gray-900">
          <span className="text-base">{CATEGORY_ICONS[issue.category] || '❓'}</span>
          <span className="capitalize">{String(issue.category || 'other').replace(/_/g, ' ')}</span>
        </h2>
        <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
          ⏰ {formatSla(issue)}
        </span>
      </div>

      {/* Row 2: ward/location */}
      <p className="mt-1 text-xs text-gray-500">
        {issue.ward ? `${issue.ward} · ` : ''}{issue.address || 'Coimbatore'}
      </p>

      {/* Row 3: description */}
      <p className="mt-2 line-clamp-2 text-sm text-gray-700">
        &ldquo;{issue.textDescription || issue.geminiDescription || 'No description provided.'}&rdquo;
      </p>

      {/* Row 4: photo + count + status */}
      <div className="mt-3 flex items-center gap-3">
        {issue.photoUrls?.[0] && (
          <img
            src={issue.photoUrls[0]}
            alt={`${issue.publicTrackingId} issue photo`}
            className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-gray-100"
          />
        )}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            👥 {issue.corroborationCount || 1}
          </span>
          <StatusBadge status={issue.status} />
          {issue.credibilityWeight > 1 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              ⭐ {issue.credibilityWeight?.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Row 5: ID + actions */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
        <span className="font-mono text-xs font-semibold text-gray-600">{issue.publicTrackingId}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={`Upvote ${issue.publicTrackingId}`}
            className={`flex items-center gap-1 text-xs font-semibold transition-colors focus:ring-2 focus:ring-civic-blue ${upvoted ? 'text-civic-blue' : 'text-gray-400 hover:text-civic-blue'}`}
            onClick={handleUpvote}
          >
            ▲ {issue.upvoteCount || 0}
          </button>
          <Link
            href={`/track/${issue.publicTrackingId}`}
            className="rounded-lg bg-civic-blue-light px-3 py-1 text-xs font-semibold text-civic-blue hover:bg-civic-blue hover:text-white transition-colors focus:ring-2 focus:ring-civic-blue"
            onClick={(e) => e.stopPropagation()}
          >
            Track →
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ─── Status Badge ──────────────────────────────────────────── */
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
  };
  const labels: Record<string, string> = {
    pending_classification: 'Classifying…',
    assigned:               'Open',
    in_progress:            'In Progress',
    pending_verification:   'Pending',
    resolved:               '✅ Resolved',
    escalated:              '⚠ Escalated',
    rejected:               'Rejected',
    merged:                 'Merged',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
}

/* ─── Helpers ───────────────────────────────────────────────── */
function statusColor(status: string) {
  return STATUS_COLORS[status] ?? '#E02424';
}

function markerScale(weight: number) {
  return Math.min(20, Math.max(8, 8 + (weight || 1) * 2));
}

function coordinateBounds(points: Array<{ gpsLat: number; gpsLng: number }>) {
  const safe = points.length ? points : [{ gpsLat: 10.9026, gpsLng: 76.9098 }];
  return {
    minLat: Math.min(...safe.map((p) => p.gpsLat)),
    maxLat: Math.max(...safe.map((p) => p.gpsLat)),
    minLng: Math.min(...safe.map((p) => p.gpsLng)),
    maxLng: Math.max(...safe.map((p) => p.gpsLng)),
  };
}

function centerOf(issues: Issue[]) {
  if (!issues.length) return { lat: 10.9026, lng: 76.9098 };
  return {
    lat: issues.reduce((s, i) => s + i.gpsLat, 0) / issues.length,
    lng: issues.reduce((s, i) => s + i.gpsLng, 0) / issues.length,
  };
}

function project(lat: number, lng: number, bounds: ReturnType<typeof coordinateBounds>) {
  const x = ((lng - bounds.minLng) / Math.max(bounds.maxLng - bounds.minLng, 0.001)) * 80 + 10;
  const y = 90 - ((lat - bounds.minLat) / Math.max(bounds.maxLat - bounds.minLat, 0.001)) * 80;
  return { x, y };
}

function formatSla(issue: Issue) {
  if (!issue.slaDeadline?.toDate) return 'SLA pending';
  const hours = Math.ceil((issue.slaDeadline.toDate().getTime() - Date.now()) / 36e5);
  if (hours < 0) return `${Math.abs(hours)}h overdue`;
  return hours < 24 ? `${hours}h` : `${Math.ceil(hours / 24)}d`;
}

/* ─── Minimal Google Maps custom styles ────────────────────── */
const mapStyles: Array<Record<string, unknown>> = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d9e8' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5f2e5' }] },
];
