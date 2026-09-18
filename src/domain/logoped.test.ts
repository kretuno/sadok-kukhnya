import { describe, it, expect } from 'vitest';
import {
  calculateLogopedWeeklyWorkload,
  tallySpeechDiagnostics,
  calculateCorrectionRate,
  generateSpeechAnnualReportText
} from './logoped';
import { SpeechCard, SpeechDailyLogEntry } from '../types';

describe('Logoped Domain Logic', () => {
  const sampleCards: SpeechCard[] = [
    {
      ID: 1,
      CHILD_ID: 101,
      CHILD_NAME: 'Бондаренко Артем',
      GROUP_NAME: 'Група «Калинка»',
      BIRTH_DATE: '2020-04-15',
      ENROLLMENT_DATE: '2024-09-01',
      DIAGNOSIS: 'ФФНМ',
      ARTICULATION_APPARATUS: 'Норма',
      PHONEMIC_HEARING: 'Знижений',
      SOUND_STATUSES: [
        { sound: '[С]', group: 'свистячі', stage: 'Введено в мовлення (Норма)' },
        { sound: '[Ш]', group: 'шиплячі', stage: 'Автоматизація в реченнях' },
        { sound: '[Р]', group: 'сонори', stage: 'Постановка звука' }
      ],
      VOCABULARY_LEVEL: 'Віковий',
      GRAMMAR_STRUCTURE: 'Сформований',
      COHERENT_SPEECH: 'Задовільне',
      INDIVIDUAL_PLAN: 'Гімнастика та постановка',
      DYNAMICS: 'Позитивна динаміка',
      LOGOPED_CONCLUSION: 'ФФНМ',
      UPDATED_AT: '2026-09-18'
    },
    {
      ID: 2,
      CHILD_ID: 102,
      CHILD_NAME: 'Коваленко Софія',
      GROUP_NAME: 'Група «Казка»',
      BIRTH_DATE: '2022-08-19',
      ENROLLMENT_DATE: '2024-09-01',
      DIAGNOSIS: 'Дислалія',
      ARTICULATION_APPARATUS: 'Норма',
      PHONEMIC_HEARING: 'Збережений',
      SOUND_STATUSES: [
        { sound: '[Р]', group: 'сонори', stage: 'Введено в мовлення (Норма)' },
        { sound: '[Л]', group: 'сонори', stage: 'Введено в мовлення (Норма)' }
      ],
      VOCABULARY_LEVEL: 'Багатий',
      GRAMMAR_STRUCTURE: 'Норма',
      COHERENT_SPEECH: 'Розвинене',
      INDIVIDUAL_PLAN: 'Закріплення',
      DYNAMICS: 'Звуки автоматизовано (Норма)',
      LOGOPED_CONCLUSION: 'Норма після корекції',
      UPDATED_AT: '2026-09-18'
    },
    {
      ID: 3,
      CHILD_ID: 103,
      CHILD_NAME: 'Сидоренко Владислав',
      GROUP_NAME: 'Група «Сонечко»',
      BIRTH_DATE: '2021-06-10',
      ENROLLMENT_DATE: '2025-09-01',
      DIAGNOSIS: 'ЗНМ III рівень',
      ARTICULATION_APPARATUS: 'Гіпотонус',
      PHONEMIC_HEARING: 'Порушений',
      SOUND_STATUSES: [
        { sound: '[С]', group: 'свистячі', stage: 'Автоматизація в словах' },
        { sound: '[Ш]', group: 'шиплячі', stage: 'Підготовчий (гімнастика)' }
      ],
      VOCABULARY_LEVEL: 'Знижений',
      GRAMMAR_STRUCTURE: 'Аграматизми',
      COHERENT_SPEECH: 'Фразове просте',
      INDIVIDUAL_PLAN: 'Масаж та гімнастика',
      DYNAMICS: 'Повільний поступ',
      LOGOPED_CONCLUSION: 'ЗНМ III',
      UPDATED_AT: '2026-09-18'
    }
  ];

  const sampleDailyLogs: SpeechDailyLogEntry[] = [
    {
      ID: 1,
      DATE: '2026-09-18',
      ACTIVITY_TYPE: 'Індивідуальне заняття',
      CATEGORY: 'Діти',
      TARGET_NAME: 'Артем Бондаренко',
      TOPIC: 'Постановка звука [Р]',
      HOURS_SPENT: 0.5
    },
    {
      ID: 2,
      DATE: '2026-09-18',
      ACTIVITY_TYPE: 'Підгрупове заняття',
      CATEGORY: 'Діти',
      TARGET_NAME: 'Підгрупа «Калинка»',
      TOPIC: 'Диференціація [С]-[Ш]',
      HOURS_SPENT: 0.75
    },
    {
      ID: 3,
      DATE: '2026-09-18',
      ACTIVITY_TYPE: 'Консультація батьків',
      CATEGORY: 'Батьки',
      TARGET_NAME: 'Мати Софії',
      TOPIC: 'Поради щодо чистомовок',
      HOURS_SPENT: 0.5
    },
    {
      ID: 4,
      DATE: '2026-09-18',
      ACTIVITY_TYPE: 'Організаційно-методична робота',
      CATEGORY: 'Методична',
      TARGET_NAME: 'Кабінет',
      TOPIC: 'Підготовка дидактичних карток',
      HOURS_SPENT: 1.0
    }
  ];

  it('calculates weekly logoped workload correctly against 20h norm', () => {
    const summary = calculateLogopedWeeklyWorkload(sampleDailyLogs);

    // Direct: 0.5 + 0.75 + 0.5 = 1.75 hours
    expect(summary.directHours).toBe(1.75);
    // Methodological: 1.0 hour
    expect(summary.methodologicalHours).toBe(1.0);
    expect(summary.totalHours).toBe(2.75);
    expect(summary.directNorm).toBe(20);
    expect(summary.directProgressPct).toBe(9); // Math.round((1.75 / 20) * 100) = 9%
    expect(summary.isDirectFulfilled).toBe(false);

    expect(summary.breakdown.individualCount).toBe(1);
    expect(summary.breakdown.subgroupCount).toBe(1);
    expect(summary.breakdown.consultationCount).toBe(1);
    expect(summary.breakdown.methodologicalCount).toBe(1);
  });

  it('marks direct workload as fulfilled when 20 or more hours recorded', () => {
    const fulfilledLogs: SpeechDailyLogEntry[] = [
      {
        ID: 10,
        DATE: '2026-09-18',
        ACTIVITY_TYPE: 'Індивідуальне заняття',
        CATEGORY: 'Діти',
        TARGET_NAME: 'Діти',
        TOPIC: 'Заняття',
        HOURS_SPENT: 20.5
      }
    ];
    const summary = calculateLogopedWeeklyWorkload(fulfilledLogs);
    expect(summary.directHours).toBe(20.5);
    expect(summary.directProgressPct).toBe(100);
    expect(summary.isDirectFulfilled).toBe(true);
  });

  it('tallies speech diagnostics correctly across all categories', () => {
    const summary = tallySpeechDiagnostics(sampleCards);

    expect(summary.total).toBe(3);
    expect(summary.diagnosesBreakdown['ФФНМ']).toBe(1);
    expect(summary.diagnosesBreakdown['Дислалія']).toBe(1);
    expect(summary.diagnosesBreakdown['ЗНМ III рівень']).toBe(1);
    expect(summary.diagnosesBreakdown['Норма']).toBe(0);

    expect(summary.dynamicsBreakdown.positive).toBe(1);
    expect(summary.dynamicsBreakdown.completed).toBe(1);
    expect(summary.dynamicsBreakdown.slow).toBe(1);

    // Sounds in active correction (excluding 'Введено в мовлення (Норма)'):
    // Card 1: [Ш] (hissing), [Р] (sonor) -> whistling [С] is normalized
    // Card 2: [Р], [Л] both normalized
    // Card 3: [С] (whistling), [Ш] (hissing)
    expect(summary.soundGroupsInCorrection.whistling).toBe(1);
    expect(summary.soundGroupsInCorrection.hissing).toBe(2);
    expect(summary.soundGroupsInCorrection.sonors).toBe(1);
  });

  it('calculates sound correction completion rate accurately', () => {
    const rate = calculateCorrectionRate(sampleCards);

    // Total sounds in 3 cards: 3 + 2 + 2 = 7
    expect(rate.totalSounds).toBe(7);
    // Normalized sounds: Card 1 ([С]), Card 2 ([Р], [Л]) = 3
    expect(rate.automatedSounds).toBe(3);
    // Rate: 3 / 7 = 42.8% -> 43%
    expect(rate.ratePct).toBe(43);
  });

  it('generates official speech annual report text with institution details', () => {
    const report = generateSpeechAnnualReportText({
      cards: sampleCards,
      academicYear: '2024/2025 н.р.',
      institutionName: 'Криворізький КЗДО КТ №145 КМР',
      directorName: 'Павлухіна Н.Г.'
    });

    expect(report).toContain('Криворізький КЗДО КТ №145 КМР');
    expect(report).toContain('Павлухіна Н.Г.');
    expect(report).toContain('ЄДРПОУ: 26136748');
    expect(report).toContain('2024/2025 н.р.');
    expect(report).toContain('Всього дітей на логопедичному обліку: 3 осіб');
    expect(report).toContain('Звуків повністю виправлено та автоматизовано: 3 (43%)');
  });
});
