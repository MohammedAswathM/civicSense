import type { Agent1Output, Agent4Output } from '@/types/agent';
import { haversineDistanceMetres } from '@/lib/geo/haversine';
import { GPS_FRAUD_THRESHOLD_METRES } from '@/lib/utils/constants';

const agent1Responses: Agent1Output[] = [
  {
    category: 'pothole',
    severity: 4,
    confidence: 0.91,
    geminiDescription: 'A deep pothole is visible on a paved road near the shoulder.',
    isValidIssue: true,
  },
  {
    category: 'waterlogging',
    severity: 5,
    confidence: 0.88,
    geminiDescription: 'Standing flood water is blocking vehicle movement on the street.',
    isValidIssue: true,
  },
  {
    category: 'garbage',
    severity: 3,
    confidence: 0.86,
    geminiDescription: 'Uncollected waste is piled near a public walkway.',
    isValidIssue: true,
  },
  {
    category: 'broken_light',
    severity: 2,
    confidence: 0.82,
    geminiDescription: 'A streetlight fixture appears damaged or non-functional.',
    isValidIssue: true,
  },
  {
    category: 'other',
    severity: 1,
    confidence: 0.77,
    geminiDescription: 'The image does not show a clear civic infrastructure issue.',
    isValidIssue: false,
    rejectionReason: 'The submitted image does not appear to show a public civic issue.',
  },
];

export function deterministicIndex(input: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}

export function mockAgent1Response(seed: string): Agent1Output {
  return agent1Responses[deterministicIndex(seed, agent1Responses.length)];
}

export function mockAgent4Response(input: {
  originalGpsLat: number;
  originalGpsLng: number;
  resolutionGpsLat: number;
  resolutionGpsLng: number;
  resolutionPhotoUrl: string;
}): Agent4Output {
  const gpsDistance = haversineDistanceMetres(
    { lat: input.originalGpsLat, lng: input.originalGpsLng },
    { lat: input.resolutionGpsLat, lng: input.resolutionGpsLng },
  );
  if (!Number.isFinite(gpsDistance) || gpsDistance > GPS_FRAUD_THRESHOLD_METRES) {
    return {
      verificationStatus: 'gps_fraud',
      gpsDistance,
      citizenConfirmRequired: false,
      flaggedForSupervisor: true,
    };
  }

  if (input.resolutionPhotoUrl.toLowerCase().includes('wrong')) {
    return {
      verificationStatus: 'visual_fraud',
      gpsDistance,
      visualSimilarity: 0.14,
      citizenConfirmRequired: false,
      flaggedForSupervisor: true,
    };
  }

  return {
    verificationStatus: 'awaiting_citizen',
    gpsDistance,
    visualSimilarity: 0.71,
    citizenConfirmRequired: true,
    flaggedForSupervisor: false,
  };
}
