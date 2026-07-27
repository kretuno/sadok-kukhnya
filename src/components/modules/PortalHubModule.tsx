import React, { useState } from 'react';
import {
  Utensils,
  Package,
  Brain,
  Users,
  HeartPulse,
  BarChart3,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldCheck,
  Building,
  CheckCircle2,
  X
} from 'lucide-react';

interface PortalHubModuleProps {
  onSelectModule: (tabId: string) => void;
}

interface ProjectModuleItem {
  id: string;
  name: string;
  subtitle: string;
  badgeLetter: string;
  gradient: string;
  icon: React.ElementType;
  status: 'active' | 'in_dev';
  description: string;
  features: string[];
}

export const PortalHubModule: React.FC<PortalHubModuleProps> = ({ onSelectModule }) => {
  const [selectedInDevModule, setSelectedInDevModule] = useState<ProjectModuleItem | null>(null);

  const projects: ProjectModuleItem[] = [
    {
      id: 'menu_planner',
      name: 'SADOK',
      subtitle: 'Кухня',
      badgeLetter: 'S',
      gradient: 'from-blue-600 to-blue-500 shadow-blue-500/30',
      icon: Utensils,
      status: 'active',
      description: 'Професійна автоматизована система меню-розкладки, складського обліку продуктів харчування та дотримання норм КМУ № 305.',
      features: [
        'Автоматичний розрахунок БЖУ та калорійності',
        'Списання товарів зі складу за методом FIFO',
        'Друк офіційної меню-розкладки для кухні A4',
        'Оборотно-сальдова відомість та аналіз норм СанПіН'
      ]
    },
    {
      id: 'maino',
      name: 'SADOK',
      subtitle: 'Майно',
      badgeLetter: 'S',
      gradient: 'from-amber-500 to-orange-600 shadow-orange-500/30',
      icon: Package,
      status: 'in_dev',
      description: 'Облік матеріально-технічних цінностей, інвентаризація обладнання, меблів, білизни та балансового майна ЗДО.',
      features: [
        'Інвентаризаційні описи та QR-маркування майна',
        'Закріплення матеріально-відповідальних осіб (МВО)',
        'Акти прийому-передачі та списання непридатного майна',
        'Облік зносу та поточного стану обладнання'
      ]
    },
    {
      id: 'psychologist',
      name: 'SADOK',
      subtitle: 'Психолог',
      badgeLetter: 'S',
      gradient: 'from-slate-950 via-slate-900 to-black shadow-slate-900/50',
      icon: Brain,
      status: 'in_dev',
      description: 'Моніторинг психологічного розвитку вихованців, діагностичні картки спостереження та рекомендації для батьків і вихователів.',
      features: [
        'Карти психологічної готовності дитини до школи',
        'Журнал індивідуальних та групових консультацій',
        'Тестові методики та адаптаційні карти груп',
        'Автоматичне формування психологічних висновків'
      ]
    },
    {
      id: 'employees',
      name: 'SADOK',
      subtitle: 'Співробітники',
      badgeLetter: 'S',
      gradient: 'from-indigo-600 to-purple-700 shadow-indigo-500/30',
      icon: Users,
      status: 'in_dev',
      description: 'Кадровий облік педагогічного та технічного персоналу, графіки чергувань, атестації та облік робочого часу.',
      features: [
        'Особові справи вихователів та працівників',
        'Табель обліку робочого часу (Форма П-5)',
        'Графіки проходження курсової перепідготовки та атестації',
        'Облік медоглядів та допусків персоналу'
      ]
    },
    {
      id: 'medical',
      name: 'SADOK',
      subtitle: 'Медичний',
      badgeLetter: 'S',
      gradient: 'from-emerald-500 to-teal-600 shadow-emerald-500/30',
      icon: HeartPulse,
      status: 'in_dev',
      description: 'Медична карта дитини, антропометрія, журнал профілактичних щеплень, медогляди та контроль соматичного здоров’я.',
      features: [
        'Картка профілактичних щеплень (Форма № 063/о)',
        'Журнал обліку захворюваності та відвідуваності',
        'Журнал антропометричних вимірювань та загартовування',
        'Облік диспансерної групи та дієтичного харчування'
      ]
    },
    {
      id: 'reports',
      name: 'SADOK',
      subtitle: 'Звіти',
      badgeLetter: 'S',
      gradient: 'from-cyan-500 to-teal-600 shadow-cyan-500/30',
      icon: BarChart3,
      status: 'in_dev',
      description: 'Зведена аналітична та фінансова звітність для Департаменту освіти, статистичні діаграми та показники ЗДО.',
      features: [
        'Річний звіт закладу дошкільної освіти (Форма 85-К)',
        'Аналітика виконання грошових норм харчування',
        'Статистика відвідуваності та моніторинг контингенту',
        'Інтерактивні дашборди для керівника та бухгалтерії'
      ]
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-y-auto selection:bg-blue-500 selection:text-white pb-12">
      {/* TOP HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-slate-800 p-5 md:p-6 shadow-2xl shrink-0">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs font-extrabold text-blue-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Екосистема управління закладами дошкільної освіти України</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              Платформа <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">SADOK</span>
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-xl font-medium leading-relaxed">
              Оберіть необхідний спеціалізований модуль для роботи. Універсальний комплекс автоматизації меню, майна, медичного обліку, кадрів та аналітики ЗДО.
            </p>
          </div>

          <div className="flex items-center space-x-3.5 bg-slate-800/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/80 shadow-xl shrink-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-md border border-white/20">
              S
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Платформа для ЗДО</div>
              <div className="text-xs font-black text-white">Універсальний онлайн-комплекс</div>
              <div className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>Версія системи v1.0.15</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODULES GRID SECTION */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-extrabold text-white tracking-wide uppercase">
              Модулі та субсистеми SADOK
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-3 py-0.5 rounded-full border border-slate-700">
            6 Спеціалізованих модулів
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const Icon = proj.icon;
            const isActive = proj.status === 'active';

            return (
              <div
                key={proj.id}
                onClick={() => {
                  if (isActive) {
                    onSelectModule(proj.id);
                  } else {
                    setSelectedInDevModule(proj);
                  }
                }}
                className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                  isActive
                    ? 'bg-slate-800/90 hover:bg-slate-800 border-blue-500/50 hover:border-blue-400 shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 -translate-y-1'
                    : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-700/60 hover:border-slate-600 hover:-translate-y-0.5'
                }`}
              >
                {/* Background Accent Glow */}
                <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-2xl transition-opacity duration-300 opacity-20 group-hover:opacity-40 bg-gradient-to-tr ${proj.gradient}`} />

                <div className="space-y-3 relative z-10">
                  {/* Card Header: Badge Logo & Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {/* Logo Badge */}
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${proj.gradient} text-white font-black text-lg flex items-center justify-center shadow-lg border border-white/20 transition-transform duration-300 group-hover:scale-105`}>
                        {proj.badgeLetter}
                      </div>

                      <div>
                        <div className="flex items-baseline space-x-1.5">
                          <span className="text-sm font-black text-white tracking-tight">{proj.name}</span>
                          <span className="text-sm font-bold text-slate-300">{proj.subtitle}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 block">Модуль системи</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isActive ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-[10px] font-extrabold text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>Активний</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-slate-700/80 border border-slate-600 rounded-full text-[10px] font-bold text-amber-300">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>В розробці</span>
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium min-h-[42px]">
                    {proj.description}
                  </p>
                </div>

                {/* Card Footer Button */}
                <div className="pt-3 border-t border-slate-700/60 mt-3 flex items-center justify-between relative z-10">
                  <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-400 group-hover:text-white transition-colors">
                    <Icon className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isActive ? 'Відкрити модуль' : 'Детальніше про модуль'}</span>
                  </div>

                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-600 text-white group-hover:bg-blue-500 group-hover:translate-x-1'
                      : 'bg-slate-700 text-slate-300 group-hover:bg-slate-600'
                  }`}>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: IN DEVELOPMENT ANNOUNCEMENT */}
      {selectedInDevModule && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Background Glow */}
            <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-30 bg-gradient-to-tr ${selectedInDevModule.gradient}`} />

            {/* Close Button */}
            <button
              onClick={() => setSelectedInDevModule(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${selectedInDevModule.gradient} text-white font-black text-2xl flex items-center justify-center shadow-xl border border-white/20 shrink-0`}>
                {selectedInDevModule.badgeLetter}
              </div>
              <div>
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded-full text-[10px] font-bold text-amber-300 mb-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Модуль знаходиться в розробці</span>
                </div>
                <h3 className="text-xl font-black text-white flex items-baseline space-x-1.5">
                  <span>{selectedInDevModule.name}</span>
                  <span className="text-slate-300 font-bold">{selectedInDevModule.subtitle}</span>
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {selectedInDevModule.description}
            </p>

            {/* Planned Features List */}
            <div className="space-y-2.5 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Заплановані можливості модуля:</span>
              </div>
              <ul className="space-y-2">
                {selectedInDevModule.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => {
                  alert(`Ви підписалися на сповіщення про реліз модуля «${selectedInDevModule.name} ${selectedInDevModule.subtitle}»!`);
                  setSelectedInDevModule(null);
                }}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition text-xs shadow-lg cursor-pointer text-center"
              >
                🔔 Повідомити про вихід релізу
              </button>

              <button
                onClick={() => setSelectedInDevModule(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition text-xs cursor-pointer"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
