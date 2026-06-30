'use client';

import { useEffect, useState } from 'react';
import { listenToPublicIssues } from '@/lib/firebase/firestore';
import type { PublicIssue } from '@/types/issue';

export function useIssues() {
  const [issues, setIssues] = useState<PublicIssue[]>([]);
  useEffect(() => listenToPublicIssues(setIssues), []);
  return issues;
}
