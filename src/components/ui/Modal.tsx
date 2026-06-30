export default function Modal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
      <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
