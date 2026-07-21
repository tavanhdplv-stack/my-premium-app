'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative w-10 h-10 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all duration-300 shadow-sm hover:shadow-md"
    >
      <Sun
        className={`w-[18px] h-[18px] absolute transition-all duration-300 ${
          theme === 'dark' ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
        }`}
      />
      <Moon
        className={`w-[18px] h-[18px] absolute transition-all duration-300 ${
          theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        }`}
      />
    </button>
  );
}
