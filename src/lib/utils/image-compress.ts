import imageCompression from 'browser-image-compression';
import { MAX_PHOTO_SIZE_KB } from './constants';

export async function compressIssueImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: MAX_PHOTO_SIZE_KB / 1024,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
  });
}
