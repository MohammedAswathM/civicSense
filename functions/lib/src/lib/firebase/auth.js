"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAnonymousUser = ensureAnonymousUser;
exports.createRecaptcha = createRecaptcha;
exports.sendOfficialOtp = sendOfficialOtp;
const auth_1 = require("firebase/auth");
const config_1 = require("./config");
async function ensureAnonymousUser() {
    if (config_1.auth.currentUser)
        return config_1.auth.currentUser;
    const credential = await (0, auth_1.signInAnonymously)(config_1.auth);
    return credential.user;
}
function createRecaptcha(containerId) {
    return new auth_1.RecaptchaVerifier(config_1.auth, containerId, { size: 'invisible' });
}
async function sendOfficialOtp(phone, verifier) {
    return (0, auth_1.signInWithPhoneNumber)(config_1.auth, phone, verifier);
}
