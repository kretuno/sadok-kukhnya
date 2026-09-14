import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  KeyRound, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Delete, 
  ShieldCheck, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { 
  verifyDirectorPin, 
  setDirectorPin, 
  verifyStaffPin, 
  setStaffPin, 
  setCurrentPortalRole 
} from '../../services/portalSecurity';

interface PinEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: 'director' | 'staff';
  onSuccess: () => void;
}

export const PinEntryModal: React.FC<PinEntryModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  onSuccess
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'enter' | 'change'>('enter');

  // Change PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setActiveTab('enter');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setChangeSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const roleTitle = targetRole === 'director' ? 'Кабінет керівника' : 'Управління та персонал';
  const roleSubtitle = targetRole === 'director' 
    ? 'Аналітика, оперативний дашборд та звітність директора ЗДО' 
    : 'Робочі модулі: харчоблок, склад, майно, кадри та медкабінет';

  const handleNumClick = (digit: string) => {
    if (pin.length < 10) {
      setPin(prev => prev + digit);
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const handleSubmitPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      setErrorMsg('Будь ласка, введіть PIN-код');
      return;
    }

    const isValid = targetRole === 'director' 
      ? verifyDirectorPin(pin) 
      : verifyStaffPin(pin);

    if (isValid) {
      setCurrentPortalRole(targetRole);
      onSuccess();
      onClose();
    } else {
      setErrorMsg('Невірний PIN-код! Спробуйте ще раз або зверніться до адміністратора.');
      setPin('');
    }
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const isCurrentValid = targetRole === 'director'
      ? verifyDirectorPin(currentPin)
      : verifyStaffPin(currentPin);

    if (!isCurrentValid) {
      setErrorMsg('Поточний пароль введено невірно!');
      return;
    }

    if (newPin.trim().length < 3) {
      setErrorMsg('Новий PIN-код повинен містити щонайменше 3 символи!');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg('Нові PIN-коди не співпадають!');
      return;
    }

    const saved = targetRole === 'director'
      ? setDirectorPin(newPin)
      : setStaffPin(newPin);

    if (saved) {
      setChangeSuccess(true);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => {
        setChangeSuccess(false);
        setActiveTab('enter');
      }, 1500);
    } else {
      setErrorMsg('Не вдалося зберегти новий PIN-код.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-4 relative overflow-hidden text-slate-900 dark:text-white">
        {/* Background glow accent */}
        <div className={`absolute -right-20 -top-20 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none ${
          targetRole === 'director' ? 'bg-blue-600' : 'bg-emerald-600'
        }`} />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3.5 pr-8">
          <div className={`p-3 rounded-2xl text-white shadow-lg shrink-0 ${
            targetRole === 'director' 
              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/30' 
              : 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-500/30'
          }`}>
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Захищений розділ</span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
              {roleTitle}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              {roleSubtitle}
            </p>
          </div>
        </div>

        {/* Tabs: Enter vs Change */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setActiveTab('enter'); setErrorMsg(''); }}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'enter' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Ввести пароль
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('change'); setErrorMsg(''); }}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'change' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Змінити PIN
          </button>
        </div>

        {/* TAB 1: ENTER PIN */}
        {activeTab === 'enter' && (
          <form onSubmit={handleSubmitPin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Введіть цифровий PIN або пароль доступу:
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => { setPin(e.target.value); setErrorMsg(''); }}
                  placeholder="••••"
                  autoFocus
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-center text-xl font-mono tracking-widest font-black focus:outline-none focus:border-blue-500 transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center space-x-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* NumPad for touch devices / quick entry */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumClick(num)}
                  className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 font-mono font-black text-lg rounded-xl transition shadow-xs cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-500 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handleNumClick('0')}
                className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 font-mono font-black text-lg rounded-xl transition shadow-xs cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-500 font-bold text-sm rounded-xl transition flex items-center justify-center cursor-pointer"
                title="Стерти символ"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            {/* Hint for initial default PIN */}
            <div className="text-center">
              <span className="text-[11px] text-slate-400 font-medium">
                💡 За замовчуванням початковий код: <b className="text-slate-600 dark:text-slate-300">145</b>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition text-xs cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className={`flex-1 py-2.5 px-4 text-white font-black rounded-xl transition text-xs shadow-lg cursor-pointer flex items-center justify-center space-x-1.5 ${
                  targetRole === 'director'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/20'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>Увійти</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: CHANGE PIN */}
        {activeTab === 'change' && (
          <form onSubmit={handleChangePinSubmit} className="space-y-3 text-xs">
            {changeSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-300 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                <div className="font-bold">PIN-код успішно змінено!</div>
                <div className="text-[10px] text-slate-500">Повернення до форми входу…</div>
              </div>
            ) : (
              <>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Поточний PIN-код:
                  </label>
                  <input
                    type="password"
                    value={currentPin}
                    onChange={e => setCurrentPin(e.target.value)}
                    placeholder="Введіть старий PIN (за замовч. 145)"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Новий PIN-код:
                  </label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    placeholder="Мінімум 3 цифри або символи"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Підтвердіть новий PIN-код:
                  </label>
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value)}
                    placeholder="Повторіть новий PIN"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm"
                  />
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 font-bold flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('enter')}
                    className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-300"
                  >
                    Назад
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
                  >
                    Зберегти новий PIN
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
