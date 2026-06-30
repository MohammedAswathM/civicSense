import { FieldValue, firestore, storage } from './admin';
import type { Agent1Store } from '../../src/lib/agents/agent1-classify';
import type { Agent2Store, DedupeCandidate } from '../../src/lib/agents/agent2-dedupe';
import type { Agent3Store, RoutingCandidate } from '../../src/lib/agents/agent3-route';
import type { Agent4Store } from '../../src/lib/agents/agent4-fraud';
import type { Department } from '../../src/types/user';

const OPEN_STATUSES = ['assigned', 'in_progress', 'pending_routing', 'pending_deduplication'];

export const agent1Store: Agent1Store = {
  async readPhotoBase64(photoUrl) {
    if (!photoUrl.startsWith('gs://')) {
      return { data: Buffer.from(photoUrl).toString('base64'), mimeType: 'image/jpeg' };
    }
    const [, bucketAndPath] = photoUrl.split('gs://');
    const [bucket, ...fileParts] = bucketAndPath.split('/');
    const [buffer] = await storage.bucket(bucket).file(fileParts.join('/')).download();
    return { data: buffer.toString('base64'), mimeType: 'image/jpeg' };
  },
  async updateIssue(issueId, patch) {
    await firestore.doc(`issues/${issueId}`).update(withStatusHistory(patch));
  },
};

export const agent2Store: Agent2Store = {
  async findOpenIssuesByCategory(category) {
    const snapshot = await firestore
      .collection('issues')
      .where('category', '==', category)
      .where('status', 'in', OPEN_STATUSES)
      .limit(100)
      .get();
    return snapshot.docs.map((doc): DedupeCandidate => {
      const data = doc.data();
      return {
        issueId: doc.id,
        publicTrackingId: stringField(data.publicTrackingId),
        gpsLat: numberField(data.gpsLat),
        gpsLng: numberField(data.gpsLng),
        category: stringField(data.category),
        status: stringField(data.status),
        createdAtMs: timestampMs(data.createdAt),
        credibilityWeight: numberField(data.credibilityWeight),
        corroborationCount: numberField(data.corroborationCount),
        corroborations: Array.isArray(data.corroborations) ? data.corroborations.map(String) : [],
      };
    });
  },
  async publicIdExists(publicTrackingId) {
    const existing = await firestore.collection('issues').where('publicTrackingId', '==', publicTrackingId).limit(1).get();
    return !existing.empty;
  },
  async updateIssue(issueId, patch) {
    await firestore.doc(`issues/${issueId}`).update(withStatusHistory(patch));
  },
};

export const agent3Store: Agent3Store = {
  async findOfficial(ward: string, department: Department, supervisor: boolean) {
    let query = firestore.collection('officials').where('ward', '==', ward).where('isActive', '==', true);
    query = supervisor ? query.where('role', 'in', ['supervisor', 'admin']) : query.where('department', '==', department);
    const snapshot = await query.limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0].id;
  },
  async findOpenIssuesNear() {
    const snapshot = await firestore.collection('issues').where('status', 'in', OPEN_STATUSES).limit(100).get();
    return snapshot.docs.map((doc): RoutingCandidate => {
      const data = doc.data();
      return {
        issueId: doc.id,
        gpsLat: numberField(data.gpsLat),
        gpsLng: numberField(data.gpsLng),
        status: stringField(data.status),
      };
    });
  },
  async updateIssue(issueId, patch) {
    await firestore.doc(`issues/${issueId}`).update(withStatusHistory(patch));
  },
};

export const agent4Store: Agent4Store = {
  async updateIssue(issueId, patch) {
    await firestore.doc(`issues/${issueId}`).update(withStatusHistory(patch));
  },
  async appendResolutionAttempt(issueId, attempt) {
    await firestore.doc(`issues/${issueId}`).update({
      resolutionAttempts: FieldValue.arrayUnion(attempt),
    });
  },
  async incrementSuspiciousResolutionCount(officialId) {
    await firestore.doc(`officials/${officialId}`).set(
      { suspiciousResolutionCount: FieldValue.increment(1) },
      { merge: true },
    );
  },
};

function numberField(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function timestampMs(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return Date.now();
}

function withStatusHistory(patch: Record<string, unknown>) {
  if (!('status' in patch) || typeof patch.status !== 'string') {
    return patch;
  }
  return {
    ...patch,
    statusHistory: FieldValue.arrayUnion({
      status: patch.status,
      timestamp: new Date(),
      changedBy: 'system',
    }),
  };
}
