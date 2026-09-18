import { describe, it, expect, beforeAll } from 'vitest';
import { 
  generateChildAccessPin, 
  normalizePin, 
  validateChildPin, 
  generateParentAccessUrl, 
  computeChildDietAndBenefit,
  buildUnifiedChildDossier,
  INSTITUTION_INFO
} from './childDossier';
import { SadokChild } from '../types';

beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      key: (i: number) => Object.keys(store)[i] || null,
      length: 0
    } as any;
  }
});

describe('childDossier domain logic', () => {
  const mockChildren: SadokChild[] = [
    {
      ID: 1,
      FULL_NAME: 'Іваненко Артем Олександрович',
      BIRTH_DATE: '2023-04-12',
      GROUP_NAME: 'Група «Сонечко»',
      STATUS: 'Навчається',
      BENEFIT_CATEGORY: 'Багатодітна сім’я',
      ACCESS_PIN: '145-1011'
    },
    {
      ID: 2,
      FULL_NAME: 'Коваленко Софія Дмитрівна',
      BIRTH_DATE: '2022-08-19',
      GROUP_NAME: 'Група «Казка»',
      STATUS: 'Навчається',
      BENEFIT_CATEGORY: 'Діти УБД',
      DIET_NOTES: 'Обмеження: безмолочна дієта (лактозна непереносимість).',
      ACCESS_PIN: '145-2022'
    },
    {
      ID: 3,
      FULL_NAME: 'Шевченко Максим Ігорович',
      BIRTH_DATE: '2021-02-05',
      GROUP_NAME: 'Ясельна група «Перлинка»',
      STATUS: 'Навчається',
      BENEFIT_CATEGORY: 'ВПО (Внутрішньо переміщена особа)'
      // No explicit ACCESS_PIN -> should fallback to generated
    }
  ];

  describe('generateChildAccessPin', () => {
    it('generates standard reproducible PIN for child ID', () => {
      expect(generateChildAccessPin(1)).toBe('145-1101');
      expect(generateChildAccessPin(2)).toBe('145-1202');
      expect(generateChildAccessPin(5)).toBe('145-1505');
    });

    it('safely handles non-positive IDs', () => {
      expect(generateChildAccessPin(0)).toBe('145-1101');
      expect(generateChildAccessPin(-10)).toBe('145-1101');
    });
  });

  describe('normalizePin', () => {
    it('removes dashes, spaces, and normalizes casing', () => {
      expect(normalizePin('145-1011')).toBe('1451011');
      expect(normalizePin('  145 - 1011  ')).toBe('1451011');
      expect(normalizePin('1451011')).toBe('1451011');
      expect(normalizePin('кр-145-а')).toBe('КР145А');
    });

    it('handles empty or null-like inputs gracefully', () => {
      expect(normalizePin('')).toBe('');
      expect(normalizePin('   ')).toBe('');
    });
  });

  describe('validateChildPin', () => {
    it('validates and returns exact child for valid PIN', () => {
      const child = validateChildPin('145-1011', mockChildren);
      expect(child).not.toBeNull();
      expect(child?.ID).toBe(1);
      expect(child?.FULL_NAME).toBe('Іваненко Артем Олександрович');
    });

    it('validates PIN with lenient formatting (spaces or no dash)', () => {
      const child = validateChildPin(' 145 2022 ', mockChildren);
      expect(child).not.toBeNull();
      expect(child?.ID).toBe(2);
      expect(child?.FULL_NAME).toBe('Коваленко Софія Дмитрівна');
    });

    it('resolves auto-generated PIN when ACCESS_PIN is not pre-set on child', () => {
      // Child 3 ID=3 -> generated is 145-1303
      const child = validateChildPin('145-1303', mockChildren);
      expect(child).not.toBeNull();
      expect(child?.ID).toBe(3);
    });

    it('returns null for wrong PIN and isolates child data', () => {
      expect(validateChildPin('999-9999', mockChildren)).toBeNull();
      expect(validateChildPin('', mockChildren)).toBeNull();
      expect(validateChildPin('000', mockChildren)).toBeNull();
    });

    it('ensures Child 1 PIN does not grant access to Child 2', () => {
      const result = validateChildPin('145-1011', mockChildren);
      expect(result?.ID).toBe(1);
      expect(result?.ID).not.toBe(2);
    });
  });

  describe('generateParentAccessUrl', () => {
    it('generates direct URL with role=parent and childPin query param', () => {
      const url = generateParentAccessUrl('145-1011', 'https://eda-ashen.vercel.app');
      expect(url).toBe('https://eda-ashen.vercel.app/?role=parent&childPin=145-1011');
    });

    it('strips trailing slashes from base URL', () => {
      const url = generateParentAccessUrl('145-2022', 'https://example.com///');
      expect(url).toBe('https://example.com/?role=parent&childPin=145-2022');
    });
  });

  describe('computeChildDietAndBenefit', () => {
    it('computes 50% discount for large families', () => {
      const res = computeChildDietAndBenefit(mockChildren[0]);
      expect(res.categoryName).toBe('Садок');
      expect(res.standardDailyRate).toBe(65.0);
      expect(res.parentPaymentSharePercent).toBe(50);
      expect(res.hasDietRestrictions).toBe(false);
    });

    it('computes 100% discount for UBD and detects diet restrictions', () => {
      const res = computeChildDietAndBenefit(mockChildren[1]);
      expect(res.parentPaymentSharePercent).toBe(0); // 100% discount
      expect(res.hasDietRestrictions).toBe(true);
      expect(res.dietNotes).toContain('безмолочна дієта');
    });

    it('computes nursery category rate of 45 UAH and 100% discount for VPO', () => {
      const res = computeChildDietAndBenefit(mockChildren[2]);
      expect(res.categoryName).toBe('Ясла');
      expect(res.standardDailyRate).toBe(45.0);
      expect(res.parentPaymentSharePercent).toBe(0);
    });
  });

  describe('buildUnifiedChildDossier', () => {
    it('returns null for non-existing child ID', () => {
      expect(buildUnifiedChildDossier(99999)).toBeNull();
    });

    it('builds full dossier for child ID 1 from persistent db', () => {
      const dossier = buildUnifiedChildDossier(1, { appBaseUrl: 'https://eda-ashen.vercel.app' });
      expect(dossier).not.toBeNull();
      expect(dossier?.child.ID).toBe(1);
      expect(dossier?.accessCredentials.pin).toBeDefined();
      expect(dossier?.accessCredentials.directorName).toBe('Павлухіна Наталія Григорівна');
      expect(dossier?.accessCredentials.edrpou).toBe('26136748');
      expect(dossier?.accessCredentials.qrPayloadUrl).toContain('childPin=');
      expect(dossier?.attendanceStats.totalRecordedDays).toBeGreaterThan(0);
    });
  });

  describe('INSTITUTION_INFO', () => {
    it('has official Kryvyi Rih #145 details', () => {
      expect(INSTITUTION_INFO.director).toBe('Павлухіна Наталія Григорівна');
      expect(INSTITUTION_INFO.edrpou).toBe('26136748');
      expect(INSTITUTION_INFO.shortName).toBe('Криворізький КЗДО КТ №145 КМР');
    });
  });
});
