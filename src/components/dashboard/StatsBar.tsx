const stats = [
  ['Total issues', '47'],
  ['Resolved this month', '31'],
  ['Avg resolution', '18h'],
  ['Escalated', '4'],
];

export default function StatsBar() {
  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-4">
      {stats.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
      ))}
    </section>
  );
}
