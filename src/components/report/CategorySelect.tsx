'use client';

import { ISSUE_CATEGORIES } from '@/lib/utils/constants';

export default function CategorySelect() {
  return (
    <div>
      <h2 className="text-lg font-semibold">Details</h2>
      <textarea data-testid="description-input" className="mt-4 min-h-28 w-full rounded border border-gray-300 p-3" placeholder="Describe the issue (optional)" />
      <div className="mt-4 flex flex-wrap gap-2">
        {ISSUE_CATEGORIES.map((category) => (
          <button key={category} type="button" className="rounded-full border border-gray-300 px-3 py-2 text-sm capitalize hover:bg-civic-blue-light">
            {category.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  );
}
