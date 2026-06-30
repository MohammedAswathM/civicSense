"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onSLAExpiry = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin_1 = require("../admin");
const constants_1 = require("../../../src/lib/utils/constants");
exports.onSLAExpiry = (0, scheduler_1.onSchedule)('every 60 minutes', async () => {
    const snapshot = await admin_1.firestore
        .collection('issues')
        .where('status', 'in', ['assigned', 'in_progress'])
        .where('slaDeadline', '<', new Date())
        .limit(100)
        .get();
    const now = Date.now();
    await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const deadlineMs = timestampMs(data.slaDeadline);
        const overdueHours = (now - deadlineMs) / (1000 * 60 * 60);
        const patch = overdueHours >= constants_1.DISTRICT_ESCALATION_THRESHOLD_HOURS
            ? { criticalEscalation: true, escalatedToRole: 'district_admin' }
            : overdueHours >= constants_1.AUTO_ESCALATION_THRESHOLD_HOURS
                ? { escalatedToRole: 'supervisor' }
                : { reminderSentAt: new Date() };
        await doc.ref.update({
            ...patch,
            statusHistory: admin_1.FieldValue.arrayUnion({
                status: data.status || 'assigned',
                timestamp: new Date(),
                changedBy: 'system',
                note: `Auto-escalation check: ${Math.round(overdueHours)}h overdue.`,
            }),
            updatedAt: new Date(),
        });
    }));
});
function timestampMs(value) {
    if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
        return value.toMillis();
    }
    return Date.now();
}
