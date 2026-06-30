"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueReport = queueReport;
exports.listQueuedReports = listQueuedReports;
const DB_NAME = 'civicsense-offline';
const STORE_NAME = 'queued-reports';
async function queueReport(report) {
    const db = await openDb();
    await requestToPromise(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(report));
}
async function listQueuedReports() {
    const db = await openDb();
    return requestToPromise(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll());
}
function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}
function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}
