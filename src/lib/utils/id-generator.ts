const PUBLIC_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PUBLIC_ID_DIGITS = '23456789';

function randomPublicIdSegment(length: number, alphabet = PUBLIC_ID_CHARS): string {
  let segment = '';
  for (let i = 0; i < length; i++) {
    segment += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return segment;
}

export function generatePublicId(): string {
  return `CS-${randomPublicIdSegment(4, PUBLIC_ID_DIGITS)}-${randomPublicIdSegment(4)}`;
}

export function fallbackPublicId(now = Date.now()): string {
  return `CS-${now.toString(36).toUpperCase().slice(-8)}`;
}
