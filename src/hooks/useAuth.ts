'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { ensureAnonymousUser } from '@/lib/firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    if (!auth.currentUser) void ensureAnonymousUser();
    return unsubscribe;
  }, []);
  return user;
}
