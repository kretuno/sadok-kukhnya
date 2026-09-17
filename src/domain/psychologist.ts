import {
  PsychologyDailyLogEntry,
  PsychologySpecialSupportEntry,
  PsychologyAdaptationRecord,
  SchoolReadinessAssessment
} from '../types';

export interface WeeklyWorkloadSummary {
  practicalHours: number;
  methodologicalHours: number;
  totalHours: number;
  practicalNorm: number;
  methodologicalNorm: number;
  practicalProgressPct: number;
  methodologicalProgressPct: number;
  isPracticalFulfilled: boolean;
  isMethodologicalFulfilled: boolean;
}

/**
 * According to Ukrainian Ministry of Education and Science (МОН України) regulations,
 * a full-time preschool practical psychologist works 40 hours per week:
 * - 20 hours: direct practical work (Diagnostics, Correction/Development, Consultations, Educational)
 * - 20 hours: organizational and methodological work (preparation, data processing, reporting, self-education)
 */
export function calculateWeeklyWorkload(entries: PsychologyDailyLogEntry[]): WeeklyWorkloadSummary {
  let practicalHours = 0;
  let methodologicalHours = 0;

  for (const entry of entries) {
    const hours = Number(entry.HOURS_SPENT) || 0;
    if (entry.ACTIVITY_TYPE === 'Організаційно-методична') {
      methodologicalHours += hours;
    } else {
      practicalHours += hours;
    }
  }

  const practicalNorm = 20;
  const methodologicalNorm = 20;
  const totalHours = practicalHours + methodologicalHours;

  const practicalProgressPct = Math.min(100, Math.round((practicalHours / practicalNorm) * 100));
  const methodologicalProgressPct = Math.min(100, Math.round((methodologicalHours / methodologicalNorm) * 100));

  return {
    practicalHours: Number(practicalHours.toFixed(1)),
    methodologicalHours: Number(methodologicalHours.toFixed(1)),
    totalHours: Number(totalHours.toFixed(1)),
    practicalNorm,
    methodologicalNorm,
    practicalProgressPct,
    methodologicalProgressPct,
    isPracticalFulfilled: practicalHours >= practicalNorm,
    isMethodologicalFulfilled: methodologicalHours >= methodologicalNorm
  };
}

export interface SpecialSupportSummary {
  total: number;
  oopCount: number;
  vpoCount: number;
  militaryFamilyCount: number;
  highAnxietyCount: number;
  otherCount: number;
  criticalCount: number;
}

export function tallySpecialSupport(entries: PsychologySpecialSupportEntry[]): SpecialSupportSummary {
  let oopCount = 0;
  let vpoCount = 0;
  let militaryFamilyCount = 0;
  let highAnxietyCount = 0;
  let otherCount = 0;
  let criticalCount = 0;

  for (const item of entries) {
    if (item.CATEGORY.includes('ООП') || item.CATEGORY.includes('ІПР') || item.CATEGORY.includes('Інклюзія')) {
      oopCount++;
    } else if (item.CATEGORY.includes('ВПО')) {
      vpoCount++;
    } else if (item.CATEGORY.includes('військовослужбовців') || item.CATEGORY.includes('УБД')) {
      militaryFamilyCount++;
    } else if (item.CATEGORY.includes('тривожність')) {
      highAnxietyCount++;
    } else {
      otherCount++;
    }

    if (item.DYNAMIC_STATUS === 'Критичний стан / Направлено до фахівців') {
      criticalCount++;
    }
  }

  return {
    total: entries.length,
    oopCount,
    vpoCount,
    militaryFamilyCount,
    highAnxietyCount,
    otherCount,
    criticalCount
  };
}

export function evaluateSchoolReadinessScores(scores: {
  motivational: number;
  intellectual: number;
  emotional: number;
  social: number;
}): { total: number; status: SchoolReadinessAssessment['READINESS_STATUS'] } {
  const m = Math.max(1, Math.min(5, scores.motivational || 1));
  const i = Math.max(1, Math.min(5, scores.intellectual || 1));
  const e = Math.max(1, Math.min(5, scores.emotional || 1));
  const s = Math.max(1, Math.min(5, scores.social || 1));

  const total = m + i + e + s;
  let status: SchoolReadinessAssessment['READINESS_STATUS'] = 'Високий (Готовий до школи)';
  if (total < 10) {
    status = 'Низький (Не готовий)';
  } else if (total < 14) {
    status = 'Потребує додаткового супроводу';
  } else if (total < 17) {
    status = 'Достатній (Переважно готовий)';
  }

  return { total, status };
}

export interface AdaptationDistribution {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  easyPct: number;
  mediumPct: number;
  hardPct: number;
}

export function getAdaptationDistribution(records: PsychologyAdaptationRecord[]): AdaptationDistribution {
  const total = records.length;
  if (total === 0) {
    return { total: 0, easy: 0, medium: 0, hard: 0, easyPct: 0, mediumPct: 0, hardPct: 0 };
  }

  const easy = records.filter(r => r.ADAPTATION_LEVEL === 'Легка').length;
  const medium = records.filter(r => r.ADAPTATION_LEVEL === 'Середня').length;
  const hard = records.filter(r => r.ADAPTATION_LEVEL === 'Важка').length;

  return {
    total,
    easy,
    medium,
    hard,
    easyPct: Math.round((easy / total) * 100),
    mediumPct: Math.round((medium / total) * 100),
    hardPct: Math.round((hard / total) * 100)
  };
}
