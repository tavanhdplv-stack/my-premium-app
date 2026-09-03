'use client';

import type { Wallet } from '../types';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { BaseModal } from './BaseModal';

interface ExpenseTransaction {
  id: string;
  note: string;
  amount: number;
  wallet_id: string;
  date: string;
  type: string;
}

export default function OtherExpenses({ onSaved }: { onSaved?: () => void }) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  
  // Main form states
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [wallet_id, setWalletId] = useState('');
  const [loading, setLoading] = useState(false);
  
  // History Modal
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ExpenseTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Edit Expense Dialog
  const [editingExpense, setEditingExpense] = useState<ExpenseTransaction | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editWallet, setEditWallet] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete Confirm Modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Temporary toast inside the component
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  const fetchWallets = async () => {
    const { data } = await supabase.from('wallets').select('*');
    if (data) {
      const w: Wallet[] = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.type
      }));
      setWallets(w);
      if (w.length > 0 && !wallet_id) {
        const comp = w.find((x: any) => x.type === 'W-COMP');
        setWalletId(comp ? comp.id : w[0].id);
      }
    }
  };

  const fetchHistory = async () => {
    setHistoryError(null);
    try {
      const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (error) throw error;
      if (data) {
        const h: ExpenseTransaction[] = [];
        data.forEach((d: any) => {
          const noteText = d.notes || d.note || '';
          const noteLower = noteText.toLowerCase();
          const isWithdrawal = noteLower.includes('ປັນຜົນ') || noteLower.includes('ปันผล') || noteLower.includes('ຖອນ') || noteLower.includes('ถอน') || noteLower.includes('เบิก') || noteLower.includes('หุ้นส่วน') || noteLower.includes('ຮຸ້ນส่วน');
          // Stock purchases are COGS (ຕົ້ນທຶນສິນຄ້າ), not operating expenses — exclude from this list
          const isStockPurchase = noteText.includes('#STOCK#') || noteText.startsWith('ຊື້ສິນຄ້າເຂົ້າສາງ');
          
          if (d.type === 'expense' && !noteText.startsWith('Order #') && !isWithdrawal && !isStockPurchase) {
            h.push({
              id: d.id,
              note: noteText,
              amount: Number(d.amount) || 0,
              wallet_id: d.wallet_id,
              date: d.date,
              type: d.type
            });
          }
        });
        setHistory(h);
      }
    } catch (err: any) {
      setHistoryError('ບໍ່ສາມາດໂຫຼດຂໍ້ມູນໄດ້: ' + err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
    fetchHistory();

    const channel = supabase.channel('other_expenses_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, fetchWallets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchHistory)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!name || !amount || !wallet_id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        type: 'expense',
        notes: name,
        amount: Number(amount),
        wallet_id: wallet_id,
        date: new Date().toISOString()
      });
      if (error) throw error;
      setName('');
      setAmount('');
      fetchHistory(); // <-- Explicitly fetch to update UI instantly
      if (onSaved) onSaved();
      showToast('ບັນທຶກສຳເລັດ', 'success');
    } catch (error: any) {
      console.error(error);
      showToast('ບັນທຶກບໍ່ສຳເລັດ: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpen = (item: ExpenseTransaction) => {
    setEditingExpense(item);
    setEditName(item.note);
    setEditAmount(String(item.amount));
    setEditWallet(item.wallet_id);
    // Format date for input datetime-local
    try {
      const d = new Date(item.date);
      // yyyy-MM-ddThh:mm
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setEditDate(formatted);
    } catch {
      setEditDate('');
    }
  };

  const handleEditSave = async () => {
    if (!editingExpense) return;
    if (!editName || !editAmount || !editWallet || !editDate) {
      showToast('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ', 'error');
      return;
    }
    setEditLoading(true);
    try {
      const { error } = await supabase.from('transactions').update({
        notes: editName,
        amount: Number(editAmount.replace(/,/g, '')),
        wallet_id: editWallet,
        date: new Date(editDate).toISOString()
      }).eq('id', editingExpense.id);
      
      if (error) throw error;
      
      setEditingExpense(null);
      fetchHistory(); // <-- Explicitly fetch
      showToast('ແກ້ໄຂສຳເລັດແລ້ວ ✅', 'success');
      if (onSaved) onSaved();
    } catch (e: any) {
      console.error(e);
      showToast('ເກີດຂໍ້ຜິດພາດ: ' + e.message, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', deleteConfirmId);
      if (error) throw error;
      setDeleteConfirmId(null);
      fetchHistory(); // <-- Explicitly fetch
      showToast('ລຶບລາຍການສຳເລັດ 🗑️', 'success');
      if (onSaved) onSaved();
    } catch (e: any) {
      console.error(e);
      showToast('ບໍ່ສາມາດລຶບໄດ້: ' + e.message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const field = "w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-[16px] focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 outline-none transition-all";
  const label = "block text-[11px] font-bold text-slate-500 mb-1.5";
  const modalField = "w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[16px] focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all";

  return (
    <>
      <div className="bg-white dark:bg-slate-900/50 rounded-[24px] p-4 sm:p-5 border border-slate-200/80 dark:border-white/5 shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center gap-5 relative">
        
        {toast && (
          <div className={`absolute -top-12 right-0 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg animate-bounce ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
            {toast.msg}
          </div>
        )}

        {/* Left: Icon & Title */}
        <div className="flex items-center gap-4 shrink-0 w-full lg:w-auto">
          <div className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-[#FF7A50] to-[#FF4B5C] flex items-center justify-center shadow-lg shadow-orange-500/30 text-white">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
          </div>
          <div>
            <h2 className="text-[16px] font-extrabold text-[#1F2937] dark:text-slate-100 leading-tight">ບັນທຶກລາຍຈ່າຍອື່ນໆ</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">ຄ່າກ່ອງ, ຍິງແອດ</p>
          </div>
        </div>

        <div className="hidden lg:block w-px h-12 bg-slate-100 dark:bg-white/10 mx-2" />

        {/* Center: Inputs */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
          <div className="flex-1 min-w-[180px]">
            <label className={label}>ຊື່ລາຍຈ່າຍ</label>
            <input type="text" placeholder="ເຊັ່ນ: ຄ່າກ່ອງ" value={name} onChange={e => setName(e.target.value)} className={field} />
          </div>
          <div className="w-full md:w-[150px]">
            <label className={label}>ຈຳນວນເງິນ (₭)</label>
            <input 
              type="text" 
              inputMode="decimal"
              placeholder="0" 
              value={
                (() => {
                  if (amount === null || amount === undefined || amount === '') return '';
                  const str = String(amount);
                  const parts = str.split('.');
                  const intPart = parts[0].replace(/[^0-9-]/g, '');
                  const decPart = parts.length > 1 ? '.' + parts[1].replace(/[^0-9]/g, '') : '';
                  let formattedInt = intPart;
                  if (intPart !== '' && intPart !== '-') {
                    formattedInt = BigInt(intPart).toLocaleString('en-US');
                  }
                  return formattedInt + decPart;
                })()
              } 
              onChange={e => {
                const raw = e.target.value.replace(/,/g, '');
                if (raw === '' || raw === '-') {
                  setAmount(raw);
                } else if (/^-?\d*\.?\d*$/.test(raw)) {
                  setAmount(raw);
                }
              }} 
              className={field} 
            />
          </div>
          <div className="w-full md:w-[200px]">
            <label className={label}>ຫັກຈາກກະເປົາ</label>
            <div className="relative">
              <select value={wallet_id} onChange={e => setWalletId(e.target.value)} className={`${field} appearance-none pr-10 font-bold text-violet-700 dark:text-violet-400`}>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <svg className="w-4 h-4 text-slate-400 absolute right-4 top-[14px] pointer-events-none" viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </div>
          </div>
        </div>

        {/* Right: Buttons */}
        <div className="flex gap-2 shrink-0 w-full lg:w-auto mt-2 lg:mt-0 lg:pt-5">
          <button 
            onClick={handleSave} 
            disabled={!name || !amount || !wallet_id || loading}
            className="flex-1 lg:flex-none h-11 px-7 rounded-xl bg-gradient-to-r from-[#FF7A50] to-[#FF4B5C] hover:opacity-90 active:scale-95 transition-all text-white font-bold text-sm shadow-md shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            ບັນທຶກ
          </button>
          
          <button 
            onClick={() => setShowHistory(true)}
            className="h-11 px-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all text-[#4B5563] dark:text-slate-300 font-bold text-sm flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ປະຫວັດບິນ
          </button>
        </div>
      </div>

      {/* ── Expenses Dashboard ── */}
      <div className="space-y-4 animate-[fadeIn_0.4s_ease-out]">
        <h3 className="text-[18px] font-bold text-slate-800 dark:text-slate-100 px-1">ພາບລວມລາຍຈ່າຍ</h3>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            
            let todayTotal = 0;
            let monthTotal = 0;
            let allTotal = 0;
            
            history.forEach(item => {
              const d = new Date(item.date);
              if (d >= today) todayTotal += item.amount;
              if (d >= firstDayOfMonth) monthTotal += item.amount;
              allTotal += item.amount;
            });
            
            return (
              <>
                {/* Today */}
                <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
                  <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 dark:opacity-20 pointer-events-none">
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full text-rose-500">
                      <path d="M0 40 Q 20 20, 40 30 T 70 10 T 100 5 L 100 40 Z" fill="currentColor" stroke="none" />
                      <path d="M0 40 Q 20 20, 40 30 T 70 10 T 100 5" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[10px] bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-rose-600 dark:text-rose-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">ມື້ນີ້</span>
                    </div>
                  </div>
                  <div className="relative z-10 mt-3">
                    <span className="text-[26px] font-black text-slate-800 dark:text-white tabular-nums tracking-tight block leading-none">
                      ₭ {todayTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* This Month */}
                <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
                  <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 dark:opacity-20 pointer-events-none">
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full text-orange-500">
                      <path d="M0 40 Q 15 35, 30 20 T 60 25 T 100 0 L 100 40 Z" fill="currentColor" stroke="none" />
                      <path d="M0 40 Q 15 35, 30 20 T 60 25 T 100 0" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[10px] bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-orange-600 dark:text-orange-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                      </div>
                      <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">ເດືອນນີ້</span>
                    </div>
                  </div>
                  <div className="relative z-10 mt-3">
                    <span className="text-[26px] font-black text-slate-800 dark:text-white tabular-nums tracking-tight block leading-none">
                      ₭ {monthTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* All Time */}
                <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
                  <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 dark:opacity-20 pointer-events-none">
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full text-violet-500">
                      <path d="M0 40 Q 25 25, 50 30 T 80 15 T 100 10 L 100 40 Z" fill="currentColor" stroke="none" />
                      <path d="M0 40 Q 25 25, 50 30 T 80 15 T 100 10" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[10px] bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-violet-600 dark:text-violet-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>
                      </div>
                      <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">ລວມທັງໝົດ</span>
                    </div>
                  </div>
                  <div className="relative z-10 mt-3">
                    <span className="text-[26px] font-black text-slate-800 dark:text-white tabular-nums tracking-tight block leading-none">
                      ₭ {allTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Recent Expenses List (Top 5) */}
        <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 sm:p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">ລາຍການຫຼ້າສຸດ</h3>
            <button 
              onClick={() => setShowHistory(true)}
              className="text-[13px] font-bold text-orange-500 hover:text-orange-600 dark:text-orange-400"
            >
              ເບິ່ງທັງໝົດ &rarr;
            </button>
          </div>
          
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                ຍັງບໍ່ມີລາຍການລາຍຈ່າຍ
              </div>
            ) : (
              history.slice(0, 5).map(item => {
                const w = wallets.find(x => x.id === item.wallet_id);
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100 text-[14px]">{item.note}</div>
                        <div className="text-[12px] text-slate-400 mt-0.5">
                          {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • 
                          <span className="text-violet-500 dark:text-violet-400 ml-1">{w?.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="font-extrabold text-rose-500 tabular-nums text-[15px]">
                      -{item.amount.toLocaleString()} ₭
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ══ History Modal ══ */}
      {showHistory && (
        <BaseModal
          isOpen
          onClose={() => setShowHistory(false)}
          maxWidth="max-w-3xl"
          width="w-[96%] md:w-full"
          bodyClassName="p-0 bg-slate-50 dark:bg-slate-900"
          title={
            <div className="flex items-center gap-2 text-slate-800 dark:text-white">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-[#FF7A50]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xl font-bold">ປະຫວັດລາຍຈ່າຍອື່ນໆ</span>
            </div>
          }
        >
          <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-4 border-[#FF7A50]/20 border-t-[#FF7A50] rounded-full animate-spin" />
                <p className="text-slate-500 font-medium">ກຳລັງໂຫຼດຂໍ້ມູນ...</p>
              </div>
            ) : historyError ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <p className="text-slate-500 font-medium">{historyError}</p>
                <button onClick={fetchHistory} className="px-6 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold transition-colors">
                  ລອງໃໝ່
                </button>
              </div>
            ) : history.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-4 animate-[fadeIn_0.3s_ease-out]">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <span className="text-5xl">📄</span>
                </div>
                <div className="text-center">
                  <h4 className="text-lg font-bold text-slate-700 dark:text-slate-200">ຍັງບໍ່ມີປະຫວັດລາຍຈ່າຍ</h4>
                  <p className="text-slate-400 text-sm mt-1">ລາຍການຄ່າໃຊ້จ่ายອື່ນໆຈະສະແດງຢູ່ບ່ອນນີ້</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(item => {
                  const w = wallets.find(x => x.id === item.wallet_id);
                  return (
                    <div 
                      key={item.id} 
                      className="group bg-white dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex gap-4 items-start sm:items-center">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 hidden sm:flex">
                          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
                        </div>
                        <div>
                          <div className="font-extrabold text-base text-slate-800 dark:text-slate-100">{item.note}</div>
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                              {new Date(item.date).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-violet-600 dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-md">
                              กระเป๋า: {w?.name || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-0 border-slate-100 dark:border-slate-700 pt-3 sm:pt-0">
                        <span className="font-extrabold text-rose-600 dark:text-rose-400 text-lg tabular-nums">
                          -{item.amount.toLocaleString()} ₭
                        </span>
                        
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => handleEditOpen(item)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700/50 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                            title="ແກ້ໄຂ"
                          >
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700/50 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="ລຶບ"
                          >
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </BaseModal>
      )}

      {/* ══ Edit Expense Dialog ══ */}
      {editingExpense && (
        <BaseModal
          isOpen
          onClose={() => setEditingExpense(null)}
          maxWidth="max-w-md"
          width="w-[96%] md:w-full"
          title={<h3 className="text-xl font-bold text-slate-800 dark:text-white">✏️ ແກ້ໄຂລາຍການ</h3>}
          bodyClassName="p-6 bg-white dark:bg-slate-900"
        >
          <div className="space-y-4">
            <div>
              <label className={label}>ชื่อรายการ / หมายเหตุ</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className={modalField} />
            </div>
            
            <div>
              <label className={label}>จำนวนเงิน</label>
              <input 
                type="text" 
                inputMode="decimal"
                value={editAmount} 
                onChange={e => {
                  const raw = e.target.value.replace(/,/g, '');
                  if (raw === '' || raw === '-') setEditAmount(raw);
                  else if (/^-?\d*\.?\d*$/.test(raw)) setEditAmount(raw);
                }} 
                className={modalField} 
              />
            </div>

            <div>
              <label className={label}>วันที่</label>
              <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} className={modalField} />
            </div>

            <div>
              <label className={label}>หักจากกระเป๋า</label>
              <select value={editWallet} onChange={e => setEditWallet(e.target.value)} className={modalField}>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingExpense(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                className="flex-1 py-3 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {editLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </BaseModal>
      )}

      {/* ══ Delete Confirm Modal ══ */}
      {deleteConfirmId && (
        <BaseModal
          isOpen
          onClose={() => setDeleteConfirmId(null)}
          title={<h3 className="text-xl font-bold text-slate-900 dark:text-white">🗑️ ยืนยันการลบ</h3>}
          maxWidth="max-w-sm"
          width="w-[92%] md:w-full"
          bodyClassName="p-6 bg-white dark:bg-slate-900"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
              คุณต้องการลบรายการนี้ใช่หรือไม่? <br/> <span className="text-xs text-slate-400 mt-1 block">(เงินจะถูกคืนเข้ากระเป๋าและไม่สามารถกู้คืนได้)</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center disabled:opacity-50"
            >
               {deleteLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'ลบรายการ'}
            </button>
          </div>
        </BaseModal>
      )}
    </>
  );
}
