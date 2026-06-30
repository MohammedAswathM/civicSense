import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, firestore } from '../admin';
import { AUTO_ESCALATION_THRESHOLD_HOURS, DISTRICT_ESCALATION_THRESHOLD_HOURS } from '../../../src/lib/utils/constants';

export const onSLAExpiry = onSchedule('every 60 minutes', async () => {
  const snapshot = await firestore
    .collection('issues')
    .where('status', 'in', ['assigned', 'in_progress'])
    .where('slaDeadline', '<', new Date())
    .limit(100)
    .get();

  const now = Date.now();
  await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const deadlineMs = timestampMs(data.slaDeadline);
      const overdueHours = (now - deadlineMs) / (1000 * 60 * 60);
      const patch =
        overdueHours >= DISTRICT_ESCALATION_THRESHOLD_HOURS
          ? { criticalEscalation: true, escalatedToRole: 'district_admin' }
          : overdueHours >= AUTO_ESCALATION_THRESHOLD_HOURS
            ? { escalatedToRole: 'supervisor' }
            : { reminderSentAt: new Date() };
      await doc.ref.update({
        ...patch,
        statusHistory: FieldValue.arrayUnion({
          status: data.status || 'assigned',
          timestamp: new Date(),
          changedBy: 'system',
          note: `Auto-escalation check: ${Math.round(overdueHours)}h overdue.`,
        }),
        updatedAt: new Date(),
      });
    }),
  );
});

function timestampMs(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return Date.now();
}
