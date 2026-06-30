import type { Agent4Input, Agent4Output } from '@/types/agent';
import { haversineDistanceMetres, type Coordinate } from '@/lib/geo/haversine';
import { GPS_FRAUD_THRESHOLD_METRES, VISUAL_SIMILARITY_THRESHOLD } from '@/lib/utils/constants';
import { verifyResolutionWithGemini } from '@/lib/gemini/embeddings';

export interface Agent4Store {
  updateIssue(issueId: string, patch: Record<string, unknown>): Promise<void>;
  appendResolutionAttempt(issueId: string, attempt: Record<string, unknown>): Promise<void>;
  incrementSuspiciousResolutionCount(officialId: string): Promise<void>;
}

export function checkGPSFraud(original: Coordinate, resolution: Coordinate) {
  if (![original.lat, original.lng, resolution.lat, resolution.lng].every(Number.isFinite)) {
    return { pass: false, reason: 'gps_unavailable' as const, distance: Number.NaN };
  }
  const distance = haversineDistanceMetres(original, resolution);
  if (distance > GPS_FRAUD_THRESHOLD_METRES) {
    return { pass: false, reason: 'gps_mismatch' as const, distance };
  }
  return { pass: true, reason: 'gps_match' as const, distance };
}

export async function run(input: Agent4Input, store: Agent4Store): Promise<Agent4Output> {
  const gps = checkGPSFraud(
    { lat: input.originalGpsLat, lng: input.originalGpsLng },
    { lat: input.resolutionGpsLat, lng: input.resolutionGpsLng },
  );

  if (!gps.pass) {
    const output: Agent4Output = {
      verificationStatus: 'gps_fraud',
      gpsDistance: gps.distance,
      citizenConfirmRequired: false,
      flaggedForSupervisor: true,
    };
    await persistFraud(input, store, output);
    return output;
  }

  try {
    const visual = await verifyResolutionWithGemini(input);
    const output: Agent4Output = {
      verificationStatus:
        (visual.visualSimilarity ?? 0) < VISUAL_SIMILARITY_THRESHOLD
          ? 'visual_fraud'
          : visual.verificationStatus,
      gpsDistance: gps.distance,
      visualSimilarity: visual.visualSimilarity,
      citizenConfirmRequired: visual.citizenConfirmRequired,
      flaggedForSupervisor: visual.flaggedForSupervisor,
    };

    if (output.verificationStatus === 'visual_fraud') {
      await persistFraud(input, store, output);
      return output;
    }

    await store.appendResolutionAttempt(input.issueId, resolutionAttempt(input, output));
    await store.updateIssue(input.issueId, {
      status: 'pending_citizen_confirmation',
      citizenConfirmationSentAt: new Date(),
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

async function persistFraud(input: Agent4Input, store: Agent4Store, output: Agent4Output) {
  await store.appendResolutionAttempt(input.issueId, resolutionAttempt(input, output));
  await store.updateIssue(input.issueId, {
    status: 'assigned',
    fraudFlaggedAt: new Date(),
    updatedAt: new Date(),
  });
  await store.incrementSuspiciousResolutionCount(input.officialId);
}

function resolutionAttempt(input: Agent4Input, output: Agent4Output): Record<string, unknown> {
  return {
    attemptId: crypto.randomUUID?.() || `${Date.now()}`,
    officialId: input.officialId,
    resolutionPhotoUrl: input.resolutionPhotoUrl,
    resolutionGpsLat: input.resolutionGpsLat,
    resolutionGpsLng: input.resolutionGpsLng,
    submittedAt: new Date(),
    agent4Result: output.verificationStatus === 'awaiting_citizen' ? 'pass' : output.verificationStatus,
    gpsDistance: output.gpsDistance,
    visualSimilarity: output.visualSimilarity,
  };
}
