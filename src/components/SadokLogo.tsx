import React from 'react';

interface SadokLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

export const SadokLogo: React.FC<SadokLogoProps> = ({
  size = 'sm',
  showText = true,
  subtitle,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-6 h-6 text-xs rounded-lg shadow-sm',
    md: 'w-9 h-9 text-base rounded-xl shadow-md',
    lg: 'w-16 h-16 text-3xl rounded-2xl shadow-xl border-2 border-white/30'
  };

  const textSizes = {
    sm: 'text-sm font-black',
    md: 'text-xl font-black',
    lg: 'text-3xl font-black'
  };

  return (
    <div className={`flex items-center space-x-2 font-black tracking-tight select-none ${className}`}>
      <div className={`bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-500 text-white font-extrabold flex items-center justify-center shrink-0 ${iconSizes[size]}`}>
        S
      </div>
      {showText && (
        <div className="flex items-baseline space-x-1.5">
          <span className={`text-blue-500 dark:text-blue-400 tracking-tight ${textSizes[size]}`}>
            SADOK
          </span>
          {subtitle && (
            <span className="text-slate-300 dark:text-slate-300 font-bold text-xs">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
