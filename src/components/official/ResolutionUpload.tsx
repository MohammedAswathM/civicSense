export default function ResolutionUpload() {
  return (
    <div>
      <h2 className="text-lg font-semibold">Resolution evidence</h2>
      <input className="mt-4 block w-full rounded border border-gray-300 p-2" type="file" accept="image/*" aria-label="Upload resolution photo" />
      <textarea className="mt-4 min-h-24 w-full rounded border border-gray-300 p-3" placeholder="Resolution note" />
    </div>
  );
}
