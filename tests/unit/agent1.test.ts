import { describe, expect, it } from 'vitest';
import { run, type Agent1Store } from '@/lib/agents/agent1-classify';

describe('Agent 1 classification', () => {
  it('rejects reports with unusable GPS accuracy before calling Gemini', async () => {
    const patches: Record<string, unknown>[] = [];
    const store: Agent1Store = {
      async readPhotoBase64() {
        throw new Error('should not read photo');
      },
      async updateIssue(_, patch) {
        patches.push(patch);
      },
    };

    const result = await run(
      { issueId: 'issue-1', photoUrl: 'demo', textDescription: '', gpsLat: 1, gpsLng: 1, gpsAccuracy: 600 },
      store,
    );
    expect(result.isValidIssue).toBe(false);
    expect(patches[0].status).toBe('rejected');
  });
});
