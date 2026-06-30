"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onIssueCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin_1 = require("../admin");
const agentStores_1 = require("../agentStores");
const agent1_classify_1 = require("../../../src/lib/agents/agent1-classify");
const agent2_dedupe_1 = require("../../../src/lib/agents/agent2-dedupe");
const agent3_route_1 = require("../../../src/lib/agents/agent3-route");
exports.onIssueCreate = (0, firestore_1.onDocumentCreated)('issues/{issueId}', async (event) => {
    const issueId = event.params.issueId;
    const issueData = event.data?.data();
    if (!issueData || issueData.status !== 'pending_classification')
        return;
    try {
        const agent1Input = {
            issueId,
            photoUrl: firstString(issueData.photoUrls) || stringField(issueData.photoUrl),
            textDescription: stringField(issueData.textDescription),
            gpsLat: numberField(issueData.gpsLat),
            gpsLng: numberField(issueData.gpsLng),
            gpsAccuracy: numberField(issueData.gpsAccuracy),
        };
        const agent1Result = await (0, agent1_classify_1.run)(agent1Input, agentStores_1.agent1Store);
        if (!agent1Result.isValidIssue)
            return;
        const agent2Result = await (0, agent2_dedupe_1.run)({
            issueId,
            gpsLat: agent1Input.gpsLat,
            gpsLng: agent1Input.gpsLng,
            category: agent1Result.category,
            severity: agent1Result.severity,
            hasPhoto: Boolean(agent1Input.photoUrl),
        }, agentStores_1.agent2Store);
        if (!agent2Result.isNewIssue)
            return;
        await (0, agent3_route_1.run)({
            issueId,
            category: agent1Result.category,
            severity: agent1Result.severity,
            gpsLat: agent1Input.gpsLat,
            gpsLng: agent1Input.gpsLng,
            autoEscalate: agent2Result.autoEscalate,
        }, agentStores_1.agent3Store);
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
