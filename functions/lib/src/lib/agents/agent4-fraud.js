"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkGPSFraud = checkGPSFraud;
exports.run = run;
const haversine_1 = require("@/lib/geo/haversine");
const constants_1 = require("@/lib/utils/constants");
const embeddings_1 = require("@/lib/gemini/embeddings");
function checkGPSFraud(original, resolution) {
    if (![original.lat, original.lng, resolution.lat, resolution.lng].every(Number.isFinite)) {
        return { pass: false, reason: 'gps_unavailable', distance: Number.NaN };
    }
    const distance = (0, haversine_1.haversineDistanceMetres)(original, resolution);
    if (distance > constants_1.GPS_FRAUD_THRESHOLD_METRES) {
        return { pass: false, reason: 'gps_mismatch', distance };
    }
    return { pass: true, reason: 'gps_match', distance };
}
async function run(input, store) {
    const gps = checkGPSFraud({ lat: input.originalGpsLat, lng: input.originalGpsLng }, { lat: input.resolutionGpsLat, lng: input.resolutionGpsLng });
    if (!gps.pass) {
        const output = {
            verificationStatus: 'gps_fraud',
            gpsDistance: gps.distance,
            citizenConfirmRequired: false,
            flaggedForSupervisor: true,
        };
        await persistFraud(input, store, output);
        return output;
    }
    try {
        const visual = await (0, embeddings_1.verifyResolutionWithGemini)(input);
        const output = {
            verificationStatus: (visual.visualSimilarity ?? 0) < constants_1.VISUAL_SIMILARITY_THRESHOLD
                ? 'visual_fraud'
                : visual.verificationStatus,
            gpsDistance: gps.distance,
            visualSimilarity: visual.visualSimilarity,
            citizenConfirmRequired: visual.citizenConfirmRequired,
            flaggedForSupervisor: visual.flaggedForSupervisor,
        };
        if (output.verificationStatus === 'visual_fraud') {
            await persistFraud(input, store, output);
            return output;
        }
        await store.appendResolutionAttempt(input.issueId, resolutionAttempt(input, output));
        await store.updateIssue(input.issueId, {
            status: 'pending_citizen_confirmation',
            citizenConfirmationSentAt: new Date(),
            updatedAt: new Date(),
        });
        return output;
    }
    catch (error) {
        await store.updateIssue(input.issueId, {
            status: 'error_processing',
            errorMessage: error instanceof Error ? error.message : String(error),
            updatedAt: new Date(),
        });
        throw error;
    }
}
async function persistFraud(input, store, output) {
    await store.appendResolutionAttempt(input.issueId, resolutionAttempt(input, output));
    await store.updateIssue(input.issueId, {
        status: 'assigned',
        fraudFlaggedAt: new Date(),
        updatedAt: new Date(),
    });
    await store.incrementSuspiciousResolutionCount(input.officialId);
}
function resolutionAttempt(input, output) {
    return {
        attemptId: crypto.randomUUID?.() || `${Date.now()}`,
        officialId: input.officialId,
        resolutionPhotoUrl: input.resolutionPhotoUrl,
        resolutionGpsLat: input.resolutionGpsLat,
        resolutionGpsLng: input.resolutionGpsLng,
        submittedAt: new Date(),
        agent4Result: output.verificationStatus === 'awaiting_citizen' ? 'pass' : output.verificationStatus,
        gpsDistance: output.gpsDistance,
        visualSimilarity: output.visualSimilarity,
    };
}
