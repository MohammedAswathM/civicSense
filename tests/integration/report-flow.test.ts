import { describe, expect, it } from 'vitest';
import { run as runAgent2 } from '@/lib/agents/agent2-dedupe';

describe('Full report pipeline emulator contract', () => {
  it('keeps duplicate reports terminal by marking the duplicate as merged', async () => {
    const patches: Record<string, unknown>[] = [];
    const result = await runAgent2(
      { issueId: 'duplicate', gpsLat: 11.01685, gpsLng: 76.9558, category: 'pothole', severity: 4 },
      {
        async findOpenIssuesByCategory() {
          return [
            {
              issueId: 'original',
              publicTrackingId: 'CS-2847-XKQM',
              gpsLat: 11.0168,
              gpsLng: 76.9558,
              category: 'pothole',
              status: 'assigned',
              createdAtMs: 1,
              credibilityWeight: 1,
              corroborationCount: 0,
              corroborations: [],
            },
          ];
        },
        async publicIdExists() {
          return false;
        },
        async updateIssue(issueId, patch) {
          patches.push({ issueId, ...patch });
        },
      },
    );
    expect(result.isNewIssue).toBe(false);
    expect(patches.some((patch) => patch.status === 'merged')).toBe(true);
  });
});
