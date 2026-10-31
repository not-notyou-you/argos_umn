'use client';

import { Check, ChevronDown } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

type Option = { value: string; label: string };

/** Dropdown filter. Daftar <select> bawaan digambar browser, jadi tidak bisa mengikuti gaya situs. */
export function FilterSelect({ name, label, options, defaultValue = '', className = '' }: { name: string; label: string; options: Option[]; defaultValue?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(options.findIndex((o) => o.value === defaultValue), 0);

  useEffect(() => {
    if (!open) return;
    items.current[index]?.focus();
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open, index]);

  const pick = (value: string) => {
    setOpen(false);
    if (!input.current) return;
    input.current.value = value;
    input.current.form?.requestSubmit();
  };

  const onKey = (e: KeyboardEvent, i: number) => {
    const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: options.length - 1 }[e.key];
    if (next !== undefined) {
      e.preventDefault();
      items.current[(next + options.length) % options.length]?.focus();
    }
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    }
  };

  return (
    <span ref={root} className={`relative flex items-center border-l border-line ${className}`}>
      <input ref={input} type="hidden" name={name} defaultValue={defaultValue} />
      <button ref={trigger} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${options[index]?.label}`} onClick={() => setOpen(!open)} className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 px-3 text-sm font-semibold whitespace-nowrap text-heading">
        {options[index]?.label}
        <ChevronDown size={16} aria-hidden className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" aria-label={label} className="filter-menu absolute top-full right-0 z-40 mt-2 max-h-72 w-max min-w-full overflow-y-auto rounded-md bg-surface p-1.5 shadow-[0_16px_40px_rgb(0_0_0/0.22)] ring-1 ring-line">
          {options.map((option, i) => (
            <button
              key={option.value}
              ref={(el) => { items.current[i] = el; }}
              type="button"
              role="option"
              aria-selected={i === index}
              onClick={() => pick(option.value)}
              onKeyDown={(e) => onKey(e, i)}
              className={`flex min-h-10 w-full cursor-pointer items-center justify-between gap-6 rounded-sm px-3 text-left text-sm font-semibold transition-colors ${i === index ? 'bg-brand-orange text-ink' : 'text-brand-dark-gray hover:bg-surface-muted hover:text-heading focus-visible:bg-surface-muted'}`}
            >
              {option.label}
              {i === index && <Check size={16} aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
