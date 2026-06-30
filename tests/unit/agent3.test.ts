import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mock stores ──────────────────────────────────────────────────────────────
import type { Agent3Store, RoutingCandidate } from '@/lib/agents/agent3-route';
import { run as runAgent3 } from '@/lib/agents/agent3-route';
import type { Agent3Input } from '@/types/agent';
import { CATEGORY_TO_DEPARTMENT, SLA_HOURS, CONVERGENCE_RADIUS_METRES } from '@/lib/utils/constants';

// Ward centres from ward-lookup.ts (ground truth)
// ward_04 = { lat: 11.001, lng: 76.951 }  (South ward)
// ward_01 = { lat: 11.0168, lng: 76.9558 } (Central ward)
const WARD_04_LAT = 11.001;
const WARD_04_LNG = 76.951;
const WARD_01_LAT = 11.0168;
const WARD_01_LNG = 76.9558;

function makeStore(overrides: Partial<Agent3Store> = {}): Agent3Store {
  return {
    findOfficial: vi.fn().mockResolvedValue('officer-001'),
    findOpenIssuesNear: vi.fn().mockResolvedValue([]),
    updateIssue: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeInput(overrides: Partial<Agent3Input> = {}): Agent3Input {
  return {
    issueId: 'test-issue-001',
    category: 'pothole',
    severity: 3,
    gpsLat: WARD_04_LAT,
    gpsLng: WARD_04_LNG,
    autoEscalate: false,
    ...overrides,
  };
}

// ── Department mapping ────────────────────────────────────────────────────────
describe('Agent 3 — Department mapping', () => {
  it.each([
    ['pothole', 'roads'],
    ['waterlogging', 'drainage'],
    ['broken_light', 'electricity'],
    ['garbage', 'sanitation'],
    ['damaged_pipe', 'water_supply'],
    ['fallen_tree', 'parks'],
    ['sewage', 'drainage'],
    ['vandalism', 'municipal'],
    ['other', 'municipal'],
  ] as const)('maps category %s → department %s', async (category, expectedDept) => {
    const store = makeStore();
    const result = await runAgent3(makeInput({ category }), store);
    expect(result.department).toBe(expectedDept);
  });
});

// ── SLA calculation ───────────────────────────────────────────────────────────
describe('Agent 3 — SLA hours per severity', () => {
  it.each([
    ['pothole', 1, 168],
    ['pothole', 3, 72],
    ['pothole', 5, 24],
    ['waterlogging', 5, 3],
    ['garbage', 1, 72],
  ] as [string, 1 | 2 | 3 | 4 | 5, number][])('category %s severity %d → %d hours SLA', async (category, severity, expectedHours) => {
    const store = makeStore();
    const before = Date.now();
    const result = await runAgent3(makeInput({ category: category as any, severity }), store);
    const after = Date.now();

    // slaDeadline is stored as a Date (then cast in the agent)
    const updateCall = (store.updateIssue as ReturnType<typeof vi.fn>).mock.calls[0];
    const patch = updateCall[1] as Record<string, unknown>;
    const deadline = patch.slaDeadline as Date;
    const actualHours = (deadline.getTime() - before) / (1000 * 60 * 60);
    const expectedMs = expectedHours * 60 * 60 * 1000;

    // Allow 1s tolerance for test execution time
    expect(deadline.getTime() - before).toBeGreaterThanOrEqual(expectedMs - 1000);
    expect(deadline.getTime() - after).toBeLessThanOrEqual(expectedMs + 1000);
  });
});

// ── Ward lookup from GPS ──────────────────────────────────────────────────────
describe('Agent 3 — Ward lookup from GPS', () => {
  it('assigns ward_04 for coords near Ward 4 South centre', async () => {
    const store = makeStore();
    const result = await runAgent3(makeInput({ gpsLat: WARD_04_LAT + 0.001, gpsLng: WARD_04_LNG + 0.001 }), store);
    expect(result.ward).toBe('ward_04');
  });

  it('assigns ward_01 for coords near Ward 1 Central centre', async () => {
    const store = makeStore();
    const result = await runAgent3(makeInput({ gpsLat: WARD_01_LAT, gpsLng: WARD_01_LNG }), store);
    expect(result.ward).toBe('ward_01');
  });
});

// ── Convergence detection ─────────────────────────────────────────────────────
describe('Agent 3 — Convergence detection', () => {
  // Two nearby issues within CONVERGENCE_RADIUS_METRES (100m)
  const nearbyIssues: RoutingCandidate[] = [
    { issueId: 'issue-nearby-1', gpsLat: WARD_04_LAT + 0.0003, gpsLng: WARD_04_LNG + 0.0003, status: 'assigned' },
    { issueId: 'issue-nearby-2', gpsLat: WARD_04_LAT - 0.0003, gpsLng: WARD_04_LNG - 0.0003, status: 'assigned' },
  ];
  // ~0.0003 degrees ≈ 33m — well within 100m

  const farIssues: RoutingCandidate[] = [
    { issueId: 'issue-far-1', gpsLat: WARD_04_LAT + 0.01, gpsLng: WARD_04_LNG + 0.01, status: 'assigned' },
    { issueId: 'issue-far-2', gpsLat: WARD_04_LAT - 0.01, gpsLng: WARD_04_LNG - 0.01, status: 'assigned' },
  ];
  // ~0.01 degrees ≈ 1100m — well beyond 100m

  it('sets convergenceAlert=true when 2+ open issues within 100m', async () => {
    const store = makeStore({ findOpenIssuesNear: vi.fn().mockResolvedValue(nearbyIssues) });
    const result = await runAgent3(makeInput(), store);
    expect(result.convergenceAlert).toBe(true);
    expect(result.nearbyIssueIds).toHaveLength(2);
  });

  it('sets convergenceAlert=false when issues are >100m away', async () => {
    const store = makeStore({ findOpenIssuesNear: vi.fn().mockResolvedValue(farIssues) });
    const result = await runAgent3(makeInput(), store);
    expect(result.convergenceAlert).toBe(false);
    expect(result.nearbyIssueIds).toHaveLength(0);
  });

  it('excludes the current issue from nearby search', async () => {
    const selfAndNearby: RoutingCandidate[] = [
      { issueId: 'test-issue-001', gpsLat: WARD_04_LAT, gpsLng: WARD_04_LNG, status: 'assigned' }, // self
      { issueId: 'issue-nearby-1', gpsLat: WARD_04_LAT + 0.0003, gpsLng: WARD_04_LNG, status: 'assigned' },
    ];
    const store = makeStore({ findOpenIssuesNear: vi.fn().mockResolvedValue(selfAndNearby) });
    const result = await runAgent3(makeInput(), store);
    // Only 1 other issue — not enough for convergenceAlert
    expect(result.convergenceAlert).toBe(false);
    expect(result.nearbyIssueIds).not.toContain('test-issue-001');
  });
});

// ── Auto-escalate path ────────────────────────────────────────────────────────
describe('Agent 3 — Auto-escalate to supervisor', () => {
  it('calls findOfficial with supervisor=true when autoEscalate=true', async () => {
    const store = makeStore({ findOfficial: vi.fn().mockResolvedValue('supervisor-001') });
    const result = await runAgent3(makeInput({ autoEscalate: true }), store);
    expect(store.findOfficial).toHaveBeenCalledWith(expect.any(String), expect.any(String), true);
    expect(result.assignedOfficialId).toBe('supervisor-001');
  });

  it('calls findOfficial with supervisor=false when autoEscalate=false', async () => {
    const store = makeStore();
    await runAgent3(makeInput({ autoEscalate: false }), store);
    expect(store.findOfficial).toHaveBeenCalledWith(expect.any(String), expect.any(String), false);
  });

  it('falls back to placeholder ID if no supervisor found', async () => {
    const store = makeStore({ findOfficial: vi.fn().mockResolvedValue(null) });
    const result = await runAgent3(makeInput({ autoEscalate: true }), store);
    expect(result.assignedOfficialId).toMatch(/^supervisor_/);
  });
});

// ── updateIssue called with correct patch ─────────────────────────────────────
describe('Agent 3 — updateIssue patch', () => {
  it('writes status=assigned and all routing fields', async () => {
    const store = makeStore();
    await runAgent3(makeInput(), store);
    const [issueId, patch] = (store.updateIssue as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(issueId).toBe('test-issue-001');
    expect(patch.status).toBe('assigned');
    expect(patch.ward).toBeDefined();
    expect(patch.department).toBeDefined();
    expect(patch.assignedOfficialId).toBeDefined();
    expect(patch.slaDeadline).toBeInstanceOf(Date);
    expect(typeof patch.convergenceAlert).toBe('boolean');
    expect(Array.isArray(patch.nearbyIssueIds)).toBe(true);
  });
});
