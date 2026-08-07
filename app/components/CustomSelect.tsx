'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

export type OptionType = {
  value: string;
  label: string;
};

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | OptionType)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'ເລືອກ...',
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize options to OptionType array
  const normalizedOptions: OptionType[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 flex items-center justify-between px-4 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/70 dark:border-white/10 rounded-[18px] text-sm text-left transition-all duration-200 focus:outline-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white dark:hover:bg-slate-800/90'
        } ${
          isOpen
            ? 'bg-white dark:bg-slate-800/90 border-teal-400 dark:border-teal-500 shadow-[0_0_0_4px_rgba(20,184,166,0.12)]'
            : 'text-slate-800 dark:text-slate-100'
        } ${className}`}
      >
        <span className={`truncate ${!selectedOption ? 'text-slate-400/70' : 'font-semibold'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-300 ${
            isOpen ? 'rotate-180 text-teal-500' : 'text-slate-400'
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 w-full mt-2 py-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.12)] rounded-[18px] max-h-60 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-600"
          >
            {normalizedOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">ບໍ່ມີຂໍ້ມູນ</div>
            ) : (
              normalizedOptions.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? 'bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 ml-auto text-teal-500 shrink-0" />}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
