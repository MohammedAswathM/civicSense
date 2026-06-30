import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { firestore } from '../admin';
import { agent4Store } from '../agentStores';
import { run as runAgent4 } from '../../../src/lib/agents/agent4-fraud';

export const onResolutionUpload = onDocumentUpdated('issues/{issueId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const issueId = event.params.issueId;
  if (!after || after.status !== 'pending_verification' || before?.status === 'pending_verification') return;

  try {
    await runAgent4(
      {
        issueId,
        originalPhotoUrl: firstString(after.photoUrls),
        originalGpsLat: numberField(after.gpsLat),
        originalGpsLng: numberField(after.gpsLng),
        resolutionPhotoUrl: stringField(after.resolutionPhotoUrl),
        resolutionGpsLat: numberField(after.resolutionGpsLat),
        resolutionGpsLng: numberField(after.resolutionGpsLng),
        officialId: stringField(after.assignedOfficialId),
      },
      agent4Store,
    );
  } catch (error) {
    await firestore.doc(`issues/${issueId}`).update({
      status: 'error_processing',
      errorMessage: error instanceof Error ? error.message : String(error),
      updatedAt: new Date(),
    });
  }
});

function numberField(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function firstString(value: unknown): string {
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : '';
}
