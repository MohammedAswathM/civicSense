import type { IssueCategory } from '@/types/issue';

export interface HistoricalIssue {
  ward: string;
  category: IssueCategory;
  resolvedAt: Date;
  gpsLat: number;
  gpsLng: number;
}

export interface PredictionHotspot {
  lat: number;
  lng: number;
  predictedIssueCount: number;
  dominantCategory: IssueCategory;
  confidence: 'low' | 'medium' | 'high';
}

export interface Agent5Output {
  wardId: string;
  forecastPeriod: '30_days';
  generatedAt: Date;
  hotspots: PredictionHotspot[];
}

export function run(history: HistoricalIssue[]): Agent5Output[] {
  const grouped = new Map<string, HistoricalIssue[]>();
  for (const issue of history) {
    grouped.set(issue.ward, [...(grouped.get(issue.ward) || []), issue]);
  }

  if (grouped.size === 0) return demoPredictions();

  return Array.from(grouped.entries()).map(([wardId, issues]) => {
    const dominantCategory = mostCommon(issues.map((issue) => issue.category));
    return {
      wardId,
      forecastPeriod: '30_days',
      generatedAt: new Date(),
      hotspots: [
        {
          lat: average(issues.map((issue) => issue.gpsLat)),
          lng: average(issues.map((issue) => issue.gpsLng)),
          predictedIssueCount: Math.max(1, Math.round(issues.length / 3)),
          dominantCategory,
          confidence: issues.length >= 10 ? 'high' : issues.length >= 4 ? 'medium' : 'low',
        },
      ],
    };
  });
}

export function demoPredictions(): Agent5Output[] {
  return [
    {
      wardId: 'ward_04',
      forecastPeriod: '30_days',
      generatedAt: new Date(),
      hotspots: [
        {
          lat: 11.001,
          lng: 76.951,
          predictedIssueCount: 14,
          dominantCategory: 'waterlogging',
          confidence: 'high',
        },
      ],
    },
  ];
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function mostCommon<T extends string>(values: T[]): T {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
