const fs = require('fs');

let content = fs.readFileSync('app/components/OrderForm.tsx', 'utf8');

// 1. Remove cost from OrderItem
content = content.replace(/cost: number;\n/, '');

// 2. Remove cost from initial state / addItem / parseData
content = content.replace(/cost: 0,/g, '');

// 3. Remove shippingFee state
content = content.replace(/const \[shippingFee, setShippingFee\] = useState<string>\(''\);\n/, '');
content = content.replace(/setShippingFee\(''\);/g, '');
content = content.replace(/setShippingFee\(String\(d\.shippingFee \?\? ''\)\);\n/, '');

// 4. Remove cost from updateItem call and Stock mapping
content = content.replace(/cost: item\.costPrice \|\| 0,/g, '');

// 5. Remove financials calculations
content = content.replace(/const totalCost = items\.reduce[^;]+;/g, 'const totalCost = 0;');
content = content.replace(/const totalShipping = Number\(shippingFee\) \|\| 0;/g, 'const totalShipping = 0;');
content = content.replace(/const totalProfit = totalSales - totalCost - totalShipping;/g, 'const totalProfit = 0;');
content = content.replace(/const totalOutlay = totalCost \+ totalShipping;/g, 'const totalOutlay = 0;');

// 6. Update design tokens
content = content.replace(
  /const card = [^;]+;/,
  "const card = 'bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all duration-300';"
);
content = content.replace(
  /const pad = [^;]+;/,
  "const pad = 'p-6 sm:p-8 lg:p-10';"
);
content = content.replace(
  /const label = [^;]+;/,
  "const label = 'block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1';"
);
content = content.replace(
  /const field =[^;]+;/,
  "const field = 'w-full h-12 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 rounded-2xl px-4 text-[15px] font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400/70 outline-none transition-all duration-300 hover:bg-white/80 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-400/80 dark:focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/10 shadow-sm shadow-slate-100/50 dark:shadow-none';"
);
content = content.replace(
  /const sectionTitle = [^;]+;/,
  "const sectionTitle = 'flex items-center gap-3 text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-widest';"
);
content = content.replace(
  /const chip = [^;]+;/,
  "const chip = 'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm';"
);
content = content.replace(
  /const primaryBtn =[^;]+;/,
  "const primaryBtn = 'relative overflow-hidden inline-flex items-center justify-center gap-2 h-12 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white text-[15px] font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none';"
);
content = content.replace(
  /const ghostBtn =[^;]+;/,
  "const ghostBtn = 'inline-flex items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-[14px] font-bold hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm active:scale-[0.98] transition-all duration-300';"
);

// 7. Remove UI inputs for Cost and Shipping
content = content.replace(
  /<div>\s*<label className={label}>ຕົ້ນທຶນ<\/label>\s*<MoneyInput value={item\.cost} onChange={\(v\) => updateItem\(item\.id, 'cost', Number\(v\)\)} placeholder="0" className="font-semibold text-slate-700" \/>\s*<\/div>/g,
  ''
);

content = content.replace(
  /<MoneyInput value={item\.cost} onChange={\(v\) => updateItem\(item\.id, 'cost', Number\(v\)\)} placeholder="ຕົ້ນທຶນ" \/>/g,
  ''
);

content = content.replace(
  /<div>\s*<label className={label}>ຕົ້ນທຶນ<\/label>[\s\S]*?<\/div>/g,
  (match) => match.includes('ຕົ້ນທຶນ') ? '' : match
);


// 8. Remove itemProfit from UI
content = content.replace(
  /<div className="flex flex-col justify-end pb-3 sm:items-end">\s*<span className="text-\[10px\] font-bold text-slate-400 uppercase tracking-widest mb-1\.5">ກຳໄລ<\/span>\s*<span className={`text-base font-extrabold tabular-nums tracking-tight \${itemProfit > 0 \? 'text-emerald-600' : itemProfit < 0 \? 'text-rose-500' : 'text-slate-400'}`}>\s*\{itemProfit > 0 && '\+'\}\{formatNumber\(itemProfit\)\}\s*<\/span>\s*<\/div>/g,
  ''
);

content = content.replace(
  /const itemProfit = \(item\.price - item\.cost\) \* item\.qty;/g,
  ''
);

content = content.replace(
  /<span className="text-xs font-semibold text-slate-500">\s*ກຳໄລ: <span className={`font-extrabold tabular-nums \${itemProfit > 0 \? 'text-emerald-600' : itemProfit < 0 \? 'text-rose-500' : 'text-slate-400'}`}>\{formatNumber\(itemProfit\)\}<\/span>\s*<\/span>/g,
  ''
);

content = content.replace(
  /<div className="flex items-center justify-between pt-2 border-t border-slate-200\/70">\s*\{items\.length > 1 && \(\s*<button onClick={\(\) => removeItem\(item\.id\)} className="text-rose-500 hover:text-rose-600 text-xs font-bold">\s*ລຶບລາຍການ\s*<\/button>\s*\)\}\s*<\/div>/g,
  '<div className="flex items-center justify-end pt-2 border-t border-slate-200/70">{items.length > 1 && (<button onClick={() => removeItem(item.id)} className="text-rose-500 hover:text-rose-600 text-xs font-bold">ລຶບລາຍການ</button>)}</div>'
);

// 9. Remove Shipping Fee block
content = content.replace(
  /{\/\* Shipping fee \*\/}[\s\S]*?<\/div>\s*<\/section>/g,
  '</section>'
);

// 10. Update Right Sticky Ticket Profit Block
content = content.replace(
  /<div className="space-y-2\.5 mb-5 text-sm">[\s\S]*?<div className="border-t border-dashed border-slate-200 -mx-6 mb-5" \/>/g,
  `<div className="space-y-2.5 mb-5 text-sm">
  <div className="flex justify-between text-slate-500">
    <span className="font-bold text-slate-600">ຍອດຂາຍລວມ (Total Sales)</span>
    <span className="font-bold text-slate-900 text-lg tabular-nums">{formatNumber(totalSales)} ₭</span>
  </div>
</div>
<div className="border-t border-dashed border-slate-200 -mx-6 mb-5" />`
);

content = content.replace(
  /<div className={`rounded-2xl p-4 mb-5 border \${totalProfit[\s\S]*?<\/div>/,
  '' // Remove profit section entirely
);

// 11. Remove profit from mobile sticky action bar
content = content.replace(
  /<div className="flex-1 min-w-0">\s*<p className="text-\[10px\] font-bold text-slate-400 uppercase tracking-wider">ກຳໄລຄາດໝາຍ<\/p>\s*<p className={`text-lg font-extrabold tabular-nums truncate \${totalProfit >= 0 \? 'text-emerald-600' : 'text-rose-600'}`}>\s*\{totalProfit > 0 && '\+'\}\{formatNumber\(totalProfit\)\} ₭\s*<\/p>\s*<\/div>/g,
  `<div className="flex-1 min-w-0 text-center">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ຍອດຂາຍລວມ</p>
    <p className="text-xl font-extrabold tabular-nums text-slate-800">
      {formatNumber(totalSales)} ₭
    </p>
  </div>`
);

// 12. Fix grid cols in item rows
// Mobile grid
content = content.replace(
  /<div className="grid grid-cols-3 gap-2">/g,
  '<div className="grid grid-cols-2 gap-2">'
);
// Desktop grid
content = content.replace(
  /grid-cols-2 sm:grid-cols-4/g,
  'grid-cols-2 sm:grid-cols-2'
);

// Write to file
fs.writeFileSync('app/components/OrderForm.tsx', content, 'utf8');
console.log('Refactor complete!');
