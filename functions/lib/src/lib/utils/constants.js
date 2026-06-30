"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLA_HOURS = exports.CATEGORY_TO_DEPARTMENT = exports.ISSUE_CATEGORIES = exports.CREDIBILITY_WEIGHT = exports.GPS_ACCURACY_WARN_METRES = exports.GPS_ACCURACY_REJECT_METRES = exports.MAX_PHOTO_SIZE_KB = exports.MAX_REPORTS_PER_USER_PER_HOUR_PER_AREA = exports.MAX_REPORTS_PER_USER_PER_DAY = exports.SUSPICIOUS_RESOLUTION_ALERT_COUNT = exports.DISTRICT_ESCALATION_THRESHOLD_HOURS = exports.AUTO_ESCALATION_THRESHOLD_HOURS = exports.CITIZEN_CONFIRMATION_TIMEOUT_HOURS = exports.VISUAL_SIMILARITY_THRESHOLD = exports.GPS_FRAUD_THRESHOLD_METRES = exports.CONVERGENCE_RADIUS_METRES = exports.DEDUP_RADIUS_METRES = void 0;
exports.DEDUP_RADIUS_METRES = 75;
exports.CONVERGENCE_RADIUS_METRES = 100;
exports.GPS_FRAUD_THRESHOLD_METRES = 100;
exports.VISUAL_SIMILARITY_THRESHOLD = 0.35;
exports.CITIZEN_CONFIRMATION_TIMEOUT_HOURS = 48;
exports.AUTO_ESCALATION_THRESHOLD_HOURS = 24;
exports.DISTRICT_ESCALATION_THRESHOLD_HOURS = 72;
exports.SUSPICIOUS_RESOLUTION_ALERT_COUNT = 3;
exports.MAX_REPORTS_PER_USER_PER_DAY = 20;
exports.MAX_REPORTS_PER_USER_PER_HOUR_PER_AREA = 5;
exports.MAX_PHOTO_SIZE_KB = 500;
exports.GPS_ACCURACY_REJECT_METRES = 500;
exports.GPS_ACCURACY_WARN_METRES = 100;
exports.CREDIBILITY_WEIGHT = {
    BASE_REPORT: 1.0,
    CORROBORATION: 0.5,
    PHOTO_EVIDENCE: 1.0,
    OFFICIAL_CONFIRMATION: 2.0,
    AUTO_ESCALATE_THRESHOLD: 5.0,
};
exports.ISSUE_CATEGORIES = [
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
exports.CATEGORY_TO_DEPARTMENT = {
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
exports.SLA_HOURS = {
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
