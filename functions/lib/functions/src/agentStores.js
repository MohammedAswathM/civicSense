"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agent4Store = exports.agent3Store = exports.agent2Store = exports.agent1Store = void 0;
const admin_1 = require("./admin");
const OPEN_STATUSES = ['assigned', 'in_progress', 'pending_routing', 'pending_deduplication'];
exports.agent1Store = {
    async readPhotoBase64(photoUrl) {
        if (!photoUrl.startsWith('gs://')) {
            return { data: Buffer.from(photoUrl).toString('base64'), mimeType: 'image/jpeg' };
        }
        const [, bucketAndPath] = photoUrl.split('gs://');
        const [bucket, ...fileParts] = bucketAndPath.split('/');
        const [buffer] = await admin_1.storage.bucket(bucket).file(fileParts.join('/')).download();
        return { data: buffer.toString('base64'), mimeType: 'image/jpeg' };
    },
    async updateIssue(issueId, patch) {
        await admin_1.firestore.doc(`issues/${issueId}`).update(patch);
    },
};
exports.agent2Store = {
    async findOpenIssuesByCategory(category) {
        const snapshot = await admin_1.firestore
            .collection('issues')
            .where('category', '==', category)
            .where('status', 'in', OPEN_STATUSES)
            .limit(100)
            .get();
        return snapshot.docs.map((doc) => {
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
        const existing = await admin_1.firestore.collection('issues').where('publicTrackingId', '==', publicTrackingId).limit(1).get();
        return !existing.empty;
    },
    async updateIssue(issueId, patch) {
        await admin_1.firestore.doc(`issues/${issueId}`).update(patch);
    },
};
exports.agent3Store = {
    async findOfficial(ward, department, supervisor) {
        let query = admin_1.firestore.collection('officials').where('ward', '==', ward).where('isActive', '==', true);
        query = supervisor ? query.where('role', 'in', ['supervisor', 'admin']) : query.where('department', '==', department);
        const snapshot = await query.limit(1).get();
        return snapshot.empty ? null : snapshot.docs[0].id;
    },
    async findOpenIssuesNear() {
        const snapshot = await admin_1.firestore.collection('issues').where('status', 'in', OPEN_STATUSES).limit(100).get();
        return snapshot.docs.map((doc) => {
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
        await admin_1.firestore.doc(`issues/${issueId}`).update(patch);
    },
};
exports.agent4Store = {
    async updateIssue(issueId, patch) {
        await admin_1.firestore.doc(`issues/${issueId}`).update(patch);
    },
    async appendResolutionAttempt(issueId, attempt) {
        await admin_1.firestore.doc(`issues/${issueId}`).update({
            resolutionAttempts: admin_1.FieldValue.arrayUnion(attempt),
        });
    },
    async incrementSuspiciousResolutionCount(officialId) {
        await admin_1.firestore.doc(`officials/${officialId}`).set({ suspiciousResolutionCount: admin_1.FieldValue.increment(1) }, { merge: true });
    },
};
function numberField(value) {
    return typeof value === 'number' ? value : 0;
}
function stringField(value) {
    return typeof value === 'string' ? value : '';
}
function timestampMs(value) {
    if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
        return value.toMillis();
    }
    return Date.now();
}
