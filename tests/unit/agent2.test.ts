import { describe, expect, it } from 'vitest';
import { run, type Agent2Store, type DedupeCandidate } from '@/lib/agents/agent2-dedupe';

function store(candidates: DedupeCandidate[]): Agent2Store & { patches: Record<string, unknown>[] } {
  const patches: Record<string, unknown>[] = [];
  return {
    patches,
    async findOpenIssuesByCategory(category) {
      return candidates.filter((issue) => issue.category === category);
    },
    async publicIdExists() {
      return false;
    },
    async updateIssue(issueId, patch) {
      patches.push({ issueId, ...patch });
    },
  };
}

const existing: DedupeCandidate = {
  issueId: 'original',
  publicTrackingId: 'CS-2847-XKQM',
  gpsLat: 11.0168,
  gpsLng: 76.9558,
  category: 'pothole',
  status: 'assigned',
  createdAtMs: 1,
  credibilityWeight: 2,
  corroborationCount: 0,
  corroborations: [],
};

describe('Agent 2 deduplication', () => {
  it('merges a new report into an existing issue within 75m same category', async () => {
    const fakeStore = store([existing]);
    const result = await run({ issueId: 'new', gpsLat: 11.01685, gpsLng: 76.9558, category: 'pothole', severity: 4, hasPhoto: true }, fakeStore);
    expect(result.isNewIssue).toBe(false);
    expect(result.canonicalThreadId).toBe('original');
  });

  it('does NOT merge reports of different categories even if within 75m', async () => {
    const fakeStore = store([{ ...existing, category: 'garbage' }]);
    const result = await run({ issueId: 'new', gpsLat: 11.01685, gpsLng: 76.9558, category: 'pothole', severity: 4 }, fakeStore);
    expect(result.isNewIssue).toBe(true);
  });

  it('creates a new thread for a report 100m from existing same-category issue', async () => {
    const fakeStore = store([existing]);
    const result = await run({ issueId: 'new', gpsLat: 11.0177, gpsLng: 76.9558, category: 'pothole', severity: 4 }, fakeStore);
    expect(result.isNewIssue).toBe(true);
  });

  it('increments credibility weight correctly on merge', async () => {
    const fakeStore = store([existing]);
    const result = await run({ issueId: 'new', gpsLat: 11.01685, gpsLng: 76.9558, category: 'pothole', severity: 4, hasPhoto: true }, fakeStore);
    expect(result.credibilityWeight).toBe(3.5);
  });
});
