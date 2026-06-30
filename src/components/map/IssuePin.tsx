export default function IssuePin({ label }: { label: string }) {
  return <span className="inline-flex rounded-full bg-status-open px-2 py-1 text-xs font-semibold text-white">{label}</span>;
}
