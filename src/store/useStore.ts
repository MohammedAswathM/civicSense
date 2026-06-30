'use client';

import { create } from 'zustand';

interface CivicSenseStore {
  selectedIssueId: string | null;
  setSelectedIssueId(issueId: string | null): void;
}

export const useStore = create<CivicSenseStore>((set) => ({
  selectedIssueId: null,
  setSelectedIssueId: (issueId) => set({ selectedIssueId: issueId }),
}));
