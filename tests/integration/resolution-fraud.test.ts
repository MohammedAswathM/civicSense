import { describe, expect, it } from 'vitest';
import { run as runAgent4 } from '@/lib/agents/agent4-fraud';

describe('Agent 4 resolution fraud flow', () => {
  it('blocks resolution with wrong GPS location', async () => {
    const patches: Record<string, unknown>[] = [];
    const result = await runAgent4(
      {
        issueId: 'issue-1',
        originalPhotoUrl: 'original',
        originalGpsLat: 11.0168,
        originalGpsLng: 76.9558,
        resolutionPhotoUrl: 'resolution',
        resolutionGpsLat: 11.03,
        resolutionGpsLng: 76.9558,
        officialId: 'official-1',
      },
      {
        async updateIssue(issueId, patch) {
          patches.push({ issueId, ...patch });
        },
        async appendResolutionAttempt() {
          return undefined;
        },
        async incrementSuspiciousResolutionCount() {
          return undefined;
        },
      },
    );
    expect(result.verificationStatus).toBe('gps_fraud');
    expect(patches[0].status).toBe('assigned');
  });
});
