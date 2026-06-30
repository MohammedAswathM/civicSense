import { describe, expect, it } from 'vitest';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, GeoPoint } from 'firebase-admin/firestore';

// Ensure emulator is targeted
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.GCLOUD_PROJECT = 'demo-no-project';
process.env.NEXT_PUBLIC_DEMO_MODE = 'true';

if (!getApps().length) {
  initializeApp({ projectId: 'demo-no-project' });
}
const db = getFirestore();

describe('True E2E Agent Pipeline Trigger', () => {
  it('processes an issue from pending_classification to assigned via the Cloud Function emulator', async () => {
    // 1. Create a raw issue representing what the frontend submits
    const publicTrackingId = `CS-TEST-${Date.now()}`;
    const issueRef = db.doc(`issues/${publicTrackingId}`);
    const ownerRef = db.doc(`issue_owners/${publicTrackingId}`);

    const batch = db.batch();
    batch.set(ownerRef, { citizenAnonymousId: 'test-citizen-uid' });
    batch.set(issueRef, {
      publicId: publicTrackingId,
      publicTrackingId,
      status: 'pending_classification',
      photoUrls: ['/demo-pothole.jpg'],
      gpsLat: 11.0168, // RS Puram coordinates
      gpsLng: 76.9558,
      gpsAccuracy: 10,
      geohash: 'tdr1vjk8', 
      geopoint: new GeoPoint(11.0168, 76.9558),
      createdAt: new Date(),
      updatedAt: new Date(),
      statusHistory: [
        {
          status: 'pending_classification',
          timestamp: new Date(),
          changedBy: 'system'
        }
      ]
    });

    await batch.commit();

    // 2. Poll until the Cloud Function onIssueCreate processes it (max 15 seconds)
    let finalStatus = 'pending_classification';
    let assignedOfficialId = null;
    let category = null;
    let attempts = 0;
    
    while (attempts < 15) {
      await new Promise(r => setTimeout(r, 1000));
      const snap = await issueRef.get();
      const data = snap.data();
      if (data && data.status !== 'pending_classification') {
        finalStatus = data.status;
        assignedOfficialId = data.assignedOfficialId;
        category = data.category;
        break;
      }
      attempts++;
    }

    // 3. Assert the Agent 1 -> Agent 2 -> Agent 3 pipeline did its job
    // It should have assigned a category, and eventually hit 'assigned' or 'unassigned_no_official'
    expect(category).toBeTruthy();
    expect(['assigned', 'unassigned_no_official']).toContain(finalStatus);
    
    if (finalStatus === 'assigned') {
      expect(assignedOfficialId).toBeTruthy();
    }
  }, 20000); // 20s timeout
});
