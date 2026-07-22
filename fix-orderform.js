const fs = require('fs');

const file = 'c:/Users/Acer/OneDrive/Desktop/my-first-webapp/my-premium-app/app/components/OrderForm.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix constants
content = content.replace(
  /const card = [^;]+;/,
  "const card = 'bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-xl transition-colors';"
);
content = content.replace(
  /const label = [^;]+;/,
  "const label = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';"
);
content = content.replace(
  /const field =\s*'[^']+';/,
  "const field =\n  'w-full h-11 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-150 focus:bg-white dark:focus:bg-slate-900 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10';"
);
content = content.replace(
  /const sectionTitle = [^;]+;/,
  "const sectionTitle = 'flex items-center gap-2.5 text-[13px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide';"
);
content = content.replace(
  /const ghostBtn =\s*'[^']+';/,
  "const ghostBtn =\n  'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:border-rose-200 dark:hover:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none';"
);

// 2. Fix wrapper background
content = content.replace(
  /className="min-h-screen bg-slate-50 animate-\[fadeIn_0\.35s_ease-out\]"/g,
  'className="min-h-screen bg-slate-50 dark:bg-transparent animate-[fadeIn_0.35s_ease-out]"'
);

// 3. Fix text colors in headers
content = content.replace(
  /text-slate-900(?! dark:)/g,
  'text-slate-900 dark:text-white'
);
content = content.replace(
  /text-slate-800(?! dark:)/g,
  'text-slate-800 dark:text-slate-200'
);

// 4. Fix utility buttons
content = content.replace(
  /bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50/g,
  'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors'
);

// 5. Fix card backgrounds (if any stray bg-slate-50 in items/expenses)
content = content.replace(
  /bg-slate-50\/50 border border-slate-100(?! dark:)/g,
  'bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5'
);
content = content.replace(
  /bg-slate-50 border border-slate-100(?! dark:)/g,
  'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5'
);

// 6. Fix lines/dividers
content = content.replace(
  /bg-slate-100(?! dark:)/g,
  'bg-slate-100 dark:bg-slate-800'
);
content = content.replace(
  /border-slate-100(?! dark:)/g,
  'border-slate-100 dark:border-white/10'
);
content = content.replace(
  /border-slate-200(?! dark:)/g,
  'border-slate-200 dark:border-white/10'
);

fs.writeFileSync(file, content);
console.log('Fixed OrderForm dark mode styling');
