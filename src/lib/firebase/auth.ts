'use client';

import { RecaptchaVerifier, signInAnonymously, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from './config';

export async function ensureAnonymousUser() {
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export function createRecaptcha(containerId: string): RecaptchaVerifier {
  return new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
}

export async function sendOfficialOtp(phone: string, verifier: RecaptchaVerifier) {
  return signInWithPhoneNumber(auth, phone, verifier);
}
