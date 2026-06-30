'use client';

export default function PhotoUpload() {
  return (
    <div>
      <h2 className="text-lg font-semibold">Photo evidence</h2>
      <input data-testid="photo-input" className="mt-4 block w-full rounded border border-gray-300 p-2" type="file" accept="image/*" aria-label="Upload issue photo" />
      <button data-testid="confirm-photo" className="mt-4 rounded-md bg-civic-blue px-4 py-2 font-semibold text-white" type="button">Use Photo</button>
    </div>
  );
}
