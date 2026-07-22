const fs = require('fs');

const dashFile = 'c:/Users/Acer/OneDrive/Desktop/my-first-webapp/my-premium-app/app/components/OrderDashboard.tsx';
let dashContent = fs.readFileSync(dashFile, 'utf8');

const lines = dashContent.split('\n');
const returnLineIndex = lines.findIndex(l => l.includes('animate-[fadeIn_0.35s_ease-out] space-y-6 lg:space-y-8 transition-opacity duration-500'));

if (returnLineIndex === -1) {
  console.error("Could not find the return line of OrderDashboard");
  process.exit(1);
}

// The '  return (' is exactly 1 line before the div
const returnIndex = returnLineIndex - 1;

const topLogic = lines.slice(0, returnIndex).join('\n') + '\n';

const newJsx = `  const lineData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'ຍອດຂາຍ (Sales)',
        data: chartData.sales,
        borderColor: '#5A67D8', // Indigo
        backgroundColor: 'rgba(90, 103, 216, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
      {
        label: 'ຕົ້ນທຶນ (Cost)',
        data: chartData.cost,
        borderColor: '#F6AD55', // Orange/Yellow
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
        fill: false,
      }
    ]
  };

  const barData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'ກຳໄລ (Profit)',
        data: chartData.profit,
        backgroundColor: '#4299E1', // Blue
        borderRadius: 8,
        barPercentage: 0.5,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false }, 
      tooltip: { 
        mode: 'index', 
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { family: 'sans-serif', size: 13 },
        bodyFont: { family: 'sans-serif', size: 13 },
        padding: 12,
        cornerRadius: 8,
      } 
    },
    scales: {
      x: { 
        grid: { display: false }, 
        ticks: { color: '#94a3b8', font: { size: 11 } },
        border: { display: false }
      },
      y: { 
        grid: { color: 'rgba(148, 163, 184, 0.1)', borderDash: [5, 5] }, 
        ticks: { 
          color: '#94a3b8', 
          font: { size: 11 },
          callback: (value) => (Number(value) >= 1000 ? (Number(value) / 1000) + 'k' : value)
        }, 
        border: { display: false } 
      }
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
  };

  return (
    <div className={\`animate-[fadeIn_0.35s_ease-out] space-y-6 transition-opacity duration-500 \${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}\`}>
      
      {/* Other Expenses Widget */}
      <OtherExpenses />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Charts) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Average Sales Analysis */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Average Sales Analysis</h3>
                <p className="text-xs text-slate-400">ภาพรวมยอดขายและต้นทุน</p>
              </div>
              <div className="flex gap-2">
                <select 
                  className="text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-1.5 text-slate-600 dark:text-slate-300 font-medium outline-none"
                  value={monthFilter || ''}
                  onChange={(e) => setQuickFilter(e.target.value)}
                >
                  <option value="">ທຸກເດືອນ (All Time)</option>
                  <option value={thisYm}>{thisYm} (ເດືອນນີ້)</option>
                  <option value={lastYm}>{lastYm} (ເດືອນກ່ອນ)</option>
                </select>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <Suspense fallback={<ChartFallback />}>
                <LineChartComponent data={lineData} options={chartOptions} />
              </Suspense>
            </div>
          </div>

          {/* Analysis (Bar Chart) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Profit Analysis</h3>
                <p className="text-xs text-slate-400">วิเคราะห์กำไรสุทธิ</p>
              </div>
            </div>
            <div className="h-[220px] w-full">
              <Suspense fallback={<ChartFallback />}>
                <BarChartComponent data={barData} options={chartOptions} />
              </Suspense>
            </div>
          </div>

        </div>

        {/* Right Column (Cards & Lists) */}
        <div className="flex flex-col gap-6">
          
          {/* Portfolio & Analysis Cards */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Portfolio */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Portfolio</h4>
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Total Balance</p>
                <div className="text-2xl font-black text-slate-800 dark:text-white truncate">
                  {totalWalletBalance.toLocaleString()} <span className="text-sm text-slate-400">₭</span>
                </div>
              </div>
            </div>

            {/* Analysis (Net Profit) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Analysis</h4>
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Net Profit</p>
                <div className="text-2xl font-black text-slate-800 dark:text-white truncate">
                  {stats.netProfit.toLocaleString()} <span className="text-sm text-slate-400">₭</span>
                </div>
              </div>
            </div>

          </div>

          {/* Account (Main Wallet) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Account</h4>
              <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">Main</span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <div>
                <p className="text-xs text-slate-400">W-COMP (ບໍລິສັດ)</p>
                <p className="text-xl font-black text-slate-800 dark:text-white">{getWalletBalance('W-COMP').toLocaleString()} ₭</p>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>

          {/* Data transactions (Recent Orders) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Data transactions</h4>
              <button onClick={onViewAll} className="text-xs text-indigo-500 hover:text-indigo-600 font-bold">View All</button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">ບໍ່ມີລາຍການຫຼ້າສຸດ</div>
              ) : (
                recentOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between group cursor-pointer" onClick={onViewAll}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-colors">
                        <span className="text-lg">📦</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{order.customerName}</p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {order.orderDate ? parseOrderDate(order.orderDate)?.day + '/' + parseOrderDate(order.orderDate)?.month + '/' + parseOrderDate(order.orderDate)?.year : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{(order.price || 0).toLocaleString()} ₭</p>
                      <p className="text-[11px] text-slate-400">Sub {order.id.slice(0,4)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button onClick={onViewAll} className="w-full mt-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[13px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
              Discover More
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(dashFile, topLogic + newJsx);
console.log('OrderDashboard patched with premium UI successfully');
