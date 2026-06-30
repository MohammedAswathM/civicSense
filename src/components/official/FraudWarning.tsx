export default function FraudWarning({ reason }: { reason: string }) {
  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-950">
      <h2 className="font-semibold">Resolution rejected</h2>
      <p className="mt-1 text-sm">{reason} Supervisor has been notified.</p>
    </section>
  );
}
