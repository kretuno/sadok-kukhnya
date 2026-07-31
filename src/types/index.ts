export interface Product {
  ID: number;
  NAME: string;
  ID_GRUPPI_PRODUKTOV: number;
  BELKI: number;
  ZIRI: number;
  UGLEVODI: number;
  KALORII: number;
  EDINICA_IZMERENIA: string;
  CENA: number;
  PROCENT_OTXODOV: number;
  NOMER_PP: number;
  DEL?: number;
  UPD?: number;
}

export interface ProductCategory {
  ID: number;
  NAME: string;
  NOMER_PP: number;
}

export interface DishCategory {
  ID: number;
  NAME: string;
  PORRDOK_SLEDOVANIR: number;
}

export interface Dish {
  ID: number;
  NAME: string;
  NOTES: string;
  ID_GRUPPI_BLUD: number;
  VYXOD: number;
  BELKI: number;
  ZIRI: number;
  UGLEVODI: number;
  KALORII: number;
  PORRDOK_SLEDOVANIR_BLUD: number;
  SOURCE_FILE?: string;
  SOURCE_FORMAT?: string;
  SOURCE_REF?: string;
  ALLERGENS?: string;
  QUALITY_REQUIREMENTS?: string;
  STORAGE_CONDITIONS?: string;
  SERVING_METHOD?: string;
  DISH_CHARACTERISTICS?: string;
  IMPORT_KEY?: string;
}

export interface RecipeComponent {
  ID: number;
  ID_BLUDA: number;
  ID_PRODUKTA: number;
  ID_KATEGORII_DETEJ: number;
  GROSSO_GR: number;
  NETTO_GR: number;
  NOMER_ID_LINII_V_TABLICE?: number;
  SOURCE_NAME?: string;
  ALLERGENS?: string;
  QUALITY_REQUIREMENTS?: string;
  IS_ALTERNATIVE?: number;
  productName?: string;
  unit?: string;
}

export interface RecipeNutritionProfile {
  ID: number;
  ID_BLUDA: number;
  ID_KATEGORII_DETEJ: number;
  VYXOD_GR: number;
  BELKI: number;
  ZIRI: number;
  UGLEVODI: number;
  KALORII: number;
  categoryName?: string;
}

export interface EaterCategory {
  ID: number;
  NAME: string;
  NOMER_PP: number;
  VIDIMOST6?: number;
}

export interface MenuHeader {
  ID: number;
  ID_ZOY: number;
  DATA: string;
  ID_BLUDA: number;
  NAME_BLUDA: string;
  PORRDOK_SLEDOVANIR_BLUD: number;
  MEAL_TYPE: string; // 'Завтрак' | '2-й Завтрак' | 'Обед' | 'Полдник' | 'Ужин'
}

export interface DishCostProfile {
  dishId: number;
  categoryId: number;
  categoryName: string;
  yieldGr: number;
  costPerPortion: number;
}

export interface DishCostHistoryEntry {
  ID: number;
  ID_BLUDA: number;
  ID_KATEGORII_DETEJ: number;
  COST_PER_PORTION: number;
  CALCULATED_AT: string;
  REASON: string;
  SOURCE_REF: string;
  categoryName?: string;
}

export interface MenuApproval {
  ID: number;
  MENU_DATE: string;
  INSTITUTION_ID: number;
  STATUS: 'approved';
  APPROVED_AT: string;
  APPROVED_BY: string;
  CHECKS_JSON: string;
}

export interface DocumentRegistryEntry {
  ID: number;
  DOCUMENT_TYPE: string;
  DOCUMENT_NUMBER: string;
  PERIOD_FROM: string;
  PERIOD_TO: string;
  CREATED_AT: string;
  CREATED_BY: string;
}

export interface InvoiceHeader {
  ID: number;
  ID_FIRMI: number;
  NOMER_DOCUMENTA: string;
  DATA: string;
  SUMMA: number;
  firmName?: string;
}

export interface StockBatch {
  ID: number;
  ID_NAKLADNOJ: number;
  ID_PRODUKTA: number;
  KOLVO_KG: number;
  CENA: number;
  SUMMA: number;
  SROK_GODNOSTI: string;
  OST_KG: number;
  productName?: string;
  unit?: string;
}

export interface SupplierFirm {
  ID: number;
  NAME: string;
  ADRES: string;
  TELEFON: string;
  INN: string;
}

export interface Institution {
  ID: number;
  NAME: string;
  ID_SADIKA: number;
  ADRES: string;
  TELEFON: string;
  EDRPOU?: string;
  DIRECTOR?: string;
  NURSE?: string;
  COOK?: string;
  IS_SEPARATE_WAREHOUSE?: number;
}

export interface ProductHistoryBatch {
  ID: number;
  ID_NAKLADNOJ: number;
  NOMER_DOCUMENTA: string;
  INVOICE_DATE: string;
  firmName: string;
  KOLVO_KG: number;
  OST_KG: number;
  CENA: number;
  SUMMA: number;
  SROK_GODNOSTI: string;
}

export interface ProductHistoryUsage {
  ID: number;
  ID_BLUDA: number;
  dishName: string;
  menuDate: string;
  MEAL_TYPE: string;
  GROSSO_GR: number;
  NETTO_GR: number;
}

export interface ProductHistoryData {
  product: Product;
  categoryName: string;
  totalStockKg: number;
  totalStockCost: number;
  batches: ProductHistoryBatch[];
  usages: ProductHistoryUsage[];
}

export interface PropertyLocationDistribution {
  id: string;
  locationName: string;
  responsiblePerson: string;
  quantity: number;
}

export interface PropertyItem {
  ID: number;
  INVENTAR_NUMBER: string;
  NAME: string;
  CATEGORY: string;
  CONDITION: 'Відмінний' | 'Задовільний' | 'Потребує ремонту' | 'Підлягає списанню';
  YEAR_COMMISSIONED: number;
  INITIAL_COST: number;
  TOTAL_QUANTITY: number;
  LOCATIONS: PropertyLocationDistribution[];
  NOTES?: string;
}

export interface PropertyWriteOffRecord {
  ID: number;
  ACT_NUMBER: string;
  DATE: string;
  PROPERTY_ID: number;
  INVENTAR_NUMBER: string;
  PROPERTY_NAME: string;
  CATEGORY: string;
  QUANTITY: number;
  LOCATION_NAME: string;
  RESPONSIBLE_PERSON: string;
  REASON: string;
  COMMISSION_HEAD: string;
  COMMISSION_MEMBERS: string;
  INITIAL_COST: number;
  TOTAL_COST: number;
  NOTES?: string;
}

export interface SadokGroup {
  ID: number;
  NAME: string;
  AGE_CATEGORY: string;
  ROOM_NUMBER?: string;
  TEACHER_NAME?: string;
  CHILDREN_COUNT: number;
}

export interface SadokEmployee {
  ID: number;
  FULL_NAME: string;
  POSITION: string;
  PHONE?: string;
  IS_MVO: boolean;
  GROUP_NAME?: string;
  EDUCATION?: string;
  HIRE_DATE?: string;
  NOTES?: string;
}

export interface SadokChild {
  ID: number;
  FULL_NAME: string;
  BIRTH_DATE: string;
  GENDER?: 'Чоловіча' | 'Жіноча';
  BIRTH_CERTIFICATE?: string;
  GROUP_NAME: string;
  STATUS: 'Навчається' | 'Вибув' | 'Тимчасово відсутній' | 'Випускник';
  BENEFIT_CATEGORY?: string;
  ADDRESS?: string;
  
  // Parents Info
  MOTHER_NAME?: string;
  MOTHER_PHONE?: string;
  FATHER_NAME?: string;
  FATHER_PHONE?: string;
  PARENT_NAME?: string;
  PARENT_PHONE?: string;

  // Admission & Departure Details
  ENROLLMENT_DATE?: string;
  ENROLLMENT_ORDER?: string;
  DEPARTURE_DATE?: string;
  DEPARTURE_REASON?: string;

  // Special Requirements
  DIET_NOTES?: string;
  HEALTH_NOTES?: string;
  PSYCHOLOGY_NOTES?: string;
}

export interface PsychologyAdaptationRecord {
  ID: number;
  CHILD_ID: number;
  CHILD_NAME: string;
  GROUP_NAME: string;
  START_DATE: string;
  WEEK_NUMBER: number; // 1 to 4
  EMOTIONAL_STATE: 'Позитивний' | 'Нестійкий' | 'Негативний' | 'Агресивний / Пригнічений';
  ANXIETY_LEVEL: 'Низький' | 'Середній' | 'Високий';
  APPETITE: 'Хороший' | 'Вибірковий' | 'Поганий / Відмова';
  SLEEP: 'Спокійний' | 'Неспокійний' | 'Порушений';
  SOCIAL_INTERACTION: 'Активна' | 'Пасивна' | 'Уникає';
  ADAPTATION_LEVEL: 'Легка' | 'Середня' | 'Важка';
  RECOMMENDATIONS?: string;
  UPDATED_AT: string;
}

export interface SchoolReadinessAssessment {
  ID: number;
  CHILD_ID: number;
  CHILD_NAME: string;
  GROUP_NAME: string;
  ASSESSMENT_DATE: string;
  AGE_YEARS: number;
  
  // 4 Core Development Spheres (scores 1-5)
  MOTIVATIONAL_SCORE: number;
  INTELLECTUAL_SCORE: number;
  EMOTIONAL_VOLITIONAL_SCORE: number;
  SOCIAL_SCORE: number;

  TOTAL_SCORE: number; // Max 20
  READINESS_STATUS: 'Високий (Готовий до школи)' | 'Достатній (Переважно готовий)' | 'Потребує додаткового супроводу' | 'Низький (Не готовий)';
  PSYCHOLOGIST_CONCLUSION: string;
  RECOMMENDATIONS_PARENTS: string;
  RECOMMENDATIONS_TEACHERS: string;
}

export interface PsychologyConsultation {
  ID: number;
  DATE: string;
  TYPE: 'Індивідуальна' | 'Групова' | 'Консультація з батьками' | 'Консультація з вихователем' | 'Психопрофілактична робота';
  TARGET_NAME: string; // ФІО дитини, батьків або назва групи/педагогів
  CHILD_ID?: number;
  GROUP_NAME?: string;
  TOPIC: string;
  SUMMARY_NOTES: string;
  RECOMMENDATIONS: string;
  STATUS: 'Заплановано' | 'Проведено' | 'Перенесено';
}

