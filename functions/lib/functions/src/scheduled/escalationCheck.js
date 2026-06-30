"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escalationCheck = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin_1 = require("../admin");
const agent5_predict_1 = require("../../../src/lib/agents/agent5-predict");
exports.escalationCheck = (0, scheduler_1.onSchedule)('0 2 * * 0', async () => {
    const predictions = (0, agent5_predict_1.demoPredictions)();
    await Promise.all(predictions.map((prediction) => admin_1.firestore.doc(`predictions/${prediction.wardId}`).set({
        ...prediction,
        generatedAt: new Date(),
    })));
});
