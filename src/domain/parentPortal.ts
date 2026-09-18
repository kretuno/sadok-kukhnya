// Domain logic for Parent Portal (Батьківський простір)
// Комунальний заклад дошкільної освіти (ясла-садок) комбінованого типу №145 Криворізької міської ради

export interface ParentAbsenceNotification {
  id: number;
  date: string; // YYYY-MM-DD
  timestamp: string;
  childName: string;
  groupName: string;
  reason: 'illness' | 'family' | 'sanatorium' | 'other';
  comment?: string;
  reportedBy: string;
}

export interface ParentFeedbackMessage {
  id: number;
  date: string;
  parentName: string;
  contact: string;
  category: string;
  message: string;
  status: 'new' | 'reviewed';
}

export interface VacationApplicationData {
  parentFullName: string;
  childFullName: string;
  groupName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  date: string;
  phone?: string;
}

export interface ParentPaymentCalculation {
  dailyRate: number;
  rawTotal: number;
  discountPercent: number;
  discountAmount: number;
  finalTotal: number;
}

/**
 * Calculates parental food fee according to Kryvyi Rih municipality standards
 * Base rates: Nursery (Ясла) = 45.00 UAH/day, Kindergarten (Садок) = 65.00 UAH/day
 * Benefits:
 * - 'none': full 100% payment (0% discount)
 * - 'large_family_50': 50% discount for families with 3+ children
 * - 'full_100_vpo_ubd': 100% free for IDP (ВПО), children of Ukrainian defenders (УБД), low-income families, or children with disabilities
 */
export function calculateParentPayment(
  daysAttended: number,
  ageGroup: 'nursery' | 'kindergarten' = 'kindergarten',
  benefitType: 'none' | 'large_family_50' | 'full_100_vpo_ubd' = 'none'
): ParentPaymentCalculation {
  const safeDays = Math.max(0, Math.floor(daysAttended || 0));
  const dailyRate = ageGroup === 'nursery' ? 45.0 : 65.0;
  const rawTotal = Math.round(safeDays * dailyRate * 100) / 100;

  let discountPercent = 0;
  if (benefitType === 'large_family_50') {
    discountPercent = 50;
  } else if (benefitType === 'full_100_vpo_ubd') {
    discountPercent = 100;
  }

  const discountAmount = Math.round(((rawTotal * discountPercent) / 100) * 100) / 100;
  const finalTotal = Math.max(0, Math.round((rawTotal - discountAmount) * 100) / 100);

  return {
    dailyRate,
    rawTotal,
    discountPercent,
    discountAmount,
    finalTotal
  };
}

export interface RoutineStage {
  id: string;
  timeRange: string;
  title: string;
  icon: string;
  description: string;
  startMinutes: number;
  endMinutes: number;
}

export const ROUTINE_STAGES: RoutineStage[] = [
  {
    id: 'morning_reception',
    timeRange: '07:00 – 08:30',
    title: 'Прийом дітей, ранковий фільтр та вільні ігри',
    icon: '☀️',
    description: 'Огляд медичною сестрою та вихователем, вимірювання температури, бесіди з батьками, спокійні настільні ігри.',
    startMinutes: 7 * 60,
    endMinutes: 8 * 60 + 30
  },
  {
    id: 'morning_exercise',
    timeRange: '08:30 – 08:45',
    title: 'Ранкова гімнастика',
    icon: '🤸',
    description: 'Веселі рухові вправи під музику, дихальна гімнастика та бадьоре налаштування на день.',
    startMinutes: 8 * 60 + 30,
    endMinutes: 8 * 60 + 45
  },
  {
    id: 'breakfast',
    timeRange: '08:45 – 09:15',
    title: 'Сніданок',
    icon: '🥣',
    description: 'Гігієнічні процедури (миття рук з милом), чергування по їдальні, перший поживний прийом їжі.',
    startMinutes: 8 * 60 + 45,
    endMinutes: 9 * 60 + 15
  },
  {
    id: 'learning_activities',
    timeRange: '09:15 – 10:30',
    title: 'Розвивальні заняття за підгрупами',
    icon: '🎨',
    description: 'Математика та логіка, розвиток мовлення, малювання, ліплення, аплікація, музика та конструювання.',
    startMinutes: 9 * 60 + 15,
    endMinutes: 10 * 60 + 30
  },
  {
    id: 'second_breakfast',
    timeRange: '10:30 – 10:45',
    title: 'Другий сніданок (вітамінна пауза)',
    icon: '🍎',
    description: 'Свіжі сезонні фрукти, натуральні соки для зміцнення дитячого імунітету.',
    startMinutes: 10 * 60 + 30,
    endMinutes: 10 * 60 + 45
  },
  {
    id: 'outdoor_walk',
    timeRange: '10:45 – 12:00',
    title: 'Прогулянка на свіжому повітрі та рухливі ігри',
    icon: '🌳',
    description: 'Спостереження за природою, активні ігри на майданчику, рухова діяльність, загартовування.',
    startMinutes: 10 * 60 + 45,
    endMinutes: 12 * 60
  },
  {
    id: 'lunch',
    timeRange: '12:00 – 12:45',
    title: 'Обід',
    icon: '🍲',
    description: 'Гарячий комплексний обід за нормами КМУ №305 (перша страва, м\'ясне/рибне, гарнір, салат, напій).',
    startMinutes: 12 * 60,
    endMinutes: 12 * 60 + 45
  },
  {
    id: 'sleep_preparation',
    timeRange: '12:45 – 13:00',
    title: 'Підготовка до денного сну',
    icon: '🛏️',
    description: 'Гігієна, провітрювання спальні, роздягання, казка на ніч або релаксаційна музика.',
    startMinutes: 12 * 60 + 45,
    endMinutes: 13 * 60
  },
  {
    id: 'quiet_hour',
    timeRange: '13:00 – 15:00',
    title: 'Денний сон (тиха година)',
    icon: '💤',
    description: 'Глибокий відновлювальний денний сон вихованців у комфортній спальній кімнаті.',
    startMinutes: 13 * 60,
    endMinutes: 15 * 60
  },
  {
    id: 'waking_up',
    timeRange: '15:00 – 15:30',
    title: 'Поступовий підйом, гімнастика пробудження',
    icon: '🧦',
    description: 'Гімнастика в ліжечках, доріжки здоров\'я (масажні килимки), одягання, зачісування.',
    startMinutes: 15 * 60,
    endMinutes: 15 * 60 + 30
  },
  {
    id: 'afternoon_snack',
    timeRange: '15:30 – 16:00',
    title: 'Полуденок',
    icon: '🥛',
    description: 'Випічка власного приготування, сирні запіканки, молоко або трав\'яні чаї.',
    startMinutes: 15 * 60 + 30,
    endMinutes: 16 * 60
  },
  {
    id: 'evening_games',
    timeRange: '16:00 – 17:30',
    title: 'Ігри, гуртки, прогулянка та зустріч з батьками',
    icon: '👋',
    description: 'Індивідуальна робота вихователя, бесіди з батьками про досягнення дитини за день, повернення додому.',
    startMinutes: 16 * 60,
    endMinutes: 17 * 60 + 30
  }
];

/**
 * Returns current routine stage based on 'HH:MM' string or current local system time
 */
export function getCurrentRoutineStage(timeStr?: string): RoutineStage | null {
  let minutes = 0;
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    minutes = (h || 0) * 60 + (m || 0);
  } else {
    const now = new Date();
    minutes = now.getHours() * 60 + now.getMinutes();
  }

  for (const stage of ROUTINE_STAGES) {
    if (minutes >= stage.startMinutes && minutes < stage.endMinutes) {
      return stage;
    }
  }

  return null;
}

/**
 * Generates official vacation and health-preservation application text on official letterhead
 */
export function generateVacationApplicationText(data: VacationApplicationData): string {
  const parent = data.parentFullName.trim() || 'ПІБ батьків';
  const child = data.childFullName.trim() || 'ПІБ дитини';
  const group = data.groupName.trim() || 'Група';
  const from = data.fromDate || '____.__.____';
  const to = data.toDate || '____.__.____';
  const reason = data.reason.trim() || 'сімейні обставини / оздоровчий період';
  const dateStr = data.date || new Date().toISOString().split('T')[0];
  const phoneStr = data.phone ? `Тел.: ${data.phone}` : '';

  return `Директору Криворізького комунального закладу
дошкільної освіти (ясла-садок)
комбінованого типу № 145
Криворізької міської ради
Павлухіній Наталії Григорівні
громадянина(ки) ${parent}
${phoneStr}

ЗАЯВА

Прошу зберегти місце в закладі дошкільної освіти у групі «${group}»
за моєю дитиною, ${child},
на період з ${from} року по ${to} року
у зв'язку з: ${reason}.

Після закінчення зазначеного періоду зобов'язуюсь надати медичну довідку встановленого зразка про стан здоров'я дитини та відсутність контакту з інфекційними хворими.

${dateStr} року                                   Підпис: _________________`;
}

// LocalStorage helpers
const ABSENCE_KEY = 'sadok_parent_absences';
const FEEDBACK_KEY = 'sadok_parent_feedback';

export function getParentAbsenceNotifications(): ParentAbsenceNotification[] {
  try {
    const raw = localStorage.getItem(ABSENCE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveParentAbsenceNotification(
  entry: Omit<ParentAbsenceNotification, 'id' | 'timestamp'>
): ParentAbsenceNotification {
  const current = getParentAbsenceNotifications();
  const newEntry: ParentAbsenceNotification = {
    ...entry,
    id: Date.now(),
    timestamp: new Date().toLocaleDateString('uk-UA') + ' ' + new Date().toLocaleTimeString('uk-UA')
  };
  localStorage.setItem(ABSENCE_KEY, JSON.stringify([newEntry, ...current]));
  return newEntry;
}

export function getParentFeedbacks(): ParentFeedbackMessage[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveParentFeedback(
  entry: Omit<ParentFeedbackMessage, 'id' | 'date' | 'status'>
): ParentFeedbackMessage {
  const current = getParentFeedbacks();
  const newEntry: ParentFeedbackMessage = {
    ...entry,
    id: Date.now(),
    date: new Date().toLocaleDateString('uk-UA') + ' ' + new Date().toLocaleTimeString('uk-UA'),
    status: 'new'
  };
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify([newEntry, ...current]));
  return newEntry;
}
