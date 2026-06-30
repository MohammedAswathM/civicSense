'use client';

import { useEffect, useState } from 'react';

export default function SLACountdown({ deadlineIso, status }: { deadlineIso: string; status: string }) {
  const [label, setLabel] = useState(formatSLADisplay(deadlineIso, status));
  useEffect(() => {
    const interval = window.setInterval(() => setLabel(formatSLADisplay(deadlineIso, status)), 1000);
    return () => window.clearInterval(interval);
  }, [deadlineIso, status]);
  return <span>{label}</span>;
}

function formatSLADisplay(deadlineIso: string, status: string): string {
  if (status === 'resolved') return 'Resolved';
  const diffHours = (new Date(deadlineIso).getTime() - Date.now()) / (1000 * 60 * 60);
  if (diffHours < 0) return `OVERDUE by ${Math.abs(Math.round(diffHours))}h`;
  if (diffHours < 24) return `${Math.round(diffHours)}h remaining`;
  return `${Math.round(diffHours / 24)}d ${Math.round(diffHours % 24)}h remaining`;
}
