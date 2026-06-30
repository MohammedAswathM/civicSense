"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.db = exports.auth = exports.app = void 0;
exports.connectFirebaseEmulators = connectFirebaseEmulators;
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const storage_1 = require("firebase/storage");
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'civicsense-demo',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'civicsense-demo.appspot.com',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:000000000000:web:demo',
};
exports.app = (0, app_1.getApps)().length ? (0, app_1.getApp)() : (0, app_1.initializeApp)(firebaseConfig);
exports.auth = (0, auth_1.getAuth)(exports.app);
exports.db = (0, firestore_1.getFirestore)(exports.app);
exports.storage = (0, storage_1.getStorage)(exports.app);
let emulatorsConnected = false;
function connectFirebaseEmulators() {
    if (emulatorsConnected || process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== 'true') {
        return;
    }
    (0, auth_1.connectAuthEmulator)(exports.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    (0, firestore_1.connectFirestoreEmulator)(exports.db, '127.0.0.1', 8080);
    (0, storage_1.connectStorageEmulator)(exports.storage, '127.0.0.1', 9199);
    emulatorsConnected = true;
}
if (typeof window !== 'undefined') {
    connectFirebaseEmulators();
}
