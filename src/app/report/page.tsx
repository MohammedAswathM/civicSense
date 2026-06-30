'use client';

import imageCompression from 'browser-image-compression';
import { Loader } from '@googlemaps/js-api-loader';
import { geohashForLocation } from 'geofire-common';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase/config';
import { fallbackPublicId, generatePublicId } from '@/lib/utils/id-generator';
import { ISSUE_CATEGORIES } from '@/lib/utils/constants';
import type { IssueCategory } from '@/types/issue';

type Step = 0 | 1 | 2 | 3;

interface ReportWizardState {
  photoPreviewUrl: string;
  photoDataUrl: string;
  photoName: string;
  photoConfirmed: boolean;
  gpsLat: number | null;
  gpsLng: number | null;
  gpsAccuracy: number | null;
  address: string;
  description: string;
  selectedCategory: IssueCategory | '';
}

const STORAGE_KEY = 'civicsense.reportDraft';
const COIMBATORE = { lat: 10.9026, lng: 76.9098 };

const CATEGORY_ICONS: Record<string, string> = {
  pothole: '🕳️', waterlogging: '💧', broken_light: '💡', garbage: '🗑️',
  damaged_pipe: '🔧', fallen_tree: '🌳', sewage: '🚽', vandalism: '🖊️', other: '❓',
};

const STEP_INFO = [
  { label: 'Photo',    icon: '📸', helper: 'Clear photo helps AI classify the issue accurately' },
  { label: 'Location', icon: '📍', helper: 'Precise location routes the issue to the correct ward' },
  { label: 'Details',  icon: '🏷️',  helper: 'Category and description help officials act quickly' },
  { label: 'Review',   icon: '✅', helper: 'Verify all details before submitting anonymously' },
];

const initialState: ReportWizardState = {
  photoPreviewUrl: '', photoDataUrl: '', photoName: '', photoConfirmed: false,
  gpsLat: null, gpsLng: null, gpsAccuracy: null, address: '', description: '', selectedCategory: '',
};

export default function ReportPage() {
  const [step, setStep] = useState<Step>(0);
  const [wizard, setWizard] = useState<ReportWizardState>(initialState);
  const [compressedPhoto, setCompressedPhoto] = useState<Blob | null>(null);
  const [restoreAvailable, setRestoreAvailable] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Restore draft prompt on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ReportWizardState;
        if (parsed.photoConfirmed || parsed.address) setRestoreAvailable(true);
      } catch { /* ignore */ }
    }
  }, []);

  // Persist draft on every wizard change
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(wizard));
  }, [wizard]);

  function updateWizard(patch: Partial<ReportWizardState>) {
    setWizard((current) => ({ ...current, ...patch }));
  }

  async function restoreDraft() {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const restored = { ...initialState, ...JSON.parse(saved) } as ReportWizardState;
    setWizard(restored);
    if (restored.photoDataUrl) {
      const blob = await dataUrlToBlob(restored.photoDataUrl);
      setCompressedPhoto(blob);
    }
    setRestoreAvailable(false);
  }

  function canContinue(currentStep: Step) {
    if (currentStep === 0) return Boolean(compressedPhoto || wizard.photoDataUrl) && wizard.photoConfirmed;
    if (currentStep === 1) return wizard.gpsLat !== null && wizard.gpsLng !== null && Boolean(wizard.address.trim());
    if (currentStep === 2) return Boolean(wizard.selectedCategory);
    return true;
  }

  async function handleSubmit() {
    const photoBlob = compressedPhoto || (wizard.photoDataUrl ? await dataUrlToBlob(wizard.photoDataUrl) : null);
    if (!photoBlob || wizard.gpsLat === null || wizard.gpsLng === null) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Anonymous sign-in failed.');

      const publicTrackingId = await generateUniquePublicId();
      const photoRef = ref(storage, `issues/${publicTrackingId}/report_photo.jpg`);
      await uploadBytes(photoRef, photoBlob, { contentType: photoBlob.type || 'image/jpeg' });
      const photoUrl = await getDownloadURL(photoRef);

      const issueDoc = {
        publicId: publicTrackingId,
        publicTrackingId,
        citizenAnonymousId: uid,
        photoUrl,
        photoUrls: [photoUrl],
        lat: wizard.gpsLat,
        lng: wizard.gpsLng,
        gpsLat: wizard.gpsLat,
        gpsLng: wizard.gpsLng,
        gpsAccuracy: wizard.gpsAccuracy ?? 999,
        geohash: geohashForLocation([wizard.gpsLat, wizard.gpsLng]),
        geopoint: { latitude: wizard.gpsLat, longitude: wizard.gpsLng },
        address: wizard.address.trim(),
        description: wizard.description.trim(),
        textDescription: wizard.description.trim(),
        citizenCategory: wizard.selectedCategory || null,
        status: 'pending_classification',
        statusHistory: [{ status: 'pending_classification', timestamp: new Date().toISOString(), changedBy: 'system' }],
        severity: 3,
        category: 'other',
        confidence: 0,
        geminiDescription: '',
        isValidIssue: true,
        credibilityWeight: 1,
        upvoteCount: 0,
        upvotedByIds: [],
        corroborationCount: 0,
        corroborations: [],
        nearbyIssueIds: [],
        convergenceAlert: false,
        resolutionAttempts: [],
        ward: '',
        canonicalThreadId: '',
        assignedOfficialId: '',
        department: '',
        slaDeadline: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'issues', publicTrackingId), issueDoc);
      const myReports = JSON.parse(localStorage.getItem('myReports') || '[]') as Array<Record<string, unknown>>;
      myReports.unshift({ publicId: publicTrackingId, publicTrackingId, createdAt: Date.now() });
      localStorage.setItem('myReports', JSON.stringify(myReports.slice(0, 20)));
      sessionStorage.removeItem(STORAGE_KEY);
      setTrackingId(publicTrackingId);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Submission failed. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (trackingId) return <SuccessState trackingId={trackingId} />;

  return (
    <main className="min-h-screen bg-gradient-to-b from-civic-blue-light/50 to-gray-50">
      {/* ─── Header ─────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href="/map" className="flex items-center gap-1 text-sm font-medium text-civic-blue hover:underline">
            ← Back
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">Report an Issue</h1>
            <p className="text-xs text-gray-500">{STEP_INFO[step].helper}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 pb-32">
        {/* ─── Restore Draft ──────────────── */}
        {restoreAvailable && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 animate-fade-in">
            <div>
              <p className="text-sm font-semibold text-blue-900">Continue where you left off?</p>
              <p className="text-xs text-blue-600">You have a saved draft</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-civic-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-civic-blue-dark"
                onClick={restoreDraft}
              >
                Restore
              </button>
              <button
                type="button"
                className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700"
                onClick={() => setRestoreAvailable(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ─── Step Progress Indicator ────── */}
        <StepIndicator step={step} />

        {/* ─── Step Content ───────────────── */}
        <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-fade-in">
          {step === 0 && (
            <PhotoStep
              previewUrl={wizard.photoPreviewUrl}
              photoName={wizard.photoName}
              onPhotoReady={(compressed, previewUrl, name) => {
                setCompressedPhoto(compressed);
                updateWizard({ photoPreviewUrl: previewUrl, photoDataUrl: previewUrl, photoName: name, photoConfirmed: true });
              }}
              onChangePhoto={() => {
                setCompressedPhoto(null);
                updateWizard({ photoPreviewUrl: '', photoDataUrl: '', photoName: '', photoConfirmed: false });
              }}
            />
          )}
          {step === 1 && <LocationStep value={wizard} onUpdate={updateWizard} />}
          {step === 2 && <DetailsStep value={wizard} onUpdate={updateWizard} />}
          {step === 3 && <ReviewStep value={wizard} submitting={submitting} submitError={submitError} />}
        </div>

        {/* ─── Navigation Buttons ─────────── */}
        <div className="mt-4 flex justify-between gap-3">
          {step > 0 ? (
            <button
              type="button"
              className="flex-1 rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-95 focus:ring-2 focus:ring-civic-blue"
              onClick={() => setStep((s) => (s - 1) as Step)}
            >
              ← Back
            </button>
          ) : (
            <div className="flex-1" />
          )}

          {step < 3 ? (
            <button
              data-testid="next-step"
              type="button"
              disabled={!canContinue(step)}
              className="flex-1 rounded-xl bg-civic-blue py-3 font-semibold text-white shadow-sm transition-all hover:bg-civic-blue-dark hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-civic-blue focus:ring-offset-2"
              onClick={() => setStep((s) => Math.min(s + 1, 3) as Step)}
            >
              Continue →
            </button>
          ) : (
            <button
              data-testid="submit-report"
              type="button"
              disabled={submitting}
              className="flex-1 rounded-xl bg-civic-blue py-3 font-semibold text-white shadow-sm transition-all hover:bg-civic-blue-dark hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-civic-blue focus:ring-offset-2"
              onClick={handleSubmit}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-ring-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting…
                </span>
              ) : (
                'Submit Report 🚀'
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

/* ─── Step Progress Indicator ─────────────────────────────────────── */
function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-0" aria-label="Report progress">
      {STEP_INFO.map((info, index) => (
        <div key={info.label} className="flex flex-1 items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                index < step
                  ? 'bg-civic-blue text-white shadow-sm'
                  : index === step
                  ? 'bg-civic-blue text-white shadow-md ring-4 ring-civic-blue/20'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {index < step ? '✓' : info.icon}
            </div>
            <span className={`mt-1 text-[10px] font-semibold ${index <= step ? 'text-civic-blue' : 'text-gray-400'}`}>
              {info.label}
            </span>
          </div>
          {index < STEP_INFO.length - 1 && (
            <div className={`mx-1 mb-4 h-0.5 flex-1 rounded transition-all ${index < step ? 'bg-civic-blue' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Photo Step ──────────────────────────────────────────────────── */
function PhotoStep({
  previewUrl,
  photoName,
  onPhotoReady,
  onChangePhoto,
}: {
  previewUrl: string;
  photoName: string;
  onPhotoReady: (compressed: Blob, previewUrl: string, name: string) => void;
  onChangePhoto: () => void;
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setBusy(true);
    setError('');
    try {
      const compressed = await compressWithTimeout(file);
      const preview = await readFileAsDataUrl(compressed);
      onPhotoReady(compressed, preview, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read this image.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmPhoto() {
    let file = pendingFile ?? inputRef.current?.files?.[0] ?? null;
    if (!file && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      const response = await fetch('/demo-pothole.jpg');
      const blob = await response.blob();
      file = new File([blob], 'demo-pothole.jpg', { type: blob.type || 'image/jpeg' });
    }
    if (!file) { setError('Choose a photo first.'); return; }
    await processFile(file);
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Add photo evidence</h2>
      <p className="mt-1 text-sm text-gray-500">A clear, well-lit photo helps AI classify the issue accurately.</p>

      {previewUrl ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 animate-fade-in">
          <img src={previewUrl} alt="Selected civic issue" className="h-52 w-full rounded-lg object-cover shadow-sm" />
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 font-semibold text-green-800">
                <span className="animate-check-pop">✅</span> Photo selected
              </p>
              <p className="text-xs text-green-700 mt-0.5">{photoName}</p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-green-300 px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-100 focus:ring-2 focus:ring-civic-blue"
              onClick={onChangePhoto}
            >
              Change photo
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            className={`mt-4 flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all focus:ring-2 focus:ring-civic-blue focus:outline-none ${
              dragOver
                ? 'border-civic-blue bg-civic-blue-light scale-[1.01]'
                : 'border-gray-300 bg-gray-50 hover:border-civic-blue hover:bg-civic-blue-light'
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) { setPendingFile(file); processFile(file); }
            }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-civic-blue-light text-3xl">
              📸
            </div>
            <div>
              <p className="font-semibold text-gray-800">Tap to add photo</p>
              <p className="mt-1 text-sm text-gray-400">or drag and drop here · JPG, PNG, camera</p>
            </div>
          </button>

          <input
            ref={inputRef}
            data-testid="photo-input"
            className="hidden"
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="Upload issue photo"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) { setPendingFile(file); processFile(file); }
            }}
          />

          {pendingFile && !busy && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
              <span className="truncate text-sm text-gray-700">📎 {pendingFile.name}</span>
              <button
                data-testid="confirm-photo"
                className="rounded-lg bg-civic-blue px-4 py-2 text-sm font-semibold text-white hover:bg-civic-blue-dark focus:ring-2 focus:ring-civic-blue"
                type="button"
                onClick={confirmPhoto}
              >
                Use Photo
              </button>
            </div>
          )}

          {busy && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
              <svg className="h-4 w-4 animate-ring-spin text-civic-blue" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Compressing image…
            </div>
          )}
        </>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}

/* ─── Location Step ───────────────────────────────────────────────── */
function LocationStep({ value, onUpdate }: { value: ReportWizardState; onUpdate: (patch: Partial<ReportWizardState>) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('Detecting your location…');
  const [loading, setLoading] = useState(true);
  const [weakSignal, setWeakSignal] = useState(false);
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const fallbackCenter = useMemo(() => ({ lat: COIMBATORE.lat, lng: COIMBATORE.lng }), []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setWeakSignal(true);
      setLoading(false);
      setFallbackCoords('GPS not available in your browser.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const weak = accuracy >= 100;
        setWeakSignal(weak);
        const address = await reverseGeocode(latitude, longitude, mapsKey);
        onUpdate({ gpsLat: latitude, gpsLng: longitude, gpsAccuracy: accuracy, address: address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` });
        setMessage(weak ? 'GPS signal weak — drag the pin to your exact location.' : 'Location confirmed. Drag pin to adjust.');
        setLoading(false);
      },
      () => {
        setWeakSignal(true);
        setFallbackCoords('GPS denied — drag the pin to your exact location.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey]);

  useEffect(() => {
    if (!mapsKey || !mapRef.current) return;
    let cancelled = false;
    const loader = new Loader({ apiKey: mapsKey, version: 'weekly', libraries: ['places', 'geometry'] });
    loader.load().then((google) => {
      if (cancelled || !mapRef.current) return;
      const center = value.gpsLat !== null && value.gpsLng !== null ? { lat: value.gpsLat, lng: value.gpsLng } : fallbackCenter;
      const map = new google.maps.Map(mapRef.current, { center, zoom: 16, mapTypeControl: false, fullscreenControl: false, streetViewControl: false });
      const marker = new google.maps.Marker({ position: center, map, draggable: true });
      marker.addListener('dragend', async () => {
        const lat = marker.getPosition()?.lat() ?? center.lat;
        const lng = marker.getPosition()?.lng() ?? center.lng;
        const address = await reverseGeocode(lat, lng, mapsKey);
        onUpdate({ gpsLat: lat, gpsLng: lng, gpsAccuracy: value.gpsAccuracy ?? 999, address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
        setMessage('Pin updated ✓');
      });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey, fallbackCenter]);

  function setFallbackCoords(reason: string) {
    onUpdate({ gpsLat: value.gpsLat ?? COIMBATORE.lat, gpsLng: value.gpsLng ?? COIMBATORE.lng, gpsAccuracy: 999, address: value.address || '' });
    setMessage(reason);
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Confirm location</h2>
      <p className="mt-1 text-sm text-gray-500">We use this to route the issue to the correct ward officer.</p>

      {/* Status message */}
      <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${loading ? 'bg-blue-50 text-blue-700' : weakSignal ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
        {loading ? (
          <svg className="h-4 w-4 shrink-0 animate-ring-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <span>{weakSignal ? '⚠️' : '✅'}</span>
        )}
        {loading ? 'Getting GPS…' : message}
      </div>

      {/* Map */}
      {mapsKey ? (
        <div className="mt-3 h-[250px] overflow-hidden rounded-xl border border-gray-200 shadow-sm" aria-label="Location map">
          <div ref={mapRef} className="h-full w-full" />
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          <div>
            <div className="text-4xl">🗺️</div>
            <p className="mt-2 text-sm">Interactive map unavailable.</p>
            <p className="text-xs text-gray-400">Please describe your location below.</p>
          </div>
        </div>
      )}

      {/* Coordinate pill */}
      <div data-testid="location-confirmed" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
        📍 {(value.gpsLat ?? COIMBATORE.lat).toFixed(5)}, {(value.gpsLng ?? COIMBATORE.lng).toFixed(5)}
        {value.gpsAccuracy && <span className="text-gray-400">· ±{Math.round(value.gpsAccuracy)}m</span>}
      </div>

      {/* Address input */}
      <label className="mt-4 block text-sm font-semibold text-gray-800" htmlFor="address">
        Address or landmark <span className="text-red-500">*</span>
      </label>
      <input
        id="address"
        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-civic-blue focus:outline-none focus:ring-2 focus:ring-civic-blue/20"
        value={value.address}
        onChange={(e) => onUpdate({ address: e.target.value })}
        placeholder="Street name, landmark, or nearby shop"
      />
    </div>
  );
}

/* ─── Details Step ────────────────────────────────────────────────── */
function DetailsStep({ value, onUpdate }: { value: ReportWizardState; onUpdate: (patch: Partial<ReportWizardState>) => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Add details</h2>
      <p className="mt-1 text-sm text-gray-500">Pick a category. Then add a description for officials (optional).</p>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Issue Category <span className="text-red-500">*</span></p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ISSUE_CATEGORIES.map((category) => {
          const selected = value.selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={selected}
              className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-2 text-sm font-medium transition-all focus:ring-2 focus:ring-civic-blue focus:ring-offset-1 ${
                selected
                  ? 'border-civic-blue bg-civic-blue text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-civic-blue hover:text-civic-blue'
              }`}
              onClick={() => onUpdate({ selectedCategory: category })}
            >
              <span>{CATEGORY_ICONS[category]}</span>
              <span className="capitalize">{category.replace(/_/g, ' ')}</span>
              {selected && <span className="ml-0.5">✓</span>}
            </button>
          );
        })}
      </div>

      <label className="mt-5 block text-sm font-semibold text-gray-800" htmlFor="description">
        Description <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <textarea
        id="description"
        data-testid="description-input"
        className="mt-2 min-h-28 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-civic-blue focus:outline-none focus:ring-2 focus:ring-civic-blue/20"
        placeholder="e.g. Large pothole near RS Puram bus stop, causing vehicle damage"
        value={value.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
      />
      <p className="mt-1 text-xs text-gray-400">{value.description.length}/500 characters</p>
    </div>
  );
}

/* ─── Review Step ─────────────────────────────────────────────────── */
function ReviewStep({ value, submitting, submitError }: { value: ReportWizardState; submitting: boolean; submitError: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Review & submit</h2>
      <p className="mt-1 text-sm text-gray-500">Check these details before creating your anonymous report.</p>

      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
        {/* Photo + Location */}
        <div className="flex gap-4">
          {value.photoPreviewUrl ? (
            <img src={value.photoPreviewUrl} alt="Issue thumbnail" className="h-20 w-20 shrink-0 rounded-lg object-cover ring-2 ring-white shadow-sm" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-2xl">📷</div>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1 font-semibold text-gray-900">
              <span>📍</span>
              <span className="truncate">{value.address || 'Location pending'}</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {value.gpsLat?.toFixed(5)}, {value.gpsLng?.toFixed(5)}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              <span>🏷️</span>
              <span>Category:</span>
              <span className="font-semibold capitalize">{(value.selectedCategory || 'other').replace(/_/g, ' ')}</span>
              <span className="text-base">{CATEGORY_ICONS[value.selectedCategory] || '❓'}</span>
            </p>
          </div>
        </div>

        {/* Description */}
        {value.description && (
          <div className="mt-3 rounded-lg bg-white p-3 text-sm text-gray-700">
            <span className="mr-1">📝</span>
            &ldquo;{value.description}&rdquo;
          </div>
        )}

        {/* Divider + Privacy notice */}
        <div className="mt-3 border-t border-gray-200 pt-3">
          <p className="flex items-start gap-1.5 text-sm text-green-800">
            <span className="mt-0.5 shrink-0">🔒</span>
            <span>Your personal details are <strong>never</strong> shared with officials or the public. You&apos;ll receive an anonymous tracking ID.</span>
          </p>
        </div>
      </div>

      {submitting && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-civic-blue">
          <svg className="h-4 w-4 animate-ring-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Uploading photo and creating report…
        </div>
      )}
      {submitError && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          ⚠️ {submitError}
        </div>
      )}
    </div>
  );
}

/* ─── Success State ───────────────────────────────────────────────── */
function SuccessState({ trackingId }: { trackingId: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 px-4">
      <section className="w-full max-w-md rounded-3xl border border-green-200 bg-white p-8 text-center shadow-xl animate-slide-up">
        {/* Animated checkmark */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-4xl text-white shadow-lg animate-check-pop">
          ✓
        </div>

        <h1 className="mt-5 text-2xl font-bold text-gray-900">Report Submitted!</h1>
        <p className="mt-2 text-sm text-gray-500">Your anonymous report is now live. AI classification will begin shortly.</p>

        {/* Tracking ID */}
        <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Your Tracking ID</p>
          <p data-testid="tracking-id" className="mt-2 font-mono text-3xl font-bold tracking-wider text-green-900">
            {trackingId}
          </p>
          <button
            type="button"
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-all focus:ring-2 focus:ring-civic-blue ${
              copied
                ? 'border-green-300 bg-green-100 text-green-800'
                : 'border-green-200 text-green-700 hover:bg-green-100'
            }`}
            onClick={async () => {
              await navigator.clipboard?.writeText(trackingId);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? '✅ Copied!' : '📋 Copy ID'}
          </button>
        </div>

        <Link
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-civic-blue py-3 font-semibold text-white shadow-sm hover:bg-civic-blue-dark transition-colors focus:ring-2 focus:ring-civic-blue"
          href={`/track/${trackingId}`}
        >
          Track your issue →
        </Link>
        <Link
          href="/"
          className="mt-3 block text-sm font-medium text-gray-500 hover:text-civic-blue"
        >
          Back to map
        </Link>
      </section>
    </main>
  );
}

/* ─── Utilities ───────────────────────────────────────────────────── */
async function generateUniquePublicId(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const id = generatePublicId();
    const existing = await getDocs(query(collection(db, 'issues'), where('publicTrackingId', '==', id), limit(1)));
    if (existing.empty) return id;
  }
  return fallbackPublicId();
}

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function compressWithTimeout(file: File): Promise<Blob> {
  if (file.size <= 500 * 1024) return file;
  try {
    return await Promise.race([
      imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1920 }),
      new Promise<Blob>((resolve) => setTimeout(() => resolve(file), 5000)),
    ]);
  } catch {
    return file;
  }
}

async function reverseGeocode(lat: number, lng: number, apiKey?: string): Promise<string> {
  if (!apiKey) return '';
  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
    const data = (await response.json()) as { results?: Array<{ formatted_address?: string }> };
    return data.results?.[0]?.formatted_address || '';
  } catch {
    return '';
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}