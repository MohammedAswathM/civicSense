import type { Timestamp } from 'firebase/firestore';
import type { Department } from './user';
import type { IssueCategory } from './issue';

export interface Agent1Input {
  issueId: string;
  photoUrl: string;
  textDescription: string;
  gpsLat: number;
  gpsLng: number;
  gpsAccuracy: number;
}

export interface Agent1Output {
  category: IssueCategory;
  severity: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  geminiDescription: string;
  isValidIssue: boolean;
  rejectionReason?: string;
}

export interface Agent2Input {
  issueId: string;
  gpsLat: number;
  gpsLng: number;
  category: IssueCategory;
  severity: number;
  hasPhoto?: boolean;
}

export interface Agent2Output {
  isNewIssue: boolean;
  canonicalThreadId: string;
  publicTrackingId: string;
  corroborationCount: number;
  credibilityWeight: number;
  autoEscalate: boolean;
}

export interface Agent3Input {
  issueId: string;
  category: IssueCategory;
  severity: 1 | 2 | 3 | 4 | 5;
  gpsLat: number;
  gpsLng: number;
  autoEscalate: boolean;
}

export interface Agent3Output {
  assignedOfficialId: string;
  department: Department;
  ward: string;
  slaDeadline: Timestamp;
  convergenceAlert: boolean;
  nearbyIssueIds: string[];
}

export interface Agent4Input {
  issueId: string;
  originalPhotoUrl: string;
  originalGpsLat: number;
  originalGpsLng: number;
  resolutionPhotoUrl: string;
  resolutionGpsLat: number;
  resolutionGpsLng: number;
  officialId: string;
}

export interface Agent4Output {
  verificationStatus: 'pass' | 'gps_fraud' | 'visual_fraud' | 'awaiting_citizen';
  gpsDistance?: number;
  visualSimilarity?: number;
  citizenConfirmRequired: boolean;
  flaggedForSupervisor: boolean;
}
