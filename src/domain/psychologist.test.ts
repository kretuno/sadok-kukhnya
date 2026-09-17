import { describe, it, expect } from 'vitest';
import {
  calculateWeeklyWorkload,
  tallySpecialSupport,
  evaluateSchoolReadinessScores,
  getAdaptationDistribution
} from './psychologist';
import {
  PsychologyDailyLogEntry,
  PsychologySpecialSupportEntry,
  PsychologyAdaptationRecord
} from '../types';

describe('Psychologist Domain Logic (МОН України)', () => {
  it('correctly calculates practical and methodological weekly workload balance (20h / 20h norm)', () => {
    const entries: PsychologyDailyLogEntry[] = [
      {
        ID: 1,
        DATE: '2026-09-15',
        ACTIVITY_TYPE: 'Діагностична',
        CATEGORY: 'Діти',
        TARGET_NAME: 'Група «Сонечко»',
        CONTENT_TOPIC: 'Первинна діагностика адаптації',
        HOURS_SPENT: 3.5
      },
      {
        ID: 2,
        DATE: '2026-09-15',
        ACTIVITY_TYPE: 'Корекційно-розвиткова',
        CATEGORY: 'Діти',
        TARGET_NAME: 'Дитина ООП',
        CONTENT_TOPIC: 'Корекція тривожності',
        HOURS_SPENT: 2.5
      },
      {
        ID: 3,
        DATE: '2026-09-16',
        ACTIVITY_TYPE: 'Консультаційна',
        CATEGORY: 'Батьки',
        TARGET_NAME: 'Батьки вихованців',
        CONTENT_TOPIC: 'Консультація щодо адаптації',
        HOURS_SPENT: 2.0
      },
      {
        ID: 4,
        DATE: '2026-09-16',
        ACTIVITY_TYPE: 'Просвітницька',
        CATEGORY: 'Педагоги',
        TARGET_NAME: 'Вихователі',
        CONTENT_TOPIC: 'Психологічна допомога в укритті',
        HOURS_SPENT: 4.0
      },
      {
        ID: 5,
        DATE: '2026-09-17',
        ACTIVITY_TYPE: 'Організаційно-методична',
        CATEGORY: 'Методична / Самоосвіта',
        TARGET_NAME: 'Кабінет психолога',
        CONTENT_TOPIC: 'Заповнення карток супроводу та ІПР',
        HOURS_SPENT: 6.0
      }
    ];

    const result = calculateWeeklyWorkload(entries);

    // Practical work: 3.5 + 2.5 + 2.0 + 4.0 = 12.0 hours
    expect(result.practicalHours).toBe(12.0);
    // Methodological work: 6.0 hours
    expect(result.methodologicalHours).toBe(6.0);
    // Total hours: 18.0
    expect(result.totalHours).toBe(18.0);

    // Norms: 20h practical, 20h methodological
    expect(result.practicalNorm).toBe(20);
    expect(result.methodologicalNorm).toBe(20);

    // Progress percentages: 12/20 = 60%, 6/20 = 30%
    expect(result.practicalProgressPct).toBe(60);
    expect(result.methodologicalProgressPct).toBe(30);

    expect(result.isPracticalFulfilled).toBe(false);
    expect(result.isMethodologicalFulfilled).toBe(false);
  });

  it('correctly marks workload as fulfilled when exceeding 20 hours', () => {
    const entries: PsychologyDailyLogEntry[] = [
      {
        ID: 1,
        DATE: '2026-09-15',
        ACTIVITY_TYPE: 'Діагностична',
        CATEGORY: 'Діти',
        TARGET_NAME: 'Група «Сонечко»',
        CONTENT_TOPIC: 'Діагностика',
        HOURS_SPENT: 21.0
      },
      {
        ID: 2,
        DATE: '2026-09-16',
        ACTIVITY_TYPE: 'Організаційно-методична',
        CATEGORY: 'Методична / Самоосвіта',
        TARGET_NAME: 'Кабінет',
        CONTENT_TOPIC: 'Методична робота',
        HOURS_SPENT: 20.5
      }
    ];

    const result = calculateWeeklyWorkload(entries);
    expect(result.practicalProgressPct).toBe(100);
    expect(result.methodologicalProgressPct).toBe(100);
    expect(result.isPracticalFulfilled).toBe(true);
    expect(result.isMethodologicalFulfilled).toBe(true);
  });

  it('correctly tallies special support categories (ООП, ВПО, Military families, High anxiety)', () => {
    const list: PsychologySpecialSupportEntry[] = [
      {
        ID: 1,
        CHILD_ID: 10,
        CHILD_NAME: 'Бондаренко Артем',
        GROUP_NAME: 'Група «Калинка»',
        CATEGORY: 'ООП (ІПР / Інклюзія)',
        DIAGNOSTIC_DATE: '2026-09-01',
        ANXIETY_SCORE: 3,
        STRESS_REACTION: 'Чутливість до шуму',
        SHELTER_BEHAVIOR: 'Потребує супроводу',
        INDIVIDUAL_PLAN: 'ІПР супровід',
        DYNAMIC_STATUS: 'Стабільний стан',
        UPDATED_AT: '2026-09-10'
      },
      {
        ID: 2,
        CHILD_ID: 11,
        CHILD_NAME: 'Сидоренко Владислав',
        GROUP_NAME: 'Група «Сонечко»',
        CATEGORY: 'ВПО (Внутрішньо переміщені)',
        DIAGNOSTIC_DATE: '2026-09-01',
        ANXIETY_SCORE: 4,
        STRESS_REACTION: 'Страх тривог',
        SHELTER_BEHAVIOR: 'Сидить біля вихователя',
        INDIVIDUAL_PLAN: 'Зниження тривожності',
        DYNAMIC_STATUS: 'Позитивна динаміка',
        UPDATED_AT: '2026-09-10'
      },
      {
        ID: 3,
        CHILD_ID: 12,
        CHILD_NAME: 'Мельник Дарина',
        GROUP_NAME: 'Група «Барвінок»',
        CATEGORY: 'Діти військовослужбовців / УБД',
        DIAGNOSTIC_DATE: '2026-09-01',
        ANXIETY_SCORE: 3,
        STRESS_REACTION: 'Плач за татом',
        SHELTER_BEHAVIOR: 'Спокійна',
        INDIVIDUAL_PLAN: 'Підтримка',
        DYNAMIC_STATUS: 'Позитивна динаміка',
        UPDATED_AT: '2026-09-10'
      },
      {
        ID: 4,
        CHILD_ID: 13,
        CHILD_NAME: 'Ткаченко Максим',
        GROUP_NAME: 'Група «Калинка»',
        CATEGORY: 'Підвищена тривожність / Стрес',
        DIAGNOSTIC_DATE: '2026-09-01',
        ANXIETY_SCORE: 5,
        STRESS_REACTION: 'Нічні жахи',
        SHELTER_BEHAVIOR: 'Моторний неспокій',
        INDIVIDUAL_PLAN: 'Вправи розслаблення',
        DYNAMIC_STATUS: 'Критичний стан / Направлено до фахівців',
        UPDATED_AT: '2026-09-10'
      }
    ];

    const tally = tallySpecialSupport(list);
    expect(tally.total).toBe(4);
    expect(tally.oopCount).toBe(1);
    expect(tally.vpoCount).toBe(1);
    expect(tally.militaryFamilyCount).toBe(1);
    expect(tally.highAnxietyCount).toBe(1);
    expect(tally.criticalCount).toBe(1);
  });

  it('correctly calculates school readiness status across 4 developmental spheres', () => {
    // Max score = 20
    expect(evaluateSchoolReadinessScores({ motivational: 5, intellectual: 5, emotional: 5, social: 5 })).toEqual({
      total: 20,
      status: 'Високий (Готовий до школи)'
    });

    // Score 15 (14..16) -> Достатній
    expect(evaluateSchoolReadinessScores({ motivational: 4, intellectual: 4, emotional: 3, social: 4 })).toEqual({
      total: 15,
      status: 'Достатній (Переважно готовий)'
    });

    // Score 12 (10..13) -> Потребує додаткового супроводу
    expect(evaluateSchoolReadinessScores({ motivational: 3, intellectual: 3, emotional: 3, social: 3 })).toEqual({
      total: 12,
      status: 'Потребує додаткового супроводу'
    });

    // Score 8 (<10) -> Низький
    expect(evaluateSchoolReadinessScores({ motivational: 2, intellectual: 2, emotional: 2, social: 2 })).toEqual({
      total: 8,
      status: 'Низький (Не готовий)'
    });
  });

  it('correctly calculates adaptation distribution percentages', () => {
    const records: PsychologyAdaptationRecord[] = [
      { ID: 1, CHILD_ID: 1, CHILD_NAME: 'A', GROUP_NAME: 'Група', START_DATE: '', WEEK_NUMBER: 1, EMOTIONAL_STATE: 'Позитивний', ANXIETY_LEVEL: 'Низький', APPETITE: 'Хороший', SLEEP: 'Спокійний', SOCIAL_INTERACTION: 'Активна', ADAPTATION_LEVEL: 'Легка', UPDATED_AT: '' },
      { ID: 2, CHILD_ID: 2, CHILD_NAME: 'B', GROUP_NAME: 'Група', START_DATE: '', WEEK_NUMBER: 1, EMOTIONAL_STATE: 'Позитивний', ANXIETY_LEVEL: 'Низький', APPETITE: 'Хороший', SLEEP: 'Спокійний', SOCIAL_INTERACTION: 'Активна', ADAPTATION_LEVEL: 'Легка', UPDATED_AT: '' },
      { ID: 3, CHILD_ID: 3, CHILD_NAME: 'C', GROUP_NAME: 'Група', START_DATE: '', WEEK_NUMBER: 1, EMOTIONAL_STATE: 'Нестійкий', ANXIETY_LEVEL: 'Середній', APPETITE: 'Вибірковий', SLEEP: 'Неспокійний', SOCIAL_INTERACTION: 'Пасивна', ADAPTATION_LEVEL: 'Середня', UPDATED_AT: '' },
      { ID: 4, CHILD_ID: 4, CHILD_NAME: 'D', GROUP_NAME: 'Група', START_DATE: '', WEEK_NUMBER: 1, EMOTIONAL_STATE: 'Агресивний / Пригнічений', ANXIETY_LEVEL: 'Високий', APPETITE: 'Поганий / Відмова', SLEEP: 'Порушений', SOCIAL_INTERACTION: 'Уникає', ADAPTATION_LEVEL: 'Важка', UPDATED_AT: '' }
    ];

    const distribution = getAdaptationDistribution(records);
    expect(distribution.total).toBe(4);
    expect(distribution.easy).toBe(2);
    expect(distribution.medium).toBe(1);
    expect(distribution.hard).toBe(1);
    expect(distribution.easyPct).toBe(50);
    expect(distribution.mediumPct).toBe(25);
    expect(distribution.hardPct).toBe(25);
  });
});
