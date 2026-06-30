import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, firestore } from '../admin';
import { CITIZEN_CONFIRMATION_TIMEOUT_HOURS } from '../../../src/lib/utils/constants';

export const citizenConfirmationTimeout = onSchedule('every 360 minutes', async () => {
  const cutoff = new Date(Date.now() - CITIZEN_CONFIRMATION_TIMEOUT_HOURS * 60 * 60 * 1000);
  const snapshot = await firestore
    .collection('issues')
    .where('status', '==', 'pending_citizen_confirmation')
    .where('citizenConfirmationSentAt', '<', cutoff)
    .limit(100)
    .get();

  await Promise.all(
    snapshot.docs.map((issueDoc) =>
      issueDoc.ref.update({
        status: 'resolved',
        resolvedAt: new Date(),
        updatedAt: new Date(),
        statusHistory: FieldValue.arrayUnion({
          status: 'resolved',
          timestamp: new Date(),
          changedBy: 'system',
          note: `Resolved by default — no citizen response within ${CITIZEN_CONFIRMATION_TIMEOUT_HOURS}h.`,
        }),
      }),
    ),
  );
});
