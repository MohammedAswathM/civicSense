"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onResolutionUpload = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin_1 = require("../admin");
const agentStores_1 = require("../agentStores");
const agent4_fraud_1 = require("../../../src/lib/agents/agent4-fraud");
exports.onResolutionUpload = (0, firestore_1.onDocumentUpdated)('issues/{issueId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const issueId = event.params.issueId;
    if (!after || after.status !== 'pending_verification' || before?.status === 'pending_verification')
        return;
    try {
        await (0, agent4_fraud_1.run)({
            issueId,
            originalPhotoUrl: firstString(after.photoUrls),
            originalGpsLat: numberField(after.gpsLat),
            originalGpsLng: numberField(after.gpsLng),
            resolutionPhotoUrl: stringField(after.resolutionPhotoUrl),
            resolutionGpsLat: numberField(after.resolutionGpsLat),
            resolutionGpsLng: numberField(after.resolutionGpsLng),
            officialId: stringField(after.assignedOfficialId),
        }, agentStores_1.agent4Store);
    }
    catch (error) {
        await admin_1.firestore.doc(`issues/${issueId}`).update({
            status: 'error_processing',
            errorMessage: error instanceof Error ? error.message : String(error),
            updatedAt: new Date(),
        });
    }
});
function numberField(value) {
    return typeof value === 'number' ? value : 0;
}
function stringField(value) {
    return typeof value === 'string' ? value : '';
}
function firstString(value) {
    return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : '';
}
