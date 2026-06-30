"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicIssueFromIssue = publicIssueFromIssue;
exports.createIssueDraft = createIssueDraft;
exports.listenToPublicIssues = listenToPublicIssues;
exports.findIssueByPublicId = findIssueByPublicId;
exports.updateIssueStatus = updateIssueStatus;
const firestore_1 = require("firebase/firestore");
const geofire_common_1 = require("geofire-common");
const config_1 = require("./config");
function publicIssueFromIssue(issue) {
    const { citizenAnonymousId: _citizenAnonymousId, ...publicIssue } = issue;
    return publicIssue;
}
async function createIssueDraft(input) {
    return (0, firestore_1.addDoc)((0, firestore_1.collection)(config_1.db, 'issues'), {
        ...input,
        publicTrackingId: '',
        geohash: (0, geofire_common_1.geohashForLocation)([input.gpsLat, input.gpsLng]),
        geopoint: { latitude: input.gpsLat, longitude: input.gpsLng },
        ward: '',
        address: '',
        category: 'other',
        severity: 3,
        confidence: 0,
        geminiDescription: '',
        isValidIssue: true,
        canonicalThreadId: '',
        corroborationCount: 0,
        credibilityWeight: 1,
        corroborations: [],
        assignedOfficialId: '',
        department: '',
        slaDeadline: (0, firestore_1.serverTimestamp)(),
        convergenceAlert: false,
        nearbyIssueIds: [],
        status: 'pending_classification',
        statusHistory: [{ status: 'pending_classification', timestamp: new Date().toISOString(), changedBy: 'system' }],
        resolutionAttempts: [],
        createdAt: (0, firestore_1.serverTimestamp)(),
        updatedAt: (0, firestore_1.serverTimestamp)(),
        upvoteCount: 0,
        upvotedByIds: [],
    });
}
function listenToPublicIssues(callback) {
    const constraints = [
        (0, firestore_1.where)('status', 'in', ['assigned', 'in_progress', 'pending_citizen_confirmation', 'resolved', 'disputed']),
        (0, firestore_1.limit)(100),
    ];
    return (0, firestore_1.onSnapshot)((0, firestore_1.query)((0, firestore_1.collection)(config_1.db, 'issues'), ...constraints), (snapshot) => {
        callback(snapshot.docs.map((item) => publicIssueFromIssue({ id: item.id, ...item.data() })));
    });
}
async function findIssueByPublicId(publicTrackingId) {
    const result = await (0, firestore_1.getDocs)((0, firestore_1.query)((0, firestore_1.collection)(config_1.db, 'issues'), (0, firestore_1.where)('publicTrackingId', '==', publicTrackingId), (0, firestore_1.limit)(1)));
    if (result.empty)
        return null;
    const first = result.docs[0];
    return publicIssueFromIssue({ id: first.id, ...first.data() });
}
async function updateIssueStatus(issueId, status) {
    await (0, firestore_1.updateDoc)((0, firestore_1.doc)(config_1.db, 'issues', issueId), { status, updatedAt: (0, firestore_1.serverTimestamp)() });
}
