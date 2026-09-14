import React, { useState, useMemo } from 'react';
import { SadokGroup, SadokChild } from '../../types';
import { batchTransferChildren, ChildGroupTransferItem } from '../../services/db';
import { 
  GraduationCap, 
  ArrowRight, 
  Users, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  Sparkles,
  Calendar
} from 'lucide-react';

interface MassGroupTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: SadokGroup[];
  children: SadokChild[];
  onComplete: () => void;
}

interface GroupRule {
  sourceGroupName: string;
  action: 'transfer' | 'graduate' | 'stay';
  targetGroupName: string;
}

export const MassGroupTransferModal: React.FC<MassGroupTransferModalProps> = ({
  isOpen,
  onClose,
  groups,
  children,
  onComplete,
}) => {
  // Only active children
  const activeChildren = useMemo(() => {
    return children.filter(c => c.STATUS === 'Навчається');
  }, [children]);

  // Distinct active group names
  const activeGroupNames = useMemo(() => {
    const fromGroups = groups.map(g => g.NAME);
    const fromChildren = Array.from(new Set(activeChildren.map(c => c.GROUP_NAME)));
    return Array.from(new Set([...fromGroups, ...fromChildren])).filter(Boolean);
  }, [groups, activeChildren]);

  // Initial group rules: guess the next group or graduate
  const [groupRules, setGroupRules] = useState<Record<string, GroupRule>>(() => {
    const initial: Record<string, GroupRule> = {};
    activeGroupNames.forEach(name => {
      const lower = name.toLowerCase();
      let action: GroupRule['action'] = 'stay';
      let targetGroupName = name;

      if (lower.includes('старш') || lower.includes('випуск')) {
        action = 'graduate';
        targetGroupName = 'Випускники до школи';
      } else {
        action = 'transfer';
        targetGroupName = name;
      }

      initial[name] = {
        sourceGroupName: name,
        action,
        targetGroupName,
      };
    });
    return initial;
  });

  // Selected children IDs (all active checked by default)
  const [selectedChildIds, setSelectedChildIds] = useState<Set<number>>(() => {
    return new Set(activeChildren.map(c => c.ID));
  });

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleActionChange = (groupName: string, action: GroupRule['action']) => {
    setGroupRules(prev => ({
      ...prev,
      [groupName]: {
        ...prev[groupName],
        action,
        targetGroupName: action === 'graduate' ? 'Випускники' : prev[groupName]?.targetGroupName || groupName,
      },
    }));
  };

  const handleTargetChange = (groupName: string, targetGroupName: string) => {
    setGroupRules(prev => ({
      ...prev,
      [groupName]: {
        ...prev[groupName],
        targetGroupName,
      },
    }));
  };

  const toggleChildSelection = (id: number) => {
    setSelectedChildIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroupChildren = (groupName: string, check: boolean) => {
    const groupChildIds = activeChildren.filter(c => c.GROUP_NAME === groupName).map(c => c.ID);
    setSelectedChildIds(prev => {
      const next = new Set(prev);
      groupChildIds.forEach(id => {
        if (check) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  // Calculate summary
  const summary = useMemo(() => {
    let toTransfer = 0;
    let toGraduate = 0;

    activeChildren.forEach(child => {
      if (!selectedChildIds.has(child.ID)) return;
      const rule = groupRules[child.GROUP_NAME];
      if (!rule) return;
      if (rule.action === 'graduate') toGraduate++;
      else if (rule.action === 'transfer' && rule.targetGroupName !== child.GROUP_NAME) toTransfer++;
    });

    return { toTransfer, toGraduate, totalSelected: selectedChildIds.size };
  }, [activeChildren, selectedChildIds, groupRules]);

  const handleExecuteTransfer = () => {
    const transfers: ChildGroupTransferItem[] = [];

    activeChildren.forEach(child => {
      if (!selectedChildIds.has(child.ID)) return; // Child stays as is
      const rule = groupRules[child.GROUP_NAME];
      if (!rule || rule.action === 'stay') return;

      if (rule.action === 'graduate') {
        transfers.push({
          childId: child.ID,
          targetGroupName: child.GROUP_NAME,
          targetStatus: 'Випускник',
        });
      } else if (rule.action === 'transfer') {
        if (rule.targetGroupName && rule.targetGroupName !== child.GROUP_NAME) {
          transfers.push({
            childId: child.ID,
            targetGroupName: rule.targetGroupName,
            targetStatus: 'Навчається',
          });
        }
      }
    });

    if (transfers.length === 0) {
      alert('Не обрано жодного переведення чи випуску.');
      return;
    }

    if (!window.confirm(`Ви підтверджуєте переведення ${transfers.length} вихованців на новий навчальний рік?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      batchTransferChildren(transfers);
      setSuccessMessage(`Успішно переведено ${transfers.length} вихованців! Дані оновлено та синхронізовано.`);
      setTimeout(() => {
        setIsProcessing(false);
        onComplete();
        onClose();
      }, 1200);
    } catch (error) {
      setIsProcessing(false);
      alert(`Помилка під час масового переведення: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <Calendar className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Майстер «1 Вересня»</span>
                <span className="text-xs px-2.5 py-0.5 bg-amber-400 text-slate-900 font-extrabold rounded-md shadow-xs">
                  Новий навчальний рік
                </span>
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Масове переведення дітей між групами, випуск старших груп до школи та оновлення контингенту в 1 клік
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {successMessage && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <span className="font-bold text-sm">{successMessage}</span>
            </div>
          )}

          {/* SUMMARY STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl text-center">
              <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase">Обрано вихованців</div>
              <div className="text-2xl font-black text-blue-900 dark:text-blue-100">{summary.totalSelected} з {activeChildren.length}</div>
            </div>

            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl text-center">
              <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Перейдуть у старшу групу</div>
              <div className="text-2xl font-black text-indigo-900 dark:text-indigo-100">{summary.toTransfer}</div>
            </div>

            <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 rounded-2xl text-center">
              <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase">🎓 Випускники до школи</div>
              <div className="text-2xl font-black text-purple-900 dark:text-purple-100">{summary.toGraduate}</div>
            </div>
          </div>

          {/* INSTRUCTIONS */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Як це працює:</strong> Вкажіть для кожної групи цільову групу або дію «Випуск до школи». Діти, з яких знято галочку, залишаться у своїй поточній групі (наприклад, для повторного року навчання).
            </div>
          </div>

          {/* GROUPS CONFIGURATION TABLE */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              1. Налаштування переходу для кожної групи
            </h3>

            <div className="space-y-3">
              {activeGroupNames.map(groupName => {
                const rule = groupRules[groupName] || {
                  sourceGroupName: groupName,
                  action: 'stay',
                  targetGroupName: groupName,
                };
                const groupKids = activeChildren.filter(c => c.GROUP_NAME === groupName);
                const isExpanded = expandedGroup === groupName;
                const checkedInGroup = groupKids.filter(k => selectedChildIds.has(k.ID)).length;

                return (
                  <div 
                    key={groupName}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sm text-slate-800 dark:text-slate-100">
                          {groupName}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded-lg">
                          {groupKids.length} дітей
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Action selector */}
                        <select
                          value={rule.action}
                          onChange={(e) => handleActionChange(groupName, e.target.value as any)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-xs cursor-pointer"
                        >
                          <option value="transfer">➔ Перевести в іншу групу</option>
                          <option value="graduate">🎓 Випустити до школи (в архів)</option>
                          <option value="stay">⏸ Залишити без змін</option>
                        </select>

                        {/* Target group if transfer */}
                        {rule.action === 'transfer' && (
                          <div className="flex items-center space-x-1.5">
                            <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                            <select
                              value={rule.targetGroupName}
                              onChange={(e) => handleTargetChange(groupName, e.target.value)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-xs cursor-pointer"
                            >
                              <option value="">-- Оберіть цільову групу --</option>
                              {activeGroupNames.map(targetName => (
                                <option key={targetName} value={targetName}>
                                  {targetName}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedGroup(isExpanded ? null : groupName)}
                          className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          {isExpanded ? 'Згорнути список' : `Список дітей (${checkedInGroup}/${groupKids.length})`}
                        </button>
                      </div>
                    </div>

                    {/* EXPANDED CHILDREN LIST */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Позначте дітей, які підлягають переведенню:</span>
                          <div className="space-x-2 font-bold">
                            <button
                              type="button"
                              onClick={() => toggleGroupChildren(groupName, true)}
                              className="text-blue-600 hover:underline"
                            >
                              Обрати всіх
                            </button>
                            <span>·</span>
                            <button
                              type="button"
                              onClick={() => toggleGroupChildren(groupName, false)}
                              className="text-rose-600 hover:underline"
                            >
                              Зняти всіх
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                          {groupKids.map(kid => {
                            const isChecked = selectedChildIds.has(kid.ID);
                            return (
                              <label
                                key={kid.ID}
                                className={`flex items-center space-x-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition ${
                                  isChecked
                                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-slate-800 dark:text-slate-100 font-bold'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 opacity-60'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleChildSelection(kid.ID)}
                                  className="rounded text-blue-600 cursor-pointer"
                                />
                                <span className="truncate">{kid.FULL_NAME}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            Скасувати
          </button>

          <button
            type="button"
            onClick={handleExecuteTransfer}
            disabled={isProcessing || summary.toTransfer + summary.toGraduate === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>
              {isProcessing ? 'Виконується переведення…' : `Виконати переведення (${summary.toTransfer + summary.toGraduate} вихованців)`}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
