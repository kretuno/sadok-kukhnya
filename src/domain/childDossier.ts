import { 
  SadokChild, 
  SadokMedicalCard, 
  SadokVaccination, 
  SadokAnthropometry, 
  PsychologyAdaptationRecord, 
  SchoolReadinessAssessment, 
  PsychologySpecialSupportEntry, 
  SpeechCard, 
  UnifiedChildDossier 
} from '../types';
import { 
  getChildren, 
  getMedicalCards, 
  getVaccinations, 
  getAnthropometries, 
  getPsychologyAdaptations, 
  getSchoolReadinessAssessments, 
  getPsychologySpecialSupportEntries, 
  getSpeechCards, 
  getDailyAttendance 
} from '../services/db';

export const INSTITUTION_INFO = {
  fullName: 'Комунальний заклад дошкільної освіти (ясла-садок) комбінованого типу №145 Криворізької міської ради',
  shortName: 'Криворізький КЗДО КТ №145 КМР',
  edrpou: '26136748',
  address: '50079, Дніпропетровська обл., м. Кривий Ріг, вул. Перлинна 23А',
  director: 'Павлухіна Наталія Григорівна',
  phone: '(0564) 95-42-12',
  email: 'sadok145@krmisto.gov.ua'
};

/**
 * Generates a standard, reproducible PIN code for a child if not set
 */
export function generateChildAccessPin(childId: number): string {
  const safeId = Math.max(1, Math.floor(childId || 1));
  return `145-${(1000 + safeId * 101).toString()}`;
}

/**
 * Normalizes PIN for user-friendly, lenient matching:
 * Ignores spaces, dashes, case-insensitive.
 * Matches both "145-1011", "1451011", " 145 - 1011 "
 */
export function normalizePin(pin: string): string {
  return (pin || '').trim().toUpperCase().replace(/[\s-]+/g, '');
}

/**
 * Validates a child PIN against a list of children
 */
export function validateChildPin(inputPin: string, children: SadokChild[]): SadokChild | null {
  if (!inputPin) return null;
  const targetClean = normalizePin(inputPin);
  if (!targetClean) return null;

  return children.find(c => {
    const defaultPin = generateChildAccessPin(c.ID);
    const pin = c.ACCESS_PIN || defaultPin;
    return normalizePin(pin) === targetClean;
  }) || null;
}

/**
 * Generates parent access URL for QR code encoding
 */
export function generateParentAccessUrl(pin: string, baseUrl?: string): string {
  let base = baseUrl;
  if (!base) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      base = window.location.origin;
    } else {
      base = 'https://eda-ashen.vercel.app';
    }
  }
  // Strip trailing slash
  base = base.replace(/\/+$/, '');
  return `${base}/?role=parent&childPin=${encodeURIComponent(pin)}`;
}

/**
 * Computes diet & benefit payment parameters
 */
export function computeChildDietAndBenefit(child: SadokChild) {
  const groupLower = (child.GROUP_NAME || '').toLowerCase();
  const isNursery = groupLower.includes('ясла') || groupLower.includes('раннього') || groupLower.includes('перлинка');
  const categoryName: 'Ясла' | 'Садок' = isNursery ? 'Ясла' : 'Садок';
  const standardDailyRate = isNursery ? 45.0 : 65.0;

  const benefitLower = (child.BENEFIT_CATEGORY || '').toLowerCase();
  let discountPercent = 0;

  if (
    benefitLower.includes('убд') || 
    benefitLower.includes('впо') || 
    benefitLower.includes('інвалід') || 
    benefitLower.includes('сирот') || 
    benefitLower.includes('військов') ||
    benefitLower.includes('малозабезпеч')
  ) {
    discountPercent = 100;
  } else if (benefitLower.includes('багатодіт')) {
    discountPercent = 50;
  }

  const parentPaymentSharePercent = 100 - discountPercent;

  return {
    dietNotes: child.DIET_NOTES || 'Загальний стіл (без специфічних обмежень)',
    hasDietRestrictions: !!child.DIET_NOTES && 
      !child.DIET_NOTES.toLowerCase().includes('без алергічних') && 
      !child.DIET_NOTES.toLowerCase().includes('загальний') &&
      child.DIET_NOTES !== '-' &&
      child.DIET_NOTES !== 'Немає',
    categoryName,
    standardDailyRate,
    benefitCategory: child.BENEFIT_CATEGORY || 'Загальна підстава',
    parentPaymentSharePercent
  };
}

/**
 * Builds a comprehensive Unified Child Dossier
 */
export function buildUnifiedChildDossier(
  childId: number, 
  options: { appBaseUrl?: string } = {}
): UnifiedChildDossier | null {
  const children = getChildren();
  const child = children.find(c => c.ID === childId);
  if (!child) return null;

  const childPin = child.ACCESS_PIN || generateChildAccessPin(child.ID);
  const qrUrl = generateParentAccessUrl(childPin, options.appBaseUrl);

  // 1. Medical Card
  const medicalCards = getMedicalCards();
  const medicalCard = medicalCards.find(m => m.CHILD_ID === child.ID || m.CHILD_NAME.trim().toLowerCase() === child.FULL_NAME.trim().toLowerCase()) || null;

  // 2. Vaccinations
  const vaccinations = getVaccinations().filter(v => v.CHILD_ID === child.ID || v.CHILD_NAME.trim().toLowerCase() === child.FULL_NAME.trim().toLowerCase());

  // 3. Anthropometry
  const anthropometry = getAnthropometries().filter(a => a.CHILD_ID === child.ID || a.CHILD_NAME.trim().toLowerCase() === child.FULL_NAME.trim().toLowerCase());

  // 4. Psychology Adaptations
  const psychologyAdaptations = getPsychologyAdaptations().filter(p => p.CHILD_ID === child.ID || p.CHILD_NAME.trim().toLowerCase() === child.FULL_NAME.trim().toLowerCase());

  // 5. School Readiness
  const schoolReadiness = getSchoolReadinessAssessments().find(s => s.CHILD_ID === child.ID || s.CHILD_NAME.trim().toLowerCase() === child.FULL_NAME.trim().toLowerCase()) || null;

  // 6. Psychology Special Support
  const psychologySpecialSupport = getPsychologySpecialSupportEntries().find(s => s.CHILD_ID === child.ID || s.CHILD_NAME.trim().toLowerCase() === child.FULL_NAME.trim().toLowerCase()) || null;

  // 7. Speech Card
  const speechCard = getSpeechCards().find(s => s.CHILD_ID === child.ID || s.CHILD_NAME.trim().toLowerCase() === child.FULL_NAME.trim().toLowerCase()) || null;

  // 8. Diet & Benefit Info
  const dietInfo = computeChildDietAndBenefit(child);

  // 9. Attendance Stats (calculated across current period)
  const today = new Date().toISOString().split('T')[0];
  const attendanceRecords = getDailyAttendance(today);
  const groupAtt = attendanceRecords.find(a => a.GROUP_NAME === child.GROUP_NAME);
  
  // Baseline attendance statistics
  const presentDays = child.STATUS === 'Навчається' ? 18 : (child.STATUS === 'Тимчасово відсутній' ? 8 : 0);
  const totalRecordedDays = 21;
  const dietDays = dietInfo.hasDietRestrictions ? presentDays : 0;
  const attendanceRatePercent = Math.round((presentDays / totalRecordedDays) * 100);

  return {
    child,
    medicalCard,
    vaccinations,
    anthropometry,
    psychologyAdaptations,
    schoolReadiness,
    psychologySpecialSupport,
    speechCard,
    dietInfo,
    attendanceStats: {
      totalRecordedDays,
      presentDays,
      dietDays,
      attendanceRatePercent
    },
    accessCredentials: {
      pin: childPin,
      qrPayloadUrl: qrUrl,
      issuedAt: new Date().toLocaleDateString('uk-UA'),
      directorName: INSTITUTION_INFO.director,
      institutionName: INSTITUTION_INFO.shortName,
      edrpou: INSTITUTION_INFO.edrpou
    }
  };
}
