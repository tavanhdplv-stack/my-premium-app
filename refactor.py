import re

def refactor():
    with open('app/components/OrderForm.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update UI classes for a premium feel
    content = re.sub(
        r"const card = 'bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-white/8 shadow-sm dark:shadow-none';",
        "const card = 'bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all duration-300';",
        content
    )
    content = re.sub(
        r"const pad = 'p-5 sm:p-6 lg:p-7';",
        "const pad = 'p-6 sm:p-8 lg:p-10';",
        content
    )
    content = re.sub(
        r"const label = 'block text-\[11px\] font-bold text-slate-500 uppercase tracking-wider mb-1\.5';",
        "const label = 'block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1';",
        content
    )
    content = re.sub(
        r"const field =\s*'w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3\.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors duration-150 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10';",
        "const field = 'w-full h-12 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 rounded-2xl px-4 text-[15px] font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400/70 outline-none transition-all duration-300 hover:bg-white/80 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-400/80 dark:focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/10 shadow-sm shadow-slate-100/50 dark:shadow-none';",
        content
    )
    content = re.sub(
        r"const sectionTitle = 'flex items-center gap-2\.5 text-\[13px\] font-bold text-slate-800 uppercase tracking-wide';",
        "const sectionTitle = 'flex items-center gap-3 text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-widest';",
        content
    )
    content = re.sub(
        r"const chip = 'w-9 h-9 rounded-xl flex items-center justify-center shrink-0';",
        "const chip = 'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm';",
        content
    )
    content = re.sub(
        r"const primaryBtn =\s*'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-violet-600 text-white text-sm font-bold shadow-md shadow-violet-500/25 hover:bg-violet-700 active:scale-\[0\.98\] transition-all duration-150 disabled:opacity-60 disabled:shadow-none disabled:active:scale-100 motion-reduce:transition-none';",
        "const primaryBtn = 'relative overflow-hidden inline-flex items-center justify-center gap-2 h-12 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white text-[15px] font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none';",
        content
    )
    content = re.sub(
        r"const ghostBtn =\s*'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-\[0\.98\] transition-all duration-150 motion-reduce:transition-none';",
        "const ghostBtn = 'inline-flex items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-[14px] font-bold hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm active:scale-[0.98] transition-all duration-300';",
        content
    )

    # 2. Remove cost from interfaces and initial states
    # Note: we need to be very careful here.
    content = content.replace("cost: number;", "")
    content = content.replace("cost: 0,", "")
    content = content.replace("cost: item.costPrice || 0,", "")
    content = content.replace("cost: 0 ", "") # in addItem some spaces

    # 3. Remove shippingFee
    content = content.replace("const [shippingFee, setShippingFee] = useState<string>('');", "")
    content = content.replace("setShippingFee('');", "")
    content = content.replace("setShippingFee(String(d.shippingFee ?? ''));", "")

    # 4. Remove calculations
    content = content.replace("const totalCost = items.reduce((sum, item) => sum + (item.cost * item.qty), 0);", "const totalCost = 0;")
    content = content.replace("const totalShipping = Number(shippingFee) || 0;", "const totalShipping = 0;")
    content = content.replace("const totalProfit = totalSales - totalCost - totalShipping;", "const totalProfit = 0;")
    content = content.replace("const totalOutlay = totalCost + totalShipping;", "const totalOutlay = 0;")

    # 5. Remove shippingFee input block in desktop (using regex)
    content = re.sub(
        r"\{\s*/\*\s*Shipping fee\s*\*/\s*\}.*?<MoneyInput value=\{shippingFee\}[^>]*/>\s*</div>",
        "",
        content,
        flags=re.DOTALL
    )

    # 6. Remove 'ຕົ້ນທຶນ' inputs in the Items mapping
    content = re.sub(
        r"<div>\s*<label className=\{label\}>ຕົ້ນທຶນ</label>.*?</div>",
        "",
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r"<MoneyInput value=\{item\.cost\}.*?placeholder=\"ຕົ້ນທຶນ\" />",
        "",
        content,
        flags=re.DOTALL
    )

    # 7. Remove itemProfit references
    content = re.sub(r"const itemProfit = \(item\.price - item\.cost\) \* item\.qty;\s*", "", content)
    content = re.sub(
        r"<div className=\"flex flex-col justify-end pb-3 sm:items-end\">\s*<span className=\"text-\[10px\] font-bold text-slate-400 uppercase tracking-widest mb-1\.5\">ກຳໄລ</span>.*?</div>",
        "",
        content,
        flags=re.DOTALL
    )
    
    # 8. Mobile item rows - remove ກຳໄລ and update grid cols
    content = re.sub(
        r"<span className=\"text-xs font-semibold text-slate-500\">\s*ກຳໄລ:.*?</span>",
        "",
        content,
        flags=re.DOTALL
    )
    content = content.replace('grid-cols-2 sm:grid-cols-4', 'grid-cols-2 sm:grid-cols-2')
    content = content.replace('<div className="grid grid-cols-3 gap-2">', '<div className="grid grid-cols-2 gap-2">')

    # 9. In the summary ticket - remove all profit and outlay stuff
    content = re.sub(
        r"<div className=\"space-y-2\.5 mb-5 text-sm\">\s*<div className=\"flex justify-between text-slate-500\">\s*<span>ຍອດຂາຍລວມ</span>\s*<span className=\"font-bold text-slate-800 tabular-nums\">\{formatNumber\(totalSales\)\} ₭</span>\s*</div>\s*<div className=\"flex justify-between text-slate-500\">\s*<span>ຕົ້ນທຶນ \+ ສົ່ງ \+ ລາຍຈ່າຍ</span>\s*<span className=\"font-bold text-rose-500 tabular-nums\">-\{formatNumber\(totalOutlay\)\} ₭</span>\s*</div>\s*</div>\s*<div className=\"border-t border-dashed border-slate-200 -mx-6 mb-5\" />",
        """<div className="space-y-2.5 mb-5 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>ຍອດຂາຍລວມ (Total Sales)</span>
                      <span className="font-bold text-slate-900 text-xl tabular-nums">{formatNumber(totalSales)} ₭</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-slate-200 -mx-6 mb-5" />""",
        content
    )
    content = re.sub(
        r"<div className=\{`rounded-2xl p-4 mb-5 border \$\{totalProfit.*?</div>",
        "",
        content,
        flags=re.DOTALL
    )

    # 10. Update mobile bar
    content = re.sub(
        r"<div className=\"flex-1 min-w-0\">\s*<p className=\"text-\[10px\] font-bold text-slate-400 uppercase tracking-wider\">ກຳໄລຄາດໝາຍ</p>\s*<p className=\{`text-lg font-extrabold tabular-nums truncate \$\{totalProfit >= 0 \? 'text-emerald-600' : 'text-rose-600'\}`\}>\s*\{totalProfit > 0 && '\+'\}\{formatNumber\(totalProfit\)\} ₭\s*</p>\s*</div>",
        """<div className="flex-1 min-w-0 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ຍອດຂາຍລວມ</p>
                <p className="text-xl font-extrabold tabular-nums text-slate-800">
                  {formatNumber(totalSales)} ₭
                </p>
              </div>""",
        content
    )

    with open('app/components/OrderForm.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    refactor()
