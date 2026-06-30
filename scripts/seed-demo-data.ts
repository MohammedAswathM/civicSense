import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { geohashForLocation } from 'geofire-common';
import { demoPredictions } from '../src/lib/agents/agent5-predict';
import type { IssueCategory, IssueStatus } from '../src/types/issue';

if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= '127.0.0.1:9199';
  process.env.GCLOUD_PROJECT ||= process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-no-project';
}

if (!getApps().length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'demo-no-project';
  initializeApp(process.env.GOOGLE_APPLICATION_CREDENTIALS ? { credential: applicationDefault(), projectId } : { projectId });
}

const db = getFirestore();

const wards = [
  { id: 'ward_rs_puram', name: 'RS Puram', centerLat: 11.008, centerLng: 76.95 },
  { id: 'ward_gandhipuram', name: 'Gandhipuram', centerLat: 11.018, centerLng: 76.967 },
  { id: 'ward_peelamedu', name: 'Peelamedu', centerLat: 11.033, centerLng: 77.029 },
  { id: 'ward_saibaba_colony', name: 'Saibaba Colony', centerLat: 11.025, centerLng: 76.943 },
  { id: 'ward_ukkadam', name: 'Ukkadam', centerLat: 10.992, centerLng: 76.96 },
];

const statuses: IssueStatus[] = [
  'assigned',
  'assigned',
  'assigned',
  'assigned',
  'assigned',
  'in_progress',
  'in_progress',
  'in_progress',
  'in_progress',
  'resolved',
  'resolved',
  'resolved',
  'escalated' as IssueStatus,
  'escalated' as IssueStatus,
  'pending_verification',
];

const categories: IssueCategory[] = ['pothole', 'waterlogging', 'broken_light', 'garbage', 'damaged_pipe'];

async function main() {
  const batch = db.batch();
  for (const ward of wards) {
    batch.set(db.doc(`wards/${ward.id}`), {
      ...ward,
      boundaryGeohashes: [],
      officials: { roads: 'demo-officer', drainage: 'demo-officer', electricity: 'demo-officer', sanitation: 'demo-officer', water_supply: 'demo-officer', parks: 'demo-officer', municipal: 'demo-officer' },
      supervisorId: 'demo-supervisor',
    });
  }

  batch.set(db.doc('officials/demo-officer'), {
    id: 'demo-officer',
    phone: '+919999999999',
    name: 'Demo Ward Officer',
    role: 'officer',
    ward: 'ward_rs_puram',
    department: 'roads',
    isActive: true,
    totalAssigned: 8,
    totalResolvedInSLA: 5,
    totalResolvedOutOfSLA: 1,
    suspiciousResolutionCount: 0,
    averageResolutionTimeHours: 18,
    createdAt: FieldValue.serverTimestamp(),
    lastActiveAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.doc('officials/demo-supervisor'), {
    id: 'demo-supervisor',
    phone: '+918888888888',
    name: 'Demo Supervisor',
    role: 'admin',
    ward: 'ward_rs_puram',
    department: 'municipal',
    isActive: true,
    totalAssigned: 0,
    totalResolvedInSLA: 0,
    totalResolvedOutOfSLA: 0,
    suspiciousResolutionCount: 0,
    averageResolutionTimeHours: 0,
    createdAt: FieldValue.serverTimestamp(),
    lastActiveAt: FieldValue.serverTimestamp(),
  });

  statuses.forEach((status, index) => {
    const ward = wards[index % wards.length];
    const category = categories[index % categories.length];
    const publicTrackingId = `CS-${String(2847 + index).slice(-4)}-${['XKQM', 'FV7K', 'RSPM', 'GDPR', 'PLMD'][index % 5]}`;
    const createdAt = Timestamp.fromMillis(Date.now() - (index + 1) * 3 * 36e5);
    const resolvedAt = status === 'resolved' ? Timestamp.fromMillis(createdAt.toMillis() + 18 * 36e5) : null;
    const slaDeadline = Timestamp.fromMillis(Date.now() + (status === 'escalated' ? -12 : 24 + index) * 36e5);
    const lat = ward.centerLat + (index % 3) * 0.002;
    const lng = ward.centerLng + (index % 4) * 0.002;
    batch.set(db.doc(`issues/${publicTrackingId}`), {
      publicId: publicTrackingId,
      publicTrackingId,
      citizenAnonymousId: `demo-citizen-${index}`,
      photoUrl: '/demo-pothole.jpg',
      photoUrls: ['/demo-pothole.jpg'],
      lat,
      lng,
      gpsLat: lat,
      gpsLng: lng,
      gpsAccuracy: 25,
      geohash: geohashForLocation([lat, lng]),
      geopoint: { latitude: lat, longitude: lng },
      ward: ward.name,
      address: `${ward.name}, Coimbatore`,
      category,
      citizenCategory: category,
      severity: ((index % 5) + 1),
      confidence: 0.86,
      geminiDescription: `${category.replace('_', ' ')} reported near ${ward.name}.`,
      isValidIssue: true,
      textDescription: `Large ${category.replace('_', ' ')} near ${ward.name} bus stop.`,
      canonicalThreadId: '',
      corroborationCount: (index % 4) + 1,
      credibilityWeight: 1 + (index % 5),
      corroborations: [],
      assignedOfficialId: 'demo-officer',
      department: category === 'waterlogging' ? 'drainage' : category === 'garbage' ? 'sanitation' : category === 'broken_light' ? 'electricity' : 'roads',
      slaDeadline,
      convergenceAlert: index % 6 === 0,
      nearbyIssueIds: [],
      status,
      statusHistory: [
        { status: 'pending_classification', timestamp: createdAt, changedBy: 'system' },
        { status: 'assigned', timestamp: Timestamp.fromMillis(createdAt.toMillis() + 60_000), changedBy: 'system' },
        ...(status !== 'assigned' ? [{ status, timestamp: Timestamp.fromMillis(createdAt.toMillis() + 2 * 36e5), changedBy: 'official' }] : []),
      ],
      resolutionAttempts: [],
      createdAt,
      updatedAt: FieldValue.serverTimestamp(),
      resolvedAt,
      upvoteCount: index % 7,
      upvotedByIds: [],
    });
  });

  for (const prediction of demoPredictions()) {
    batch.set(db.doc(`predictions/${prediction.wardId}`), prediction);
  }

  await batch.commit();
  console.log('Seeded demo wards, officials, issues, and predictions.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
