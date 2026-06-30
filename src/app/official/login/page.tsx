'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signOut, type ConfirmationResult } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { createRecaptcha, sendOfficialOtp } from '@/lib/firebase/auth';
import type { Official } from '@/types/user';

export default function OfficialLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+91 9999999999');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function sendOtp() {
    setBusy(true);
    setError('');
    try {
      const verifier = createRecaptcha('recaptcha-container');
      const result = await sendOfficialOtp(normalizePhone(phone), verifier);
      setConfirmation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!confirmation) return;
    setBusy(true);
    setError('');
    try {
      const credential = await confirmation.confirm(otp);
      await redirectForOfficial(credential.user.phoneNumber || phone);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function demoLogin() {
    setBusy(true);
    setError('');
    try {
      const verifier = createRecaptcha('recaptcha-container');
      const result = await sendOfficialOtp('+919999999999', verifier);
      const credential = await result.confirm('123456');
      await redirectForOfficial(credential.user.phoneNumber || '+919999999999');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed. Ensure Firebase Phone Auth emulator is running.');
    } finally {
      setBusy(false);
    }
  }

  async function redirectForOfficial(phoneNumber: string) {
    const normalized = normalizePhone(phoneNumber);
    const officialSnapshot = await getDocs(query(collection(db, 'officials'), where('phone', '==', normalized)));
    if (officialSnapshot.empty) {
      await signOut(auth);
      setError('This phone number is not registered as an official. Contact your administrator.');
      return;
    }
    const officialDoc = officialSnapshot.docs[0];
    const official = officialDoc.data() as Official;
    localStorage.setItem('civicsense.officialId', officialDoc.id);
    localStorage.setItem('civicsense.officialRole', official.role);
    localStorage.setItem('civicsense.officialPhone', official.phone);
    router.push(official.role === 'admin' ? '/admin' : '/official/queue');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
      {/* Background pattern */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/4 h-96 w-96 rounded-full bg-civic-blue/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back link */}
        <Link href="/" className="mb-6 flex items-center gap-1.5 text-sm font-medium text-blue-300 hover:text-white transition-colors">
          ← Back to home
        </Link>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-civic-blue text-2xl shadow-lg">
              🏙️
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Official Portal</h1>
              <p className="text-xs text-blue-300">CivicSense Ward Management</p>
            </div>
          </div>

          {!confirmation ? (
            // ─── Phone Number Entry
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-blue-200" htmlFor="phone">
                  Registered Phone Number
                </label>
                <div className="mt-2 flex items-center rounded-xl border border-white/20 bg-white/10 px-4 py-3 focus-within:border-civic-blue focus-within:ring-2 focus-within:ring-civic-blue/30 transition-all">
                  <span className="mr-2 text-sm text-blue-300">📱</span>
                  <input
                    id="phone"
                    className="flex-1 bg-transparent text-sm font-medium text-white placeholder-blue-300/60 outline-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    type="tel"
                    inputMode="tel"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                className="w-full rounded-xl bg-civic-blue py-3.5 font-semibold text-white shadow-lg hover:bg-civic-blue-dark transition-all active:scale-95 disabled:opacity-60 focus:ring-2 focus:ring-civic-blue focus:ring-offset-2 focus:ring-offset-transparent"
                onClick={sendOtp}
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-ring-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Sending OTP…
                  </span>
                ) : (
                  'Send OTP →'
                )}
              </button>
            </div>
          ) : (
            // ─── OTP Verification
            <div className="space-y-4">
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3">
                <p className="text-sm font-medium text-green-300">✅ OTP sent to {phone}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-200" htmlFor="otp">
                  Enter 6-digit OTP
                </label>
                <input
                  id="otp"
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-white placeholder-white/30 outline-none focus:border-civic-blue focus:ring-2 focus:ring-civic-blue/30 transition-all"
                  placeholder="• • • • • •"
                  aria-label="OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
              <button
                type="button"
                disabled={busy || otp.length < 6}
                className="w-full rounded-xl bg-civic-blue py-3.5 font-semibold text-white shadow-lg hover:bg-civic-blue-dark transition-all active:scale-95 disabled:opacity-60 focus:ring-2 focus:ring-civic-blue"
                onClick={verifyOtp}
              >
                {busy ? 'Verifying…' : 'Verify & Login →'}
              </button>
              <button
                type="button"
                className="w-full text-sm text-blue-300 hover:text-white transition-colors"
                onClick={() => setConfirmation(null)}
              >
                ← Change phone number
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-300">⚠️ {error}</p>
            </div>
          )}

          <div id="recaptcha-container" />

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 border-t border-white/10" />
            <span className="text-xs font-medium text-white/30">or</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          {/* Demo Login */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 mb-3">
              🧪 Demo / Testing Mode
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-amber-200/70 mb-3">
              <div><span className="font-semibold text-amber-200">Phone:</span><br/>+91 9999999999</div>
              <div><span className="font-semibold text-amber-200">OTP:</span><br/>123456</div>
            </div>
            <button
              type="button"
              disabled={busy}
              className="w-full rounded-xl border border-amber-400/40 bg-amber-500/20 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/30 transition-all active:scale-95 disabled:opacity-60 focus:ring-2 focus:ring-amber-400"
              onClick={demoLogin}
            >
              {busy ? 'Logging in…' : '⚡ Demo Login (Skip OTP)'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function normalizePhone(phone: string) {
  return phone.replace(/\s/g, '');
}