import React from 'react';
import { QuickToolbar } from '../QuickToolbar';
import { SadokLogo } from '../SadokLogo';
import { Database, ShieldCheck, User, Mail, Phone, Globe, Cpu, Award, FileCode2, CheckCircle2, ExternalLink, Heart, Sparkles, Server } from 'lucide-react';

export const AboutModule: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950 text-xs">
      <QuickToolbar
        onRefresh={() => {}}
        onExportExcel={() => {}}
        onExportPDF={() => {}}
        onPrint={() => window.print()}
        title="Про програму SADOK v1.0.27"
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* MAIN HERO CARD */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-8 shadow-xl">
            {/* Subtle background glow effect */}
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center space-x-5 text-center md:text-left">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 via-blue-600 to-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-2xl border-2 border-white/40 flex-shrink-0">
                  S
                </div>
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>Офіційний реліз v1.0.27</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-sm flex items-center space-x-2">
                    <span className="text-white">SADOK</span>
                    <span className="text-blue-200">Екосистема</span>
                  </h1>
                  <p className="text-blue-100 text-sm max-w-xl font-medium leading-relaxed">
                    Професійна автоматизована система управління ЗДО України: Меню-розкладка, Облік майна, Контингент та Кадри, Складські процедури та Норми харчування.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-center min-w-[170px] shadow-inner">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-blue-200">Версія ПЗ</span>
                <span className="text-2xl font-black text-white my-0.5">v1.0.27</span>
                <span className="text-[10px] text-emerald-300 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Активна ліцензія</span>
                </span>
              </div>
            </div>
          </div>

          {/* TWO COLUMN GRID: DEVELOPER REQUISITES & SYSTEM INFO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* DEVELOPER REQUISITES CARD */}
            <div className="card-glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                    Інформація про розробника
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Офіційні контакти та авторські права
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Developer Name */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center space-x-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Автор / Розробник:</span>
                  </span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                    Osipov Eduard
                  </span>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span>E-mail:</span>
                  </span>
                  <a
                    href="mailto:edosipov@gmail.com"
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 text-xs"
                  >
                    <span>edosipov@gmail.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    <span>Телефон:</span>
                  </span>
                  <a
                    href="tel:0675694704"
                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 text-xs"
                  >
                    <span>+380 (67) 569-47-04</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Website */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-purple-500" />
                    <span>Веб-сайт:</span>
                  </span>
                  <a
                    href="https://osipix.pp.ua"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1 text-xs"
                  >
                    <span>osipix.pp.ua</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* TECHNICAL SPECS CARD */}
            <div className="card-glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                    Технічні специфікації системи
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Архітектура та збереження даних
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center space-x-2 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg">
                  <Database className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Ядро Бази Даних:</span>
                    <span>SQLite 3.51 (WASM + Local Persistence 1:1)</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg">
                  <Server className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Платформа компіляції:</span>
                    <span>Electron 33.2 + React 18 + TypeScript</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Автономна безпека:</span>
                    <span>100% Офлайн-робота без залежності від інтернету</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 font-medium flex items-center justify-center space-x-1">
                  <span>Розроблено з турботою про дитячі садки України</span>
                  <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
