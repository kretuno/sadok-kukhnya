import React, { Children, isValidElement, useDeferredValue, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

type NativeSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'multiple'>;

interface SearchableOption {
  value: string;
  label: string;
  disabled: boolean;
}

function extractOptions(children: React.ReactNode): SearchableOption[] {
  const options: SearchableOption[] = [];

  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === 'option') {
      const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
      options.push({
        value: String(props.value ?? ''),
        label: Children.toArray(props.children).join(''),
        disabled: Boolean(props.disabled),
      });
      return;
    }

    if (child.type === 'optgroup') {
      const props = child.props as React.OptgroupHTMLAttributes<HTMLOptGroupElement>;
      options.push(...extractOptions(props.children));
    }
  });

  return options;
}

function normalize(value: React.SelectHTMLAttributes<HTMLSelectElement>['value']): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value ?? '');
}

export function SearchableSelect({
  children,
  className = '',
  disabled,
  onBlur,
  onChange,
  onFocus,
  value,
  defaultValue,
  name,
  id,
  required,
  title,
  'aria-label': ariaLabel,
}: NativeSelectProps) {
  const options = useMemo(() => extractOptions(children), [children]);
  const controlledValue = value === undefined ? undefined : normalize(value);
  const [internalValue, setInternalValue] = useState(() => normalize(defaultValue));
  const currentValue = controlledValue ?? internalValue;
  const selected = options.find(option => option.value === currentValue);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimer = useRef<number | null>(null);
  const wrapperClassName = className
    .split(/\s+/)
    .filter(token => /(^|:)(w-|min-w-|max-w-|flex-|grow|shrink|basis-|self-)/.test(token))
    .join(' ');

  const filteredOptions = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase('uk-UA');
    if (!normalizedQuery) return options;
    return options.filter(option =>
      option.label.toLocaleLowerCase('uk-UA').startsWith(normalizedQuery)
    );
  }, [deferredQuery, options]);

  const choose = (option: SearchableOption) => {
    if (option.disabled) return;
    if (controlledValue === undefined) setInternalValue(option.value);
    setQuery('');
    setIsOpen(false);

    onChange?.({
      target: { value: option.value, name },
      currentTarget: { value: option.value, name },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  const open = () => {
    if (disabled) return;
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    setQuery('');
    setActiveIndex(0);
    setIsOpen(true);
  };

  const closeSoon = (event: React.FocusEvent<HTMLInputElement>) => {
    blurTimer.current = window.setTimeout(() => setIsOpen(false), 120);
    onBlur?.(event as unknown as React.FocusEvent<HTMLSelectElement>);
  };

  return (
    <div className={`relative min-w-0 ${wrapperClassName}`}>
      {name && <input type="hidden" name={name} value={currentValue} />}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-label={ariaLabel || title || name || 'Пошук у списку'}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          required={required}
          title={title}
          value={isOpen ? query : selected?.label ?? ''}
          placeholder="Почніть вводити назву…"
          onFocus={event => {
            open();
            onFocus?.(event as unknown as React.FocusEvent<HTMLSelectElement>);
          }}
          onClick={open}
          onBlur={closeSoon}
          onChange={event => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex(index => Math.min(index + 1, filteredOptions.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex(index => Math.max(index - 1, 0));
            } else if (event.key === 'Enter' && isOpen && filteredOptions[activeIndex]) {
              event.preventDefault();
              choose(filteredOptions[activeIndex]);
            } else if (event.key === 'Escape') {
              setQuery('');
              setIsOpen(false);
            }
          }}
          className={`${className} w-full pl-8 pr-8`}
        />
        <ChevronDown className={`pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div
          role="listbox"
          className="absolute z-[100] mt-1 max-h-64 w-full min-w-52 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
            <button
              key={`${option.value}-${index}`}
              type="button"
              role="option"
              aria-selected={option.value === currentValue}
              disabled={option.disabled}
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs transition ${
                index === activeIndex ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200' : 'text-slate-700 dark:text-slate-200'
              } ${option.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-50 dark:hover:bg-blue-950/70'}`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === currentValue && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
            </button>
          )) : (
            <div className="px-3 py-4 text-center text-xs text-slate-500">
              Нічого не знайдено
            </div>
          )}
        </div>
      )}
    </div>
  );
}
