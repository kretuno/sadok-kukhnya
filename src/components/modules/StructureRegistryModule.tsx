import { SearchableSelect } from "../common/SearchableSelect";
import { WorkflowGuideModal, WorkflowStep } from "../common/WorkflowGuideModal";
import React, { useState, useEffect, useMemo } from 'react';
import { SadokGroup, SadokEmployee, SadokChild } from '../../types';
import { 
  DATABASE_SYNC_EVENT,
  getGroups, saveGroup, deleteGroup,
  getEmployees, saveEmployee, deleteEmployee,
  getChildren, saveChild, deleteChild
} from '../../services/db';
import { QuickToolbar } from '../QuickToolbar';
import { exportToExcel, exportToPDF } from '../../services/export';
import { 
  Users, 
  Baby, 
  Trash2, 
  Edit3, 
  Phone, 
  CheckCircle2, 
  Search, 
  X, 
  Home, 
  ShieldCheck, 
  GraduationCap,
  ChevronRight,
  Printer,
  FileText,
  UserCheck,
  Calendar,
  HeartPulse,
  Brain,
  MapPin,
  Briefcase,
  AlertTriangle,
  HelpCircle,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  RotateCcw
} from 'lucide-react';

export const StructureRegistryModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'employees' | 'children'>('groups');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Children Filtering & Sorting State
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'Навчається' | 'Вибув' | 'Тимчасово відсутній' | 'Випускник'>('all');
  const [selectedBenefitFilter, setSelectedBenefitFilter] = useState<string>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('all');
  const [selectedDietFilter, setSelectedDietFilter] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'name' | 'birth_date' | 'enrollment_date' | 'group' | 'status'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Data lists
  const [groups, setGroups] = useState<SadokGroup[]>([]);
  const [employees, setEmployees] = useState<SadokEmployee[]>([]);
  const [children, setChildren] = useState<SadokChild[]>([]);

  // Detailed Modal View States
  const [viewingChild, setViewingChild] = useState<SadokChild | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<SadokEmployee | null>(null);
  const [viewingGroup, setViewingGroup] = useState<SadokGroup | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Edit Modals
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<SadokGroup> | null>(null);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<SadokEmployee> | null>(null);

  const [isChildModalOpen, setIsChildModalOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Partial<SadokChild> | null>(null);

  // Group Form State
  const [groupNumber, setGroupNumber] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupAgeCategory, setGroupAgeCategory] = useState('Молодша (3-4 роки)');
  const [groupRoom, setGroupRoom] = useState('');
  const [groupTeacher, setGroupTeacher] = useState('');
  const [groupCount, setGroupCount] = useState<number>(25);

  // Employee Form State
  const [empFullName, setEmpFullName] = useState('');
  const [empPosition, setEmpPosition] = useState('Вихователь');
  const [empPhone, setEmpPhone] = useState('');
  const [empIsMvo, setEmpIsMvo] = useState(false);
  const [empGroupName, setEmpGroupName] = useState('');
  const [empEducation, setEmpEducation] = useState('');
  const [empNotes, setEmpNotes] = useState('');

  // Child Form State
  const [childFullName, setChildFullName] = useState('');
  const [childBirthDate, setChildBirthDate] = useState('2022-05-15');
  const [childGender, setChildGender] = useState<'Чоловіча' | 'Жіноча'>('Чоловіча');
  const [childBirthCert, setChildBirthCert] = useState('');
  const [childGroupName, setChildGroupName] = useState('');
  const [childStatus, setChildStatus] = useState<'Навчається' | 'Вибув' | 'Тимчасово відсутній' | 'Випускник'>('Навчається');
  const [childBenefitCategory, setChildBenefitCategory] = useState('Загальна підстава');
  const [childAddress, setChildAddress] = useState('');

  // Parents Info
  const [childMotherName, setChildMotherName] = useState('');
  const [childMotherPhone, setChildMotherPhone] = useState('');
  const [childFatherName, setChildFatherName] = useState('');
  const [childFatherPhone, setChildFatherPhone] = useState('');
  const [childParentName, setChildParentName] = useState('');
  const [childParentPhone, setChildParentPhone] = useState('');

  // Admission & Departure Details
  const [childEnrollmentDate, setChildEnrollmentDate] = useState('2025-09-01');
  const [childEnrollmentOrder, setChildEnrollmentOrder] = useState('');
  const [childDepartureDate, setChildDepartureDate] = useState('');
  const [childDepartureReason, setChildDepartureReason] = useState('');

  // Special Requirements
  const [childDietNotes, setChildDietNotes] = useState('');
  const [childHealthNotes, setChildHealthNotes] = useState('');
  const [childPsychologyNotes, setChildPsychologyNotes] = useState('');

  useEffect(() => {
    loadAllData();
    window.addEventListener(DATABASE_SYNC_EVENT, loadAllData);
    return () => window.removeEventListener(DATABASE_SYNC_EVENT, loadAllData);
  }, []);

  const loadAllData = () => {
    const g = getGroups();
    const e = getEmployees();
    const c = getChildren();
    setGroups(g);
    setEmployees(e);
    setChildren(c);
  };

  // Quick Child Status Switcher
  const handleQuickStatusChange = (child: SadokChild, newStatus: 'Навчається' | 'Вибув' | 'Тимчасово відсутній' | 'Випускник') => {
    const updated = saveChild({
      ...child,
      STATUS: newStatus
    });
    setChildren(updated);
    if (viewingChild && viewingChild.ID === child.ID) {
      setViewingChild({ ...viewingChild, STATUS: newStatus });
    }
  };

  // Group Handlers
  const handleOpenGroupModal = (g?: SadokGroup) => {
    setEditingGroup(g || null);
    setGroupNumber(g?.NUMBER || g?.GROUP_NUMBER || '');
    setGroupName(g?.NAME || '');
    setGroupAgeCategory(g?.AGE_CATEGORY || 'Молодша (3-4 роки)');
    setGroupRoom(g?.ROOM_NUMBER || '');
    setGroupTeacher(g?.TEACHER_NAME || (employees[0]?.FULL_NAME || ''));
    setGroupCount(g?.CHILDREN_COUNT || 25);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    const updated = saveGroup({
      ID: editingGroup?.ID,
      NUMBER: groupNumber.trim(),
      NAME: groupName.trim(),
      AGE_CATEGORY: groupAgeCategory,
      ROOM_NUMBER: groupRoom.trim(),
      TEACHER_NAME: groupTeacher.trim(),
      CHILDREN_COUNT: Number(groupCount) || 0
    });
    setGroups(updated);
    setIsGroupModalOpen(false);
  };

  const handleDeleteGroup = (id: number) => {
    if (window.confirm('Видалити цю групу з довідника?')) {
      setGroups(deleteGroup(id));
      if (viewingGroup?.ID === id) setViewingGroup(null);
    }
  };

  // Employee Handlers
  const handleOpenEmpModal = (emp?: SadokEmployee) => {
    setEditingEmployee(emp || null);
    setEmpFullName(emp?.FULL_NAME || '');
    setEmpPosition(emp?.POSITION || 'Вихователь');
    setEmpPhone(emp?.PHONE || '');
    setEmpIsMvo(Boolean(emp?.IS_MVO));
    setEmpGroupName(emp?.GROUP_NAME || (groups[0]?.NAME || ''));
    setEmpEducation(emp?.EDUCATION || 'Вища педагогічна');
    setEmpNotes(emp?.NOTES || '');
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFullName.trim()) return;
    const updated = saveEmployee({
      ID: editingEmployee?.ID,
      FULL_NAME: empFullName.trim(),
      POSITION: empPosition.trim(),
      PHONE: empPhone.trim(),
      IS_MVO: empIsMvo,
      GROUP_NAME: empGroupName,
      EDUCATION: empEducation.trim(),
      NOTES: empNotes.trim()
    });
    setEmployees(updated);
    setIsEmployeeModalOpen(false);
  };

  const handleDeleteEmployee = (id: number) => {
    if (window.confirm('Вилучити працівника з кадрового обліку?')) {
      setEmployees(deleteEmployee(id));
      if (viewingEmployee?.ID === id) setViewingEmployee(null);
    }
  };

  // Child Handlers
  const handleOpenChildModal = (ch?: SadokChild) => {
    setEditingChild(ch || null);
    setChildFullName(ch?.FULL_NAME || '');
    setChildBirthDate(ch?.BIRTH_DATE || '2022-05-15');
    setChildGender(ch?.GENDER || 'Чоловіча');
    setChildBirthCert(ch?.BIRTH_CERTIFICATE || '');
    setChildGroupName(ch?.GROUP_NAME || selectedGroupFilter || (groups[0]?.NAME || ''));
    setChildStatus(ch?.STATUS || 'Навчається');
    setChildBenefitCategory(ch?.BENEFIT_CATEGORY || 'Загальна підстава');
    setChildAddress(ch?.ADDRESS || 'м. Кривий Ріг');
    
    setChildMotherName(ch?.MOTHER_NAME || ch?.PARENT_NAME || '');
    setChildMotherPhone(ch?.MOTHER_PHONE || ch?.PARENT_PHONE || '');
    setChildFatherName(ch?.FATHER_NAME || '');
    setChildFatherPhone(ch?.FATHER_PHONE || '');
    setChildParentName(ch?.PARENT_NAME || ch?.MOTHER_NAME || '');
    setChildParentPhone(ch?.PARENT_PHONE || ch?.MOTHER_PHONE || '');

    setChildEnrollmentDate(ch?.ENROLLMENT_DATE || '2025-09-01');
    setChildEnrollmentOrder(ch?.ENROLLMENT_ORDER || 'Наказ № 42-У');
    setChildDepartureDate(ch?.DEPARTURE_DATE || '');
    setChildDepartureReason(ch?.DEPARTURE_REASON || '');

    setChildDietNotes(ch?.DIET_NOTES || '');
    setChildHealthNotes(ch?.HEALTH_NOTES || '');
    setChildPsychologyNotes(ch?.PSYCHOLOGY_NOTES || '');
    setIsChildModalOpen(true);
  };

  const handleSaveChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childFullName.trim()) return;
    const updatedData: Partial<SadokChild> & { FULL_NAME: string } = {
      ID: editingChild?.ID,
      FULL_NAME: childFullName.trim(),
      BIRTH_DATE: childBirthDate,
      GENDER: childGender,
      BIRTH_CERTIFICATE: childBirthCert.trim(),
      GROUP_NAME: childGroupName,
      STATUS: childStatus,
      BENEFIT_CATEGORY: childBenefitCategory,
      ADDRESS: childAddress.trim(),
      MOTHER_NAME: childMotherName.trim(),
      MOTHER_PHONE: childMotherPhone.trim(),
      FATHER_NAME: childFatherName.trim(),
      FATHER_PHONE: childFatherPhone.trim(),
      PARENT_NAME: (childMotherName || childParentName || childFatherName).trim(),
      PARENT_PHONE: (childMotherPhone || childParentPhone || childFatherPhone).trim(),
      ENROLLMENT_DATE: childEnrollmentDate,
      ENROLLMENT_ORDER: childEnrollmentOrder.trim(),
      DEPARTURE_DATE: childDepartureDate,
      DEPARTURE_REASON: childDepartureReason.trim(),
      DIET_NOTES: childDietNotes.trim(),
      HEALTH_NOTES: childHealthNotes.trim(),
      PSYCHOLOGY_NOTES: childPsychologyNotes.trim()
    };

    const updatedList = saveChild(updatedData);
    setChildren(updatedList);
    setIsChildModalOpen(false);

    // If currently viewing this child, update live view modal
    if (viewingChild && editingChild && viewingChild.ID === editingChild.ID) {
      const fresh = updatedList.find(c => c.ID === editingChild.ID);
      if (fresh) setViewingChild(fresh);
    }
  };

  const handleDeleteChild = (id: number) => {
    if (window.confirm('Вилучити картку вихованця?')) {
      setChildren(deleteChild(id));
      if (viewingChild?.ID === id) setViewingChild(null);
    }
  };

  // Filtered Items
  const filteredGroups = groups.filter(g => 
    g.NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.TEACHER_NAME || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmployees = employees.filter(e => 
    e.FULL_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.POSITION.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.GROUP_NAME || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const distinctBenefitCategories = useMemo(() => {
    return Array.from(new Set(children.map(c => c.BENEFIT_CATEGORY || 'Загальна підстава').filter(Boolean)));
  }, [children]);

  const filteredChildren = useMemo(() => {
    return children
      .filter(c => {
        const q = searchTerm.trim().toLowerCase();
        const matchesSearch = !q || (
          c.FULL_NAME.toLowerCase().includes(q) ||
          c.GROUP_NAME.toLowerCase().includes(q) ||
          (c.PARENT_NAME || '').toLowerCase().includes(q) ||
          (c.MOTHER_NAME || '').toLowerCase().includes(q) ||
          (c.FATHER_NAME || '').toLowerCase().includes(q) ||
          (c.PARENT_PHONE || '').includes(q) ||
          (c.MOTHER_PHONE || '').includes(q) ||
          (c.FATHER_PHONE || '').includes(q) ||
          (c.BIRTH_CERTIFICATE || '').toLowerCase().includes(q) ||
          (c.ADDRESS || '').toLowerCase().includes(q) ||
          (c.DIET_NOTES || '').toLowerCase().includes(q)
        );

        const matchesGroup = !selectedGroupFilter || selectedGroupFilter === 'all' || c.GROUP_NAME === selectedGroupFilter;
        const matchesStatus = selectedStatusFilter === 'all' || c.STATUS === selectedStatusFilter;
        const matchesBenefit = selectedBenefitFilter === 'all' || (c.BENEFIT_CATEGORY || 'Загальна підстава') === selectedBenefitFilter;
        const matchesGender = selectedGenderFilter === 'all' || c.GENDER === selectedGenderFilter;
        const matchesDiet = !selectedDietFilter || Boolean(c.DIET_NOTES);

        return matchesSearch && matchesGroup && matchesStatus && matchesBenefit && matchesGender && matchesDiet;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === 'name') {
          comp = a.FULL_NAME.localeCompare(b.FULL_NAME, 'uk-UA');
        } else if (sortField === 'birth_date') {
          comp = (a.BIRTH_DATE || '').localeCompare(b.BIRTH_DATE || '');
        } else if (sortField === 'enrollment_date') {
          comp = (a.ENROLLMENT_DATE || '').localeCompare(b.ENROLLMENT_DATE || '');
        } else if (sortField === 'group') {
          comp = (a.GROUP_NAME || '').localeCompare(b.GROUP_NAME || '', 'uk-UA');
        } else if (sortField === 'status') {
          comp = (a.STATUS || '').localeCompare(b.STATUS || '', 'uk-UA');
        }
        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [children, searchTerm, selectedGroupFilter, selectedStatusFilter, selectedBenefitFilter, selectedGenderFilter, selectedDietFilter, sortField, sortDirection]);

  // Exports
  const handleExportExcel = () => {
    if (activeSubTab === 'groups') {
      const headers = ['№ групи', 'Назва групи / приміщення', 'Вікова категорія', '№ Приміщення', 'Закріплений вихователь/МВО', 'Кількість дітей'];
      const rows = filteredGroups.map(g => [g.NUMBER || g.GROUP_NUMBER || '', g.NAME, g.AGE_CATEGORY, g.ROOM_NUMBER || '', g.TEACHER_NAME || '', g.CHILDREN_COUNT]);
      exportToExcel('SADOK_Групи_ДНЗ', 'Групи', headers, rows);
    } else if (activeSubTab === 'employees') {
      const headers = ['ПІБ Співробітника', 'Посада', 'Телефон', 'МВО', 'Закріплена група/відділ'];
      const rows = filteredEmployees.map(e => [e.FULL_NAME, e.POSITION, e.PHONE || '', e.IS_MVO ? 'Так' : 'Ні', e.GROUP_NAME || '']);
      exportToExcel('SADOK_Кадровий_склад', 'Співробітники', headers, rows);
    } else {
      const headers = ['ПІБ Вихованця', 'Дата народження', 'Група', 'Пільгова категорія', 'Батьки', 'Телефон батьків', 'Статус', 'Особливості дієти'];
      const rows = filteredChildren.map(c => [c.FULL_NAME, c.BIRTH_DATE, c.GROUP_NAME, c.BENEFIT_CATEGORY || 'Загальна', c.PARENT_NAME || c.MOTHER_NAME || '', c.PARENT_PHONE || c.MOTHER_PHONE || '', c.STATUS, c.DIET_NOTES || '']);
      exportToExcel('SADOK_Контингент_Вихованців', 'Діти', headers, rows);
    }
  };

  const handleExportPDF = () => {
    const title = activeSubTab === 'groups' ? 'Реєстр груп та приміщень ЗДО' : (activeSubTab === 'employees' ? 'Кадровий склад та МВО' : 'Списковий склад вихованців ЗДО');
    const headers = activeSubTab === 'groups' 
      ? ['№', 'Група', 'Категорія', 'Кімната', 'Вихователь', 'Дітей']
      : (activeSubTab === 'employees' ? ['ПІБ Співробітника', 'Посада', 'Телефон', 'МВО', 'Локація'] : ['ПІБ Дитини', 'Група', 'Дата народж.', 'Батьки & Тел.', 'Статус']);
    
    const rows = activeSubTab === 'groups'
      ? filteredGroups.map(g => [g.NUMBER || g.GROUP_NUMBER ? `№${g.NUMBER || g.GROUP_NUMBER}` : '-', g.NAME, g.AGE_CATEGORY, g.ROOM_NUMBER || '-', g.TEACHER_NAME || '-', `${g.CHILDREN_COUNT} осіб`])
      : (activeSubTab === 'employees'
        ? filteredEmployees.map(e => [e.FULL_NAME, e.POSITION, e.PHONE || '-', e.IS_MVO ? 'Так' : 'Ні', e.GROUP_NAME || '-'])
        : filteredChildren.map(c => [c.FULL_NAME, c.GROUP_NAME, c.BIRTH_DATE, `${c.PARENT_NAME || c.MOTHER_NAME || '-'} (${c.PARENT_PHONE || c.MOTHER_PHONE || ''})`, c.STATUS]));

    exportToPDF(title, headers, rows);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Навчається':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">🟢 Навчається</span>;
      case 'Вибув':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">🔴 Вибув</span>;
      case 'Тимчасово відсутній':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">🟡 Тимчасово відсутній</span>;
      case 'Випускник':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">🎓 Випускник</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const structureWorkflowSteps: WorkflowStep[] = [
    {
      number: 1,
      title: 'Крок 1. Створення структури (Групи та приміщення)',
      description: 'Почніть із внесення груп садка (номер групи, вікова категорія, назва) та службових приміщень (Харчоблок, Музична зала, Методичний кабінет).',
      details: [
        'Обов\'язково вказуйте номер групи (наприклад: 1, 2, 3) та вікову категорію (Ясла, Молодша, Логопедична тощо)',
        'Створіть службові локації (Харчоблок, Кабінет завгоспа) для коректного закріплення кухарів і майна'
      ],
      warning: 'Якщо пропустити цей крок, при додаванні співробітника або дитини їх не буде до якої групи прикріпити!',
      actionButton: {
        label: 'Додати групу',
        onClick: () => {
          setActiveSubTab('groups');
          handleOpenGroupModal();
        }
      }
    },
    {
      number: 2,
      title: 'Крок 2. Кадри та працівники закладу',
      description: 'Додайте педагогів (вихователів, логопедів), помічників вихователів, кухарів, медсестер та адміністрацію.',
      details: [
        'Оберіть посаду та закріплену групу/локацію (створену на Кроці 1)',
        'Для завгоспа, шеф-кухаря та вихователів увімкніть статус "МВО" (Матеріально-відповідальна особа) — це необхідно для подальшого обліку майна'
      ],
      actionButton: {
        label: 'Додати співробітника',
        onClick: () => {
          setActiveSubTab('employees');
          handleOpenEmpModal();
        }
      }
    },
    {
      number: 3,
      title: 'Крок 3. Контингент вихованців (Діти)',
      description: 'Внесіть дані дітей: ПІБ, дату народження, групу, пільгову категорію та контакти батьків.',
      details: [
        'Кожна дитина закріплюється за групою, створеною на Кроці 1',
        'Вказуйте пільгову категорію (Багатодітні, ВПО, УБД, Малозабезпечені тощо) для розрахунку харчування та звітів'
      ],
      actionButton: {
        label: 'Додати вихованця',
        onClick: () => {
          setActiveSubTab('children');
          handleOpenChildModal();
        }
      }
    }
  ];

  return (
    <>
      {/* SCREEN UI (Hidden on Print) */}
      <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950 no-print">
        <QuickToolbar
          onAdd={() => {
            if (activeSubTab === 'groups') handleOpenGroupModal();
            else if (activeSubTab === 'employees') handleOpenEmpModal();
            else handleOpenChildModal();
          }}
          onRefresh={loadAllData}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          onPrint={() => window.print()}
          onShowGuide={() => setIsGuideOpen(true)}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          title="Контингент та Кадри"
        />

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* HEADER BANNER */}
          <div className="card-glass p-3.5 flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-indigo-600 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-xl shadow-md flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                  <span>SADOK Контингент</span>
                  <span className="text-xs px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 font-bold rounded-md border border-indigo-200 dark:border-indigo-800">ЗДО №145</span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Організаційна структура, кадри та вихованці закладу дошкільної освіти
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsGuideOpen(true)}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 shadow-xs"
              >
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>Як заповнювати</span>
              </button>
            </div>
          </div>
          {/* SUB-TAB SELECTION BAR */}
          <div className="card-glass p-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => { setActiveSubTab('groups'); setSelectedGroupFilter(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  activeSubTab === 'groups'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Групи та Приміщення ДНЗ ({groups.length})</span>
              </button>

              <button
                onClick={() => { setActiveSubTab('employees'); setSelectedGroupFilter(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  activeSubTab === 'employees'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Кадри та Співробітники ({employees.length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('children')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  activeSubTab === 'children'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                <Baby className="w-4 h-4" />
                <span>Контингент вихованців ({children.length})</span>
              </button>
            </div>

            <div className="text-xs font-bold text-slate-500">
              {activeSubTab === 'groups' && <span>Всього груп: {groups.length} | Дітей: {children.filter(c => c.STATUS === 'Навчається').length}</span>}
              {activeSubTab === 'employees' && <span>Працівників: {employees.length} | МВО: {employees.filter(e => e.IS_MVO).length}</span>}
              {activeSubTab === 'children' && (
                <div className="flex items-center space-x-3 text-[11px]">
                  <span className="text-emerald-600 font-bold">Навчається: {children.filter(c => c.STATUS === 'Навчається').length}</span>
                  <span className="text-rose-600 font-bold">Вибули: {children.filter(c => c.STATUS === 'Вибув').length}</span>
                  <span className="text-amber-600 font-bold">Тимчасово відсутні: {children.filter(c => c.STATUS === 'Тимчасово відсутній').length}</span>
                </div>
              )}
            </div>
          </div>

          {/* GROUPS TAB */}
          {activeSubTab === 'groups' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map(g => {
                const groupChildren = children.filter(c => c.GROUP_NAME === g.NAME);
                const groupTeachers = employees.filter(e => e.GROUP_NAME === g.NAME);
                const isSelected = selectedGroupFilter === g.NAME;

                return (
                  <div 
                    key={g.ID}
                    onClick={() => {
                      setSelectedGroupFilter(g.NAME);
                      setActiveSubTab('children');
                    }}
                    className={`card-glass p-4 rounded-2xl cursor-pointer hover:shadow-xl transition border-2 ${
                      isSelected ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/30' : 'border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          {(g.NUMBER || g.GROUP_NUMBER) && (
                            <span className="px-2 py-0.5 bg-slate-900 dark:bg-slate-700 text-white font-mono font-black rounded-md text-[10px] shadow-xs">
                              № {g.NUMBER || g.GROUP_NUMBER}
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold rounded-md text-[10px]">
                            {g.AGE_CATEGORY}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mt-1 flex items-center space-x-1.5">
                          <span>{g.NAME}</span>
                          {g.ROOM_NUMBER && <span className="text-xs font-mono text-slate-500 font-normal">(кімн. {g.ROOM_NUMBER})</span>}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenGroupModal(g); }} 
                          className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition"
                          title="Редагувати групу"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.ID); }} 
                          className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition"
                          title="Видалити групу"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* ASSIGNED TEACHERS & STAFF HEADER */}
                    <div className="bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-xl text-xs space-y-1 mb-3">
                      <div className="font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span>Закріплені педагоги & працівники:</span>
                      </div>
                      {groupTeachers.length > 0 ? (
                        <div className="space-y-0.5">
                          {groupTeachers.map(t => (
                            <div key={t.ID} className="flex justify-between items-center font-medium text-slate-800 dark:text-slate-200">
                              <span>• {t.FULL_NAME}</span>
                              <span className="text-[10px] text-slate-500">({t.POSITION})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-500 italic text-[11px]">
                          {g.TEACHER_NAME ? `• ${g.TEACHER_NAME}` : 'Вихователів не закріплено'}
                        </div>
                      )}
                    </div>

                    {/* CHILDREN COUNT & GO BUTTON */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="font-extrabold text-blue-600 dark:text-blue-400 flex items-center space-x-1">
                        <Baby className="w-4 h-4" />
                        <span>{groupChildren.length} вихованців</span>
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center space-x-1 group-hover:translate-x-1 transition">
                        <span>Переглянути список</span>
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* EMPLOYEES TAB */}
          {activeSubTab === 'employees' && (
            <div className="card-glass overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table-grid w-full text-xs">
                  <thead>
                    <tr>
                      <th>ПІБ Співробітника</th>
                      <th>Посада</th>
                      <th className="w-36">Телефон</th>
                      <th className="w-24 text-center">МВО (Так / Ні)</th>
                      <th>Закріплена група / локація</th>
                      <th className="w-28 text-center">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map(e => (
                      <tr key={e.ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="font-bold text-slate-800 dark:text-slate-100">
                          <button 
                            onClick={() => setViewingEmployee(e)}
                            className="hover:text-blue-600 font-bold text-left transition underline decoration-dotted"
                          >
                            {e.FULL_NAME}
                          </button>
                        </td>
                        <td className="font-semibold text-slate-700 dark:text-slate-300">{e.POSITION}</td>
                        <td className="font-mono text-slate-600">{e.PHONE || '-'}</td>
                        <td className="text-center font-bold">
                          {e.IS_MVO ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded font-bold text-[10px]">
                              Так
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Ні</span>
                          )}
                        </td>
                        <td className="font-medium text-slate-700 dark:text-slate-300">{e.GROUP_NAME || 'Загальна територія'}</td>
                        <td className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button onClick={() => setViewingEmployee(e)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Особова справа"><FileText className="w-4 h-4" /></button>
                            <button onClick={() => handleOpenEmpModal(e)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Редагувати"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteEmployee(e.ID)} className="p-1 text-rose-500 hover:bg-rose-50 rounded" title="Вилучити"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CHILDREN TAB */}
          {activeSubTab === 'children' && (
            <div className="space-y-3.5">
              {/* STATUS SUMMARY STATS BAR (Interactive Click-to-Filter) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <button
                  type="button"
                  onClick={() => { setSelectedStatusFilter('all'); setSelectedDietFilter(false); }}
                  className={`p-3 rounded-2xl border text-left transition shadow-xs cursor-pointer ${
                    selectedStatusFilter === 'all' && !selectedDietFilter
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase opacity-80">Всі вихованці</div>
                  <div className="text-xl font-black mt-0.5">{children.length}</div>
                </button>

                <button
                  type="button"
                  onClick={() => { setSelectedStatusFilter('Навчається'); setSelectedDietFilter(false); }}
                  className={`p-3 rounded-2xl border text-left transition shadow-xs cursor-pointer ${
                    selectedStatusFilter === 'Навчається'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1">
                    <span>🟢 Навчаються</span>
                  </div>
                  <div className="text-xl font-black mt-0.5">{children.filter(c => c.STATUS === 'Навчається').length}</div>
                </button>

                <button
                  type="button"
                  onClick={() => { setSelectedStatusFilter('Вибув'); setSelectedDietFilter(false); }}
                  className={`p-3 rounded-2xl border text-left transition shadow-xs cursor-pointer ${
                    selectedStatusFilter === 'Вибув'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300'
                      : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:border-rose-400 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1">
                    <span>🔴 Вибули</span>
                  </div>
                  <div className="text-xl font-black mt-0.5">{children.filter(c => c.STATUS === 'Вибув').length}</div>
                </button>

                <button
                  type="button"
                  onClick={() => { setSelectedStatusFilter('Тимчасово відсутній'); setSelectedDietFilter(false); }}
                  className={`p-3 rounded-2xl border text-left transition shadow-xs cursor-pointer ${
                    selectedStatusFilter === 'Тимчасово відсутній'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-300'
                      : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 hover:border-amber-400 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1">
                    <span>🟡 Тимч. відсутні</span>
                  </div>
                  <div className="text-xl font-black mt-0.5">{children.filter(c => c.STATUS === 'Тимчасово відсутній').length}</div>
                </button>

                <button
                  type="button"
                  onClick={() => { setSelectedStatusFilter('Випускник'); setSelectedDietFilter(false); }}
                  className={`p-3 rounded-2xl border text-left transition shadow-xs cursor-pointer ${
                    selectedStatusFilter === 'Випускник'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-300'
                      : 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50 hover:border-purple-400 text-purple-800 dark:text-purple-300'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1">
                    <span>🎓 Випускники</span>
                  </div>
                  <div className="text-xl font-black mt-0.5">{children.filter(c => c.STATUS === 'Випускник').length}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDietFilter(prev => !prev)}
                  className={`p-3 rounded-2xl border text-left transition shadow-xs cursor-pointer ${
                    selectedDietFilter
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                      : 'bg-amber-50/30 dark:bg-amber-950/10 border-slate-200 dark:border-slate-800 hover:border-amber-400 text-amber-900 dark:text-amber-300'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1">
                    <span>🍎 Спецдієта</span>
                  </div>
                  <div className="text-xl font-black mt-0.5">{children.filter(c => Boolean(c.DIET_NOTES)).length}</div>
                </button>
              </div>

              {/* ADVANCED FILTER & SORT TOOLBAR */}
              <div className="card-glass p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Group Filter */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] whitespace-nowrap">Група:</span>
                    <select
                      value={selectedGroupFilter || 'all'}
                      onChange={(e) => setSelectedGroupFilter(e.target.value === 'all' ? null : e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold text-xs shadow-xs outline-none cursor-pointer"
                    >
                      <option value="all">Всі групи ({children.length})</option>
                      {groups.map(g => (
                        <option key={g.ID} value={g.NAME}>
                          {g.NAME} ({children.filter(c => c.GROUP_NAME === g.NAME).length})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] whitespace-nowrap">Статус:</span>
                    <select
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold text-xs shadow-xs outline-none cursor-pointer"
                    >
                      <option value="all">Всі статуси ({children.length})</option>
                      <option value="Навчається">🟢 Навчаються ({children.filter(c => c.STATUS === 'Навчається').length})</option>
                      <option value="Вибув">🔴 Вибули ({children.filter(c => c.STATUS === 'Вибув').length})</option>
                      <option value="Тимчасово відсутній">🟡 Тимчасово відсутні ({children.filter(c => c.STATUS === 'Тимчасово відсутній').length})</option>
                      <option value="Випускник">🎓 Випускники ({children.filter(c => c.STATUS === 'Випускник').length})</option>
                    </select>
                  </div>

                  {/* Benefit Category Filter */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] whitespace-nowrap">Пільга:</span>
                    <select
                      value={selectedBenefitFilter}
                      onChange={(e) => setSelectedBenefitFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold text-xs shadow-xs outline-none cursor-pointer"
                    >
                      <option value="all">Всі категорії</option>
                      {distinctBenefitCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Gender Filter */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] whitespace-nowrap">Стать:</span>
                    <select
                      value={selectedGenderFilter}
                      onChange={(e) => setSelectedGenderFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold text-xs shadow-xs outline-none cursor-pointer"
                    >
                      <option value="all">Всі (хлопчики & дівчатка)</option>
                      <option value="Чоловіча">👦 Хлопчики ({children.filter(c => c.GENDER === 'Чоловіча').length})</option>
                      <option value="Жіноча">👧 Дівчатка ({children.filter(c => c.GENDER === 'Жіноча').length})</option>
                    </select>
                  </div>

                  {/* Reset Filters button if any filter is active */}
                  {(selectedGroupFilter || selectedStatusFilter !== 'all' || selectedBenefitFilter !== 'all' || selectedGenderFilter !== 'all' || selectedDietFilter || searchTerm) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGroupFilter(null);
                        setSelectedStatusFilter('all');
                        setSelectedBenefitFilter('all');
                        setSelectedGenderFilter('all');
                        setSelectedDietFilter(false);
                        setSearchTerm('');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition flex items-center space-x-1 cursor-pointer"
                      title="Скинути всі фільтри"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Скинути фільтри</span>
                    </button>
                  )}
                </div>

                {/* Sorting Controls */}
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] whitespace-nowrap flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                    <span>Сортувати:</span>
                  </span>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold text-xs shadow-xs outline-none cursor-pointer"
                  >
                    <option value="name">🔤 За ПІБ дитини</option>
                    <option value="birth_date">🎂 За датою народження</option>
                    <option value="enrollment_date">📅 За датою зарахування</option>
                    <option value="group">🏫 За групою</option>
                    <option value="status">📋 За статусом</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1"
                    title={sortDirection === 'asc' ? 'Порядок: За зростанням (А-Я / 0-9)' : 'Порядок: За спаданням (Я-А / 9-0)'}
                  >
                    <span>{sortDirection === 'asc' ? '▲ Зростання' : '▼ Спадання'}</span>
                  </button>
                </div>
              </div>

              {/* Filter badge if active */}
              {selectedGroupFilter && (
                <div className="flex items-center justify-between bg-blue-100 dark:bg-blue-950/80 p-3 rounded-xl border border-blue-300 text-xs">
                  <div className="flex items-center space-x-2 font-bold text-blue-900 dark:text-blue-200">
                    <Home className="w-4 h-4 text-blue-600" />
                    <span>Фільтр за групою: <strong>{selectedGroupFilter}</strong> ({filteredChildren.length} вихованців)</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedGroupFilter(null)}
                    className="px-3 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-200 transition text-[11px] cursor-pointer"
                  >
                    Показати всі групи
                  </button>
                </div>
              )}

              {/* CHILDREN TABLE */}
              <div className="card-glass overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="table-grid w-full text-xs">
                    <thead>
                      <tr>
                        <th 
                          onClick={() => { setSortField('name'); setSortDirection(prev => sortField === 'name' && prev === 'asc' ? 'desc' : 'asc'); }}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition select-none"
                          title="Натисніть для сортування за ПІБ"
                        >
                          <div className="flex items-center space-x-1.5">
                            <span>ПІБ Вихованця (Дитини)</span>
                            {sortField === 'name' && (
                              <span className="text-blue-600 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => { setSortField('birth_date'); setSortDirection(prev => sortField === 'birth_date' && prev === 'asc' ? 'desc' : 'asc'); }}
                          className="w-32 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition select-none"
                          title="Натисніть для сортування за датою народження"
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>Дата народж.</span>
                            {sortField === 'birth_date' && (
                              <span className="text-blue-600 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => { setSortField('group'); setSortDirection(prev => sortField === 'group' && prev === 'asc' ? 'desc' : 'asc'); }}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition select-none"
                          title="Натисніть для сортування за групою"
                        >
                          <div className="flex items-center space-x-1.5">
                            <span>Група</span>
                            {sortField === 'group' && (
                              <span className="text-blue-600 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </div>
                        </th>
                        <th>Пільгова категорія</th>
                        <th>Батьки & Телефон</th>
                        <th>🍎 Дієта / Алергії</th>
                        <th 
                          onClick={() => { setSortField('status'); setSortDirection(prev => sortField === 'status' && prev === 'asc' ? 'desc' : 'asc'); }}
                          className="w-48 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition select-none"
                          title="Натисніть для сортування за статусом"
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>Статус</span>
                            {sortField === 'status' && (
                              <span className="text-blue-600 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </div>
                        </th>
                        <th className="w-24 text-center">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChildren.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            <Baby className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                            <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">Вихованців не знайдено за вибраними фільтрами</p>
                            <p className="text-xs text-slate-400 mt-1">Спробуйте змінити критерії пошуку або скинути фільтри</p>
                          </td>
                        </tr>
                      ) : (
                        filteredChildren.map(c => (
                          <tr key={c.ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="font-bold text-slate-800 dark:text-slate-100">
                              <button 
                                onClick={() => setViewingChild(c)}
                                className="hover:text-blue-600 font-bold text-left transition underline decoration-dotted flex items-center space-x-1.5"
                              >
                                <span>{c.GENDER === 'Жіноча' ? '👧' : '👦'} {c.FULL_NAME}</span>
                              </button>
                            </td>
                            <td className="text-center font-mono text-slate-600 dark:text-slate-400">{c.BIRTH_DATE}</td>
                            <td className="font-bold text-blue-600 dark:text-blue-400">{c.GROUP_NAME}</td>
                            <td>
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold text-[11px]">
                                {c.BENEFIT_CATEGORY || 'Загальна'}
                              </span>
                            </td>
                            <td className="font-medium text-slate-700 dark:text-slate-300">
                              <div>{c.MOTHER_NAME || c.PARENT_NAME || '-'}</div>
                              <div className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">{c.MOTHER_PHONE || c.PARENT_PHONE || ''}</div>
                            </td>
                            <td>
                              {c.DIET_NOTES ? (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-800 rounded font-bold text-[10px] inline-flex items-center space-x-1">
                                  <span>🍎 {c.DIET_NOTES}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Звичайна</span>
                              )}
                            </td>
                            <td className="text-center">
                              <select
                                value={c.STATUS}
                                onChange={(e) => handleQuickStatusChange(c, e.target.value as any)}
                                className={`w-full min-w-[155px] px-2.5 py-1.5 rounded-lg font-bold text-xs border shadow-xs cursor-pointer outline-none transition ${
                                  c.STATUS === 'Навчається'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                    : (c.STATUS === 'Вибув'
                                      ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 font-black'
                                      : (c.STATUS === 'Тимчасово відсутній'
                                        ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                        : 'bg-purple-50 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700'))
                                }`}
                              >
                                <option value="Навчається">🟢 Навчається</option>
                                <option value="Вибув">🔴 Вибув</option>
                                <option value="Тимчасово відсутній">🟡 Тимчасово відсутній</option>
                                <option value="Випускник">🎓 Випускник</option>
                              </select>
                            </td>
                            <td className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button onClick={() => setViewingChild(c)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition" title="Переглянути Особову картку"><FileText className="w-4 h-4" /></button>
                                <button onClick={() => handleOpenChildModal(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition" title="Редагувати картку"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteChild(c.ID)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition" title="Вилучити"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VIEW MODAL: CHILD PERSONAL CARD (ОСОБОВА КАРТКА ВИХОВАНЦЯ) */}
      {viewingChild && (
        <div className="print-preview-shell fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4">
          <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
            <div className="print-preview-panel bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col">
              <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white flex items-center justify-between font-bold shrink-0 no-print">
              <div className="flex items-center space-x-2">
                <Baby className="w-5 h-5" />
                <span>Особова картка вихованця ЗДО №145</span>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleOpenChildModal(viewingChild)}
                  className="px-3 py-1.5 bg-amber-400 text-slate-900 rounded-xl font-extrabold hover:bg-amber-300 transition text-xs flex items-center space-x-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Редагувати картку</span>
                </button>
                <button onClick={() => setViewingChild(null)}><X className="w-5 h-5 text-white/80 hover:text-white" /></button>
              </div>
            </div>

            <div className="print-only print-preview print-portrait p-6 space-y-4 text-xs overflow-y-auto flex-1 bg-white text-black">
              <div className="print-heading-only print-header">
                <div className="text-xs font-bold uppercase">Криворізький КЗДО (ясла-садок) КТ №145 КМР</div>
                <h1 className="text-base font-bold uppercase mt-1">Особова картка вихованця</h1>
                <div className="text-xs mt-1">Дата формування: {new Date().toLocaleDateString('uk-UA')}</div>
              </div>
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{viewingChild.FULL_NAME}</h2>
                  <div className="text-slate-500 font-medium mt-1 flex items-center space-x-3">
                    <span>Група: <b className="text-blue-600 dark:text-blue-400">{viewingChild.GROUP_NAME}</b></span>
                    <span>Пільгова категорія: <b className="text-amber-600 dark:text-amber-400">{viewingChild.BENEFIT_CATEGORY || 'Загальна'}</b></span>
                  </div>
                </div>
                <div>{getStatusBadge(viewingChild.STATUS)}</div>
              </div>

              {/* SECTION 1: PERSONAL DETAILS */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-3 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <UserCheck className="w-4 h-4 text-blue-500" />
                  <span>Персональна інформація вихованця</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px]">ДАТА НАРОДЖЕННЯ</span>
                    <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">{viewingChild.BIRTH_DATE}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px]">СТАТЬ</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{viewingChild.GENDER || 'Чоловіча'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px]">СВІДОЦТВО ПРО НАРОДЖЕННЯ</span>
                    <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{viewingChild.BIRTH_CERTIFICATE || 'Не вказано'}</span>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-slate-400 font-bold block text-[10px]">ДОМАШНЯ АДРЕСА ПРОЖИВАННЯ</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingChild.ADDRESS || 'м. Кривий Ріг'}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PARENTS & CONTACTS */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-3 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <span>Відомості про батьків та опікунів</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 font-bold block text-[10px]">МАТИ</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewingChild.MOTHER_NAME || viewingChild.PARENT_NAME || 'Не вказано'}</div>
                    <div className="font-mono text-blue-600 font-bold mt-0.5">{viewingChild.MOTHER_PHONE || viewingChild.PARENT_PHONE || 'Не вказано'}</div>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 font-bold block text-[10px]">БАТЬКО</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewingChild.FATHER_NAME || 'Не вказано'}</div>
                    <div className="font-mono text-blue-600 font-bold mt-0.5">{viewingChild.FATHER_PHONE || 'Не вказано'}</div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: ADMISSION & DEPARTURE */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-3 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <span>Рух контингенту (Зарахування & Вибуття)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px]">ДАТА ЗАРАХУВАННЯ</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{viewingChild.ENROLLMENT_DATE || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px]">НАКАЗ ПРО ЗАРАХУВАННЯ</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{viewingChild.ENROLLMENT_ORDER || '-'}</span>
                  </div>
                  {viewingChild.STATUS === 'Вибув' && (
                    <>
                      <div>
                        <span className="text-slate-400 font-bold block text-[10px] text-rose-500">ДАТА ВИБУТТЯ</span>
                        <span className="font-mono font-bold text-rose-600">{viewingChild.DEPARTURE_DATE || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block text-[10px] text-rose-500">ПРИЧИНА ВИБУТТЯ</span>
                        <span className="font-semibold text-rose-600">{viewingChild.DEPARTURE_REASON || '-'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* SECTION 4: DIET, HEALTH & PSYCHOLOGY */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center space-x-1 mb-1">
                    <span>🍎 Дієта & Алергії (Кухня)</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-medium">
                    {viewingChild.DIET_NOTES || 'Спеціальних дієтичних обмежень не заявлено.'}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center space-x-1 mb-1">
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span>Медичні примітки</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-medium">
                    {viewingChild.HEALTH_NOTES || 'Група здоров’я 1-А. Щеплення за віком.'}
                  </div>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-300">
                  <div className="font-bold text-purple-900 dark:text-purple-200 flex items-center space-x-1 mb-1">
                    <Brain className="w-3.5 h-3.5" />
                    <span>Спостереження психолога</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-medium">
                    {viewingChild.PSYCHOLOGY_NOTES || 'Адаптація проходить успішно.'}
                  </div>
                </div>
              </div>

              {/* QUICK STATUS SWITCHER INSIDE MODAL */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3">
                <span className="font-bold text-slate-800 dark:text-slate-200">Поточний статус у закладі:</span>
                <select
                  value={viewingChild.STATUS}
                  onChange={(e) => handleQuickStatusChange(viewingChild, e.target.value as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs border shadow-xs cursor-pointer outline-none transition ${
                    viewingChild.STATUS === 'Навчається'
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                      : (viewingChild.STATUS === 'Вибув'
                        ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 font-black'
                        : (viewingChild.STATUS === 'Тимчасово відсутній'
                          ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                          : 'bg-purple-50 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700'))
                  }`}
                >
                  <option value="Навчається">🟢 Навчається</option>
                  <option value="Вибув">🔴 Вибув</option>
                  <option value="Тимчасово відсутній">🟡 Тимчасово відсутній</option>
                  <option value="Випускник">🎓 Випускник</option>
                </select>
              </div>

              <div className="pt-2 flex justify-between items-center shrink-0">
                <button 
                  onClick={() => window.print()} 
                  className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition flex items-center space-x-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Друкувати особову картку (А4)</span>
                </button>
                <button onClick={() => setViewingChild(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl">
                  Закрити
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* VIEW MODAL: EMPLOYEE PERSONAL FILE (ОСОБОВА СПРАВА СПІВРОБІТНИКА) */}
      {viewingEmployee && (
        <div className="print-preview-shell fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4">
          <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
            <div className="print-preview-panel bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col">
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between font-bold no-print shrink-0">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <span>Особова справа працівника ЗДО №145</span>
                </div>
                <button onClick={() => setViewingEmployee(null)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
              </div>

              <div className="print-only print-preview print-portrait p-6 space-y-4 text-xs bg-white text-black">
                <div className="print-heading-only print-header">
                  <div className="text-xs font-bold uppercase">Криворізький КЗДО (ясла-садок) КТ №145 КМР</div>
                  <h1 className="text-base font-bold uppercase mt-1">Особова справа працівника</h1>
                  <div className="text-xs mt-1">Дата формування: {new Date().toLocaleDateString('uk-UA')}</div>
                </div>
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">{viewingEmployee.FULL_NAME}</h2>
                    <div className="text-slate-500 font-bold text-sm mt-0.5">{viewingEmployee.POSITION}</div>
                  </div>
                  {viewingEmployee.IS_MVO && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold rounded-full text-xs">
                      🛡️ МВО (Матеріально-відповідальна особа)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px]">КОНТАКТНИЙ ТЕЛЕФОН</span>
                    <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">{viewingEmployee.PHONE || 'Не вказано'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px]">ЗАКРІПЛЕНА ГРУПА / ЛОКАЦІЯ</span>
                    <span className="font-bold text-sm text-blue-600">{viewingEmployee.GROUP_NAME || 'Загальна'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px]">ОСВІТА</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{viewingEmployee.EDUCATION || 'Вища фахова'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px]">СТАТУС МВО</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{viewingEmployee.IS_MVO ? 'Так (Матеріально відповідальний)' : 'Ні'}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button 
                    onClick={() => window.print()} 
                    className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition flex items-center space-x-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Друкувати особову справу</span>
                  </button>
                  <button onClick={() => setViewingEmployee(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl">
                    Закрити
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODALS FOR GROUP, EMPLOYEE, CHILD */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4">
          <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between font-bold text-sm shrink-0">
                <span>{editingGroup ? 'Редагувати групу' : 'Додати групу / приміщення'}</span>
                <button onClick={() => setIsGroupModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
              </div>
              <form onSubmit={handleSaveGroup} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">№ групи</label>
                      <input 
                        type="text" 
                        value={groupNumber} 
                        onChange={(e) => setGroupNumber(e.target.value)} 
                        placeholder="1, 2, 3-А..." 
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold font-mono text-blue-600 dark:text-blue-400" 
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Назва групи / приміщення *</label>
                      <input 
                        type="text" 
                        required 
                        value={groupName} 
                        onChange={(e) => setGroupName(e.target.value)} 
                        placeholder="Група «Сонечко»" 
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Вікова категорія / тип</label>
                      <SearchableSelect value={groupAgeCategory} onChange={(e) => setGroupAgeCategory(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-semibold">
                        <option value="Ясла (1-3 роки)">Ясла (ранній вік, 1-3 роки)</option>
                        <option value="Молодша (3-4 роки)">Молодша група (3-4 роки)</option>
                        <option value="Середня (4-5 років)">Середня група (4-5 років)</option>
                        <option value="Старша (5-7 років)">Старша група (5-7 років)</option>
                        <option value="Логопедична група">Логопедична група (спеціальна)</option>
                        <option value="Інклюзивна група">Інклюзивна група</option>
                        <option value="Спеціальна / Санаторна група">Спеціальна / Санаторна група</option>
                        <option value="Різновікова група">Різновікова група</option>
                        <option value="Чергова група">Чергова група</option>
                        <option value="Спеціалізоване приміщення">Спеціалізоване приміщення (Муззал, Спортзал)</option>
                        <option value="Виробниче приміщення">Виробниче приміщення (Харчоблок)</option>
                        <option value="Адміністрація">Адміністрація / Методкабінет</option>
                        <option value="Благоустрій">Благоустрій / Територія ДНЗ</option>
                      </SearchableSelect>
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Кімната №</label>
                      <input type="text" value={groupRoom} onChange={(e) => setGroupRoom(e.target.value)} placeholder="101" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono" />
                    </div>
                  </div>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 shrink-0 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
                  <button type="button" onClick={() => setIsGroupModalOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 transition">Скасувати</button>
                  <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md">Зберегти</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4">
          <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between font-bold text-sm shrink-0">
                <span>{editingEmployee ? 'Редагувати співробітника' : 'Додати нового співробітника'}</span>
                <button onClick={() => setIsEmployeeModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
              </div>
              <form onSubmit={handleSaveEmployee} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  {groups.length === 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span><b>Зверніть увагу:</b> У закладі ще не створено груп. Рекомендуємо спочатку створити групу.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEmployeeModalOpen(false);
                          setActiveSubTab('groups');
                          handleOpenGroupModal();
                        }}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0"
                      >
                        + Створити групу
                      </button>
                    </div>
                  )}
                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">ПІБ Співробітника *</label>
                    <input type="text" required value={empFullName} onChange={(e) => setEmpFullName(e.target.value)} placeholder="Петренко Олена Іванівна" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Посада</label>
                      <input type="text" required value={empPosition} onChange={(e) => setEmpPosition(e.target.value)} placeholder="Вихователь" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Телефон</label>
                      <input type="text" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} placeholder="(098) 123-45-67" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Закріплена група / локація</label>
                      <SearchableSelect value={empGroupName} onChange={(e) => setEmpGroupName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                        {groups.map(g => <option key={g.ID} value={g.NAME}>{g.NAME}</option>)}
                      </SearchableSelect>
                    </div>
                    <div className="flex items-center pt-1 sm:pt-5">
                      <label className="flex items-center space-x-2 font-bold text-amber-600 dark:text-amber-400 cursor-pointer">
                        <input type="checkbox" checked={empIsMvo} onChange={(e) => setEmpIsMvo(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                        <span>Матеріально-відповідальна особа (МВО)</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 shrink-0 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
                  <button type="button" onClick={() => setIsEmployeeModalOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 transition">Скасувати</button>
                  <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md">Зберегти</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isChildModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4">
          <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between font-bold text-sm shrink-0">
                <span>{editingChild ? `Редагування особової картки: ${editingChild.FULL_NAME}` : 'Зарахування нового вихованця'}</span>
                <button onClick={() => setIsChildModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
              </div>
              
              <form onSubmit={handleSaveChild} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
                {groups.length === 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span><b>Зверніть увагу:</b> У закладі ще не створено груп. Спочатку створіть групу для зарахування дитини.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsChildModalOpen(false);
                        setActiveSubTab('groups');
                        handleOpenGroupModal();
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0"
                    >
                      + Створити групу
                    </button>
                  </div>
                )}

                {/* SECTION 1: PERSONAL */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border">
                  <div className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[11px]">
                    1. Персональні дані дитини
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">ПІБ Дитини (повністю) *</label>
                    <input type="text" required value={childFullName} onChange={(e) => setChildFullName(e.target.value)} placeholder="Іваненко Артем Олександрович" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg font-bold" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Дата народження *</label>
                      <input type="date" required value={childBirthDate} onChange={(e) => setChildBirthDate(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg font-mono font-bold" />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Стать</label>
                      <SearchableSelect value={childGender} onChange={(e) => setChildGender(e.target.value as any)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg font-bold">
                        <option value="Чоловіча">Чоловіча</option>
                        <option value="Жіноча">Жіноча</option>
                      </SearchableSelect>
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Свідоцтво про народж.</label>
                      <input type="text" value={childBirthCert} onChange={(e) => setChildBirthCert(e.target.value)} placeholder="1-КР № 123456" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Закріплена група *</label>
                      <SearchableSelect value={childGroupName} onChange={(e) => setChildGroupName(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg font-bold text-blue-600">
                        {groups.map(g => <option key={g.ID} value={g.NAME}>{g.NAME}</option>)}
                      </SearchableSelect>
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Пільгова категорія</label>
                      <SearchableSelect value={childBenefitCategory} onChange={(e) => setChildBenefitCategory(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg font-bold">
                        <option value="Загальна підстава">Загальна підстава</option>
                        <option value="Діти УБД">Діти УБД (Учасників бойових дій)</option>
                        <option value="ВПО (Внутрішньо переміщена особа)">ВПО (Внутрішньо переміщена особа)</option>
                        <option value="Багатодітна сім’я">Багатодітна сім’я</option>
                        <option value="Діти-сироти / опіка">Діти-сироти / опіка</option>
                        <option value="Дитина з інвалідністю">Дитина з інвалідністю</option>
                      </SearchableSelect>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: PARENTS & ADDRESS */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[11px]">
                    2. Батьки, опікуни та адреса
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Домашня адреса проживання</label>
                    <input type="text" value={childAddress} onChange={(e) => setChildAddress(e.target.value)} placeholder="м. Кривий Ріг, вул. Перлинна 12, кв. 4" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">ПІБ Матері</label>
                      <input type="text" value={childMotherName} onChange={(e) => setChildMotherName(e.target.value)} placeholder="Іваненко Олена Олександрівна" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Телефон Матері</label>
                      <input type="text" value={childMotherPhone} onChange={(e) => setChildMotherPhone(e.target.value)} placeholder="(097) 111-22-33" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">ПІБ Батька</label>
                      <input type="text" value={childFatherName} onChange={(e) => setChildFatherName(e.target.value)} placeholder="Іваненко Олександр Васильович" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Телефон Батька</label>
                      <input type="text" value={childFatherPhone} onChange={(e) => setChildFatherPhone(e.target.value)} placeholder="(050) 999-88-77" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg font-mono" />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: STATUS & ADMISSION */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border">
                  <div className="font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider text-[11px]">
                    3. Статус, Зарахування та Вибуття
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Поточний статус *</label>
                      <SearchableSelect value={childStatus} onChange={(e) => setChildStatus(e.target.value as any)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg font-bold">
                        <option value="Навчається">🟢 Навчається</option>
                        <option value="Вибув">🔴 Вибув</option>
                        <option value="Тимчасово відсутній">🟡 Тимчасово відсутній</option>
                        <option value="Випускник">🎓 Випускник</option>
                      </SearchableSelect>
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Дата зарахування</label>
                      <input type="date" value={childEnrollmentDate} onChange={(e) => setChildEnrollmentDate(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg font-mono" />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Наказ №</label>
                      <input type="text" value={childEnrollmentOrder} onChange={(e) => setChildEnrollmentOrder(e.target.value)} placeholder="Наказ № 42-У" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg font-mono" />
                    </div>
                  </div>
                  {childStatus === 'Вибув' && (
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200">
                      <div>
                        <label className="block font-bold mb-1 text-rose-700">Дата вибуття</label>
                        <input type="date" value={childDepartureDate} onChange={(e) => setChildDepartureDate(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-rose-300 rounded-lg font-mono" />
                      </div>
                      <div>
                        <label className="block font-bold mb-1 text-rose-700">Причина вибуття</label>
                        <input type="text" value={childDepartureReason} onChange={(e) => setChildDepartureReason(e.target.value)} placeholder="Зміна місця проживання родини" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-rose-300 rounded-lg" />
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 4: HEALTH & PSYCHOLOGY NOTES */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border">
                  <div className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[11px]">
                    4. Особливі примітки (Дієта для Кухні, Медсестра, Психолог)
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">🍎 Дієтичні обмеження / Алергії (для Кухні)</label>
                    <input type="text" value={childDietNotes} onChange={(e) => setChildDietNotes(e.target.value)} placeholder="Наприклад: Безмолочна дієта, алергія на цитрусові" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">🩺 Медична група & Щеплення</label>
                      <input type="text" value={childHealthNotes} onChange={(e) => setChildHealthNotes(e.target.value)} placeholder="Група 1-А. Щеплення за віком" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">🧠 Оцінка психолога</label>
                      <input type="text" value={childPsychologyNotes} onChange={(e) => setChildPsychologyNotes(e.target.value)} placeholder="Адаптація проходить успішно" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg" />
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 shrink-0 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
                  <button type="button" onClick={() => setIsChildModalOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 transition">Скасувати</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition">Зберегти картку вихованця</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FORMAL STATE PRINT LAYOUT (A4 Portrait) */}
      <div className={`print-only p-6 font-serif text-black bg-white ${viewingChild || viewingEmployee ? 'print-suppressed' : ''}`}>
        <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-3">
          <div>
            <div className="font-bold text-xs">УКРАЇНА</div>
            <div className="text-xs">ДНІПРОПЕТРОВСЬКА ОБЛАСТЬ</div>
            <div className="font-bold text-xs uppercase">КРИВОРІЗЬКИЙ КЗДО (ЯСЛА-САДОК) КТ №145 КМР</div>
            <div className="text-[10px] text-slate-700">ЄДРПОУ: 26136748 | вул. Перлинна 23А, м. Кривий Ріг</div>
          </div>
          <div className="text-right text-xs">
            <div><b>ЗАТВЕРДЖУЮ</b></div>
            <div>Директор КЗДО № 145</div>
            <div className="mt-4">________________ / Н. Г. Павлухіна</div>
            <div className="text-[10px] mt-1">«_____» ____________ 2026 р.</div>
          </div>
        </div>

        <div className="text-center my-4">
          <h1 className="text-base font-bold uppercase tracking-wide">
            {activeSubTab === 'groups' ? 'СПИСОК ВІКОВИХ ГРУП ТА СТРУКТУРНИХ ПРИМІЩЕНЬ' :
             (activeSubTab === 'employees' ? 'КАДРОВИЙ СТРУКТУРНИЙ РОЗПИС ТА СТАТУС МВО' : 'СПИСКОВИЙ СКЛАД ВИХОВАНЦІВ ЗДО')}
          </h1>
          <div className="text-xs mt-1">
            <b>Дата формування:</b> {new Date().toLocaleDateString('uk-UA')}
          </div>
        </div>

        {/* PRINT TABLE */}
        <table className="w-full border-collapse border border-black text-xs my-3">
          <thead>
            <tr className="bg-slate-200 border-b border-black font-bold text-center">
              <th className="border border-black p-1.5 w-10">№</th>
              {activeSubTab === 'children' && (
                <React.Fragment>
                  <th className="border border-black p-1.5 text-left">ПІБ Дитини</th>
                  <th className="border border-black p-1.5 w-24 text-center">Дата народження</th>
                  <th className="border border-black p-1.5 text-left">Група</th>
                  <th className="border border-black p-1.5 text-left">ПІБ Батьків</th>
                  <th className="border border-black p-1.5 w-28 text-center">Статус</th>
                </React.Fragment>
              )}
              {activeSubTab === 'employees' && (
                <React.Fragment>
                  <th className="border border-black p-1.5 text-left">ПІБ Співробітника</th>
                  <th className="border border-black p-1.5 text-left">Посада</th>
                  <th className="border border-black p-1.5 w-28 text-center">Телефон</th>
                  <th className="border border-black p-1.5 w-24 text-center">МВО (Так / Ні)</th>
                  <th className="border border-black p-1.5 text-left">Закріплена група / локація</th>
                </React.Fragment>
              )}
              {activeSubTab === 'groups' && (
                <React.Fragment>
                  <th className="border border-black p-1.5 w-14 text-center">№ групи</th>
                  <th className="border border-black p-1.5 text-left">Назва групи / приміщення</th>
                  <th className="border border-black p-1.5 text-left">Категорія</th>
                  <th className="border border-black p-1.5 text-center">Кімната №</th>
                  <th className="border border-black p-1.5 text-left">Закріплений педагог</th>
                  <th className="border border-black p-1.5 w-20 text-center">К-сть дітей</th>
                </React.Fragment>
              )}
            </tr>
          </thead>
          <tbody>
            {activeSubTab === 'children' && filteredChildren.map((c, idx) => (
              <tr key={c.ID} className="border-b border-black">
                <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                <td className="border border-black p-1.5 font-bold">{c.FULL_NAME}</td>
                <td className="border border-black p-1.5 text-center font-mono">{c.BIRTH_DATE}</td>
                <td className="border border-black p-1.5">{c.GROUP_NAME}</td>
                <td className="border border-black p-1.5">{c.PARENT_NAME || '-'}</td>
                <td className="border border-black p-1.5 text-center font-bold">{c.STATUS}</td>
              </tr>
            ))}
            {activeSubTab === 'employees' && filteredEmployees.map((e, idx) => (
              <tr key={e.ID} className="border-b border-black">
                <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                <td className="border border-black p-1.5 font-bold">{e.FULL_NAME}</td>
                <td className="border border-black p-1.5">{e.POSITION}</td>
                <td className="border border-black p-1.5 text-center font-mono">{e.PHONE || '-'}</td>
                <td className="border border-black p-1.5 text-center font-bold">{e.IS_MVO ? 'Так' : 'Ні'}</td>
                <td className="border border-black p-1.5">{e.GROUP_NAME || 'Загальна'}</td>
              </tr>
            ))}
            {activeSubTab === 'groups' && filteredGroups.map((g, idx) => (
              <tr key={g.ID} className="border-b border-black">
                <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{g.NUMBER || g.GROUP_NUMBER || '-'}</td>
                <td className="border border-black p-1.5 font-bold">{g.NAME}</td>
                <td className="border border-black p-1.5">{g.AGE_CATEGORY}</td>
                <td className="border border-black p-1.5 text-center font-mono">{g.ROOM_NUMBER || '-'}</td>
                <td className="border border-black p-1.5">{g.TEACHER_NAME || '-'}</td>
                <td className="border border-black p-1.5 text-center font-bold">{g.CHILDREN_COUNT}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 text-xs space-y-4 page-break-inside-avoid">
          <div className="flex justify-between items-end pt-4">
            <div className="space-y-3">
              <div><b>Керівник ЗДО:</b> ____________________ / Н. Г. Павлухіна</div>
              <div><b>Вихователь-методист:</b> ____________________ / Н. Є. Суміна</div>
            </div>
            <div className="space-y-3 text-right">
              <div><b>Відповідальна особа:</b> ____________________ / (Підпис)</div>
              <div>«_____» ________________ 2026 р.</div>
            </div>
          </div>
        </div>
      </div>

      {/* WORKFLOW GUIDE MODAL */}
      <WorkflowGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="Покрокова інструкція: Контингент та Кадри ЗДО"
        subtitle="Рекомендований порядок дій: створення груп ➔ працівники ➔ зарахування дітей"
        steps={structureWorkflowSteps}
        importantNotes={[
          'Особову справу працівника або особову картку вихованця (формат А4) можна роздрукувати прямо з таблиці, клікнувши «Особова справа / картка».',
          'Будь-який список (Групи, Кадри, Діти) можна миттєво експортувати в Excel (.xlsx) або PDF кнопками на верхній панелі.',
          'При редагуванні групи можна вказати як стандартну вікову категорію, так і спеціальну (Логопедична, Інклюзивна, Санаторна тощо).'
        ]}
      />
    </>
  );
};
