"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
exports.demoPredictions = demoPredictions;
function run(history) {
    const grouped = new Map();
    for (const issue of history) {
        grouped.set(issue.ward, [...(grouped.get(issue.ward) || []), issue]);
    }
    if (grouped.size === 0)
        return demoPredictions();
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
function demoPredictions() {
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
function average(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function mostCommon(values) {
    const counts = new Map();
    for (const value of values)
        counts.set(value, (counts.get(value) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
