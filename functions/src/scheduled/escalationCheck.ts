import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, firestore } from '../admin';
import { AUTO_ESCALATION_THRESHOLD_HOURS, DISTRICT_ESCALATION_THRESHOLD_HOURS } from '../../../src/lib/utils/constants';

export const escalationCheck = onSchedule('every 60 minutes', async () => {
  const snapshot = await firestore
    .collection('issues')
    .where('status', 'in', ['assigned', 'in_progress'])
    .where('slaDeadline', '<', new Date())
    .limit(100)
    .get();

  const now = Date.now();
  await Promise.all(
    snapshot.docs.map(async (issueDoc) => {
      const data = issueDoc.data();
      const deadlineMs = timestampMs(data.slaDeadline);
      const overdueHours = (now - deadlineMs) / (1000 * 60 * 60);

      if (overdueHours >= DISTRICT_ESCALATION_THRESHOLD_HOURS) {
        // Find district admin for this ward
        const ward = typeof data.ward === 'string' ? data.ward : '';
        const adminSnap = await firestore
          .collection('officials')
          .where('ward', '==', ward)
          .where('role', '==', 'admin')
          .where('isActive', '==', true)
          .limit(1)
          .get();

        const adminId = adminSnap.empty ? null : adminSnap.docs[0].id;
        const patch: Record<string, unknown> = {
          criticalEscalation: true,
          escalatedToRole: 'district_admin',
          updatedAt: new Date(),
          statusHistory: FieldValue.arrayUnion({
            status: data.status || 'assigned',
            timestamp: new Date(),
            changedBy: 'system',
            note: adminId
              ? `Critical: escalated to district admin after ${Math.round(overdueHours)}h overdue.`
              : `Critical: ${Math.round(overdueHours)}h overdue — no district admin found for ward "${ward}".`,
          }),
        };
        if (adminId) {
          patch.assignedOfficialId = adminId;
          // Write notification to admin
          await firestore.collection(`notifications/${adminId}/items`).add({
            type: 'escalation',
            issueId: issueDoc.id,
            publicTrackingId: data.publicTrackingId || issueDoc.id,
            message: `Issue ${data.publicTrackingId || issueDoc.id} escalated to district level after ${Math.round(overdueHours)}h overdue.`,
            createdAt: new Date(),
            read: false,
          });
        }
        await issueDoc.ref.update(patch);

      } else if (overdueHours >= AUTO_ESCALATION_THRESHOLD_HOURS) {
        // Find supervisor for this ward
        const ward = typeof data.ward === 'string' ? data.ward : '';
        const supervisorSnap = await firestore
          .collection('officials')
          .where('ward', '==', ward)
          .where('role', 'in', ['supervisor', 'admin'])
          .where('isActive', '==', true)
          .limit(1)
          .get();

        const supervisorId = supervisorSnap.empty ? null : supervisorSnap.docs[0].id;
        const patch: Record<string, unknown> = {
          escalatedToRole: 'supervisor',
          updatedAt: new Date(),
          statusHistory: FieldValue.arrayUnion({
            status: data.status || 'assigned',
            timestamp: new Date(),
            changedBy: 'system',
            note: supervisorId
              ? `Auto-reassigned to supervisor after ${Math.round(overdueHours)}h overdue.`
              : `${Math.round(overdueHours)}h overdue — no supervisor found for ward "${ward}"; assignedOfficialId unchanged.`,
          }),
        };
        if (supervisorId) {
          patch.assignedOfficialId = supervisorId;
          // Write notification to supervisor
          await firestore.collection(`notifications/${supervisorId}/items`).add({
            type: 'escalation',
            issueId: issueDoc.id,
            publicTrackingId: data.publicTrackingId || issueDoc.id,
            message: `Issue ${data.publicTrackingId || issueDoc.id} auto-assigned to you — ${Math.round(overdueHours)}h overdue.`,
            createdAt: new Date(),
            read: false,
          });
        }
        await issueDoc.ref.update(patch);

      } else {
        await issueDoc.ref.update({
          reminderSentAt: new Date(),
          updatedAt: new Date(),
          statusHistory: FieldValue.arrayUnion({
            status: data.status || 'assigned',
            timestamp: new Date(),
            changedBy: 'system',
            note: `Reminder: ${Math.round(overdueHours)}h overdue.`,
          }),
        });
      }
    }),
  );
});

function timestampMs(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return (value as { toMillis(): number }).toMillis();
  }
  return Date.now();
}
