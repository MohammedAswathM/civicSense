export default function Badge({
  children,
  tone = 'open',
}: {
  children: React.ReactNode;
  tone?: 'open' | 'progress' | 'resolved' | 'escalated' | 'muted';
}) {
  const classes: Record<string, string> = {
    open:      'bg-red-100 text-red-800',
    progress:  'bg-amber-100 text-amber-800',
    resolved:  'bg-green-100 text-green-800',
    escalated: 'bg-gray-900 text-white',
    muted:     'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${classes[tone]}`}>
      {children}
    </span>
  );
}
