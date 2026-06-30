import type { Timestamp, GeoPoint } from 'firebase/firestore';

export type IssueCategory =
  | 'pothole'
  | 'waterlogging'
  | 'broken_light'
  | 'garbage'
  | 'damaged_pipe'
  | 'fallen_tree'
  | 'sewage'
  | 'vandalism'
  | 'other';

export type IssueStatus =
  | 'pending_classification'
  | 'pending_deduplication'
  | 'pending_routing'
  | 'unassigned_no_official'
  | 'assigned'
  | 'in_progress'
  | 'pending_verification'
  | 'pending_citizen_confirmation'
  | 'disputed'
  | 'escalated'
  | 'resolved'
  | 'rejected'
  | 'error_processing'
  | 'merged'
  | 'upload_pending';

export interface StatusHistoryEntry {
  status: string;
  timestamp: Timestamp;
  changedBy: string;
  note?: string;
}

export interface ResolutionAttempt {
  attemptId: string;
  officialId: string;
  resolutionPhotoUrl: string;
  resolutionGpsLat: number;
  resolutionGpsLng: number;
  submittedAt: Timestamp;
  agent4Result: 'pass' | 'gps_fraud' | 'visual_fraud' | 'awaiting_citizen';
  gpsDistance?: number;
  visualSimilarity?: number;
  citizenResponse?: 'confirmed' | 'disputed' | 'timeout';
  citizenRespondedAt?: Timestamp;
}

export interface Issue {
  id: string;
  publicId?: string;
  publicTrackingId: string;
  citizenAnonymousId: string;
  gpsLat: number;
  gpsLng: number;
  lat?: number;
  lng?: number;
  gpsAccuracy: number;
  geohash: string;
  geopoint: GeoPoint;
  ward: string;
  address: string;
  category: IssueCategory;
  citizenCategory?: IssueCategory | null;
  severity: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  geminiDescription: string;
  isValidIssue: boolean;
  photoUrl?: string;
  photoUrls: string[];
  textDescription: string;
  description?: string;
  canonicalThreadId: string;
  corroborationCount: number;
  credibilityWeight: number;
  corroborations: string[];
  assignedOfficialId: string;
  department: string;
  slaDeadline: Timestamp;
  convergenceAlert: boolean;
  nearbyIssueIds: string[];
  status: IssueStatus;
  statusHistory: StatusHistoryEntry[];
  resolutionAttempts: ResolutionAttempt[];
  resolutionPhotoUrl?: string;
  resolutionGpsLat?: number;
  resolutionGpsLng?: number;
  resolutionNote?: string;
  rejectionReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
  citizenRespondedAt?: Timestamp;
  upvoteCount: number;
  upvotedByIds: string[];
}

export type PublicIssue = Omit<Issue, 'citizenAnonymousId'>;
