export default function IssueThread() {
  const steps = ['Reported', 'Classified', 'Assigned'];
  return (
    <ol className="mt-6 space-y-3">
      {steps.map((step) => (
        <li key={step} className="rounded border border-gray-200 p-3 text-sm">
          <span className="font-semibold">{step}</span>
          <span className="ml-2 text-gray-500">System verified</span>
        </li>
      ))}
    </ol>
  );
}
