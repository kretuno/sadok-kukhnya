import React, { useState, useEffect } from 'react';
import { SadokGroup, SadokEmployee, SadokChild } from '../../types';
import { 
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
  AlertTriangle
} from 'lucide-react';

export const StructureRegistryModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'employees' | 'children'>('groups');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Data lists
  const [groups, setGroups] = useState<SadokGroup[]>([]);
  const [employees, setEmployees] = useState<SadokEmployee[]>([]);
  const [children, setChildren] = useState<SadokChild[]>([]);

  // Detailed Modal View States
  const [viewingChild, setViewingChild] = useState<SadokChild | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<SadokEmployee | null>(null);
  const [viewingGroup, setViewingGroup] = useState<SadokGroup | null>(null);

  // Edit Modals
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<SadokGroup> | null>(null);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<SadokEmployee> | null>(null);

  const [isChildModalOpen, setIsChildModalOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Partial<SadokChild> | null>(null);

  // Group Form State
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
  const [childGroupName, setChildGroupName] = useState('');
  const [childParentName, setChildParentName] = useState('');
  const [childParentPhone, setChildParentPhone] = useState('');
  const [childStatus, setChildStatus] = useState<'Навчається' | 'Вибув' | 'Тимчасово відсутній' | 'Випускник'>('Навчається');
  const [childAddress, setChildAddress] = useState('');
  const [childGender, setChildGender] = useState<'Чоловіча' | 'Жіноча'>('Чоловіча');
  const [childHealthNotes, setChildHealthNotes] = useState('');
  const [childPsychologyNotes, setChildPsychologyNotes] = useState('');

  useEffect(() => {
    loadAllData();
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
    setChildGroupName(ch?.GROUP_NAME || selectedGroupFilter || (groups[0]?.NAME || ''));
    setChildParentName(ch?.PARENT_NAME || '');
    setChildParentPhone(ch?.PARENT_PHONE || '');
    setChildStatus(ch?.STATUS || 'Навчається');
    setChildAddress(ch?.ADDRESS || 'м. Кривий Ріг');
    setChildGender(ch?.GENDER || 'Чоловіча');
    setChildHealthNotes(ch?.HEALTH_NOTES || '');
    setChildPsychologyNotes(ch?.PSYCHOLOGY_NOTES || '');
    setIsChildModalOpen(true);
  };

  const handleSaveChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childFullName.trim()) return;
    const updated = saveChild({
      ID: editingChild?.ID,
      FULL_NAME: childFullName.trim(),
      BIRTH_DATE: childBirthDate,
      GROUP_NAME: childGroupName,
      PARENT_NAME: childParentName.trim(),
      PARENT_PHONE: childParentPhone.trim(),
      STATUS: childStatus,
      ADDRESS: childAddress.trim(),
      GENDER: childGender,
      HEALTH_NOTES: childHealthNotes.trim(),
      PSYCHOLOGY_NOTES: childPsychologyNotes.trim()
    });
    setChildren(updated);
    setIsChildModalOpen(false);
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

  const filteredChildren = children.filter(c => {
    const matchesSearch = c.FULL_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.GROUP_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.PARENT_NAME || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroupFilter ? c.GROUP_NAME === selectedGroupFilter : true;
    return matchesSearch && matchesGroup;
  });

  // Exports
  const handleExportExcel = () => {
    if (activeSubTab === 'groups') {
      const headers = ['Назва групи', 'Вікова категорія', '№ Приміщення', 'Закріплений вихователь/МВО', 'Кількість дітей'];
      const rows = filteredGroups.map(g => [g.NAME, g.AGE_CATEGORY, g.ROOM_NUMBER || '', g.TEACHER_NAME || '', g.CHILDREN_COUNT]);
      exportToExcel('SADOK_Групи_ДНЗ', 'Групи', headers, rows);
    } else if (activeSubTab === 'employees') {
      const headers = ['ПІБ Співробітника', 'Посада', 'Телефон', 'МВО', 'Закріплена група/відділ'];
      const rows = filteredEmployees.map(e => [e.FULL_NAME, e.POSITION, e.PHONE || '', e.IS_MVO ? 'Так' : 'Ні', e.GROUP_NAME || '']);
      exportToExcel('SADOK_Кадровий_склад', 'Співробітники', headers, rows);
    } else {
      const headers = ['ПІБ Вихованця', 'Дата народження', 'Група', 'Батьки', 'Телефон батьків', 'Статус'];
      const rows = filteredChildren.map(c => [c.FULL_NAME, c.BIRTH_DATE, c.GROUP_NAME, c.PARENT_NAME || '', c.PARENT_PHONE || '', c.STATUS]);
      exportToExcel('SADOK_Контингент_Вихованців', 'Діти', headers, rows);
    }
  };

  const handleExportPDF = () => {
    const title = activeSubTab === 'groups' ? 'Реєстр груп та приміщень ЗДО' : (activeSubTab === 'employees' ? 'Кадровий склад та МВО' : 'Списковий склад вихованців ЗДО');
    const headers = activeSubTab === 'groups' 
      ? ['Група', 'Категорія', 'Кімната', 'Вихователь', 'Дітей']
      : (activeSubTab === 'employees' ? ['ПІБ Співробітника', 'Посада', 'Телефон', 'МВО', 'Локація'] : ['ПІБ Дитини', 'Група', 'Дата народж.', 'Батьки', 'Статус']);
    
    const rows = activeSubTab === 'groups'
      ? filteredGroups.map(g => [g.NAME, g.AGE_CATEGORY, g.ROOM_NUMBER || '-', g.TEACHER_NAME || '-', `${g.CHILDREN_COUNT} осіб`])
      : (activeSubTab === 'employees'
        ? filteredEmployees.map(e => [e.FULL_NAME, e.POSITION, e.PHONE || '-', e.IS_MVO ? 'Так' : 'Ні', e.GROUP_NAME || '-'])
        : filteredChildren.map(c => [c.FULL_NAME, c.GROUP_NAME, c.BIRTH_DATE, c.PARENT_NAME || '-', c.STATUS]));

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
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          title="SADOK Контингент — Організаційна структура, кадри та вихованці ЗДО №145"
        />

        <div className="flex-1 overflow-auto p-4 space-y-4">
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
                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold rounded-md text-[10px]">
                          {g.AGE_CATEGORY}
                        </span>
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mt-1 flex items-center space-x-1.5">
                          <span>{g.NAME}</span>
                          {g.ROOM_NUMBER && <span className="text-xs font-mono text-slate-500">(кімн. {g.ROOM_NUMBER})</span>}
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
            <div className="space-y-3">
              {/* Filter banner if specific group selected */}
              {selectedGroupFilter && (
                <div className="flex items-center justify-between bg-blue-100 dark:bg-blue-950/80 p-3 rounded-xl border border-blue-300 text-xs">
                  <div className="flex items-center space-x-2 font-bold text-blue-900 dark:text-blue-200">
                    <Home className="w-4 h-4 text-blue-600" />
                    <span>Фільтр за групою: {selectedGroupFilter}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedGroupFilter(null)}
                    className="px-3 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-200 transition text-[11px]"
                  >
                    Показати всі групи
                  </button>
                </div>
              )}

              <div className="card-glass overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table-grid w-full text-xs">
                    <thead>
                      <tr>
                        <th>ПІБ Вихованця (Дитини)</th>
                        <th className="w-28 text-center">Дата народження</th>
                        <th>Група</th>
                        <th>ПІБ Батьків / Опікунів</th>
                        <th className="w-32">Телефон батьків</th>
                        <th className="w-44 text-center">Зміна статусу (в т.ч. Вибув)</th>
                        <th className="w-24 text-center">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChildren.map(c => (
                        <tr key={c.ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="font-bold text-slate-800 dark:text-slate-100">
                            <button 
                              onClick={() => setViewingChild(c)}
                              className="hover:text-blue-600 font-bold text-left transition underline decoration-dotted flex items-center space-x-1.5"
                            >
                              <span>{c.FULL_NAME}</span>
                            </button>
                          </td>
                          <td className="text-center font-mono text-slate-600">{c.BIRTH_DATE}</td>
                          <td className="font-bold text-blue-600 dark:text-blue-400">{c.GROUP_NAME}</td>
                          <td className="font-medium text-slate-700 dark:text-slate-300">{c.PARENT_NAME || '-'}</td>
                          <td className="font-mono text-slate-600">{c.PARENT_PHONE || '-'}</td>
                          <td className="text-center">
                            <select 
                              value={c.STATUS}
                              onChange={(e) => handleQuickStatusChange(c, e.target.value as any)}
                              className={`px-2 py-1 rounded-lg font-bold text-[11px] border cursor-pointer ${
                                c.STATUS === 'Навчається' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                (c.STATUS === 'Вибув' ? 'bg-rose-50 text-rose-800 border-rose-300 font-black' :
                                (c.STATUS === 'Тимчасово відсутній' ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-purple-50 text-purple-800 border-purple-300'))
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
                              <button onClick={() => setViewingChild(c)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Картка дитини"><FileText className="w-4 h-4" /></button>
                              <button onClick={() => handleOpenChildModal(c)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Редагувати"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteChild(c.ID)} className="p-1 text-rose-500 hover:bg-rose-50 rounded" title="Вилучити"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between font-bold">
              <div className="flex items-center space-x-2">
                <Baby className="w-5 h-5" />
                <span>Особова картка вихованця ЗДО</span>
              </div>
              <button onClick={() => setViewingChild(null)}><X className="w-5 h-5 text-white/80 hover:text-white" /></button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">{viewingChild.FULL_NAME}</h2>
                  <div className="text-slate-500 font-medium mt-0.5">Група: <span className="font-bold text-blue-600">{viewingChild.GROUP_NAME}</span></div>
                </div>
                <div>{getStatusBadge(viewingChild.STATUS)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">ДАТА НАРОДЖЕННЯ</span>
                  <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">{viewingChild.BIRTH_DATE}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">СТАТЬ</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{viewingChild.GENDER || 'Чоловіча'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">БАТЬКИ / ОПІКУНИ</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{viewingChild.PARENT_NAME || 'Не вказано'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">ТЕЛЕФОН БАТЬКІВ</span>
                  <span className="font-mono font-bold text-blue-600">{viewingChild.PARENT_PHONE || 'Не вказано'}</span>
                </div>
              </div>

              {/* QUICK STATUS SWITCHER INSIDE MODAL */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-xl flex items-center justify-between">
                <span className="font-bold text-amber-900 dark:text-amber-200">Змінити поточний статус вихованця:</span>
                <select 
                  value={viewingChild.STATUS}
                  onChange={(e) => handleQuickStatusChange(viewingChild, e.target.value as any)}
                  className="px-3 py-1 bg-white dark:bg-slate-900 border rounded-lg font-bold"
                >
                  <option value="Навчається">🟢 Навчається</option>
                  <option value="Вибув">🔴 Вибув</option>
                  <option value="Тимчасово відсутній">🟡 Тимчасово відсутній</option>
                  <option value="Випускник">🎓 Випускник</option>
                </select>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button 
                  onClick={() => window.print()} 
                  className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition flex items-center space-x-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Друкувати картку (Держформа)</span>
                </button>
                <button onClick={() => setViewingChild(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl">
                  Закрити
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL: EMPLOYEE PERSONAL FILE (ОСОБОВА СПРАВА СПІВРОБІТНИКА) */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between font-bold">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span>Особова справа працівника ЗДО №145</span>
              </div>
              <button onClick={() => setViewingEmployee(null)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
            </div>

            <div className="p-6 space-y-4 text-xs">
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
      )}

      {/* EDIT MODALS FOR GROUP, EMPLOYEE, CHILD */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between font-bold text-sm">
              <span>{editingGroup ? 'Редагувати групу' : 'Додати групу / приміщення'}</span>
              <button onClick={() => setIsGroupModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSaveGroup} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Назва групи / приміщення *</label>
                <input type="text" required value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Група «Сонечко»" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Вікова категорія</label>
                  <select value={groupAgeCategory} onChange={(e) => setGroupAgeCategory(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                    <option value="Ясла (1-3 роки)">Ясла (1-3 роки)</option>
                    <option value="Молодша (3-4 роки)">Молодша (3-4 роки)</option>
                    <option value="Середня (4-5 років)">Середня (4-5 років)</option>
                    <option value="Старша (5-7 років)">Старша (5-7 років)</option>
                    <option value="Спеціалізоване приміщення">Спеціалізоване приміщення</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Кімната №</label>
                  <input type="text" value={groupRoom} onChange={(e) => setGroupRoom(e.target.value)} placeholder="101" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono" />
                </div>
              </div>
              <div className="pt-3 border-t flex justify-end space-x-2">
                <button type="button" onClick={() => setIsGroupModalOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold">Скасувати</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold">Зберегти</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between font-bold text-sm">
              <span>{editingEmployee ? 'Редагувати співробітника' : 'Додати нового співробітника'}</span>
              <button onClick={() => setIsEmployeeModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSaveEmployee} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">ПІБ Співробітника *</label>
                <input type="text" required value={empFullName} onChange={(e) => setEmpFullName(e.target.value)} placeholder="Петренко Олена Іванівна" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Посада</label>
                  <input type="text" required value={empPosition} onChange={(e) => setEmpPosition(e.target.value)} placeholder="Вихователь" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold mb-1">Телефон</label>
                  <input type="text" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} placeholder="(098) 123-45-67" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Закріплена група / локація</label>
                  <select value={empGroupName} onChange={(e) => setEmpGroupName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                    {groups.map(g => <option key={g.ID} value={g.NAME}>{g.NAME}</option>)}
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center space-x-2 font-bold text-amber-600 dark:text-amber-400 cursor-pointer">
                    <input type="checkbox" checked={empIsMvo} onChange={(e) => setEmpIsMvo(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                    <span>Матеріально-відповідальна особа (МВО)</span>
                  </label>
                </div>
              </div>
              <div className="pt-3 border-t flex justify-end space-x-2">
                <button type="button" onClick={() => setIsEmployeeModalOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold">Скасувати</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold">Зберегти</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isChildModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between font-bold text-sm">
              <span>{editingChild ? 'Редагувати картку вихованця' : 'Зарахувати нового вихованця'}</span>
              <button onClick={() => setIsChildModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSaveChild} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">ПІБ Дитини *</label>
                <input type="text" required value={childFullName} onChange={(e) => setChildFullName(e.target.value)} placeholder="Коваленко Софія Дмитрівна" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Дата народження</label>
                  <input type="date" value={childBirthDate} onChange={(e) => setChildBirthDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block font-bold mb-1">Закріплена група</label>
                  <select value={childGroupName} onChange={(e) => setChildGroupName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold text-blue-600">
                    {groups.map(g => <option key={g.ID} value={g.NAME}>{g.NAME}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">ПІБ Батьків</label>
                  <input type="text" value={childParentName} onChange={(e) => setChildParentName(e.target.value)} placeholder="Коваленко Д. М." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold mb-1">Статус вихованця</label>
                  <select value={childStatus} onChange={(e) => setChildStatus(e.target.value as any)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold">
                    <option value="Навчається">🟢 Навчається</option>
                    <option value="Вибув">🔴 Вибув</option>
                    <option value="Тимчасово відсутній">🟡 Тимчасово відсутній</option>
                    <option value="Випускник">🎓 Випускник</option>
                  </select>
                </div>
              </div>
              <div className="pt-3 border-t flex justify-end space-x-2">
                <button type="button" onClick={() => setIsChildModalOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold">Скасувати</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold">Зберегти</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORMAL STATE PRINT LAYOUT (A4 Portrait) */}
      <div className="print-only p-6 font-serif text-black bg-white">
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
                  <th className="border border-black p-1.5 text-left">Назва групи</th>
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
    </>
  );
};
