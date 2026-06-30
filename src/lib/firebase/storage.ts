'use client';

import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from './config';

export async function uploadIssuePhoto(issueId: string, file: File): Promise<string> {
  const storageRef = ref(storage, `issues/${issueId}/report_photo.jpg`);
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type || 'image/jpeg' });
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', undefined, reject, () => resolve());
  });
  return getDownloadURL(storageRef);
}
