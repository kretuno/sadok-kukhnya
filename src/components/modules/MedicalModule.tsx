import React, { useState, useEffect, useMemo } from 'react';
import { 
  HeartPulse, 
  Activity, 
  Syringe, 
  Ruler, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Printer, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  HelpCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Sparkles,
  Users,
  Filter,
  RefreshCw,
  Utensils,
  Eye,
  Info,
  X
} from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';
import { WorkflowGuideModal, WorkflowStep } from '../common/WorkflowGuideModal';
import { QuickToolbar } from '../QuickToolbar';
import { exportToExcel, exportToPDF } from '../../services/export';
import { 
  SadokChild, 
  SadokGroup, 
  SadokMedicalCard, 
  SadokVaccination, 
  SadokAnthropometry,
  BrackerageReadyEntry,
  BrackerageRawEntry
} from '../../types';
import { 
  DATABASE_SYNC_EVENT,
  getChildren, 
  getGroups, 
  getMedicalCards, 
  saveMedicalCard, 
  deleteMedicalCard,
  getVaccinations, 
  saveVaccination, 
  deleteVaccination,
  getAnthropometries, 
  saveAnthropometry, 
  deleteAnthropometry,
  getBrackerageReadyEntries,
  addBrackerageReadyEntry,
  deleteBrackerageReadyEntry,
  getBrackerageRawEntries,
  addBrackerageRawEntry,
  deleteBrackerageRawEntry,
  getMenuEntries
} from '../../services/db';

const medicalWorkflowSteps: WorkflowStep[] = [
  {
    number: 1,
    title: '1. Формування «Листка здоров\'я» групи',
    description: 'Оберіть групу вихованців. Заповніть дані з довідок педіатра: групу здоров\'я (I, II або III), фізкультурну групу, маркування меблів за зростом та особливі рекомендації дієти (алергії, безлактозне харчування тощо).'
  },
  {
    number: 2,
    title: '2. Облік профілактичних щеплень (Форма № 063/о)',
    description: 'Вносьте дані про вакцинацію дитини (БЦЖ, Гепатит B, АКДП, КПК, Поліомієліт тощо). Фіксуйте дату, серію вакцини, реакцію організму та медичні відводи.'
  },
  {
    number: 3,
    title: '3. Сезонна антропометрія (Осінь / Весна)',
    description: 'Двічі на рік проводьте обов\'язкове вимірювання зросту та ваги дітей. Система автоматично розрахує динаміку та відповідність віковим нормам розвитку.'
  },
  {
    number: 4,
    title: '4. Роздруківка та експорт',
    description: 'Листок здоров\'я роздруковується у 2-х примірниках: один в медичний кабінет, другий — вихователям у груповий куточок для правильного розсаджування за столиками.'
  }
];

export const MedicalModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'health_sheet' | 'vaccinations' | 'anthropometry' | 'brackerage' | 'analytics'>('health_sheet');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // Data lists
  const [children, setChildren] = useState<SadokChild[]>([]);
  const [groups, setGroups] = useState<SadokGroup[]>([]);
  const [medicalCards, setMedicalCards] = useState<SadokMedicalCard[]>([]);
  const [vaccinations, setVaccinations] = useState<SadokVaccination[]>([]);
  const [anthropometries, setAnthropometries] = useState<SadokAnthropometry[]>([]);
  const [brackerageReadyList, setBrackerageReadyList] = useState<BrackerageReadyEntry[]>([]);
  const [brackerageRawList, setBrackerageRawList] = useState<BrackerageRawEntry[]>([]);
  const [brackerageSubTab, setBrackerageSubTab] = useState<'ready' | 'raw'>('ready');

  // Filters & Search
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vaccineTypeFilter, setVaccineTypeFilter] = useState<string>('all');
  const [vaccineStatusFilter, setVaccineStatusFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');

  // Modal States
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Partial<SadokMedicalCard> | null>(null);

  const [isVacModalOpen, setIsVacModalOpen] = useState(false);
  const [editingVac, setEditingVac] = useState<Partial<SadokVaccination> | null>(null);

  const [isAnthroModalOpen, setIsAnthroModalOpen] = useState(false);
  const [editingAnthro, setEditingAnthro] = useState<Partial<SadokAnthropometry> | null>(null);

  const [isBrackReadyModalOpen, setIsBrackReadyModalOpen] = useState(false);
  const [isBrackRawModalOpen, setIsBrackRawModalOpen] = useState(false);

  const [printDocType, setPrintDocType] = useState<'health_sheet' | 'vaccinations' | 'anthropometry' | 'brackerage_ready' | null>(null);

  // Form local states - Brackerage Ready
  const [brackDate, setBrackDate] = useState(new Date().toISOString().split('T')[0]);
  const [brackTime, setBrackTime] = useState('11:30');
  const [brackMealType, setBrackMealType] = useState('Обід');
  const [brackDishName, setBrackDishName] = useState('');
  const [brackTemp, setBrackTemp] = useState<number>(75);
  const [brackWeight, setBrackWeight] = useState('200г / 200г');
  const [brackRating, setBrackRating] = useState<BrackerageReadyEntry['ORGANOLEPTIC_RATING']>('Відмінно');
  const [brackPermission, setBrackPermission] = useState<BrackerageReadyEntry['PERMISSION_TO_SERVE']>('Видача дозволена');
  const [brackCommission, setBrackCommission] = useState('Медсестра Суміна Н.Є., Шеф-кухар');
  const [brackNotes, setBrackNotes] = useState('Смак, колір та консистенція відповідають техкартці');

  // Form local states - Brackerage Raw
  const [rawDate, setRawDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawProdName, setRawProdName] = useState('');
  const [rawSupplier, setRawSupplier] = useState('ТОВ «Агропостач»');
  const [rawInvoice, setRawInvoice] = useState('НАК-104');
  const [rawIntegrity, setRawIntegrity] = useState<BrackerageRawEntry['PACKAGE_INTEGRITY']>('Цілісна');
  const [rawExpiry, setRawExpiry] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [rawDocStatus, setRawDocStatus] = useState<BrackerageRawEntry['DOCUMENTATION_STATUS']>('В наявності');
  const [rawDecision, setRawDecision] = useState<BrackerageRawEntry['ACCEPTANCE_DECISION']>('Прийнято');
  const [rawPerson, setRawPerson] = useState('Суміна Н.Є.');
  const [rawNotes, setRawNotes] = useState('Товарний вигляд, маркування та температурний режим у нормі');

  // Form local states - Card
  const [cardChildId, setCardChildId] = useState<number>(0);
  const [cardHealthGroup, setCardHealthGroup] = useState<SadokMedicalCard['HEALTH_GROUP']>('I (Здорові)');
  const [cardPhysicalGroup, setCardPhysicalGroup] = useState<SadokMedicalCard['PHYSICAL_GROUP']>('Основна');
  const [cardDeskSize, setCardDeskSize] = useState<SadokMedicalCard['DESK_FURNITURE_SIZE']>('1 (85-100 см)');
  const [cardDiet, setCardDiet] = useState('Загальний стіл');
  const [cardChronic, setCardChronic] = useState('Немає');
  const [cardVision, setCardVision] = useState('Норма');
  const [cardDoctor, setCardDoctor] = useState('Здоровий, може відвідувати ЗДО');

  // Form local states - Vac
  const [vacChildId, setVacChildId] = useState<number>(0);
  const [vacType, setVacType] = useState<SadokVaccination['VACCINE_TYPE']>('АКДП / АДП-м');
  const [vacStage, setVacStage] = useState('V1 (1 доза)');
  const [vacDate, setVacDate] = useState(new Date().toISOString().split('T')[0]);
  const [vacSeries, setVacSeries] = useState('');
  const [vacReaction, setVacReaction] = useState<SadokVaccination['REACTION']>('Звичайна');
  const [vacStatus, setVacStatus] = useState<SadokVaccination['STATUS']>('Зроблено');
  const [vacExemption, setVacExemption] = useState('');
  const [vacNotes, setVacNotes] = useState('');

  // Form local states - Anthro
  const [anthroChildId, setAnthroChildId] = useState<number>(0);
  const [anthroDate, setAnthroDate] = useState(new Date().toISOString().split('T')[0]);
  const [anthroSeason, setAnthroSeason] = useState<'Осінь' | 'Весна'>(new Date().getMonth() >= 8 ? 'Осінь' : 'Весна');
  const [anthroHeight, setAnthroHeight] = useState<number>(104);
  const [anthroWeight, setAnthroWeight] = useState<number>(17.2);
  const [anthroChest, setAnthroChest] = useState<number | undefined>(54);
  const [anthroEval, setAnthroEval] = useState<SadokAnthropometry['EVALUATION']>('Нормальний розвиток');
  const [anthroNotes, setAnthroNotes] = useState('');

  useEffect(() => {
    loadAllData();
    window.addEventListener(DATABASE_SYNC_EVENT, loadAllData);
    return () => window.removeEventListener(DATABASE_SYNC_EVENT, loadAllData);
  }, []);

  const loadAllData = () => {
    const c = getChildren();
    const g = getGroups();
    const cards = getMedicalCards();
    const vacs = getVaccinations();
    const anthros = getAnthropometries();
    const ready = getBrackerageReadyEntries();
    const raw = getBrackerageRawEntries();
    setChildren(c);
    setGroups(g);
    setMedicalCards(cards);
    setVaccinations(vacs);
    setAnthropometries(anthros);
    setBrackerageReadyList(ready);
    setBrackerageRawList(raw);
  };

  // Grouped and filtered children for Health Sheet
  const activeChildren = useMemo(() => {
    return children.filter(c => c.STATUS === 'Навчається');
  }, [children]);

  const filteredChildrenForHealthSheet = useMemo(() => {
    return activeChildren.filter(c => {
      const matchGroup = selectedGroup === 'all' || c.GROUP_NAME === selectedGroup;
      const matchSearch = !searchQuery || 
        c.FULL_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.GROUP_NAME.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGroup && matchSearch;
    });
  }, [activeChildren, selectedGroup, searchQuery]);

  // Map of child ID -> Medical Card
  const medicalCardMap = useMemo(() => {
    const map = new Map<number, SadokMedicalCard>();
    medicalCards.forEach(card => {
      map.set(card.CHILD_ID, card);
    });
    return map;
  }, [medicalCards]);

  // Filtered Vaccinations
  const filteredVaccinations = useMemo(() => {
    return vaccinations.filter(v => {
      const matchGroup = selectedGroup === 'all' || v.GROUP_NAME === selectedGroup;
      const matchType = vaccineTypeFilter === 'all' || v.VACCINE_TYPE === vaccineTypeFilter;
      const matchStatus = vaccineStatusFilter === 'all' || v.STATUS === vaccineStatusFilter;
      const matchSearch = !searchQuery || 
        v.CHILD_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.GROUP_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.SERIES_NUMBER && v.SERIES_NUMBER.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchGroup && matchType && matchStatus && matchSearch;
    });
  }, [vaccinations, selectedGroup, vaccineTypeFilter, vaccineStatusFilter, searchQuery]);

  // Filtered Anthropometry
  const filteredAnthropometry = useMemo(() => {
    return anthropometries.filter(a => {
      const matchGroup = selectedGroup === 'all' || a.GROUP_NAME === selectedGroup;
      const matchSeason = seasonFilter === 'all' || a.SEASON === seasonFilter;
      const matchSearch = !searchQuery || 
        a.CHILD_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.GROUP_NAME.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGroup && matchSeason && matchSearch;
    });
  }, [anthropometries, selectedGroup, seasonFilter, searchQuery]);

  // Summary statistics
  const stats = useMemo(() => {
    const totalEnrolled = activeChildren.length;
    let group1Count = 0;
    let group2Count = 0;
    let group3Count = 0;
    let specialDietCount = 0;

    activeChildren.forEach(c => {
      const card = medicalCardMap.get(c.ID);
      const hg = card?.HEALTH_GROUP || 'I (Здорові)';
      if (hg.startsWith('I ')) group1Count++;
      else if (hg.startsWith('II ')) group2Count++;
      else if (hg.startsWith('III ')) group3Count++;

      const diet = card?.DIET_PRECAUTIONS || c.DIET_NOTES || '';
      if (diet && diet !== 'Загальний стіл' && diet !== 'Звичайне харчування' && diet !== 'Немає' && diet !== '-') {
        specialDietCount++;
      }
    });

    const totalVacs = vaccinations.length;
    const completedVacs = vaccinations.filter(v => v.STATUS === 'Зроблено').length;
    const pendingVacs = vaccinations.filter(v => v.STATUS === 'Заплановано').length;
    const overdueVacs = vaccinations.filter(v => v.STATUS === 'Прострочено').length;
    const exemptionVacs = vaccinations.filter(v => v.STATUS === 'Медвідвід').length;

    return {
      totalEnrolled,
      group1Count,
      group2Count,
      group3Count,
      specialDietCount,
      totalVacs,
      completedVacs,
      pendingVacs,
      overdueVacs,
      exemptionVacs
    };
  }, [activeChildren, medicalCardMap, vaccinations]);

  // Handle open Edit Medical Card Modal
  const handleOpenCardModal = (child: SadokChild) => {
    const existingCard = medicalCardMap.get(child.ID);
    setEditingCard(existingCard || { CHILD_ID: child.ID, CHILD_NAME: child.FULL_NAME, GROUP_NAME: child.GROUP_NAME });
    setCardChildId(child.ID);
    setCardHealthGroup(existingCard?.HEALTH_GROUP || 'I (Здорові)');
    setCardPhysicalGroup(existingCard?.PHYSICAL_GROUP || 'Основна');
    setCardDeskSize(existingCard?.DESK_FURNITURE_SIZE || '1 (85-100 см)');
    setCardDiet(existingCard?.DIET_PRECAUTIONS || child.DIET_NOTES || 'Загальний стіл');
    setCardChronic(existingCard?.CHRONIC_CONDITIONS || 'Немає');
    setCardVision(existingCard?.VISION_HEARING_NOTES || 'Норма');
    setCardDoctor(existingCard?.DOCTOR_CONCLUSION || 'Здоровий, може відвідувати ЗДО');
    setIsCardModalOpen(true);
  };

  // Save Medical Card
  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    const targetChild = children.find(c => c.ID === cardChildId);
    if (!targetChild) return;

    saveMedicalCard({
      ID: editingCard?.ID,
      CHILD_ID: targetChild.ID,
      CHILD_NAME: targetChild.FULL_NAME,
      GROUP_NAME: targetChild.GROUP_NAME,
      BIRTH_DATE: targetChild.BIRTH_DATE,
      HEALTH_GROUP: cardHealthGroup,
      PHYSICAL_GROUP: cardPhysicalGroup,
      DESK_FURNITURE_SIZE: cardDeskSize,
      DIET_PRECAUTIONS: cardDiet,
      CHRONIC_CONDITIONS: cardChronic,
      VISION_HEARING_NOTES: cardVision,
      DOCTOR_CONCLUSION: cardDoctor
    });

    setIsCardModalOpen(false);
    loadAllData();
  };

  // Open Vaccination Modal
  const handleOpenVacModal = (vac?: SadokVaccination) => {
    if (vac) {
      setEditingVac(vac);
      setVacChildId(vac.CHILD_ID);
      setVacType(vac.VACCINE_TYPE);
      setVacStage(vac.DOSE_STAGE);
      setVacDate(vac.ADMINISTERED_DATE);
      setVacSeries(vac.SERIES_NUMBER || '');
      setVacReaction(vac.REACTION);
      setVacStatus(vac.STATUS);
      setVacExemption(vac.EXEMPTION_REASON || '');
      setVacNotes(vac.NOTES || '');
    } else {
      setEditingVac(null);
      const defaultChild = activeChildren[0];
      setVacChildId(defaultChild ? defaultChild.ID : 0);
      setVacType('АКДП / АДП-м');
      setVacStage('V1 (1 доза)');
      setVacDate(new Date().toISOString().split('T')[0]);
      setVacSeries('');
      setVacReaction('Звичайна');
      setVacStatus('Зроблено');
      setVacExemption('');
      setVacNotes('');
    }
    setIsVacModalOpen(true);
  };

  // Save Vaccination
  const handleSaveVac = (e: React.FormEvent) => {
    e.preventDefault();
    const targetChild = children.find(c => c.ID === vacChildId);
    if (!targetChild) return;

    saveVaccination({
      ID: editingVac?.ID,
      CHILD_ID: targetChild.ID,
      CHILD_NAME: targetChild.FULL_NAME,
      GROUP_NAME: targetChild.GROUP_NAME,
      VACCINE_TYPE: vacType,
      DOSE_STAGE: vacStage,
      ADMINISTERED_DATE: vacDate,
      SERIES_NUMBER: vacSeries,
      REACTION: vacReaction,
      STATUS: vacStatus,
      EXEMPTION_REASON: vacExemption,
      NOTES: vacNotes
    });

    setIsVacModalOpen(false);
    loadAllData();
  };

  // Delete Vaccination
  const handleDeleteVac = (id: number) => {
    if (window.confirm('Видалити цей запис про вакцинацію?')) {
      deleteVaccination(id);
      loadAllData();
    }
  };

  // Open Anthropometry Modal
  const handleOpenAnthroModal = (anthro?: SadokAnthropometry) => {
    if (anthro) {
      setEditingAnthro(anthro);
      setAnthroChildId(anthro.CHILD_ID);
      setAnthroDate(anthro.DATE);
      setAnthroSeason(anthro.SEASON);
      setAnthroHeight(anthro.HEIGHT_CM);
      setAnthroWeight(anthro.WEIGHT_KG);
      setAnthroChest(anthro.CHEST_CM);
      setAnthroEval(anthro.EVALUATION);
      setAnthroNotes(anthro.NOTES || '');
    } else {
      setEditingAnthro(null);
      const defaultChild = activeChildren[0];
      setAnthroChildId(defaultChild ? defaultChild.ID : 0);
      setAnthroDate(new Date().toISOString().split('T')[0]);
      setAnthroSeason(new Date().getMonth() >= 8 ? 'Осінь' : 'Весна');
      setAnthroHeight(104);
      setAnthroWeight(17.2);
      setAnthroChest(54);
      setAnthroEval('Нормальний розвиток');
      setAnthroNotes('');
    }
    setIsAnthroModalOpen(true);
  };

  // Save Anthropometry
  const handleSaveAnthro = (e: React.FormEvent) => {
    e.preventDefault();
    const targetChild = children.find(c => c.ID === anthroChildId);
    if (!targetChild) return;

    saveAnthropometry({
      ID: editingAnthro?.ID,
      CHILD_ID: targetChild.ID,
      CHILD_NAME: targetChild.FULL_NAME,
      GROUP_NAME: targetChild.GROUP_NAME,
      DATE: anthroDate,
      SEASON: anthroSeason,
      HEIGHT_CM: Number(anthroHeight),
      WEIGHT_KG: Number(anthroWeight),
      CHEST_CM: anthroChest ? Number(anthroChest) : undefined,
      EVALUATION: anthroEval,
      NOTES: anthroNotes
    });

    setIsAnthroModalOpen(false);
    loadAllData();
  };

  // Delete Anthropometry
  const handleDeleteAnthro = (id: number) => {
    if (window.confirm('Видалити запис антропометричних вимірювань?')) {
      deleteAnthropometry(id);
      loadAllData();
    }
  };

  // Save Brackerage Ready
  const handleSaveBrackReady = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brackDishName.trim()) {
      alert('Будь ласка, вкажіть назву страви');
      return;
    }
    addBrackerageReadyEntry({
      DATE: brackDate,
      TIME: brackTime,
      MEAL_TYPE: brackMealType,
      DISH_NAME: brackDishName.trim(),
      TEMPERATURE_C: brackTemp ? Number(brackTemp) : undefined,
      WEIGHT_PORTION_CHECK: brackWeight,
      ORGANOLEPTIC_RATING: brackRating,
      PERMISSION_TO_SERVE: brackPermission,
      COMMISSION_MEMBERS: brackCommission,
      NOTES: brackNotes
    });
    setBrackerageReadyList(getBrackerageReadyEntries());
    setIsBrackReadyModalOpen(false);
    setBrackDishName('');
  };

  // Save Brackerage Raw
  const handleSaveBrackRaw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawProdName.trim()) {
      alert('Будь ласка, вкажіть назву продукту');
      return;
    }
    addBrackerageRawEntry({
      DATE: rawDate,
      PRODUCT_NAME: rawProdName.trim(),
      SUPPLIER_NAME: rawSupplier,
      INVOICE_NUMBER: rawInvoice,
      PACKAGE_INTEGRITY: rawIntegrity,
      EXPIRY_DATE: rawExpiry,
      DOCUMENTATION_STATUS: rawDocStatus,
      ACCEPTANCE_DECISION: rawDecision,
      RESPONSIBLE_PERSON: rawPerson,
      NOTES: rawNotes
    });
    setBrackerageRawList(getBrackerageRawEntries());
    setIsBrackRawModalOpen(false);
    setRawProdName('');
  };

  // Export handlers
  const handleExportExcel = () => {
    if (activeSubTab === 'health_sheet') {
      const headers = ['№', 'ПІБ Дитини', 'Група', 'Дата народження', 'Група здоров\'я', 'Фізкультурна група', 'Розмір меблів', 'Особливості харчування / Дієта', 'Хронічні стани / Зір, слух', 'Висновки лікаря'];
      const data = filteredChildrenForHealthSheet.map((c, idx) => {
        const card = medicalCardMap.get(c.ID);
        return [
          idx + 1,
          c.FULL_NAME,
          c.GROUP_NAME,
          c.BIRTH_DATE,
          card?.HEALTH_GROUP || 'I (Здорові)',
          card?.PHYSICAL_GROUP || 'Основна',
          card?.DESK_FURNITURE_SIZE || '1 (85-100 см)',
          card?.DIET_PRECAUTIONS || c.DIET_NOTES || 'Загальний стіл',
          `${card?.CHRONIC_CONDITIONS || 'Немає'} / ${card?.VISION_HEARING_NOTES || 'Норма'}`,
          card?.DOCTOR_CONCLUSION || 'Здоровий'
        ];
      });
      exportToExcel(`Листок_здоров'я_${selectedGroup}_${new Date().toISOString().split('T')[0]}`, 'Листок здоров\'я', headers, data);
    } else if (activeSubTab === 'vaccinations') {
      const headers = ['№', 'ПІБ Дитини', 'Група', 'Вакцина', 'Доза/Етап', 'Дата введення', 'Серія', 'Реакція', 'Статус', 'Причина відводу', 'Примітки'];
      const data = filteredVaccinations.map((v, idx) => [
        idx + 1,
        v.CHILD_NAME,
        v.GROUP_NAME,
        v.VACCINE_TYPE,
        v.DOSE_STAGE,
        v.ADMINISTERED_DATE,
        v.SERIES_NUMBER || '-',
        v.REACTION,
        v.STATUS,
        v.EXEMPTION_REASON || '-',
        v.NOTES || '-'
      ]);
      exportToExcel(`Журнал_щеплень_063_${new Date().toISOString().split('T')[0]}`, 'Журнал щеплень', headers, data);
    } else if (activeSubTab === 'anthropometry') {
      const headers = ['№', 'ПІБ Дитини', 'Група', 'Дата', 'Сезон', 'Зріст (см)', 'Вага (кг)', 'Окружність грудей (см)', 'Оцінка розвитку', 'Примітки'];
      const data = filteredAnthropometry.map((a, idx) => [
        idx + 1,
        a.CHILD_NAME,
        a.GROUP_NAME,
        a.DATE,
        a.SEASON,
        a.HEIGHT_CM,
        a.WEIGHT_KG,
        a.CHEST_CM || '-',
        a.EVALUATION,
        a.NOTES || '-'
      ]);
      exportToExcel(`Антропометрія_${new Date().toISOString().split('T')[0]}`, 'Антропометрія', headers, data);
    }
  };

  const handleExportPDF = () => {
    if (activeSubTab === 'health_sheet') {
      const headers = ['№', 'ПІБ Дитини', 'Група', 'Група здор.', 'Фізкульт.', 'Меблі', 'Дієта / Алергії'];
      const data = filteredChildrenForHealthSheet.map((c, idx) => {
        const card = medicalCardMap.get(c.ID);
        return [
          String(idx + 1),
          c.FULL_NAME,
          c.GROUP_NAME,
          (card?.HEALTH_GROUP || 'I').split(' ')[0],
          card?.PHYSICAL_GROUP || 'Основна',
          (card?.DESK_FURNITURE_SIZE || '1').split(' ')[0],
          card?.DIET_PRECAUTIONS || c.DIET_NOTES || 'Загальний стіл'
        ];
      });
      exportToPDF(
        `ЛИСТОК ЗДОРОВ'Я ВИХОВАНЦІВ — ${selectedGroup === 'all' ? 'ВСІ ГРУПИ' : selectedGroup}`,
        headers,
        data,
        {
          institution: 'КЗДО (Ясла-садок) КТ №145 КМР',
          period: `Станом на ${new Date().toLocaleDateString('uk-UA')}`,
          nurse: 'Сестра медична старша'
        }
      );
    } else if (activeSubTab === 'vaccinations') {
      const headers = ['№', 'ПІБ Дитини', 'Група', 'Вакцина', 'Доза', 'Дата', 'Статус'];
      const data = filteredVaccinations.map((v, idx) => [
        String(idx + 1),
        v.CHILD_NAME,
        v.GROUP_NAME,
        v.VACCINE_TYPE,
        v.DOSE_STAGE,
        v.ADMINISTERED_DATE,
        v.STATUS
      ]);
      exportToPDF(
        'ЖУРНАЛ ПРОФІЛАКТИЧНИХ ЩЕПЛЕНЬ (ФОРМА № 063/О)',
        headers,
        data,
        {
          institution: 'КЗДО №145 КМР',
          period: `Станом на ${new Date().toLocaleDateString('uk-UA')}`,
          nurse: 'Сестра медична старша'
        }
      );
    } else if (activeSubTab === 'anthropometry') {
      const headers = ['№', 'ПІБ Дитини', 'Група', 'Сезон', 'Зріст', 'Вага', 'Оцінка'];
      const data = filteredAnthropometry.map((a, idx) => [
        String(idx + 1),
        a.CHILD_NAME,
        a.GROUP_NAME,
        a.SEASON,
        `${a.HEIGHT_CM} см`,
        `${a.WEIGHT_KG} кг`,
        a.EVALUATION
      ]);
      exportToPDF(
        'ЖУРНАЛ АНТРОПОМЕТРИЧНИХ ВИМІРЮВАНЬ ВИХОВАНЦІВ',
        headers,
        data,
        {
          institution: 'КЗДО №145 КМР',
          period: `Навчальний рік 2025/2026`,
          nurse: 'Сестра медична старша'
        }
      );
    }
  };

  const handlePrint = (type: 'health_sheet' | 'vaccinations' | 'anthropometry' | 'brackerage' | 'brackerage_ready') => {
    setPrintDocType(type === 'brackerage' ? 'brackerage_ready' : type);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <>
      {/* SCREEN VIEW */}
      <div className="space-y-6 print:hidden">
        {/* TOP BANNER */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
              <HeartPulse className="w-8 h-8 text-emerald-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black tracking-tight">SADOK Медичний кабінет</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                  Форма № 063/о
                </span>
              </div>
              <p className="text-emerald-100/80 text-xs md:text-sm mt-1">
                Листок здоров'я, журнал профілактичних щеплень, маркування меблів та антропометрія ЗДО №145
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold text-xs transition flex items-center space-x-1.5 shadow-sm"
            >
              <HelpCircle className="w-4 h-4 text-emerald-200" />
              <span>Як вести облік</span>
            </button>
            <button
              onClick={() => handlePrint(activeSubTab === 'analytics' ? 'health_sheet' : activeSubTab)}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black text-xs transition flex items-center space-x-1.5 shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Друкувати бланк</span>
            </button>
          </div>
        </div>

        {/* QUICK STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="card-glass p-3.5 flex items-center space-x-3 border-l-4 border-l-blue-500">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-800 dark:text-white leading-none">{stats.totalEnrolled}</div>
              <div className="text-[11px] text-slate-500 mt-1">Вихованців на обліку</div>
            </div>
          </div>

          <div className="card-glass p-3.5 flex items-center space-x-3 border-l-4 border-l-emerald-500">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 leading-none">
                {stats.group1Count} <span className="text-xs font-normal text-slate-400">({Math.round((stats.group1Count / (stats.totalEnrolled || 1)) * 100)}%)</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">I група (Здорові)</div>
            </div>
          </div>

          <div className="card-glass p-3.5 flex items-center space-x-3 border-l-4 border-l-amber-500">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-amber-700 dark:text-amber-400 leading-none">
                {stats.group2Count + stats.group3Count}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">II та III групи здоров'я</div>
            </div>
          </div>

          <div className="card-glass p-3.5 flex items-center space-x-3 border-l-4 border-l-rose-500">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-rose-700 dark:text-rose-400 leading-none">
                {stats.specialDietCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Особливі дієти / алергії</div>
            </div>
          </div>

          <div className="card-glass p-3.5 flex items-center space-x-3 border-l-4 border-l-purple-500 col-span-2 md:col-span-1">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-purple-700 dark:text-purple-400 leading-none">
                {stats.completedVacs} <span className="text-xs font-normal text-slate-400">/ {stats.totalVacs}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Щеплень проведено</div>
            </div>
          </div>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="card-glass p-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveSubTab('health_sheet')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                activeSubTab === 'health_sheet'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Листок здоров'я групи</span>
            </button>

            <button
              onClick={() => setActiveSubTab('vaccinations')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                activeSubTab === 'vaccinations'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
              }`}
            >
              <Syringe className="w-4 h-4" />
              <span>Журнал щеплень (№ 063/о) ({vaccinations.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('anthropometry')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                activeSubTab === 'anthropometry'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
              }`}
            >
              <Ruler className="w-4 h-4" />
              <span>Антропометрія ({anthropometries.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('brackerage')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                activeSubTab === 'brackerage'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>НАССР: Журнал бракеражу ({brackerageReadyList.length + brackerageRawList.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                activeSubTab === 'analytics'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Статистика та норми ДБН</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <QuickToolbar
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
              onPrint={() => handlePrint(activeSubTab === 'analytics' ? 'health_sheet' : activeSubTab)}
            />
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="card-glass p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Пошук вихованця за ПІБ чи групою..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Group Selector */}
            <div className="w-48">
              <SearchableSelect
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="all">Усі групи ЗДО</option>
                {groups.map(g => (
                  <option key={g.ID} value={g.NAME}>{g.NAME}</option>
                ))}
              </SearchableSelect>
            </div>

            {/* Sub-tab specific filters */}
            {activeSubTab === 'vaccinations' && (
              <>
                <div className="w-44">
                  <select
                    value={vaccineTypeFilter}
                    onChange={e => setVaccineTypeFilter(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="all">Усі вакцини</option>
                    <option value="АКДП / АДП-м">АКДП / АДП-м</option>
                    <option value="КПК">КПК</option>
                    <option value="Поліомієліт">Поліомієліт</option>
                    <option value="Гепатит B">Гепатит B</option>
                    <option value="БЦЖ">БЦЖ</option>
                    <option value="ХІБ">ХІБ</option>
                    <option value="Інше">Інше</option>
                  </select>
                </div>

                <div className="w-40">
                  <select
                    value={vaccineStatusFilter}
                    onChange={e => setVaccineStatusFilter(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="all">Усі статуси</option>
                    <option value="Зроблено">🟢 Зроблено</option>
                    <option value="Заплановано">🟡 Заплановано</option>
                    <option value="Прострочено">🔴 Прострочено</option>
                    <option value="Медвідвід">⚪ Медвідвід</option>
                  </select>
                </div>
              </>
            )}

            {activeSubTab === 'anthropometry' && (
              <div className="w-36">
                <select
                  value={seasonFilter}
                  onChange={e => setSeasonFilter(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="all">Усі сезони</option>
                  <option value="Осінь">🍁 Осінь</option>
                  <option value="Весна">🌸 Весна</option>
                </select>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {activeSubTab === 'vaccinations' && (
              <button
                onClick={() => handleOpenVacModal()}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Додати щеплення</span>
              </button>
            )}

            {activeSubTab === 'anthropometry' && (
              <button
                onClick={() => handleOpenAnthroModal()}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Зафіксувати виміри</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: HEALTH SHEET */}
        {activeSubTab === 'health_sheet' && (
          <div className="card-glass overflow-hidden shadow-md">
            <div className="p-4 bg-emerald-500/5 border-b border-emerald-500/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Листок здоров'я та маркування меблів для групи: {selectedGroup === 'all' ? 'Всі групи' : selectedGroup}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Визначає ростову групу столу й стільця для кожної дитини відповідно до ДБН В.2.2-4:2018 та Санітарного регламенту
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Записів: {filteredChildrenForHealthSheet.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 w-10 text-center font-bold">№</th>
                    <th className="p-3 font-bold">ПІБ Дитини</th>
                    <th className="p-3 font-bold">Група</th>
                    <th className="p-3 font-bold">Група здоров'я</th>
                    <th className="p-3 font-bold">Фізкультурна група</th>
                    <th className="p-3 font-bold">Група меблів</th>
                    <th className="p-3 font-bold">Дієта / Алергії</th>
                    <th className="p-3 font-bold">Хронічні стани</th>
                    <th className="p-3 w-28 text-center font-bold">Дія</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredChildrenForHealthSheet.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Вихованців не знайдено за заданими фільтрами
                      </td>
                    </tr>
                  ) : (
                    filteredChildrenForHealthSheet.map((child, idx) => {
                      const card = medicalCardMap.get(child.ID);
                      const healthGroup = card?.HEALTH_GROUP || 'I (Здорові)';
                      const physicalGroup = card?.PHYSICAL_GROUP || 'Основна';
                      const deskSize = card?.DESK_FURNITURE_SIZE || '1 (85-100 см)';
                      const diet = card?.DIET_PRECAUTIONS || child.DIET_NOTES || 'Загальний стіл';
                      const isSpecialDiet = diet && diet !== 'Загальний стіл' && diet !== 'Звичайне харчування' && diet !== 'Немає';

                      return (
                        <tr key={child.ID} className="hover:bg-emerald-500/5 transition">
                          <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{child.FULL_NAME}</div>
                            <div className="text-[10px] text-slate-400">{child.BIRTH_DATE} ({child.GENDER})</div>
                          </td>
                          <td className="p-3 font-medium text-slate-600 dark:text-slate-400">{child.GROUP_NAME}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              healthGroup.startsWith('I ') 
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : healthGroup.startsWith('II ')
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            }`}>
                              {healthGroup}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                              {physicalGroup}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono font-bold text-[11px]">
                              № {deskSize}
                            </span>
                          </td>
                          <td className="p-3">
                            {isSpecialDiet ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                                <Utensils className="w-3 h-3" />
                                <span>{diet}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Загальний стіл</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate">
                            {card?.CHRONIC_CONDITIONS || 'Немає'}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleOpenCardModal(child)}
                              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg font-bold text-[11px] transition flex items-center space-x-1 mx-auto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Змінити</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: VACCINATIONS */}
        {activeSubTab === 'vaccinations' && (
          <div className="card-glass overflow-hidden shadow-md">
            <div className="p-4 bg-purple-500/5 border-b border-purple-500/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
                  <Syringe className="w-4 h-4 text-purple-600" />
                  <span>Журнал профілактичних щеплень вихованців (Форма первинного обліку № 063/о)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Фіксація вакцинації проти туберкульозу, гепатиту В, дифтерії, кашлюка, правця, поліомієліту, кору, краснухи, паротиту
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                Записів: {filteredVaccinations.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 w-10 text-center font-bold">№</th>
                    <th className="p-3 font-bold">ПІБ Дитини</th>
                    <th className="p-3 font-bold">Група</th>
                    <th className="p-3 font-bold">Вакцина</th>
                    <th className="p-3 font-bold">Доза / Етап</th>
                    <th className="p-3 font-bold">Дата</th>
                    <th className="p-3 font-bold">Серія</th>
                    <th className="p-3 font-bold">Реакція</th>
                    <th className="p-3 font-bold">Статус</th>
                    <th className="p-3 w-24 text-center font-bold">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredVaccinations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        Записів щеплень не знайдено
                      </td>
                    </tr>
                  ) : (
                    filteredVaccinations.map((vac, idx) => (
                      <tr key={vac.ID} className="hover:bg-purple-500/5 transition">
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{vac.CHILD_NAME}</td>
                        <td className="p-3 text-slate-500">{vac.GROUP_NAME}</td>
                        <td className="p-3 font-black text-slate-700 dark:text-slate-300">{vac.VACCINE_TYPE}</td>
                        <td className="p-3 font-medium text-slate-600 dark:text-slate-400">{vac.DOSE_STAGE}</td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{vac.ADMINISTERED_DATE}</td>
                        <td className="p-3 font-mono text-slate-500">{vac.SERIES_NUMBER || '—'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{vac.REACTION}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center space-x-1 ${
                            vac.STATUS === 'Зроблено' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : vac.STATUS === 'Заплановано'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : vac.STATUS === 'Прострочено'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            <span>{vac.STATUS}</span>
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleOpenVacModal(vac)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 rounded transition"
                              title="Редагувати"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteVac(vac.ID)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600 rounded transition"
                              title="Видалити"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ANTHROPOMETRY */}
        {activeSubTab === 'anthropometry' && (
          <div className="card-glass overflow-hidden shadow-md">
            <div className="p-4 bg-teal-500/5 border-b border-teal-500/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
                  <Ruler className="w-4 h-4 text-teal-600" />
                  <span>Журнал антропометричних вимірювань (Осінь / Весна)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Обов'язковий моніторинг показників фізичного розвитку дітей дошкільного віку
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                Вимірів: {filteredAnthropometry.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 w-10 text-center font-bold">№</th>
                    <th className="p-3 font-bold">ПІБ Дитини</th>
                    <th className="p-3 font-bold">Група</th>
                    <th className="p-3 font-bold">Дата виміру</th>
                    <th className="p-3 font-bold">Сезон</th>
                    <th className="p-3 font-bold">Зріст (см)</th>
                    <th className="p-3 font-bold">Вага (кг)</th>
                    <th className="p-3 font-bold">Окружність грудей</th>
                    <th className="p-3 font-bold">Оцінка розвитку</th>
                    <th className="p-3 w-24 text-center font-bold">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAnthropometry.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        Записів вимірювань не знайдено
                      </td>
                    </tr>
                  ) : (
                    filteredAnthropometry.map((a, idx) => (
                      <tr key={a.ID} className="hover:bg-teal-500/5 transition">
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{a.CHILD_NAME}</td>
                        <td className="p-3 text-slate-500">{a.GROUP_NAME}</td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{a.DATE}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                            a.SEASON === 'Осінь' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {a.SEASON}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-200">{a.HEIGHT_CM} см</td>
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-200">{a.WEIGHT_KG} кг</td>
                        <td className="p-3 font-mono text-slate-500">{a.CHEST_CM ? `${a.CHEST_CM} см` : '—'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            a.EVALUATION === 'Нормальний розвиток'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {a.EVALUATION}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleOpenAnthroModal(a)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 rounded transition"
                              title="Редагувати"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAnthro(a.ID)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600 rounded transition"
                              title="Видалити"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: HACCP BRACKERAGE (ЖУРНАЛ БРАКЕРАЖУ ГОТОВОЇ ТА СИРОЇ ПРОДУКЦІЇ) */}
        {activeSubTab === 'brackerage' && (
          <div className="space-y-4">
            {/* Brackerage Header & Mode Switcher */}
            <div className="card-glass p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setBrackerageSubTab('ready')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 ${
                    brackerageSubTab === 'ready'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  <span>Бракераж готових страв ({brackerageReadyList.length})</span>
                </button>

                <button
                  onClick={() => setBrackerageSubTab('raw')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 ${
                    brackerageSubTab === 'raw'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Бракераж сирої продукції ({brackerageRawList.length})</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {brackerageSubTab === 'ready' ? (
                  <>
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        const menu = getMenuEntries(today);
                        if (menu.length === 0) {
                          alert(`На сьогодні (${today}) в системі ще немає збережених страв у меню.`);
                          return;
                        }
                        menu.forEach(item => {
                          addBrackerageReadyEntry({
                            DATE: today,
                            TIME: item.MEAL_TYPE === 'Сніданок' ? '08:30' : item.MEAL_TYPE === 'Обід' ? '12:00' : '15:30',
                            MEAL_TYPE: item.MEAL_TYPE,
                            DISH_NAME: item.NAME_BLUDA,
                            SAMPLE_TAKEN_TIME: item.MEAL_TYPE === 'Сніданок' ? '08:25' : item.MEAL_TYPE === 'Обід' ? '11:55' : '15:25',
                            WEIGHT_PORTION_CHECK: 'Відповідає виходу',
                            TEMPERATURE_C: item.MEAL_TYPE === 'Обід' ? 75 : 65,
                            ORGANOLEPTIC_RATING: 'Відмінно',
                            PERMISSION_TO_SERVE: 'Видача дозволена',
                            COMMISSION_MEMBERS: 'Медсестра Суміна Н.Є., Шеф-кухар',
                            NOTES: 'Смак, запах, колір та консистенція відповідають нормі'
                          });
                        });
                        setBrackerageReadyList(getBrackerageReadyEntries());
                      }}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
                      title="За 1 клік створити записи для всіх страв з меню на сьогодні"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Заповнити з сьогоднішнього меню</span>
                    </button>

                    <button
                      onClick={() => {
                        setBrackDate(new Date().toISOString().split('T')[0]);
                        setIsBrackReadyModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Новий запис проби</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setRawDate(new Date().toISOString().split('T')[0]);
                      setIsBrackRawModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Прийняти сировину</span>
                  </button>
                )}
              </div>
            </div>

            {/* Brackerage Ready Table */}
            {brackerageSubTab === 'ready' && (
              <div className="card-glass rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="table-grid text-xs">
                    <thead>
                      <tr>
                        <th className="w-8">№</th>
                        <th>Дата та час</th>
                        <th>Прийом їжі</th>
                        <th>Назва страви</th>
                        <th className="text-center">Температура</th>
                        <th className="text-center">Оцінка якості</th>
                        <th className="text-center">Рішення</th>
                        <th>Бракеражна комісія</th>
                        <th className="w-12 text-center">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brackerageReadyList.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-8 text-slate-400">
                            Немає записів у журналі бракеражу готових страв. Натисніть «Заповнити з сьогоднішнього меню» або «Новий запис проби».
                          </td>
                        </tr>
                      ) : (
                        brackerageReadyList.map((b, idx) => (
                          <tr key={b.ID}>
                            <td className="text-center text-slate-400">{idx + 1}</td>
                            <td className="font-mono">
                              <b>{b.DATE}</b> <span className="text-slate-400">{b.TIME}</span>
                            </td>
                            <td>
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                                {b.MEAL_TYPE}
                              </span>
                            </td>
                            <td className="font-bold text-slate-800 dark:text-slate-100">{b.DISH_NAME}</td>
                            <td className="text-center font-mono">{b.TEMPERATURE_C ? `${b.TEMPERATURE_C}°C` : '—'}</td>
                            <td className="text-center">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                b.ORGANOLEPTIC_RATING === 'Відмінно'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {b.ORGANOLEPTIC_RATING}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                                b.PERMISSION_TO_SERVE === 'Видача дозволена'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}>
                                ✓ {b.PERMISSION_TO_SERVE}
                              </span>
                            </td>
                            <td className="text-slate-600 dark:text-slate-300 text-[11px] truncate max-w-[200px]" title={b.COMMISSION_MEMBERS}>
                              {b.COMMISSION_MEMBERS}
                            </td>
                            <td className="text-center">
                              <button
                                onClick={() => {
                                  deleteBrackerageReadyEntry(b.ID);
                                  setBrackerageReadyList(getBrackerageReadyEntries());
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                title="Видалити запис"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Brackerage Raw Table */}
            {brackerageSubTab === 'raw' && (
              <div className="card-glass rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="table-grid text-xs">
                    <thead>
                      <tr>
                        <th className="w-8">№</th>
                        <th>Дата</th>
                        <th>Продукт / Сировина</th>
                        <th>Постачальник</th>
                        <th>Накладна</th>
                        <th className="text-center">Цілісність</th>
                        <th>Термін придатності</th>
                        <th className="text-center">Документи</th>
                        <th className="text-center">Рішення</th>
                        <th className="w-12 text-center">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brackerageRawList.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-8 text-slate-400">
                            Немає записів у журналі сирої продукції. Натисніть «Прийняти сировину».
                          </td>
                        </tr>
                      ) : (
                        brackerageRawList.map((r, idx) => (
                          <tr key={r.ID}>
                            <td className="text-center text-slate-400">{idx + 1}</td>
                            <td className="font-mono font-bold">{r.DATE}</td>
                            <td className="font-bold text-slate-800 dark:text-slate-100">{r.PRODUCT_NAME}</td>
                            <td>{r.SUPPLIER_NAME}</td>
                            <td className="font-mono text-slate-500">{r.INVOICE_NUMBER || '—'}</td>
                            <td className="text-center">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                {r.PACKAGE_INTEGRITY}
                              </span>
                            </td>
                            <td className="font-mono text-slate-600 dark:text-slate-300">{r.EXPIRY_DATE}</td>
                            <td className="text-center">
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                                {r.DOCUMENTATION_STATUS}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                                ✓ {r.ACCEPTANCE_DECISION}
                              </span>
                            </td>
                            <td className="text-center">
                              <button
                                onClick={() => {
                                  deleteBrackerageRawEntry(r.ID);
                                  setBrackerageRawList(getBrackerageRawEntries());
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                title="Видалити запис"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ANALYTICS & NORMS */}
        {activeSubTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-glass p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Норми підбору меблів за зростом дитини (ДБН В.2.2-4:2018)</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                За вимогами Санітарного регламенту для ЗДО столи та стільці маркуються відповідним кольором та номером групи:
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-orange-800 dark:text-orange-300">Група 00 (до 85 см):</span>
                    <div className="text-[11px] text-slate-500">Висота столу: 34 см | Висота сидіння: 18 см</div>
                  </div>
                  <span className="px-2 py-1 rounded bg-orange-200 dark:bg-orange-900 font-bold text-orange-900 dark:text-orange-100 text-[10px]">
                    Маркування: Чорне
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-blue-800 dark:text-blue-300">Група 0 (85-100 см):</span>
                    <div className="text-[11px] text-slate-500">Висота столу: 40 см | Висота сидіння: 22 см</div>
                  </div>
                  <span className="px-2 py-1 rounded bg-blue-200 dark:bg-blue-900 font-bold text-blue-900 dark:text-blue-100 text-[10px]">
                    Маркування: Біле
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-amber-800 dark:text-amber-300">Група 1 (100-115 см):</span>
                    <div className="text-[11px] text-slate-500">Висота столу: 46 см | Висота сидіння: 26 см</div>
                  </div>
                  <span className="px-2 py-1 rounded bg-amber-200 dark:bg-amber-900 font-bold text-amber-900 dark:text-amber-100 text-[10px]">
                    Маркування: Помаранчеве
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-purple-800 dark:text-purple-300">Група 2 (115-130 см):</span>
                    <div className="text-[11px] text-slate-500">Висота столу: 52 см | Висота сидіння: 30 см</div>
                  </div>
                  <span className="px-2 py-1 rounded bg-purple-200 dark:bg-purple-900 font-bold text-purple-900 dark:text-purple-100 text-[10px]">
                    Маркування: Фіолетове
                  </span>
                </div>
              </div>
            </div>

            <div className="card-glass p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center space-x-2">
                <Utensils className="w-5 h-5 text-rose-600" />
                <span>Зведення з дієтичного харчування та алергій</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Перелік дітей з особливими дієтичними потребами, що передається на харчоблок шеф-кухарю:
              </p>

              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {activeChildren.filter(c => {
                  const card = medicalCardMap.get(c.ID);
                  const diet = card?.DIET_PRECAUTIONS || c.DIET_NOTES || '';
                  return diet && diet !== 'Загальний стіл' && diet !== 'Звичайне харчування' && diet !== 'Немає';
                }).length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">Дітей на спецдієті немає</div>
                ) : (
                  activeChildren
                    .filter(c => {
                      const card = medicalCardMap.get(c.ID);
                      const diet = card?.DIET_PRECAUTIONS || c.DIET_NOTES || '';
                      return diet && diet !== 'Загальний стіл' && diet !== 'Звичайне харчування' && diet !== 'Немає';
                    })
                    .map(child => {
                      const card = medicalCardMap.get(child.ID);
                      const diet = card?.DIET_PRECAUTIONS || child.DIET_NOTES;
                      return (
                        <div key={child.ID} className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex justify-between items-center text-xs">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{child.FULL_NAME}</div>
                            <div className="text-[10px] text-slate-500">{child.GROUP_NAME}</div>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold text-[11px]">
                            {diet}
                          </span>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRINT VIEW (Official Ukrainian A4 document) */}
      <div className="hidden print:block text-black bg-white p-6 font-sans">
        <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-4 text-xs">
          <div>
            <div className="font-bold">УКРАЇНА</div>
            <div>МІНІСТЕРСТВО ОСВІТИ І НАУКИ УКРАЇНИ</div>
            <div className="font-bold uppercase">КЗДО (ЯСЛА-САДОК) КТ №145 КМР</div>
            <div>ЄДРПОУ: 26136748 | м. Кривий Ріг, вул. Перлинна 23А</div>
          </div>
          <div className="text-right">
            <div><b>ЗАТВЕРДЖУЮ</b></div>
            <div>Директор КЗДО №145</div>
            <div className="mt-3">________________ / Н. Г. Павлухіна</div>
            <div className="text-[10px]">«_____» ____________ 2026 р.</div>
          </div>
        </div>

        <div className="text-center my-3">
          <h2 className="text-sm font-bold uppercase tracking-wider">
            {printDocType === 'health_sheet' && `ЛИСТОК ЗДОРОВ'Я ТА МАРКУВАННЯ МЕБЛІВ (${selectedGroup === 'all' ? 'ВСІ ГРУПИ' : selectedGroup})`}
            {printDocType === 'vaccinations' && 'ЖУРНАЛ ПРОФІЛАКТИЧНИХ ЩЕПЛЕНЬ (ФОРМА № 063/О)'}
            {printDocType === 'anthropometry' && 'ЖУРНАЛ АНТРОПОМЕТРИЧНИХ ВИМІРЮВАНЬ ВИХОВАНЦІВ'}
          </h2>
          <div className="text-[11px] mt-0.5">Дата формування: {new Date().toLocaleDateString('uk-UA')}</div>
        </div>

        <table className="w-full border-collapse border border-black text-[10px] my-3">
          <thead>
            <tr className="bg-slate-100 font-bold text-center">
              <th className="border border-black p-1 w-8">№</th>
              <th className="border border-black p-1 text-left">ПІБ Дитини</th>
              <th className="border border-black p-1 text-left">Група</th>
              {printDocType === 'health_sheet' && (
                <>
                  <th className="border border-black p-1 w-20">Група здоров'я</th>
                  <th className="border border-black p-1 w-20">Фізкультура</th>
                  <th className="border border-black p-1 w-20">Група меблів</th>
                  <th className="border border-black p-1 text-left">Особливості харчування / Дієта</th>
                </>
              )}
              {printDocType === 'vaccinations' && (
                <>
                  <th className="border border-black p-1">Вакцина</th>
                  <th className="border border-black p-1">Доза</th>
                  <th className="border border-black p-1">Дата введення</th>
                  <th className="border border-black p-1">Серія</th>
                  <th className="border border-black p-1">Статус</th>
                </>
              )}
              {printDocType === 'anthropometry' && (
                <>
                  <th className="border border-black p-1">Сезон / Дата</th>
                  <th className="border border-black p-1">Зріст</th>
                  <th className="border border-black p-1">Вага</th>
                  <th className="border border-black p-1">Оцінка розвитку</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {printDocType === 'health_sheet' && filteredChildrenForHealthSheet.map((c, idx) => {
              const card = medicalCardMap.get(c.ID);
              return (
                <tr key={c.ID} className="border-b border-black">
                  <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-1 font-bold">{c.FULL_NAME}</td>
                  <td className="border border-black p-1">{c.GROUP_NAME}</td>
                  <td className="border border-black p-1 text-center font-bold">{(card?.HEALTH_GROUP || 'I').split(' ')[0]}</td>
                  <td className="border border-black p-1 text-center">{card?.PHYSICAL_GROUP || 'Основна'}</td>
                  <td className="border border-black p-1 text-center font-bold">№ {card?.DESK_FURNITURE_SIZE || '1'}</td>
                  <td className="border border-black p-1">{card?.DIET_PRECAUTIONS || c.DIET_NOTES || 'Загальний стіл'}</td>
                </tr>
              );
            })}

            {printDocType === 'vaccinations' && filteredVaccinations.map((v, idx) => (
              <tr key={v.ID} className="border-b border-black">
                <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                <td className="border border-black p-1 font-bold">{v.CHILD_NAME}</td>
                <td className="border border-black p-1">{v.GROUP_NAME}</td>
                <td className="border border-black p-1 font-bold">{v.VACCINE_TYPE}</td>
                <td className="border border-black p-1">{v.DOSE_STAGE}</td>
                <td className="border border-black p-1 text-center font-mono">{v.ADMINISTERED_DATE}</td>
                <td className="border border-black p-1 text-center font-mono">{v.SERIES_NUMBER || '—'}</td>
                <td className="border border-black p-1 text-center font-bold">{v.STATUS}</td>
              </tr>
            ))}

            {printDocType === 'anthropometry' && filteredAnthropometry.map((a, idx) => (
              <tr key={a.ID} className="border-b border-black">
                <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                <td className="border border-black p-1 font-bold">{a.CHILD_NAME}</td>
                <td className="border border-black p-1">{a.GROUP_NAME}</td>
                <td className="border border-black p-1 text-center">{a.SEASON} ({a.DATE})</td>
                <td className="border border-black p-1 text-center font-bold">{a.HEIGHT_CM} см</td>
                <td className="border border-black p-1 text-center font-bold">{a.WEIGHT_KG} кг</td>
                <td className="border border-black p-1">{a.EVALUATION}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center text-xs mt-6 pt-3 border-t border-black">
          <div><b>Сестра медична старша:</b> ____________________ / (Підпис)</div>
          <div><b>Вихователь групи:</b> ____________________ / (Підпис)</div>
        </div>
      </div>

      {/* MODAL: EDIT MEDICAL CARD */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="card-glass bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <HeartPulse className="w-5 h-5 text-emerald-600" />
                <span>Медична картка: {editingCard?.CHILD_NAME}</span>
              </h3>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Група здоров'я</label>
                  <select
                    value={cardHealthGroup}
                    onChange={e => setCardHealthGroup(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="I (Здорові)">I (Здорові)</option>
                    <option value="II (Група ризику)">II (Група ризику)</option>
                    <option value="III (Хронічні захворювання)">III (Хронічні захворювання)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Фізкультурна група</label>
                  <select
                    value={cardPhysicalGroup}
                    onChange={e => setCardPhysicalGroup(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="Основна">Основна</option>
                    <option value="Підготовча">Підготовча</option>
                    <option value="Спеціальна">Спеціальна</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Група меблів (ДБН В.2.2-4:2018)
                </label>
                <select
                  value={cardDeskSize}
                  onChange={e => setCardDeskSize(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="0 (до 85 см)">0 (до 85 см) — маркування біле</option>
                  <option value="1 (85-100 см)">1 (85-100 см) — маркування помаранчеве</option>
                  <option value="2 (100-115 см)">2 (100-115 см) — маркування фіолетове</option>
                  <option value="3 (115-130 см)">3 (115-130 см) — маркування жовте</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Особливості харчування / Дієта (Алергії, стіл №5 тощо)
                </label>
                <input
                  type="text"
                  value={cardDiet}
                  onChange={e => setCardDiet(e.target.value)}
                  placeholder="Наприклад: Безлактозна дієта, Алергія на цитрусові"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Загальний стіл', 'Безлактозна дієта', 'Безглютенова', 'Алергія на рибу', 'Алергія на цитрусові', 'Стіл №5'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setCardDiet(tag)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 text-slate-600 dark:text-slate-400 hover:text-emerald-700 text-[10px]"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Хронічні захворювання</label>
                  <input
                    type="text"
                    value={cardChronic}
                    onChange={e => setCardChronic(e.target.value)}
                    placeholder="Немає або діагноз"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Зір та слух</label>
                  <input
                    type="text"
                    value={cardVision}
                    onChange={e => setCardVision(e.target.value)}
                    placeholder="Норма / Корекція"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Висновок педіатра / сімейного лікаря</label>
                <textarea
                  value={cardDoctor}
                  onChange={e => setCardDoctor(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  Зберегти медкарту
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT VACCINATION */}
      {isVacModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="card-glass bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <Syringe className="w-5 h-5 text-purple-600" />
                <span>{editingVac ? 'Редагувати щеплення' : 'Новий запис про щеплення (Ф. 063/о)'}</span>
              </h3>
              <button
                onClick={() => setIsVacModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVac} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Вихованець</label>
                <select
                  value={vacChildId}
                  onChange={e => setVacChildId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  {activeChildren.map(c => (
                    <option key={c.ID} value={c.ID}>{c.FULL_NAME} ({c.GROUP_NAME})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Тип вакцини</label>
                  <select
                    value={vacType}
                    onChange={e => setVacType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="АКДП / АДП-м">АКДП / АДП-м</option>
                    <option value="КПК">КПК (Кір, Паротит, Краснуха)</option>
                    <option value="Поліомієліт">Поліомієліт (ІПВ/ОПВ)</option>
                    <option value="Гепатит B">Гепатит B</option>
                    <option value="БЦЖ">БЦЖ (Туберкульоз)</option>
                    <option value="ХІБ">ХІБ-інфекція</option>
                    <option value="Інше">Інше</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Доза / Етап</label>
                  <input
                    type="text"
                    value={vacStage}
                    onChange={e => setVacStage(e.target.value)}
                    placeholder="Наприклад: V1, V2, R1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Дата введення</label>
                  <input
                    type="date"
                    value={vacDate}
                    onChange={e => setVacDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Серія / Партія</label>
                  <input
                    type="text"
                    value={vacSeries}
                    onChange={e => setVacSeries(e.target.value)}
                    placeholder="Серія препарату"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Статус щеплення</label>
                  <select
                    value={vacStatus}
                    onChange={e => setVacStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="Зроблено">🟢 Зроблено</option>
                    <option value="Заплановано">🟡 Заплановано</option>
                    <option value="Прострочено">🔴 Прострочено</option>
                    <option value="Медвідвід">⚪ Медвідвід</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Реакція організму</label>
                  <select
                    value={vacReaction}
                    onChange={e => setVacReaction(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="Звичайна">Звичайна</option>
                    <option value="Слабка">Слабка</option>
                    <option value="Місцева">Місцева</option>
                    <option value="Ускладнена">Ускладнена</option>
                    <option value="Відсутня">Відсутня</option>
                  </select>
                </div>
              </div>

              {vacStatus === 'Медвідвід' && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Причина медичного відводу</label>
                  <input
                    type="text"
                    value={vacExemption}
                    onChange={e => setVacExemption(e.target.value)}
                    placeholder="Тимчасовий медвідвід за станом здоров'я / Відмова батьків"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Примітки медсестри</label>
                <input
                  type="text"
                  value={vacNotes}
                  onChange={e => setVacNotes(e.target.value)}
                  placeholder="Додаткові примітки"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVacModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/20"
                >
                  Зберегти щеплення
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ANTHROPOMETRY */}
      {isAnthroModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="card-glass bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <Ruler className="w-5 h-5 text-teal-600" />
                <span>{editingAnthro ? 'Редагувати вимірювання' : 'Новий антропометричний запис'}</span>
              </h3>
              <button
                onClick={() => setIsAnthroModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAnthro} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Вихованець</label>
                <select
                  value={anthroChildId}
                  onChange={e => setAnthroChildId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  {activeChildren.map(c => (
                    <option key={c.ID} value={c.ID}>{c.FULL_NAME} ({c.GROUP_NAME})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Сезон виміру</label>
                  <select
                    value={anthroSeason}
                    onChange={e => setAnthroSeason(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="Осінь">🍁 Осінь</option>
                    <option value="Весна">🌸 Весна</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Дата виміру</label>
                  <input
                    type="date"
                    value={anthroDate}
                    onChange={e => setAnthroDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Зріст (см)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={anthroHeight}
                    onChange={e => setAnthroHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Вага (кг)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={anthroWeight}
                    onChange={e => setAnthroWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Окружність грудей (см)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={anthroChest || ''}
                    onChange={e => setAnthroChest(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Необов'язково"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Оцінка фізичного розвитку</label>
                <select
                  value={anthroEval}
                  onChange={e => setAnthroEval(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="Нормальний розвиток">Нормальний розвиток</option>
                  <option value="Дефіцит ваги">Дефіцит ваги</option>
                  <option value="Надлишкова вага">Надлишкова вага</option>
                  <option value="Високий зріст">Високий зріст</option>
                  <option value="Низький зріст">Низький зріст</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Примітки</label>
                <input
                  type="text"
                  value={anthroNotes}
                  onChange={e => setAnthroNotes(e.target.value)}
                  placeholder="Додаткові спостереження"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAnthroModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md shadow-teal-600/20"
                >
                  Зберегти виміри
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BRACKERAGE READY */}
      {isBrackReadyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Utensils className="w-5 h-5" />
                <h3 className="font-bold text-base">Бракераж готової продукції (НАССР)</h3>
              </div>
              <button onClick={() => setIsBrackReadyModalOpen(false)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBrackReady} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Дата виготовлення</label>
                  <input
                    type="date"
                    value={brackDate}
                    onChange={e => setBrackDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Час зняття проби</label>
                  <input
                    type="time"
                    value={brackTime}
                    onChange={e => setBrackTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Прийом їжі</label>
                  <select
                    value={brackMealType}
                    onChange={e => setBrackMealType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="Сніданок">Сніданок</option>
                    <option value="2-й сніданок">2-й сніданок</option>
                    <option value="Обід">Обід</option>
                    <option value="Полуденок">Полуденок</option>
                    <option value="Вечеря">Вечеря</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Температура страви (°C)</label>
                  <input
                    type="number"
                    value={brackTemp}
                    onChange={e => setBrackTemp(Number(e.target.value))}
                    placeholder="Напр. 75"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Назва страви / кулінарного виробу</label>
                <input
                  type="text"
                  value={brackDishName}
                  onChange={e => setBrackDishName(e.target.value)}
                  placeholder="Наприклад: Борщ український зі сметаною"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Органолептична оцінка</label>
                  <select
                    value={brackRating}
                    onChange={e => setBrackRating(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="Відмінно">🟢 Відмінно</option>
                    <option value="Добре">🔵 Добре</option>
                    <option value="Задовільно">🟡 Задовільно</option>
                    <option value="Незадовільно">🔴 Незадовільно</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Дозвіл на видачу</label>
                  <select
                    value={brackPermission}
                    onChange={e => setBrackPermission(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="Видача дозволена">✅ Видача дозволена</option>
                    <option value="Видача заборонена">⛔ Видача заборонена</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Контроль виходу порції (факт / норма)</label>
                <input
                  type="text"
                  value={brackWeight}
                  onChange={e => setBrackWeight(e.target.value)}
                  placeholder="200г / 200г"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Бракеражна комісія (підписи)</label>
                <input
                  type="text"
                  value={brackCommission}
                  onChange={e => setBrackCommission(e.target.value)}
                  placeholder="Медсестра Суміна Н.Є., Шеф-кухар"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Результати органолептики / Примітки</label>
                <textarea
                  rows={2}
                  value={brackNotes}
                  onChange={e => setBrackNotes(e.target.value)}
                  placeholder="Зовнішній вигляд, смак, запах, консистенція відповідають вимогам"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBrackReadyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Зафіксувати пробу</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BRACKERAGE RAW */}
      {isBrackRawModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold text-base">Вхідний контроль сировини (НАССР)</h3>
              </div>
              <button onClick={() => setIsBrackRawModalOpen(false)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBrackRaw} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Дата прийому</label>
                  <input
                    type="date"
                    value={rawDate}
                    onChange={e => setRawDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Термін придатності до</label>
                  <input
                    type="date"
                    value={rawExpiry}
                    onChange={e => setRawExpiry(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Назва продукту / сировини</label>
                <input
                  type="text"
                  value={rawProdName}
                  onChange={e => setRawProdName(e.target.value)}
                  placeholder="Наприклад: Масло вершкове 73% ДСТУ"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Постачальник</label>
                  <input
                    type="text"
                    value={rawSupplier}
                    onChange={e => setRawSupplier(e.target.value)}
                    placeholder="ТОВ «Агропостач»"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Номер накладної</label>
                  <input
                    type="text"
                    value={rawInvoice}
                    onChange={e => setRawInvoice(e.target.value)}
                    placeholder="НАК-104"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Цілісність упаковки</label>
                  <select
                    value={rawIntegrity}
                    onChange={e => setRawIntegrity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="Цілісна">🟢 Цілісна, без пошкоджень</option>
                    <option value="Пошкоджена">🔴 Пошкоджена / Деформована</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Супровідні документи</label>
                  <select
                    value={rawDocStatus}
                    onChange={e => setRawDocStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="В наявності">🟢 В наявності (сертифікат / декларація)</option>
                    <option value="Неповна">🟡 Неповний пакет документів</option>
                    <option value="Відсутня">🔴 Документи відсутні</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Рішення про допуск</label>
                  <select
                    value={rawDecision}
                    onChange={e => setRawDecision(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="Прийнято">✅ Прийнято до харчоблоку</option>
                    <option value="Відхилено">⛔ Відхилено / Повернення</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Відповідальна особа</label>
                  <input
                    type="text"
                    value={rawPerson}
                    onChange={e => setRawPerson(e.target.value)}
                    placeholder="Суміна Н.Є."
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Умови транспортування / Примітки</label>
                <textarea
                  rows={2}
                  value={rawNotes}
                  onChange={e => setRawNotes(e.target.value)}
                  placeholder="Температурний режим рефрижератора дотримано, маркування чітке"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBrackRawModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md shadow-teal-600/20 flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Зареєструвати партію</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WORKFLOW GUIDE MODAL */}
      <WorkflowGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="Покрокова інструкція: Медичний кабінет ЗДО"
        subtitle="Ведення обов'язкової медичної документації: Листок здоров'я, Форма № 063/о та Антропометрія"
        steps={medicalWorkflowSteps}
        importantNotes={[
          'Листок здоров\'я обов\'язково вивішується в ігровій кімнаті кожної групи для дотримання педагогами правил розсаджування дітей за кольоровим маркуванням столів.',
          'При зміні дієти (на підставі довідки ЛКК або педіатра) медична сестра оновлює статус у медичній картці, і дані автоматично враховуються при формуванні меню-вимоги.',
          'Дані профілактичних щеплень синхронізуються з медичною формою 063/о та зберігаються в картці вихованця при переведенні до іншої групи або випуску до школи.'
        ]}
      />
    </>
  );
};
