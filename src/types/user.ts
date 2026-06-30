import type { Timestamp } from 'firebase/firestore';

export type OfficialRole = 'officer' | 'supervisor' | 'admin';
export type Department =
  | 'roads'
  | 'drainage'
  | 'electricity'
  | 'sanitation'
  | 'water_supply'
  | 'parks'
  | 'municipal';

export interface Official {
  id: string;
  phone: string;
  name: string;
  role: OfficialRole;
  ward: string;
  department: Department;
  isActive: boolean;
  totalAssigned: number;
  totalResolvedInSLA: number;
  totalResolvedOutOfSLA: number;
  suspiciousResolutionCount: number;
  averageResolutionTimeHours: number;
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
}

export interface Ward {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  boundaryGeohashes: string[];
  officials: Record<Department, string>;
  supervisorId: string;
}

export interface WardPrediction {
  wardId: string;
  forecastPeriod: '30_days';
  generatedAt: Timestamp;
  hotspots: Array<{
    lat: number;
    lng: number;
    predictedIssueCount: number;
    dominantCategory: string;
    confidence: 'low' | 'medium' | 'high';
  }>;
}
