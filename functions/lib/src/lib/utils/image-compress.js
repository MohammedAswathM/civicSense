"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressIssueImage = compressIssueImage;
const browser_image_compression_1 = __importDefault(require("browser-image-compression"));
const constants_1 = require("./constants");
async function compressIssueImage(file) {
    return (0, browser_image_compression_1.default)(file, {
        maxSizeMB: constants_1.MAX_PHOTO_SIZE_KB / 1024,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
    });
}
