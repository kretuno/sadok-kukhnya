import React from 'react';
import { SadokLogo } from './SadokLogo';
import {
  FileText,
  BookOpen,
  Utensils,
  Calendar,
  Package,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Database,
  Info,
  LayoutGrid
} from 'lucide-react';

interface HeaderNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  fontScale: number;
  setFontScale: (scale: number) => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  fontScale,
  setFontScale
}) => {
  const navItems = [
    { id: 'portal', label: 'Головне меню', icon: LayoutGrid, hotkey: 'Esc' },
    { id: 'menu_planner', label: 'Меню-розкладка', icon: Calendar, hotkey: 'F2' },
    { id: 'recipes', label: 'Картотека страв', icon: Utensils, hotkey: 'F3' },
    { id: 'products', label: 'Продукти та відходи', icon: BookOpen, hotkey: 'F4' },
    { id: 'warehouse', label: 'Склад і прихід', icon: Package, hotkey: 'F5' },
    { id: 'sanpin', label: 'Норми харчування', icon: BarChart3, hotkey: 'F6' },
    { id: 'reports', label: 'Звіти та ОСВ', icon: FileText, hotkey: 'F7' },
    { id: 'settings', label: 'Налаштування', icon: Settings, hotkey: 'F9' },
    { id: 'about', label: 'Про програму', icon: Info, hotkey: 'F1' },
  ];

  return (
    <header className="bg-slate-800 text-white dark:bg-slate-900 border-b border-slate-700 shadow-md no-print">
      {/* Top Delphi Menu Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900 dark:bg-slate-950 text-xs border-b border-slate-700/60">
        <div className="flex items-center space-x-6">
          <SadokLogo size="sm" subtitle="Кухня v1.0.16" />
          <nav className="flex space-x-4 text-slate-300">
            <button onClick={() => setActiveTab('portal')} className="text-amber-400 font-extrabold hover:text-amber-300 transition flex items-center space-x-1"><span>🏠 Головне меню</span></button>
            <button onClick={() => setActiveTab('menu_planner')} className="hover:text-white transition">Файл</button>
            <button onClick={() => setActiveTab('products')} className="hover:text-white transition">Довідники</button>
            <button onClick={() => setActiveTab('recipes')} className="hover:text-white transition">Страви</button>
            <button onClick={() => setActiveTab('menu_planner')} className="hover:text-white transition">Меню-вимога</button>
            <button onClick={() => setActiveTab('warehouse')} className="hover:text-white transition">Склад</button>
            <button onClick={() => setActiveTab('sanpin')} className="hover:text-white transition">Норми харчування</button>
            <button onClick={() => setActiveTab('reports')} className="hover:text-white transition">Звіти</button>
            <button onClick={() => setActiveTab('settings')} className="hover:text-white transition">Сервіс</button>
            <button onClick={() => setActiveTab('about')} className="hover:text-amber-300 font-bold transition">Про програму</button>
          </nav>
        </div>

        {/* System Controls */}
        <div className="flex items-center space-x-3 text-slate-300">
          <button
            onClick={() => setFontScale(fontScale === 1 ? 1.15 : (fontScale === 1.15 ? 0.9 : 1))}
            className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 text-[11px]"
            title="Масштаб шрифту"
          >
            A {fontScale > 1 ? '+' : (fontScale < 1 ? '-' : '')}
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title="Переключити тему (Світла / Темна)"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-300" />}
          </button>
        </div>
      </div>

      {/* Main Module Tabs */}
      <div className="flex items-center space-x-1 px-3 pt-2 bg-slate-800 dark:bg-slate-900">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-medium rounded-t-lg transition border-t border-x ${
                isActive
                  ? 'bg-slate-100 dark:bg-slate-950 text-blue-600 dark:text-blue-400 border-slate-300 dark:border-slate-800 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              <span className="text-[10px] opacity-60 bg-slate-700 dark:bg-slate-800 px-1 rounded ml-1">{item.hotkey}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
