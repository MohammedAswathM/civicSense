"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePublicId = generatePublicId;
exports.fallbackPublicId = fallbackPublicId;
const PUBLIC_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PUBLIC_ID_DIGITS = '23456789';
function randomPublicIdSegment(length, alphabet = PUBLIC_ID_CHARS) {
    let segment = '';
    for (let i = 0; i < length; i++) {
        segment += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return segment;
}
function generatePublicId() {
    return `CS-${randomPublicIdSegment(4, PUBLIC_ID_DIGITS)}-${randomPublicIdSegment(4)}`;
}
function fallbackPublicId(now = Date.now()) {
    return `CS-${now.toString(36).toUpperCase().slice(-8)}`;
}
