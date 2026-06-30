"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadIssuePhoto = uploadIssuePhoto;
const storage_1 = require("firebase/storage");
const config_1 = require("./config");
async function uploadIssuePhoto(issueId, file) {
    const storageRef = (0, storage_1.ref)(config_1.storage, `issues/${issueId}/report_photo.jpg`);
    const task = (0, storage_1.uploadBytesResumable)(storageRef, file, { contentType: file.type || 'image/jpeg' });
    await new Promise((resolve, reject) => {
        task.on('state_changed', undefined, reject, () => resolve());
    });
    return (0, storage_1.getDownloadURL)(storageRef);
}
