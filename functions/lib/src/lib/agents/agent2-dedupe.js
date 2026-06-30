"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const constants_1 = require("@/lib/utils/constants");
const haversine_1 = require("@/lib/geo/haversine");
const id_generator_1 = require("@/lib/utils/id-generator");
async function run(input, store) {
    try {
        const candidates = await store.findOpenIssuesByCategory(input.category);
        const matches = candidates
            .filter((issue) => issue.issueId !== input.issueId)
            .filter((issue) => (0, haversine_1.haversineDistanceMetres)({ lat: input.gpsLat, lng: input.gpsLng }, { lat: issue.gpsLat, lng: issue.gpsLng }) <= constants_1.DEDUP_RADIUS_METRES)
            .sort((a, b) => a.createdAtMs - b.createdAtMs);
        if (matches.length > 0) {
            const canonical = matches[0];
            const credibilityWeight = canonical.credibilityWeight +
                constants_1.CREDIBILITY_WEIGHT.CORROBORATION +
                (input.hasPhoto ? constants_1.CREDIBILITY_WEIGHT.PHOTO_EVIDENCE : 0);
            const corroborations = Array.from(new Set([...canonical.corroborations, input.issueId]));
            const output = {
                isNewIssue: false,
                canonicalThreadId: canonical.issueId,
                publicTrackingId: canonical.publicTrackingId,
                corroborationCount: canonical.corroborationCount + 1,
                credibilityWeight,
                autoEscalate: credibilityWeight >= constants_1.CREDIBILITY_WEIGHT.AUTO_ESCALATE_THRESHOLD,
            };
            await store.updateIssue(canonical.issueId, {
                corroborations,
                corroborationCount: output.corroborationCount,
                credibilityWeight,
                autoEscalate: output.autoEscalate,
                updatedAt: new Date(),
            });
            await store.updateIssue(input.issueId, {
                status: 'merged',
                canonicalThreadId: canonical.issueId,
                publicTrackingId: canonical.publicTrackingId,
                merged_into: canonical.issueId,
                updatedAt: new Date(),
            });
            return output;
        }
        const publicTrackingId = await assignUniquePublicId(store);
        const output = {
            isNewIssue: true,
            canonicalThreadId: input.issueId,
            publicTrackingId,
            corroborationCount: 0,
            credibilityWeight: constants_1.CREDIBILITY_WEIGHT.BASE_REPORT + (input.hasPhoto ? constants_1.CREDIBILITY_WEIGHT.PHOTO_EVIDENCE : 0),
            autoEscalate: false,
        };
        await store.updateIssue(input.issueId, {
            ...output,
            status: 'pending_routing',
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
async function assignUniquePublicId(store) {
    let id = (0, id_generator_1.generatePublicId)();
    for (let attempts = 0; attempts < 10; attempts++) {
        if (!(await store.publicIdExists(id)))
            return id;
        id = (0, id_generator_1.generatePublicId)();
    }
    return (0, id_generator_1.fallbackPublicId)();
}
