import {
  SpeechCard,
  SpeechDailyLogEntry,
  SpeechDiagnosisType,
  SoundCorrectionStage
} from '../types';

export interface WeeklyLogopedWorkloadSummary {
  directHours: number;
  methodologicalHours: number;
  totalHours: number;
  directNorm: number;
  directProgressPct: number;
  isDirectFulfilled: boolean;
  breakdown: {
    individualCount: number;
    subgroupCount: number;
    screeningCount: number;
    consultationCount: number;
    methodologicalCount: number;
  };
}

/**
 * According to Ukrainian preschool regulations (Закон України «Про дошкільну освіту»),
 * a full-time preschool speech-language pathologist (вчитель-логопед) has a weekly norm
 * of 20 hours of direct correctional-pedagogical, diagnostic and consultative work.
 */
export function calculateLogopedWeeklyWorkload(entries: SpeechDailyLogEntry[]): WeeklyLogopedWorkloadSummary {
  let directHours = 0;
  let methodologicalHours = 0;

  let individualCount = 0;
  let subgroupCount = 0;
  let screeningCount = 0;
  let consultationCount = 0;
  let methodologicalCount = 0;

  for (const entry of entries) {
    const hours = Number(entry.HOURS_SPENT) || 0;
    if (entry.ACTIVITY_TYPE === 'Організаційно-методична робота') {
      methodologicalHours += hours;
      methodologicalCount++;
    } else {
      directHours += hours;
      if (entry.ACTIVITY_TYPE === 'Індивідуальне заняття') individualCount++;
      else if (entry.ACTIVITY_TYPE === 'Підгрупове заняття') subgroupCount++;
      else if (entry.ACTIVITY_TYPE === 'Логопедичне обстеження (скринінг)') screeningCount++;
      else if (
        entry.ACTIVITY_TYPE === 'Консультація батьків' ||
        entry.ACTIVITY_TYPE === 'Консультація вихователів'
      ) {
        consultationCount++;
      }
    }
  }

  const directNorm = 20;
  const directProgressPct = Math.min(100, Math.round((directHours / directNorm) * 100));

  return {
    directHours: Number(directHours.toFixed(2)),
    methodologicalHours: Number(methodologicalHours.toFixed(2)),
    totalHours: Number((directHours + methodologicalHours).toFixed(2)),
    directNorm,
    directProgressPct,
    isDirectFulfilled: directHours >= directNorm,
    breakdown: {
      individualCount,
      subgroupCount,
      screeningCount,
      consultationCount,
      methodologicalCount
    }
  };
}

export interface SpeechDiagnosticsSummary {
  total: number;
  diagnosesBreakdown: Record<SpeechDiagnosisType, number>;
  soundGroupsInCorrection: {
    whistling: number; // свистячі
    hissing: number;   // шиплячі
    sonors: number;    // сонори
    guttural: number;  // задньоязикові
    other: number;
  };
  dynamicsBreakdown: {
    positive: number;
    slow: number;
    stable: number;
    completed: number;
  };
  stagesCount: Record<SoundCorrectionStage, number>;
}

export function tallySpeechDiagnostics(cards: SpeechCard[]): SpeechDiagnosticsSummary {
  const diagnosesBreakdown: Record<SpeechDiagnosisType, number> = {
    'ФФНМ': 0,
    'ЗНМ I рівень': 0,
    'ЗНМ II рівень': 0,
    'ЗНМ III рівень': 0,
    'Дислалія': 0,
    'Дизартрія': 0,
    'Заїкання': 0,
    'Ринолалія': 0,
    'Норма': 0,
    'Потребує обстеження': 0
  };

  const soundGroupsInCorrection = {
    whistling: 0,
    hissing: 0,
    sonors: 0,
    guttural: 0,
    other: 0
  };

  const dynamicsBreakdown = {
    positive: 0,
    slow: 0,
    stable: 0,
    completed: 0
  };

  const stagesCount: Record<SoundCorrectionStage, number> = {
    'Обстеження': 0,
    'Підготовчий (гімнастика)': 0,
    'Постановка звука': 0,
    'Автоматизація в складах': 0,
    'Автоматизація в словах': 0,
    'Автоматизація в реченнях': 0,
    'Диференціація': 0,
    'Введено в мовлення (Норма)': 0
  };

  for (const card of cards) {
    if (diagnosesBreakdown[card.DIAGNOSIS] !== undefined) {
      diagnosesBreakdown[card.DIAGNOSIS]++;
    }

    if (card.DYNAMICS === 'Позитивна динаміка') dynamicsBreakdown.positive++;
    else if (card.DYNAMICS === 'Повільний поступ') dynamicsBreakdown.slow++;
    else if (card.DYNAMICS === 'Стабільний стан') dynamicsBreakdown.stable++;
    else if (card.DYNAMICS === 'Звуки автоматизовано (Норма)') dynamicsBreakdown.completed++;

    for (const sound of card.SOUND_STATUSES || []) {
      if (sound.stage !== 'Введено в мовлення (Норма)') {
        if (sound.group === 'свистячі') soundGroupsInCorrection.whistling++;
        else if (sound.group === 'шиплячі') soundGroupsInCorrection.hissing++;
        else if (sound.group === 'сонори') soundGroupsInCorrection.sonors++;
        else if (sound.group === 'задньоязикові') soundGroupsInCorrection.guttural++;
        else soundGroupsInCorrection.other++;
      }

      if (stagesCount[sound.stage] !== undefined) {
        stagesCount[sound.stage]++;
      }
    }
  }

  return {
    total: cards.length,
    diagnosesBreakdown,
    soundGroupsInCorrection,
    dynamicsBreakdown,
    stagesCount
  };
}

export function calculateCorrectionRate(cards: SpeechCard[]): {
  totalSounds: number;
  automatedSounds: number;
  ratePct: number;
} {
  let totalSounds = 0;
  let automatedSounds = 0;

  for (const card of cards) {
    for (const sound of card.SOUND_STATUSES || []) {
      totalSounds++;
      if (sound.stage === 'Введено в мовлення (Норма)') {
        automatedSounds++;
      }
    }
  }

  const ratePct = totalSounds > 0 ? Math.round((automatedSounds / totalSounds) * 100) : 0;
  return {
    totalSounds,
    automatedSounds,
    ratePct
  };
}

export function generateSpeechAnnualReportText(input: {
  cards: SpeechCard[];
  academicYear: string;
  institutionName?: string;
  directorName?: string;
}): string {
  const institution = input.institutionName || 'Криворізький заклад дошкільної освіти комбінованого типу №145 КМР';
  const director = input.directorName || 'Павлухіна Н.Г.';
  const summary = tallySpeechDiagnostics(input.cards);
  const correction = calculateCorrectionRate(input.cards);

  return `ЗВІТ ПРО РЕЗУЛЬТАТИВНІСТЬ КОРЕКЦІЙНО-РОЗВИТКОВОЇ РОБОТИ
ВЧИТЕЛЯ-ЛОГОПЕДА ЗА ${input.academicYear}

Заклад: ${institution}
Директор: ${director}
ЄДРПОУ: 26136748
м. Кривий Ріг, вул. Перлинна 23А

1. ЗАГАЛЬНІ ПОКАЗНИКИ КОНТИНГЕНТУ:
- Всього дітей на логопедичному обліку: ${summary.total} осіб
- Звуки автоматизовано / випущено з чистою вимовою: ${summary.dynamicsBreakdown.completed} дітей
- Позитивна динаміка у корекції звуковимови: ${summary.dynamicsBreakdown.positive} дітей
- Повільний поступ (продовжують корекцію / ООП): ${summary.dynamicsBreakdown.slow} дітей
- Стабільний стан без змін: ${summary.dynamicsBreakdown.stable} дітей

2. РОЗПОДІЛ ЗА МОВЛЕННЄВИМИ ВИСНОВКАМИ:
- Фонетико-фонематичний недорозвиток (ФФНМ): ${summary.diagnosesBreakdown['ФФНМ']} дітей
- Загальний недорозвиток мовлення (ЗНМ III рівень): ${summary.diagnosesBreakdown['ЗНМ III рівень']} дітей
- Дислалія (функціональна / механічна): ${summary.diagnosesBreakdown['Дислалія']} дітей
- Дизартрія (стерта форма): ${summary.diagnosesBreakdown['Дизартрія']} дітей
- Інші порушення: ${summary.diagnosesBreakdown['Заїкання'] + summary.diagnosesBreakdown['Ринолалія']} дітей

3. ДИНАМІКА ПОДОЛАННЯ МОВЛЕННЄВИХ ДЕФЕКТІВ:
- Загальна кількість звуків, що підлягали корекції: ${correction.totalSounds}
- Звуків повністю виправлено та автоматизовано: ${correction.automatedSounds} (${correction.ratePct}%)
- Звуків у процесі постановки та автоматизації: ${correction.totalSounds - correction.automatedSounds}

Вчитель-логопед: ____________________ / ____________________ /
Погоджено директором: Павлухіна Н.Г. / ____________________ /
Дата складання: ${new Date().toLocaleDateString('uk-UA')}`;
}
