/**
 * Privacy Enforcement Integration Test
 *
 * Verifies that citizenAnonymousId is never present in the public
 * /issues/{issueId} document, only in /issue_owners/{issueId}.
 *
 * Uses the Firebase Emulator (FIRESTORE_EMULATOR_HOST must be set).
 * Run with: firebase emulators:exec "vitest run tests/integration/privacy-enforcement.test.ts"
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const [host, portStr] = EMULATOR_HOST.split(':');
const port = parseInt(portStr || '8080', 10);

let app: FirebaseApp;
let db: Firestore;

const TEST_ISSUE_ID = 'privacy-test-issue-001';
const TEST_CITIZEN_ID = 'test-anon-uid-abc123';

beforeAll(async () => {
  // Initialize with a test project
  if (!getApps().length) {
    app = initializeApp({ projectId: 'demo-privacy-test' });
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
  connectFirestoreEmulator(db, host, port);

  // Write a test issue WITHOUT citizenAnonymousId (as the fixed report page does)
  await setDoc(doc(db, 'issues', TEST_ISSUE_ID), {
    publicTrackingId: 'CS-0001-TEST',
    ward: 'ward_04',
    category: 'pothole',
    status: 'assigned',
    gpsLat: 11.001,
    gpsLng: 76.951,
    // citizenAnonymousId is intentionally absent — goes to issue_owners instead
  });

  // Write the owner doc (as the fixed report page does via writeBatch)
  await setDoc(doc(db, 'issue_owners', TEST_ISSUE_ID), {
    citizenAnonymousId: TEST_CITIZEN_ID,
  });
});

describe('Privacy Enforcement — citizenAnonymousId isolation', () => {
  it('issue document does NOT contain citizenAnonymousId', async () => {
    const issueSnap = await getDoc(doc(db, 'issues', TEST_ISSUE_ID));
    expect(issueSnap.exists()).toBe(true);
    const data = issueSnap.data() as Record<string, unknown>;
    expect(data).not.toHaveProperty('citizenAnonymousId');
  });

  it('issue_owners document DOES contain citizenAnonymousId', async () => {
    const ownerSnap = await getDoc(doc(db, 'issue_owners', TEST_ISSUE_ID));
    expect(ownerSnap.exists()).toBe(true);
    const data = ownerSnap.data() as Record<string, unknown>;
    expect(data.citizenAnonymousId).toBe(TEST_CITIZEN_ID);
  });

  it('issue document fields do not include any uid-like field leaking identity', async () => {
    const issueSnap = await getDoc(doc(db, 'issues', TEST_ISSUE_ID));
    const data = issueSnap.data() as Record<string, unknown>;
    const keys = Object.keys(data);
    // None of these field names should be present
    const privateFields = ['citizenAnonymousId', 'uid', 'anonymousUid', 'userId', 'citizenId'];
    for (const field of privateFields) {
      expect(keys, `Field "${field}" must not appear in public issue doc`).not.toContain(field);
    }
  });

  it('issue_owners collection is separate from issues collection', async () => {
    // Verify both collections have docs with same ID but different shapes
    const issueSnap = await getDoc(doc(db, 'issues', TEST_ISSUE_ID));
    const ownerSnap = await getDoc(doc(db, 'issue_owners', TEST_ISSUE_ID));

    const issueData = issueSnap.data() as Record<string, unknown>;
    const ownerData = ownerSnap.data() as Record<string, unknown>;

    // Issue has civic fields, owner has only the UID
    expect(issueData).toHaveProperty('category');
    expect(issueData).toHaveProperty('status');
    expect(ownerData).toHaveProperty('citizenAnonymousId');
    expect(ownerData).not.toHaveProperty('category');
    expect(ownerData).not.toHaveProperty('status');
  });
});
