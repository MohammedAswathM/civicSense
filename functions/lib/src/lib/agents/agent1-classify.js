"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const constants_1 = require("@/lib/utils/constants");
const classify_1 = require("@/lib/gemini/classify");
async function run(input, store) {
    if (input.gpsAccuracy > constants_1.GPS_ACCURACY_REJECT_METRES) {
        const output = {
            category: 'other',
            severity: 1,
            confidence: 1,
            geminiDescription: 'Location accuracy is too low to verify this report.',
            isValidIssue: false,
            rejectionReason: 'GPS accuracy is too low. Please resubmit outdoors or use manual pin drop.',
        };
        await store.updateIssue(input.issueId, terminalPatch('rejected', output.rejectionReason, output));
        return output;
    }
    try {
        const photo = await store.readPhotoBase64(input.photoUrl);
        const output = await (0, classify_1.classifyIssuePhoto)({
            photoBase64: photo.data,
            mimeType: photo.mimeType,
            seed: `${input.photoUrl}:${input.textDescription}`,
        });
        if (!output.isValidIssue) {
            await store.updateIssue(input.issueId, terminalPatch('rejected', output.rejectionReason || 'Invalid civic issue photo.', output));
            return output;
        }
        await store.updateIssue(input.issueId, {
            ...output,
            status: 'pending_deduplication',
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
function terminalPatch(status, note, output) {
    return {
        ...output,
        status,
        rejectionReason: note,
        updatedAt: new Date(),
    };
}
