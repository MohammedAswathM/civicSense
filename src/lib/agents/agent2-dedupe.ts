import type { Agent2Input, Agent2Output } from '@/types/agent';
import { CREDIBILITY_WEIGHT, DEDUP_RADIUS_METRES } from '@/lib/utils/constants';
import { haversineDistanceMetres } from '@/lib/geo/haversine';
import { fallbackPublicId, generatePublicId } from '@/lib/utils/id-generator';

export interface DedupeCandidate {
  issueId: string;
  publicTrackingId: string;
  gpsLat: number;
  gpsLng: number;
  category: string;
  status: string;
  createdAtMs: number;
  credibilityWeight: number;
  corroborationCount: number;
  corroborations: string[];
}

export interface Agent2Store {
  findOpenIssuesByCategory(category: string): Promise<DedupeCandidate[]>;
  publicIdExists(publicTrackingId: string): Promise<boolean>;
  updateIssue(issueId: string, patch: Record<string, unknown>): Promise<void>;
}

export async function run(input: Agent2Input, store: Agent2Store): Promise<Agent2Output> {
  try {
    const candidates = await store.findOpenIssuesByCategory(input.category);
    const matches = candidates
      .filter((issue) => issue.issueId !== input.issueId)
      .filter(
        (issue) =>
          haversineDistanceMetres(
            { lat: input.gpsLat, lng: input.gpsLng },
            { lat: issue.gpsLat, lng: issue.gpsLng },
          ) <= DEDUP_RADIUS_METRES,
      )
      .sort((a, b) => a.createdAtMs - b.createdAtMs);

    if (matches.length > 0) {
      const canonical = matches[0];
      const credibilityWeight =
        canonical.credibilityWeight +
        CREDIBILITY_WEIGHT.CORROBORATION +
        (input.hasPhoto ? CREDIBILITY_WEIGHT.PHOTO_EVIDENCE : 0);
      const corroborations = Array.from(new Set([...canonical.corroborations, input.issueId]));
      const output: Agent2Output = {
        isNewIssue: false,
        canonicalThreadId: canonical.issueId,
        publicTrackingId: canonical.publicTrackingId,
        corroborationCount: canonical.corroborationCount + 1,
        credibilityWeight,
        autoEscalate: credibilityWeight >= CREDIBILITY_WEIGHT.AUTO_ESCALATE_THRESHOLD,
      };

      await store.updateIssue(canonical.issueId, {
        corroborations,
        corroborationCount: output.corroborationCount,
        credibilityWeight,
        autoEscalate: output.autoEscalate,
        updatedAt: new Date(),
      });
      await store.updateIssue(input.issueId, {
        status: 'merged',
        canonicalThreadId: canonical.issueId,
        publicTrackingId: canonical.publicTrackingId,
        merged_into: canonical.issueId,
        updatedAt: new Date(),
      });
      return output;
    }

    const publicTrackingId = await assignUniquePublicId(store);
    const output: Agent2Output = {
      isNewIssue: true,
      canonicalThreadId: input.issueId,
      publicTrackingId,
      corroborationCount: 0,
      credibilityWeight: CREDIBILITY_WEIGHT.BASE_REPORT + (input.hasPhoto ? CREDIBILITY_WEIGHT.PHOTO_EVIDENCE : 0),
      autoEscalate: false,
    };
    await store.updateIssue(input.issueId, {
      ...output,
      status: 'pending_routing',
      updatedAt: new Date(),
    });
    return output;
  } catch (error) {
    await store.updateIssue(input.issueId, {
      status: 'error_processing',
      errorMessage: error instanceof Error ? error.message : String(error),
      updatedAt: new Date(),
    });
    throw error;
  }
}

async function assignUniquePublicId(store: Pick<Agent2Store, 'publicIdExists'>): Promise<string> {
  let id = generatePublicId();
  for (let attempts = 0; attempts < 10; attempts++) {
    if (!(await store.publicIdExists(id))) return id;
    id = generatePublicId();
  }
  return fallbackPublicId();
}
