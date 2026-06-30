import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import type { Issue } from '@/types/issue';

const CATEGORY_ICONS: Record<string, string> = {
  pothole: '🕳️', waterlogging: '💧', broken_light: '💡', garbage: '🗑️',
  damaged_pipe: '🔧', fallen_tree: '🌳', sewage: '🚽', vandalism: '🖊️', other: '❓',
};

export default function TicketCard({ ticket }: { ticket: Issue }) {
  const hours = slaHours(ticket);
  const slaClass = hours < 24 ? 'bg-red-50 text-red-700 border-red-200' : hours < 72 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200';

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Row 1: Category + SLA urgency */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-bold text-gray-900">
          <span className="text-xl">{CATEGORY_ICONS[ticket.category] || '❓'}</span>
          <span className="capitalize">{String(ticket.category || 'other').replace(/_/g, ' ')}</span>
        </h2>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${slaClass}`}>
          ⏰ {slaText(ticket)}
        </span>
      </div>

      {/* Row 2: Ward / Location */}
      <p className="mt-1.5 text-xs text-gray-500">
        📍 {ticket.ward || 'Ward pending'} · {ticket.address || 'Coimbatore'}
      </p>

      {/* Row 3: Description */}
      <p className="mt-2 line-clamp-2 text-sm text-gray-700">
        &ldquo;{ticket.textDescription || ticket.geminiDescription || 'No description provided.'}&rdquo;
      </p>

      {/* Row 4: Photo + meta */}
      <div className="mt-3 flex items-end gap-3">
        {ticket.photoUrls?.[0] && (
          <div className="relative shrink-0">
            <img
              src={ticket.photoUrls[0]}
              alt={`${ticket.publicTrackingId} issue`}
              className="h-16 w-16 rounded-xl object-cover ring-1 ring-gray-100"
            />
            {/* Status overlay dot */}
            <span
              className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white"
              style={{ backgroundColor: statusDotColor(ticket.status) }}
            />
          </div>
        )}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">👥 {ticket.corroborationCount || 1}</span>
          <Badge tone={badgeTone(ticket.status)}>{statusLabel(ticket.status)}</Badge>
          {ticket.credibilityWeight > 1 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
              ⭐ {ticket.credibilityWeight?.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Row 5: ID + Action */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
        <span className="font-mono text-xs font-semibold text-gray-500">{ticket.publicTrackingId}</span>
        <Link
          href={`/official/resolve/${ticket.id}`}
          className="flex items-center gap-1 rounded-xl bg-civic-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-civic-blue-dark transition-colors focus:ring-2 focus:ring-civic-blue"
        >
          Resolve →
        </Link>
      </div>
    </article>
  );
}

function slaHours(ticket: Issue) {
  if (!ticket.slaDeadline?.toDate) return Number.POSITIVE_INFINITY;
  return (ticket.slaDeadline.toDate().getTime() - Date.now()) / 36e5;
}

function slaText(ticket: Issue) {
  const hours = slaHours(ticket);
  if (!Number.isFinite(hours)) return 'Pending';
  if (hours < 0) return `${Math.ceil(Math.abs(hours))}h overdue`;
  return hours < 24 ? `${Math.ceil(hours)}h left` : `${Math.ceil(hours / 24)}d left`;
}

function statusDotColor(status: string) {
  if (status === 'resolved') return '#057A55';
  if (status === 'in_progress') return '#FF8800';
  if (status === 'escalated') return '#1C1C1E';
  return '#E02424';
}

function badgeTone(status: Issue['status']): 'open' | 'progress' | 'resolved' | 'escalated' | 'muted' {
  if (status === 'resolved') return 'resolved';
  if (status === 'in_progress') return 'progress';
  if (status === 'escalated') return 'escalated';
  if (status === 'rejected' || status === 'merged') return 'muted';
  return 'open';
}

function statusLabel(status: Issue['status']) {
  return ({
    pending_classification: 'Classifying…',
    pending_deduplication: 'Deduplicating',
    pending_routing: 'Routing…',
    assigned: 'Open',
    in_progress: 'In Progress',
    pending_verification: 'Pending Verify',
    pending_citizen_confirmation: 'Citizen Confirm',
    resolved: '✅ Resolved',
    escalated: '⚠ Escalated',
    rejected: 'Rejected',
    merged: 'Merged',
    disputed: 'Disputed',
    error_processing: 'Error',
    upload_pending: 'Upload Pending',
  }[status] || status);
}
