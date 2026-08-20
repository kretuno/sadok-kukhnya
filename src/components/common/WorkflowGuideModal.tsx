import React from 'react';
import { HelpCircle, X, CheckCircle2, AlertTriangle, ArrowRight, Lightbulb, Sparkles } from 'lucide-react';

export interface WorkflowStep {
  number: number;
  title: string;
  description: string;
  details?: string[];
  warning?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

export interface WorkflowGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  steps: WorkflowStep[];
  importantNotes?: string[];
}

export const WorkflowGuideModal: React.FC<WorkflowGuideModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = 'Рекомендована послідовність дій для правильного та швидкого старту',
  steps,
  importantNotes,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4">
      <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                <HelpCircle className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base leading-snug flex items-center gap-1.5">
                  <span>{title}</span>
                </h3>
                <p className="text-[11px] text-blue-100/90 mt-0.5">{subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition"
              title="Закрити інструкцію"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
            {/* Step Chain Banner */}
            <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-3.5 rounded-xl flex items-center space-x-2 text-blue-900 dark:text-blue-200 font-medium">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Дотримуйтесь правильної послідовності кроків, щоб усі дані коректно пов'язалися між собою:
              </span>
            </div>

            {/* Steps List */}
            <div className="space-y-3.5">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 transition hover:border-blue-400 dark:hover:border-blue-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow">
                        {step.number}
                      </span>
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {step.title}
                        </h4>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {step.description}
                        </p>

                        {step.details && step.details.length > 0 && (
                          <ul className="space-y-1 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {step.details.map((detail, dIdx) => (
                              <li key={dIdx} className="flex items-start space-x-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {step.warning && (
                          <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-amber-800 dark:text-amber-300 text-[11px] flex items-start space-x-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <span>{step.warning}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {step.actionButton && (
                      <button
                        onClick={() => {
                          step.actionButton?.onClick();
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] shrink-0 transition flex items-center space-x-1 shadow-sm"
                      >
                        <span>{step.actionButton.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Important Notes */}
            {importantNotes && importantNotes.length > 0 && (
              <div className="p-3.5 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5">
                <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 text-xs">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Корисні поради для щоденної роботи:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300 pl-1">
                  {importantNotes.map((note, nIdx) => (
                    <li key={nIdx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow transition"
            >
              Зрозуміло, розпочати роботу
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
