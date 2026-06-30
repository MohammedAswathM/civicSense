import type { Department } from '@/types/user';
import type { IssueCategory } from '@/types/issue';

export const DEDUP_RADIUS_METRES = 75;
export const CONVERGENCE_RADIUS_METRES = 100;
export const GPS_FRAUD_THRESHOLD_METRES = 100;
export const VISUAL_SIMILARITY_THRESHOLD = 0.35;
export const CITIZEN_CONFIRMATION_TIMEOUT_HOURS = 48;
export const AUTO_ESCALATION_THRESHOLD_HOURS = 24;
export const DISTRICT_ESCALATION_THRESHOLD_HOURS = 72;
export const SUSPICIOUS_RESOLUTION_ALERT_COUNT = 3;
export const MAX_REPORTS_PER_USER_PER_DAY = 20;
export const MAX_REPORTS_PER_USER_PER_HOUR_PER_AREA = 5;
export const MAX_PHOTO_SIZE_KB = 500;
export const GPS_ACCURACY_REJECT_METRES = 500;
export const GPS_ACCURACY_WARN_METRES = 100;

export const CREDIBILITY_WEIGHT = {
  BASE_REPORT: 1.0,
  CORROBORATION: 0.5,
  PHOTO_EVIDENCE: 1.0,
  OFFICIAL_CONFIRMATION: 2.0,
  AUTO_ESCALATE_THRESHOLD: 5.0,
} as const;

export const ISSUE_CATEGORIES: IssueCategory[] = [
  'pothole',
  'waterlogging',
  'broken_light',
  'garbage',
  'damaged_pipe',
  'fallen_tree',
  'sewage',
  'vandalism',
  'other',
];

export const CATEGORY_TO_DEPARTMENT: Record<IssueCategory, Department> = {
  pothole: 'roads',
  waterlogging: 'drainage',
  broken_light: 'electricity',
  garbage: 'sanitation',
  damaged_pipe: 'water_supply',
  fallen_tree: 'parks',
  sewage: 'drainage',
  vandalism: 'municipal',
  other: 'municipal',
};

export const SLA_HOURS: Record<IssueCategory, Record<1 | 2 | 3 | 4 | 5, number>> = {
  pothole: { 1: 168, 2: 120, 3: 72, 4: 48, 5: 24 },
  waterlogging: { 1: 48, 2: 24, 3: 12, 4: 6, 5: 3 },
  broken_light: { 1: 120, 2: 96, 3: 72, 4: 48, 5: 24 },
  garbage: { 1: 72, 2: 48, 3: 24, 4: 12, 5: 6 },
  damaged_pipe: { 1: 96, 2: 72, 3: 48, 4: 24, 5: 12 },
  fallen_tree: { 1: 72, 2: 48, 3: 24, 4: 12, 5: 6 },
  sewage: { 1: 72, 2: 48, 3: 24, 4: 12, 5: 6 },
  vandalism: { 1: 168, 2: 120, 3: 72, 4: 48, 5: 24 },
  other: { 1: 168, 2: 120, 3: 72, 4: 48, 5: 24 },
};
