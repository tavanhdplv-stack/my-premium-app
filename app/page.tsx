'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import ThemeToggle from './components/ThemeToggle';
import OrderDashboard from './components/OrderDashboard';
import OrderForm from './components/OrderForm';
import OrderList from './components/OrderList';
import OrderStock from './components/OrderStock';
import OrderAgent from './components/OrderAgent';
import OrderWallet from './components/OrderWallet';
import OrderSettings from './components/OrderSettings';
import OrderNotes from './components/OrderNotes';

type TabType = 'dashboard' | 'add' | 'list' | 'stock' | 'agent' | 'wallet' | 'settings' | 'notes';

const navConfig: { id: TabType; label: string; icon: string }[] = [
  { id: 'add', label: 'ເພີ່ມອໍເດີໃໝ່', icon: 'add' },
  { id: 'dashboard', label: 'ໜ້າຫຼັກ', icon: 'dashboard' },
  { id: 'list', label: 'ລາຍການອໍເດີ', icon: 'list' },
  { id: 'stock', label: 'ສາງສິນຄ້າ', icon: 'stock' },
  { id: 'agent', label: 'ຕົວແທນຈຳໜ່າຍ', icon: 'agent' },
  { id: 'wallet', label: 'ກະເປົາເງິນ', icon: 'wallet' },
  { id: 'notes', label: 'ໂນ້ດ & ຂໍ້ຄວາມ', icon: 'notes' },
  { id: 'settings', label: 'ຕັ້ງຄ່າ', icon: 'settings' },
];

const Icon = ({ name, className }: { name: string; className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    dashboard: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    add: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    list: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
    stock: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
    agent: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    wallet: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    settings: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    notes: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
      </svg>
    ),
  };
  return <>{icons[name] || icons['dashboard']}</>;
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('add');
  const [orderCount, setOrderCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [preSelectedAgentId, setPreSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => setOrderCount(snapshot.size),
      () => {} // silently ignore errors in the nav badge count
    );
    return () => unsubscribe();
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSidebarOpen(false); // close mobile sidebar on tab change
    if (tab === 'add') setEditOrderId(null); // Clear edit ID when explicitly clicking 'Add'
  };

  const handleEditOrder = (id: string) => {
    setEditOrderId(id);
    setActiveTab('add');
  };

  // Bottom nav shows 5 most important tabs on mobile
  const bottomNavItems: { id: TabType; label: string; icon: string }[] = [
    { id: 'add', label: 'ເພີ່ມ', icon: 'add' },
    { id: 'dashboard', label: 'ໜ້າຫຼັກ', icon: 'dashboard' },
    { id: 'list', label: 'ລາຍການ', icon: 'list' },
    { id: 'stock', label: 'ສາງ', icon: 'stock' },
    { id: 'wallet', label: 'ເງິນ', icon: 'wallet' },
    { id: 'notes', label: 'ໂນ້ດ', icon: 'notes' },
  ];

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] dark:bg-[#030712] font-lao text-slate-800 dark:text-slate-100 flex overflow-hidden selection:bg-indigo-100 dark:selection:bg-indigo-900/50 selection:text-indigo-900 dark:selection:text-indigo-100 transition-colors duration-300">
      {/* Decorative Blurred Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-br from-indigo-200/40 to-purple-200/40 dark:from-indigo-600/15 dark:to-purple-600/10 blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-br from-blue-200/30 to-cyan-200/30 dark:from-blue-600/10 dark:to-cyan-600/8 blur-[80px]" />
        <div className="absolute top-[30%] left-[30%] w-[30vw] h-[30vw] rounded-full bg-gradient-to-br from-amber-200/20 to-rose-200/20 dark:from-amber-500/8 dark:to-rose-500/5 blur-[100px]" />
      </div>

      {/* ─── MOBILE OVERLAY BACKDROP ───────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── SIDEBAR ────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0
          ${sidebarExpanded ? 'w-[280px]' : 'w-[280px] lg:w-[88px]'}
          bg-white/90 dark:bg-slate-900/90 lg:bg-white/60 lg:dark:bg-slate-900/60
          backdrop-blur-2xl border-r border-white/80 dark:border-white/5
          shadow-[4px_0_24px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.3)] lg:shadow-[4px_0_24px_rgba(0,0,0,0.02)]
          flex flex-col z-40 transition-[width,transform] duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className={`py-8 transition-all duration-300 ${!sidebarExpanded ? 'px-8 lg:px-2 flex lg:justify-center' : 'px-8'}`}>
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 shrink-0 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white text-xl font-bold tracking-wider">T</span>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full" />
            </div>
            <div className={`whitespace-nowrap overflow-hidden transition-[width,opacity] duration-300 ${!sidebarExpanded ? 'lg:w-0 lg:opacity-0' : 'w-[150px] opacity-100'}`}>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                Tawan East
              </h1>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Premium Order System
              </p>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1 px-4 py-2 overflow-y-auto no-scrollbar overflow-x-hidden">
          <p className={`px-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 whitespace-nowrap transition-opacity duration-300 ${!sidebarExpanded ? 'lg:opacity-0' : 'opacity-100'}`}>
            ເມນູຫຼັກ
          </p>
          {navConfig.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                title={!sidebarExpanded ? item.label : undefined}
                className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 ease-out
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-600/25 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white hover:shadow-sm'
                  }
                  ${!sidebarExpanded ? 'lg:justify-center lg:px-0' : ''}`}
              >
                <Icon
                  name={item.icon}
                  className={`w-5 h-5 transition-transform duration-300 shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                />
                <span className={`text-[15px] font-medium tracking-wide whitespace-nowrap overflow-hidden transition-[width,opacity] duration-300 ${isActive ? 'font-semibold' : ''} ${!sidebarExpanded ? 'lg:w-0 lg:opacity-0' : 'lg:w-[130px] lg:opacity-100 text-left'}`}>
                  {item.label}
                </span>
                {item.id === 'list' && orderCount > 0 && (
                  <span
                    className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full transition-all duration-300 ${!sidebarExpanded ? 'lg:hidden' : ''} ${
                      isActive
                        ? 'bg-white/20 text-white border border-white/30'
                        : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-500/30'
                    }`}
                  >
                    {orderCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={`p-6 mt-auto transition-all duration-300 ${!sidebarExpanded ? 'lg:px-2 lg:py-6' : 'p-6'}`}>
          <div className={`flex items-center gap-3 p-3 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all cursor-pointer group ${!sidebarExpanded ? 'lg:justify-center' : ''}`} title="Admin Tawan">
            <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-bold">
                A
              </div>
            </div>
            <div className={`flex-1 min-w-0 overflow-hidden whitespace-nowrap transition-[width,opacity] duration-300 ${!sidebarExpanded ? 'lg:w-0 lg:opacity-0' : 'w-[120px] opacity-100'}`}>
              <p className="text-[14px] font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Admin Tawan
              </p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">Premium Package</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 min-w-0">
        {/* Header */}
        <header className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-b border-white/60 dark:border-white/5 px-4 sm:px-6 lg:px-10 py-4 lg:py-5 flex items-center justify-between z-20 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.05)] sticky top-0 transition-colors duration-300">
          {/* Hamburger button (visible on all screens now) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarOpen(true);
                } else {
                  setSidebarExpanded(!sidebarExpanded);
                }
              }}
              aria-label="ເປີດປິດເມນູ"
              className="w-10 h-10 rounded-xl bg-white/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm hover:shadow-md"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 transition-transform duration-300 ${!sidebarExpanded ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {navConfig.find((n) => n.id === activeTab)?.label}
              </h2>
              <p className="text-[13px] lg:text-[14px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium hidden sm:block">
                ພາບລວມ ແລະ ການຈັດການຂໍ້ມູນລ່າສຸດ — Tawan East Shop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <ThemeToggle />
            <button
              onClick={() => handleTabChange('add')}
              className="text-[13px] lg:text-[14px] font-semibold text-white px-3 lg:px-5 py-2 lg:py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="hidden sm:inline">ສ້າງອໍເດີໃໝ່</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-6 lg:p-10 overflow-y-auto pb-24 lg:pb-10">
          <div className="max-w-7xl mx-auto">
            <div
              key={activeTab}
              className="premium-card p-1 min-h-[500px] animate-subtle-fade"
            >
              <div className="bg-white/90 dark:bg-slate-900/60 rounded-[20px] p-3 sm:p-6 h-full shadow-inner shadow-slate-100/50 dark:shadow-none min-h-[500px] transition-colors duration-300">
                {activeTab === 'dashboard' && (
                  <OrderDashboard onViewAll={() => handleTabChange('list')} />
                )}
                {activeTab === 'add' && <OrderForm editId={editOrderId || undefined} preSelectedAgentId={preSelectedAgentId || undefined} onSuccess={() => { setEditOrderId(null); setPreSelectedAgentId(null); handleTabChange('list'); }} />}
                {activeTab === 'list' && <OrderList onEdit={handleEditOrder} />}
                {activeTab === 'stock' && <OrderStock />}
                {activeTab === 'agent' && <OrderAgent onCreateOrder={(agId) => { setPreSelectedAgentId(agId); handleTabChange('add'); }} onEdit={handleEditOrder} />}
                {activeTab === 'wallet' && <OrderWallet onEditOrder={handleEditOrder} />}
                {activeTab === 'notes' && <OrderNotes />}
                {activeTab === 'settings' && <OrderSettings />}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── MOBILE BOTTOM NAVIGATION ────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/8 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {bottomNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-xl bg-indigo-50 dark:bg-indigo-500/10" />
                )}
                <Icon name={item.icon} className="relative w-5 h-5" />
                <span className="relative text-[10px] font-semibold">{item.label}</span>
                {item.id === 'list' && orderCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                    {orderCount > 99 ? '99+' : orderCount}
                  </span>
                )}
              </button>
            );
          })}
          {/* More button — opens sidebar to access agent/settings */}
          <button
            onClick={() => setSidebarOpen(true)}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
              !bottomNavItems.find(i => i.id === activeTab)
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <span className="text-[10px] font-semibold">ເພີ່ມເຕີມ</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
