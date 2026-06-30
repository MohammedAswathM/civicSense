import { describe, expect, it } from 'vitest';
import { generatePublicId } from '@/lib/utils/id-generator';

describe('generatePublicId', () => {
  it('generates ID in CS-XXXX-YYYY format', () => {
    expect(generatePublicId()).toMatch(/^CS-\d{4}-[A-Z0-9]{4}$/);
  });

  it('does not include ambiguous characters', () => {
    for (let i = 0; i < 100; i++) {
      expect(generatePublicId()).not.toMatch(/[OI01]/);
    }
  });

  it('generates unique IDs across 1000 calls', () => {
    const ids = new Set(Array.from({ length: 1000 }, generatePublicId));
    expect(ids.size).toBeGreaterThan(990);
  });
});
