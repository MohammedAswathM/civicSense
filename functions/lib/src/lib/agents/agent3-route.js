"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const constants_1 = require("@/lib/utils/constants");
const ward_lookup_1 = require("@/lib/geo/ward-lookup");
const haversine_1 = require("@/lib/geo/haversine");
async function run(input, store) {
    try {
        const ward = (0, ward_lookup_1.getWardFromGPS)(input.gpsLat, input.gpsLng);
        const department = constants_1.CATEGORY_TO_DEPARTMENT[input.category];
        const assignedOfficialId = (await store.findOfficial(ward, department, input.autoEscalate)) ||
            (input.autoEscalate ? `supervisor_${ward}` : `${ward}_${department}_officer`);
        const nearbyIssueIds = (await store.findOpenIssuesNear(input.gpsLat, input.gpsLng))
            .filter((issue) => issue.issueId !== input.issueId)
            .filter((issue) => (0, haversine_1.haversineDistanceMetres)({ lat: input.gpsLat, lng: input.gpsLng }, { lat: issue.gpsLat, lng: issue.gpsLng }) <= constants_1.CONVERGENCE_RADIUS_METRES)
            .map((issue) => issue.issueId);
        const slaDeadline = new Date(Date.now() + constants_1.SLA_HOURS[input.category][input.severity] * 60 * 60 * 1000);
        const output = {
            assignedOfficialId,
            department,
            ward,
            slaDeadline: slaDeadline,
            convergenceAlert: nearbyIssueIds.length >= 2,
            nearbyIssueIds,
        };
        await store.updateIssue(input.issueId, {
            ...output,
            status: 'assigned',
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
