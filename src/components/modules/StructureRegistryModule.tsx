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
  Building2, 
  Baby, 
  Plus, 
  Trash2, 
  Edit3, 
  Phone, 
  CheckCircle2, 
  UserCheck, 
  Search, 
  Sparkles, 
  X, 
  Briefcase, 
  Home, 
  ShieldCheck, 
  GraduationCap
} from 'lucide-react';

export const StructureRegistryModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'employees' | 'children'>('groups');
  const [searchTerm, setSearchTerm] = useState('');

  // Data lists
  const [groups, setGroups] = useState<SadokGroup[]>([]);
  const [employees, setEmployees] = useState<SadokEmployee[]>([]);
  const [children, setChildren] = useState<SadokChild[]>([]);

  // Modals
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<SadokGroup> | null>(null);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<SadokEmployee> | null>(null);

  const [isChildModalOpen, setIsChildModalOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Partial<SadokChild> | null>(null);

  // Group Form
  const [groupName, setGroupName] = useState('');
  const [groupAgeCategory, setGroupAgeCategory] = useState('Молодша (3-4 роки)');
  const [groupRoom, setGroupRoom] = useState('');
  const [groupTeacher, setGroupTeacher] = useState('');
  const [groupCount, setGroupCount] = useState<number>(25);

  // Employee Form
  const [empFullName, setEmpFullName] = useState('');
  const [empPosition, setEmpPosition] = useState('Вихователь');
  const [empPhone, setEmpPhone] = useState('');
  const [empIsMvo, setEmpIsMvo] = useState(false);
  const [empGroupName, setEmpGroupName] = useState('');
  const [empNotes, setEmpNotes] = useState('');

  // Child Form
  const [childFullName, setChildFullName] = useState('');
  const [childBirthDate, setChildBirthDate] = useState('2022-05-15');
  const [childGroupName, setChildGroupName] = useState('');
  const [childParentName, setChildParentName] = useState('');
  const [childParentPhone, setChildParentPhone] = useState('');
  const [childStatus, setChildStatus] = useState<'Навчається' | 'Випускник' | 'Тимчасово відсутній'>('Навчається');

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
      NOTES: empNotes.trim()
    });
    setEmployees(updated);
    setIsEmployeeModalOpen(false);
  };

  const handleDeleteEmployee = (id: number) => {
    if (window.confirm('Вилучити працівника з кадрового обліку?')) {
      setEmployees(deleteEmployee(id));
    }
  };

  // Child Handlers
  const handleOpenChildModal = (ch?: SadokChild) => {
    setEditingChild(ch || null);
    setChildFullName(ch?.FULL_NAME || '');
    setChildBirthDate(ch?.BIRTH_DATE || '2022-05-15');
    setChildGroupName(ch?.GROUP_NAME || (groups[0]?.NAME || ''));
    setChildParentName(ch?.PARENT_NAME || '');
    setChildParentPhone(ch?.PARENT_PHONE || '');
    setChildStatus(ch?.STATUS || 'Навчається');
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
      STATUS: childStatus
    });
    setChildren(updated);
    setIsChildModalOpen(false);
  };

  const handleDeleteChild = (id: number) => {
    if (window.confirm('Вилучити картку вихованця?')) {
      setChildren(deleteChild(id));
    }
  };

  // Filtering
  const filteredGroups = groups.filter(g => 
    g.NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.TEACHER_NAME || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmployees = employees.filter(e => 
    e.FULL_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.POSITION.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.GROUP_NAME || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredChildren = children.filter(c => 
    c.FULL_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.GROUP_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.PARENT_NAME || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Exports
  const handleExportExcel = () => {
    if (activeSubTab === 'groups') {
      const headers = ['Назва групи', 'Вікова категорія', '№ Приміщення', 'Вихователь', 'Кількість дітей'];
      const rows = filteredGroups.map(g => [g.NAME, g.AGE_CATEGORY, g.ROOM_NUMBER || '', g.TEACHER_NAME || '', g.CHILDREN_COUNT]);
      exportToExcel('SADOK_Групи_ДНЗ', 'Групи', headers, rows);
    } else if (activeSubTab === 'employees') {
      const headers = ['ПІБ Співробітника', 'Посада', 'Телефон', 'Статус МВО', 'Закріплена група/відділ'];
      const rows = filteredEmployees.map(e => [e.FULL_NAME, e.POSITION, e.PHONE || '', e.IS_MVO ? 'Так (МВО)' : 'Ні', e.GROUP_NAME || '']);
      exportToExcel('SADOK_Кадри_МВО', 'Співробітники', headers, rows);
    } else {
      const headers = ['ПІБ Вихованця', 'Дата народження', 'Група', 'Батьки', 'Телефон батьків', 'Статус'];
      const rows = filteredChildren.map(c => [c.FULL_NAME, c.BIRTH_DATE, c.GROUP_NAME, c.PARENT_NAME || '', c.PARENT_PHONE || '', c.STATUS]);
      exportToExcel('SADOK_Вихованці', 'Діти', headers, rows);
    }
  };

  const handleExportPDF = () => {
    const title = activeSubTab === 'groups' ? 'Реєстр груп та приміщень ДНЗ' : (activeSubTab === 'employees' ? 'Кадровий склад та МВО' : 'Список вихованців закладу');
    const headers = activeSubTab === 'groups' 
      ? ['Група', 'Категорія', 'Кімната', 'Вихователь', 'Дітей']
      : (activeSubTab === 'employees' ? ['ПІБ Співробітника', 'Посада', 'Телефон', 'МВО', 'Локація'] : ['ПІБ Дитини', 'Група', 'Дата народж.', 'Батьки', 'Телефон']);
    
    const rows = activeSubTab === 'groups'
      ? filteredGroups.map(g => [g.NAME, g.AGE_CATEGORY, g.ROOM_NUMBER || '-', g.TEACHER_NAME || '-', `${g.CHILDREN_COUNT} осіб`])
      : (activeSubTab === 'employees'
        ? filteredEmployees.map(e => [e.FULL_NAME, e.POSITION, e.PHONE || '-', e.IS_MVO ? 'МВО' : '-', e.GROUP_NAME || '-'])
        : filteredChildren.map(c => [c.FULL_NAME, c.GROUP_NAME, c.BIRTH_DATE, c.PARENT_NAME || '-', c.PARENT_PHONE || '-']));

    exportToPDF(title, headers, rows);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950">
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
        title="SADOK Контингент — Організаційна структура, кадри та вихованці ДНЗ"
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* SUB-TAB SELECTION BAR */}
        <div className="card-glass p-2 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveSubTab('groups')}
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
              onClick={() => setActiveSubTab('employees')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                activeSubTab === 'employees'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Кадри та Співробітники МВО ({employees.length})</span>
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
            {activeSubTab === 'groups' && <span>Всього списковий склад: {groups.reduce((s, g) => s + (g.CHILDREN_COUNT || 0), 0)} дітей</span>}
            {activeSubTab === 'employees' && <span>Всього МВО у закладі: {employees.filter(e => e.IS_MVO).length} осіб</span>}
            {activeSubTab === 'children' && <span>Активно навчається: {children.filter(c => c.STATUS === 'Навчається').length} дітей</span>}
          </div>
        </div>

        {/* GROUPS TAB CONTENT */}
        {activeSubTab === 'groups' && (
          <div className="card-glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-grid w-full">
                <thead>
                  <tr>
                    <th>Назва групи / локації</th>
                    <th>Вікова категорія</th>
                    <th className="w-24 text-center">Приміщення №</th>
                    <th>Закріплений вихователь / МВО</th>
                    <th className="w-28 text-center">Кількість дітей</th>
                    <th className="w-20 text-center">Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map(g => (
                    <tr key={g.ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="font-bold text-slate-800 dark:text-slate-100 text-xs">{g.NAME}</td>
                      <td><span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded text-[11px]">{g.AGE_CATEGORY}</span></td>
                      <td className="text-center font-mono font-bold text-xs">{g.ROOM_NUMBER || '-'}</td>
                      <td className="font-medium text-slate-700 dark:text-slate-300">{g.TEACHER_NAME || 'Не призначено'}</td>
                      <td className="text-center font-black text-xs text-blue-600 dark:text-blue-400">{g.CHILDREN_COUNT} осіб</td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button onClick={() => handleOpenGroupModal(g)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteGroup(g.ID)} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EMPLOYEES TAB CONTENT */}
        {activeSubTab === 'employees' && (
          <div className="card-glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-grid w-full">
                <thead>
                  <tr>
                    <th>ПІБ Співробітника</th>
                    <th>Посада</th>
                    <th className="w-36">Телефон</th>
                    <th className="w-36 text-center">Статус МВО</th>
                    <th>Закріплена група / локація</th>
                    <th className="w-20 text-center">Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(e => (
                    <tr key={e.ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="font-bold text-slate-800 dark:text-slate-100 text-xs">{e.FULL_NAME}</td>
                      <td className="font-semibold text-slate-700 dark:text-slate-300">{e.POSITION}</td>
                      <td className="font-mono text-xs text-slate-600">{e.PHONE || '-'}</td>
                      <td className="text-center">
                        {e.IS_MVO ? (
                          <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 rounded font-bold text-[10px]">
                            🛡️ МВО (Матеріально відповідальний)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="font-medium text-slate-700 dark:text-slate-300">{e.GROUP_NAME || 'Загальна територія'}</td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button onClick={() => handleOpenEmpModal(e)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteEmployee(e.ID)} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CHILDREN TAB CONTENT */}
        {activeSubTab === 'children' && (
          <div className="card-glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-grid w-full">
                <thead>
                  <tr>
                    <th>ПІБ Вихованця (Дитини)</th>
                    <th className="w-32 text-center">Дата народження</th>
                    <th>Закріплена група</th>
                    <th>ПІБ Батьків / Опікунів</th>
                    <th className="w-36">Телефон батьків</th>
                    <th className="w-28 text-center">Статус</th>
                    <th className="w-20 text-center">Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChildren.map(c => (
                    <tr key={c.ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="font-bold text-slate-800 dark:text-slate-100 text-xs">{c.FULL_NAME}</td>
                      <td className="text-center font-mono text-xs">{c.BIRTH_DATE}</td>
                      <td className="font-bold text-blue-600 dark:text-blue-400 text-xs">{c.GROUP_NAME}</td>
                      <td className="font-medium text-slate-700 dark:text-slate-300">{c.PARENT_NAME || '-'}</td>
                      <td className="font-mono text-xs text-slate-600">{c.PARENT_PHONE || '-'}</td>
                      <td className="text-center">
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded text-[10px]">
                          {c.STATUS}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button onClick={() => handleOpenChildModal(c)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteChild(c.ID)} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* GROUP MODAL */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between font-bold text-sm">
              <span>{editingGroup ? 'Редагувати групу' : 'Додати групу / приміщення'}</span>
              <button onClick={() => setIsGroupModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSaveGroup} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Назва групи / приміщення *</label>
                <input type="text" required value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Наприклад: Група «Сонечко»" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Вікова категорія</label>
                  <select value={groupAgeCategory} onChange={(e) => setGroupAgeCategory(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                    <option value="Ясла (1-3 роки)">Ясла (1-3 роки)</option>
                    <option value="Молодша (3-4 роки)">Молодша (3-4 роки)</option>
                    <option value="Середня (4-5 років)">Середня (4-5 років)</option>
                    <option value="Старша (5-7 років)">Старша (5-7 років)</option>
                    <option value="Спеціалізоване приміщення">Спеціалізоване приміщення</option>
                    <option value="Виробниче приміщення">Виробниче приміщення</option>
                    <option value="Адміністрація">Адміністрація</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Приміщення № / Кімната</label>
                  <input type="text" value={groupRoom} onChange={(e) => setGroupRoom(e.target.value)} placeholder="Наприклад: 101" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Закріплений вихователь / МВО</label>
                  <select value={groupTeacher} onChange={(e) => setGroupTeacher(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-medium">
                    {employees.map(e => <option key={e.ID} value={e.FULL_NAME}>{e.FULL_NAME} ({e.POSITION})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Кількість дітей</label>
                  <input type="number" min="0" value={groupCount} onChange={(e) => setGroupCount(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold" />
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

      {/* EMPLOYEE MODAL */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between font-bold text-sm">
              <span>{editingEmployee ? 'Редагувати співробітника' : 'Додати нового співробітника'}</span>
              <button onClick={() => setIsEmployeeModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSaveEmployee} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">ПІБ Співробітника *</label>
                <input type="text" required value={empFullName} onChange={(e) => setEmpFullName(e.target.value)} placeholder="Наприклад: Петренко Олена Іванівна" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Посада</label>
                  <input type="text" required value={empPosition} onChange={(e) => setEmpPosition(e.target.value)} placeholder="Наприклад: Вихователь" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Телефон</label>
                  <input type="text" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} placeholder="(098) 123-45-67" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Закріплена група / локація</label>
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

      {/* CHILD MODAL */}
      {isChildModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between font-bold text-sm">
              <span>{editingChild ? 'Редагувати картку вихованця' : 'Зарахувати нового вихованця'}</span>
              <button onClick={() => setIsChildModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSaveChild} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">ПІБ Дитини *</label>
                <input type="text" required value={childFullName} onChange={(e) => setChildFullName(e.target.value)} placeholder="Наприклад: Коваленко Софія Дмитрівна" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Дата народження</label>
                  <input type="date" value={childBirthDate} onChange={(e) => setChildBirthDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Закріплена група</label>
                  <select value={childGroupName} onChange={(e) => setChildGroupName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold text-blue-600">
                    {groups.map(g => <option key={g.ID} value={g.NAME}>{g.NAME}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">ПІБ Батьків / Опікунів</label>
                  <input type="text" value={childParentName} onChange={(e) => setChildParentName(e.target.value)} placeholder="Коваленко Д. М." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Телефон батьків</label>
                  <input type="text" value={childParentPhone} onChange={(e) => setChildParentPhone(e.target.value)} placeholder="(067) 222-33-44" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono" />
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
    </div>
  );
};
