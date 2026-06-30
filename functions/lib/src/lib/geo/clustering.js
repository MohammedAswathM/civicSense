"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nearbyPointIds = nearbyPointIds;
const haversine_1 = require("./haversine");
function nearbyPointIds(origin, points, radiusMetres) {
    return points
        .filter((point) => (0, haversine_1.haversineDistanceMetres)(origin, point) <= radiusMetres)
        .map((point) => point.id);
}
