'use client';

import imageCompression from 'browser-image-compression';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import type { Issue } from '@/types/issue';

export default function ResolvePage({ params }: { params: { id: string } }) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [note, setNote] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'issues', params.id), (snapshot) => {
      setIssue(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Issue) : null);
    });
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsLoading(false);
      },
      () => { setGps(null); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
    return () => unsubscribe();
  }, [params.id]);

  async function handleFileChange(selectedFile: File) {
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  }

  async function submitResolution() {
    if (!file || !issue || !note.trim() || !gps) return;
    setBusy(true);
    setResult(null);
    setMessage('');
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1920 });
      const attemptId = crypto.randomUUID();
      const photoRef = ref(storage, `issues/${issue.publicTrackingId}/resolution_${attemptId}.jpg`);
      await uploadBytes(photoRef, compressed, { contentType: compressed.type || 'image/jpeg' });
      const url = await getDownloadURL(photoRef);
      await updateDoc(doc(db, 'issues', issue.id), {
        status: 'pending_verification',
        resolutionPhotoUrl: url,
        resolutionGpsLat: gps.lat,
        resolutionGpsLng: gps.lng,
        resolutionNote: note.trim(),
        updatedAt: serverTimestamp(),
      });
      setResult('success');
      setMessage('✅ Resolution evidence uploaded. Fraud detection is running (GPS + visual check).');
    } catch (error) {
      setResult('error');
      setMessage(error instanceof Error ? error.message : 'Submission failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = Boolean(file && note.trim() && gps && !busy);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ─── Header ─────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href="/official/queue" className="text-sm font-medium text-civic-blue hover:underline">← Queue</Link>
          <p className="text-sm font-semibold text-gray-500">Submit Resolution</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 pb-24 space-y-4">
        {!issue ? (
          <div className="space-y-4">
            <div className="h-64 rounded-2xl shimmer" />
            <div className="h-32 rounded-2xl shimmer" />
          </div>
        ) : (
          <>
            {/* ─── Original Report ──────── */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                Resolve <span className="font-mono text-civic-blue">{issue.publicTrackingId}</span>
              </h1>
              {issue.photoUrls?.[0] && (
                <img src={issue.photoUrls[0]} alt="Original report" className="mt-4 h-48 w-full rounded-xl object-cover" />
              )}
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Address</p>
                  <p className="mt-0.5 font-medium text-gray-800">{issue.address || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Category</p>
                  <p className="mt-0.5 font-medium capitalize text-gray-800">{String(issue.category || 'other').replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Reporters</p>
                  <p className="mt-0.5 font-medium text-gray-800">{Math.max(1, issue.corroborationCount || 0)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Severity</p>
                  <p className="mt-0.5 font-medium text-gray-800">{issue.severity}/5</p>
                </div>
              </div>
              {issue.textDescription && (
                <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  &ldquo;{issue.textDescription}&rdquo;
                </p>
              )}
            </div>

            {/* ─── Resolution Form ──────── */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Upload Resolution Evidence</h2>
              <p className="mt-1 text-sm text-gray-500">
                Photos are verified via GPS distance check and AI visual similarity analysis.
              </p>

              {/* GPS status */}
              <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
                gpsLoading ? 'bg-blue-50 text-blue-700' : gps ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {gpsLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-ring-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Getting your GPS location…
                  </>
                ) : gps ? (
                  <>✅ GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)} · ±{Math.round(gps.accuracy)}m</>
                ) : (
                  <>❌ GPS unavailable — please enable location access</>
                )}
              </div>

              {/* Photo upload */}
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-800">
                  Resolution photo <span className="text-red-500">*</span>
                </label>
                {previewUrl ? (
                  <div className="mt-2">
                    <img src={previewUrl} alt="Resolution preview" className="h-48 w-full rounded-xl object-cover" />
                    <button
                      type="button"
                      className="mt-2 text-sm font-semibold text-civic-blue hover:underline"
                      onClick={() => { setFile(null); setPreviewUrl(''); }}
                    >
                      Change photo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="mt-2 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-center hover:border-civic-blue hover:bg-civic-blue-light transition-all focus:ring-2 focus:ring-civic-blue"
                    onClick={() => inputRef.current?.click()}
                  >
                    <span className="text-3xl">📷</span>
                    <span className="text-sm font-semibold text-gray-600">Tap to capture or upload photo</span>
                    <span className="text-xs text-gray-400">Must be taken at the issue location</span>
                  </button>
                )}
                <input
                  ref={inputRef}
                  id="resolution-photo"
                  className="hidden"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
                />
              </div>

              {/* Note */}
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-800" htmlFor="resolution-note">
                  Resolution note <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="resolution-note"
                  required
                  className="mt-2 min-h-24 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-civic-blue focus:outline-none focus:ring-2 focus:ring-civic-blue/20"
                  placeholder="Describe the action taken to resolve this issue…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {/* Submit */}
              <button
                type="button"
                className="mt-4 w-full rounded-xl bg-civic-blue py-3.5 font-bold text-white shadow-sm transition-all hover:bg-civic-blue-dark hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-civic-blue focus:ring-offset-2"
                disabled={!canSubmit}
                onClick={submitResolution}
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-ring-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Uploading evidence…
                  </span>
                ) : (
                  'Submit Resolution Evidence'
                )}
              </button>

              {/* Result */}
              {result && (
                <div className={`mt-4 rounded-xl p-4 text-sm font-medium animate-fade-in ${result === 'success' ? 'border border-green-200 bg-green-50 text-green-800' : 'border border-red-200 bg-red-50 text-red-800'}`}>
                  {message}
                </div>
              )}

              {/* Status-specific info */}
              {issue.status === 'pending_citizen_confirmation' && (
                <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 animate-fade-in">
                  ✅ Evidence verified. Citizen confirmation has been requested — awaiting their response.
                </div>
              )}
              {issue.resolutionAttempts?.some((a) => a.agent4Result === 'gps_fraud') && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 animate-fade-in">
                  🚨 GPS Fraud Detected — Your submitted location was too far from the issue location. Please physically go to the site and resubmit.
                </div>
              )}
              {issue.resolutionAttempts?.some((a) => a.agent4Result === 'visual_fraud') && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 animate-fade-in">
                  ⚠️ Visual Similarity Check Failed — The submitted photo doesn&apos;t appear to show the same location as the original report. Please upload a photo clearly showing the resolved issue.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
