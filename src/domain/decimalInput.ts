export interface DecimalDraft {
  accepted: boolean;
  complete: boolean;
  value?: number;
}

export function parseNonNegativeDecimalDraft(rawValue: string): DecimalDraft {
  if (!/^\d*(?:[.,]\d*)?$/.test(rawValue)) return { accepted: false, complete: false };
  const normalized = rawValue.replace(',', '.');
  if (!normalized || normalized.endsWith('.')) return { accepted: true, complete: false };
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return { accepted: false, complete: false };
  return { accepted: true, complete: true, value };
}
