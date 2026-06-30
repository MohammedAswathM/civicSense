'use client';

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';
import { db } from './config';
import type { Issue, PublicIssue } from '@/types/issue';

export function publicIssueFromIssue(issue: Issue): PublicIssue {
  // citizenAnonymousId is now stored in issue_owners/{issueId} — strip it here as a safety measure
  // for any legacy documents that may still have the field.
  const { citizenAnonymousId: _citizenAnonymousId, ...publicIssue } = issue as Issue & { citizenAnonymousId?: string };
  return publicIssue as PublicIssue;
}

export async function createIssueDraft(input: {
  gpsLat: number;
  gpsLng: number;
  gpsAccuracy: number;
  textDescription: string;
  photoUrls: string[];
}) {
  return addDoc(collection(db, 'issues'), {
    ...input,
    publicTrackingId: '',
    geohash: geohashForLocation([input.gpsLat, input.gpsLng]),
    geopoint: { latitude: input.gpsLat, longitude: input.gpsLng },
    ward: '',
    address: '',
    category: 'other',
    severity: 3,
    confidence: 0,
    geminiDescription: '',
    isValidIssue: true,
    canonicalThreadId: '',
    corroborationCount: 0,
    credibilityWeight: 1,
    corroborations: [],
    assignedOfficialId: '',
    department: '',
    slaDeadline: serverTimestamp(),
    convergenceAlert: false,
    nearbyIssueIds: [],
    status: 'pending_classification',
    statusHistory: [{ status: 'pending_classification', timestamp: new Date().toISOString(), changedBy: 'system' }],
    resolutionAttempts: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    upvoteCount: 0,
    upvotedByIds: [],
  });
}

export function listenToPublicIssues(callback: (issues: PublicIssue[]) => void) {
  const constraints: QueryConstraint[] = [
    where('status', 'in', ['assigned', 'in_progress', 'pending_citizen_confirmation', 'resolved', 'disputed']),
    limit(100),
  ];
  return onSnapshot(query(collection(db, 'issues'), ...constraints), (snapshot) => {
    callback(snapshot.docs.map((item) => publicIssueFromIssue({ id: item.id, ...item.data() } as Issue)));
  });
}

export async function findIssueByPublicId(publicTrackingId: string) {
  const result = await getDocs(
    query(collection(db, 'issues'), where('publicTrackingId', '==', publicTrackingId), limit(1)),
  );
  if (result.empty) return null;
  const first = result.docs[0];
  return publicIssueFromIssue({ id: first.id, ...first.data() } as Issue);
}

export async function updateIssueStatus(issueId: string, status: string) {
  await updateDoc(doc(db, 'issues', issueId), { status, updatedAt: serverTimestamp() });
}
