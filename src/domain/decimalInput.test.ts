import { describe, expect, it } from 'vitest';
import { parseNonNegativeDecimalDraft } from './decimalInput';

describe('parseNonNegativeDecimalDraft', () => {
  it('keeps intermediate input that starts with zero', () => {
    expect(parseNonNegativeDecimalDraft('0')).toEqual({ accepted: true, complete: true, value: 0 });
    expect(parseNonNegativeDecimalDraft('0.')).toEqual({ accepted: true, complete: false });
    expect(parseNonNegativeDecimalDraft('0.5')).toEqual({ accepted: true, complete: true, value: 0.5 });
  });

  it('supports a decimal comma and rejects invalid values', () => {
    expect(parseNonNegativeDecimalDraft('0,25')).toEqual({ accepted: true, complete: true, value: 0.25 });
    expect(parseNonNegativeDecimalDraft('-1').accepted).toBe(false);
    expect(parseNonNegativeDecimalDraft('abc').accepted).toBe(false);
  });
});
