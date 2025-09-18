import { suite, it, expect } from 'vitest';
import { BanTemplatesDataSchema } from '@modules/ConfigStore/schema/banlist';

suite('BanTemplatesDataSchema', () => {
  it('accepts optional text', () => {
    const input = {
      id: 'a'.repeat(21),
      reason: 'test reason',
      duration: 'permanent' as const,
      text: 'some optional text',
    };
    const res = BanTemplatesDataSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.text).toBe('some optional text');
    }
  });

  it('accepts missing text', () => {
    const input = {
      id: 'b'.repeat(21),
      reason: 'another reason',
      duration: { value: 2, unit: 'days' as const },
    };
    const res = BanTemplatesDataSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.text).toBeUndefined();
    }
  });
});
