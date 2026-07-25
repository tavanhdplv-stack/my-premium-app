'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/app/lib/supabase';
import { BaseModal } from './BaseModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Wallet {
  id: string;
  name: string;
  type: 'W-COMP' | 'partner';
  share_percent?: number;
  createdAt?: string;
}

interface Transaction {
  id: string;
  wallet_id: string;
  type: 'income' | 'expense' | 'profit_split';
  amount: number;
  notes: string;
  date: string;
  partner_split_id?: string;
}

interface NormalizedOrder {
  id: string;
  customer_name: string;
  status: string;
  wallet_id: string;
  payment_method: string;
  deposit: number;
  total_sales: number;
  total_cost: number;
  shipping_cost: number;
  total_expenses: number;
  total_profit: number;
  order_date: string;
  created_at: string;
  items: any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ymOf(dateStr?: string): string | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}/.test(s)) return s.substring(0, 7);
  const p = s.split('/');
  if (p.length === 3) {
    const [, m, y] = p;
    if (y && m) return `${y}-${String(m).padStart(2, '0')}`;
  }
  return null;
}

function fmt(n: number) {
  if (!n && n !== 0) return '0';
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

// ─── Does an order belong to this wallet? ────────────────────────────────────
function orderBelongsTo(wallet: Wallet, oWalletId: string): boolean {
  if (wallet.type === 'W-COMP') {
    return !oWalletId || oWalletId === '' || oWalletId === 'W-COMP' ||
      oWalletId === wallet.name ||
      oWalletId.includes('ບໍລິສັດ') ||
      oWalletId.includes('BCEL') ||
      oWalletId.includes('W-COMP');
  }
  const clean = (wallet.name || '').split(/[(\s]/)[0];
  return oWalletId === wallet.name || (!!clean && oWalletId.includes(clean));
}

// ─── Income already received from an order ───────────────────────────────────
function orderIncome(o: NormalizedOrder): number {
  if (o.payment_method === 'ຈ່າຍແລ້ວ') return o.total_sales;
  if (o.status === 'ໄດ້ຮັບເງິນແລ້ວ' || o.status === 'ປິດບິນແລ້ວ') return o.total_sales;
  // For all other statuses: only deposit received
  return o.deposit;
}

// ─── Main component ───────────────────────────────────────────────────────────
interface OrderWalletProps {
  onEditOrder?: (orderId: string) => void;
}

export default function OrderWallet({ onEditOrder }: OrderWalletProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<NormalizedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));

  // Modals
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [showTransModal, setShowTransModal] = useState<{ type: 'income' | 'expense'; wallet_id: string } | null>(null);
  const [showStatement, setShowStatement] = useState<Wallet | null>(null);
  const [showProfitSplit, setShowProfitSplit] = useState(false);
  const [editTx, setEditTx] = useState<{ id: string, amount: number } | null>(null);
  const [deleteTx, setDeleteTx] = useState<{ id: string } | null>(null);

  // Form
  const [newWalletName, setNewWalletName] = useState('');
  const [transAmount, setTransAmount] = useState('');
  const [transNote, setTransNote] = useState('');
  const [isProfitSplit, setIsProfitSplit] = useState(false);
  const [splitPartnerId, setSplitPartnerId] = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchWallets = useCallback(async () => {
    const { data } = await supabase.from('wallets').select('*');
    if (!data) return;
    const list: Wallet[] = data.map((d: any) => ({
      id: d.id, name: d.name, type: d.type,
      share_percent: d.share_percent ?? 50,
      createdAt: d.created_at,
    }));
    if (list.length === 0) {
      await supabase.from('wallets').insert({
        id: 'W-COMP', name: 'ກະເປົາບໍລິສັດ', type: 'W-COMP',
        share_percent: 100, created_at: new Date().toISOString(),
      });
    } else {
      list.sort((a, b) => {
        if (a.type === 'W-COMP') return -1;
        if (b.type === 'W-COMP') return 1;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });
      setWallets(list);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (!data) return;
    setTransactions(data.map((d: any) => ({
      id: d.id,
      wallet_id: d.wallet_id,
      type: d.type,
      amount: Number(d.amount) || 0,
      notes: d.notes || d.note || '',
      date: d.date || d.created_at || new Date().toISOString(),
      partner_split_id: d.partner_split_id || d.category,
    })));
  }, []);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (!data) return;
    setOrders(data.map((d: any) => ({
      id: d.id,
      customer_name: d.customer_name || 'ລູກຄ້າ',
      status: d.status || '',
      wallet_id: d.wallet || d.wallet_id || '',   // DB field is 'wallet'
      payment_method: d.payment_method || 'COD',
      deposit: Number(d.deposit) || Number(d.transfer_amount) || 0,
      total_sales: Number(d.total_sales) || Number(d.price) || 0,
      total_cost: Number(d.total_cost) || 0,
      shipping_cost: Number(d.shipping_fee) || Number(d.shipping_cost) || 0,
      total_expenses: Number(d.total_expenses) || 0,
      total_profit: Number(d.total_profit) || 0,
      order_date: d.order_date || d.created_at || '',
      created_at: d.created_at || d.order_date || '',
      items: Array.isArray(d.items) ? d.items : [],
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWallets(); fetchTransactions(); fetchOrders();
    const ch = supabase.channel('wallet_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, fetchWallets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchTransactions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchWallets, fetchTransactions, fetchOrders]);

  // ── Wallet stats (all-time balance + monthly in/out) ─────────────────────
  function getWalletStats(wallet: Wallet, month: string) {
    let bal = 0, inAmt = 0, outAmt = 0, cap = 0;

    // From manual transactions
    transactions.forEach(t => {
      if (t.wallet_id !== wallet.id) return;
      const tYm = ymOf(t.date);
      const pastOrCurrent = month === 'all' || (tYm && tYm <= month);
      const isCurrent = month === 'all' || tYm === month;
      if (t.type === 'income') {
        if (pastOrCurrent) bal += t.amount;
        if (isCurrent) { inAmt += t.amount; if (!t.notes?.includes('ຄືນທຶນ')) cap += t.amount; }
      } else {
        if (pastOrCurrent) bal -= t.amount;
        if (isCurrent) outAmt += t.amount;
      }
    });

    // From orders
    orders.forEach(o => {
      if (o.status === 'ຍົກເລີກອໍເດີ') return;
      if (!orderBelongsTo(wallet, o.wallet_id)) return;
      const income = orderIncome(o);
      const cost = o.total_cost + o.shipping_cost + o.total_expenses;
      const oYm = ymOf(o.created_at || o.order_date);
      const pastOrCurrent = month === 'all' || (oYm && oYm <= month);
      const isCurrent = month === 'all' || oYm === month;
      if (pastOrCurrent) { bal += income; bal -= cost; }
      if (isCurrent) { inAmt += income; outAmt += cost; }
    });

    return { bal, in: inAmt, out: outAmt, capital: cap };
  }

  const totalBalance = useMemo(() =>
    wallets.reduce((sum, w) => sum + getWalletStats(w, 'all').bal, 0),
    [wallets, transactions, orders]  // eslint-disable-line
  );

  const totalProfit = useMemo(() =>
    orders.filter(o => o.status !== 'ຍົກເລີກອໍເດີ').reduce((s, o) => s + o.total_profit, 0),
    [orders]);

  const totalExpenses = useMemo(() =>
    transactions.filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0),
    [transactions]);

  const totalDividends = useMemo(() =>
    transactions.filter(t => t.type === 'profit_split')
      .reduce((s, t) => s + t.amount, 0),
    [transactions]);

  const netProfit = totalProfit - totalExpenses;

  // ── Statement rows for a wallet ───────────────────────────────────────────
  function buildStatement(wallet: Wallet) {
    const rows: any[] = [];

    // Manual transactions
    transactions
      .filter(t => t.wallet_id === wallet.id)
      .forEach(t => {
        let detailText = t.notes || (t.type === 'income' ? 'ເຕີມທຶນ' : 'ຖອນ');
        if (t.type === 'profit_split' && t.partner_split_id) {
          const partner = wallets.find(w => w.id === t.partner_split_id);
          if (partner) {
            detailText = `ເບີກໃຫ້: ${partner.name}${t.notes ? ` (${t.notes})` : ''}`;
          }
        }

        rows.push({
          id: `t-${t.id}`,
          date: new Date(t.date),
          kind: t.type,
          label: t.type === 'income' ? 'ຮັບເຂົ້າ / ເຕີມທຶນ'
            : t.type === 'profit_split' ? 'ປັນຜົນຮຸ້ນສ່ວນ'
            : 'ຄ່າໃຊ້ຈ່າຍ / ຖອນ',
          labelColor: t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400 font-bold'
            : t.type === 'profit_split' ? 'text-amber-600 dark:text-amber-400 font-bold'
            : 'text-slate-600 dark:text-slate-400',
          detail: detailText,
          subDetail: null,
          badges: [],
          inAmt: t.type === 'income' ? t.amount : 0,
          outAmt: t.type !== 'income' ? t.amount : 0,
          depositAmt: 0,
          rawId: t.id,
          isOrder: false,
        });
      });

    // Orders
    orders.forEach(o => {
      if (o.status === 'ຍົກເລີກອໍເດີ') return;
      if (!orderBelongsTo(wallet, o.wallet_id)) return;

      const income = orderIncome(o);
      const cost = o.total_cost + o.shipping_cost + o.total_expenses;
      if (income === 0 && cost === 0) return;

      const dateStr = o.created_at || o.order_date;
      const d = dateStr ? new Date(dateStr) : new Date();
      const itemsStr = o.items.map((i: any) => `${i.name} (x${i.qty})`).join(', ');

      // Determine income display breakdown
      const isFullPayment = o.status === 'ໄດ້ຮັບເງິນແລ້ວ'
        || o.status === 'ປິດບິນແລ້ວ'
        || o.payment_method === 'ຈ່າຍແລ້ວ';

      const badges: any[] = [];
      if (o.status) {
        const isGreen = o.status === 'ໄດ້ຮັບເງິນແລ້ວ' || o.status === 'ປິດບິນແລ້ວ';
        badges.push({
          text: o.status,
          cls: isGreen ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
            : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
        });
      }
      if (o.deposit > 0 && !isFullPayment) {
        badges.push({ text: `ມັດຈຳ ${fmt(o.deposit)} ₭`, cls: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30' });
      }
      if (cost > 0) {
        badges.push({ text: 'ລົງທຶນ', cls: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30' });
      }

      rows.push({
        id: `o-${o.id}`,
        date: d,
        kind: 'order',
        label: 'ບິນອໍເດີ',
        labelColor: 'text-blue-600 dark:text-blue-400 font-bold',
        detail: `[#${o.id.slice(-8)}] ${o.customer_name}`,
        subDetail: itemsStr,
        badges,
        inAmt: income,
        outAmt: cost,
        depositAmt: o.deposit,
        isFullPayment,
        rawId: o.id,
        isOrder: true,
        totalSales: o.total_sales,
      });
    });

    rows.sort((a, b) => b.date.getTime() - a.date.getTime());
    return rows;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddWallet = async () => {
    if (!newWalletName.trim()) return;
    const newWallet = {
      id: `W-${Date.now()}`, name: newWalletName.trim(),
      type: 'partner' as const, share_percent: 50, created_at: new Date().toISOString(),
    };
    
    // Optimistic update
    setWallets(prev => [...prev, {
      id: newWallet.id, name: newWallet.name, type: newWallet.type,
      share_percent: newWallet.share_percent, createdAt: newWallet.created_at
    }]);

    await supabase.from('wallets').insert(newWallet);
    setNewWalletName(''); setShowAddWallet(false);
  };

  const handleSaveTransaction = async () => {
    if (!transAmount || !showTransModal) return;
    const txType = showTransModal.type === 'income' ? 'income'
      : isProfitSplit ? 'profit_split' : 'expense';
    const note = transNote || (showTransModal.type === 'income' ? 'ເຕີມທຶນ' : 'ຖອນອອກ');
    
    // Optimistic Update
    const tempTx: Transaction = {
      id: `temp-${Date.now()}`,
      wallet_id: showTransModal.wallet_id, 
      type: txType as any,
      amount: Number(transAmount), 
      notes: note, 
      date: new Date().toISOString(),
      partner_split_id: isProfitSplit ? splitPartnerId : undefined
    };
    setTransactions(prev => [tempTx, ...prev]);
    
    await supabase.from('transactions').insert({
      wallet_id: showTransModal.wallet_id, 
      type: txType,
      amount: Number(transAmount), 
      notes: note, 
      date: tempTx.date,
      category: isProfitSplit ? splitPartnerId : null
    });
    setShowTransModal(null); setTransAmount(''); setTransNote('');
    setIsProfitSplit(false); setSplitPartnerId('');
  };

  const handleEditWallet = async (wallet: Wallet) => {
    const newName = prompt('ປ່ຽນຊື່ຮຸ້ນສ່ວນ:', wallet.name);
    if (newName && newName.trim() !== wallet.name) {
      await supabase.from('wallets').update({ name: newName.trim() }).eq('id', wallet.id);
      setWallets(prev => prev.map(w => w.id === wallet.id ? { ...w, name: newName.trim() } : w));
    }
  };

  const handleDeleteWallet = async (wallet: Wallet) => {
    if (confirm(`ລຶບກະເປົາຮຸ້ນສ່ວນ "${wallet.name}"?\n(ລາຍການຕ່າງໆຂອງກະເປົານີ້ຈະຖືກລຶບນຳ)`)) {
      await supabase.from('wallets').delete().eq('id', wallet.id);
      setWallets(prev => prev.filter(w => w.id !== wallet.id));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fadeIn font-sans">
      {/* ══ Top Banner ══ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900 border border-white/10 p-6 mb-6 shadow-2xl">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-violet-500/20 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/15 rounded-full blur-[50px] pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest mb-1">ຍອດລວມທຸກກະເປົາ</p>
            <div className="flex items-end gap-2">
              <p className="text-4xl sm:text-5xl font-black text-white tabular-nums tracking-tight">{fmt(totalBalance)}</p>
              <span className="text-xl text-indigo-300 font-bold mb-1">₭</span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-indigo-200">
              <span>ກຳໄລລວມ: <span className="font-bold text-emerald-300">{fmt(totalProfit)} ₭</span></span>
              <span>ຄ່າໃຊ້ຈ່າຍອື່ນໆ: <span className="font-bold text-orange-300">{fmt(totalExpenses)} ₭</span></span>
              <span>ເບີກປັນຜົນ: <span className="font-bold text-rose-300">{fmt(totalDividends)} ₭</span></span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="month" value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-white outline-none [color-scheme:dark]"
            />
            <button onClick={() => setMonthFilter('all')} className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white/20 transition-all">ທັງໝົດ</button>
            <button onClick={() => setShowProfitSplit(true)} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold shadow-lg shadow-amber-500/25 transition-all active:scale-95">ແບ່ງຮຸ້ນ</button>
            <button onClick={() => setShowAddWallet(true)} className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold shadow-lg transition-all active:scale-95">+ ກະເປົາ</button>
          </div>
        </div>
      </div>

      {/* ══ Wallet Cards Grid ══ */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          ກຳລັງໂຫຼດ...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map(wallet => {
            const stats = getWalletStats(wallet, monthFilter);
            const isMain = wallet.type === 'W-COMP';
            return (
              <motion.div
                key={wallet.id}
                layout
                className={`rounded-3xl p-5 sm:p-6 border shadow-xl backdrop-blur-xl relative overflow-hidden transition-all duration-300 ${
                  isMain
                    ? 'bg-gradient-to-br from-indigo-950/90 to-slate-900/95 border-indigo-500/30 hover:border-indigo-400/50'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                {isMain && <div className="absolute -right-16 -top-16 w-44 h-44 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none" />}

                {/* Header */}
                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${isMain ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {isMain
                        ? <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2l1.22 3.76h3.96l-3.2 2.33 1.22 3.76L10 9.53l-3.2 2.32 1.22-3.76-3.2-2.33h3.96L10 2z"/></svg>
                        : <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center ${isMain ? 'bg-white/15 text-white' : 'bg-slate-200 dark:bg-white/15 text-slate-700 dark:text-white'}`}>{wallet.name.charAt(0)}</span>
                      }
                      {wallet.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">ID: {wallet.id}</p>
                  </div>
                  {isMain ? (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                      Main
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditWallet(wallet)} className="p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors" title="ແກ້ໄຂຊື່">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteWallet(wallet)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors" title="ລຶບ">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Balance */}
                <div className="mb-5 relative z-10">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold mb-1">
                    ຍອດຄົງເຫຼືອ ({monthFilter === 'all' ? 'ທັງໝົດ' : monthFilter})
                  </p>
                  <div className="flex items-end gap-1.5">
                    <span className={`text-4xl font-black tabular-nums tracking-tight ${stats.bal >= 0 ? (isMain ? 'text-white' : 'text-slate-800 dark:text-white') : 'text-rose-500 dark:text-rose-400'}`}>
                      {fmt(stats.bal)}
                    </span>
                    <span className={`text-base font-bold mb-1 ${isMain ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>₭</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-5 relative z-10">
                  {!isMain && (
                    <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl px-4 py-2.5">
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">ທຶນທີ່ລົງ:</span>
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300 tabular-nums">+{fmt(stats.capital)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl px-4 py-2.5">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12"/></svg>
                      ຮັບເຂົ້າ (In):
                    </span>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">+{fmt(stats.in)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl px-4 py-2.5">
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6"/></svg>
                      ຈ່າຍ/ຕົ້ນທຶນ (Out):
                    </span>
                    <span className="text-sm font-bold text-rose-700 dark:text-rose-400 tabular-nums">-{fmt(stats.out)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="relative z-10 border-t border-slate-200 dark:border-white/10 pt-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowTransModal({ type: 'income', wallet_id: wallet.id })}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/25 transition-all active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
                      {isMain ? 'ຍອດຍົກມາ' : 'ເຕີມເງິນ'}
                    </button>
                    <button
                      onClick={() => setShowTransModal({ type: 'expense', wallet_id: wallet.id })}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/25 transition-all active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                      {isMain ? 'ຖອນ/ຈ່າຍ' : 'ຖອນອອກ'}
                    </button>
                  </div>
                  {/* Statement button */}
                  <button
                    onClick={() => setShowStatement(wallet)}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
                      isMain
                        ? 'bg-white text-indigo-950 hover:bg-slate-100 shadow-md'
                        : 'bg-slate-800 dark:bg-slate-700 text-white border border-slate-900 dark:border-white/10 hover:bg-slate-700 dark:hover:bg-slate-600 shadow-sm'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
                    ດູ Statement / ປະຫວັດ
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ════════ MODALS ════════ */}

      {/* Add Wallet */}
      {showAddWallet && (
        <BaseModal isOpen onClose={() => setShowAddWallet(false)}
          title={<h3 className="text-lg font-bold text-slate-900 dark:text-white">ສ້າງກະເປົາ / ເພີ່ມຫຸ້ນສ່ວນ</h3>}
          maxWidth="max-w-sm" width="w-full" bodyClassName="p-6 bg-white dark:bg-slate-900"
        >
          <label className="block text-xs text-slate-500 mb-1">ຊື່ກະເປົາ</label>
          <input autoFocus type="text" value={newWalletName}
            onChange={e => setNewWalletName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddWallet()}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white mb-4 outline-none focus:border-violet-500 text-sm"
            placeholder="ເຊັ່ນ: ສົມຊາຍ"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowAddWallet(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold text-sm border border-slate-200 dark:border-white/10">ຍົກເລີກ</button>
            <button onClick={handleAddWallet} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm">ສ້າງ</button>
          </div>
        </BaseModal>
      )}

      {/* Income / Expense */}
      {showTransModal && (
        <BaseModal isOpen onClose={() => setShowTransModal(null)}
          title={
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {showTransModal.type === 'income' ? '💰 ເຕີມ / ຮັບເງິນ' : '💸 ຖອນ / ຈ່າຍ'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-normal">
                ກະເປົາ: <span className="font-bold text-slate-200">{wallets.find(w => w.id === showTransModal.wallet_id)?.name}</span>
              </p>
            </div>
          }
          maxWidth="max-w-sm" width="w-full" bodyClassName="p-6 bg-white dark:bg-slate-900 space-y-4"
        >
          <input autoFocus type="text" inputMode="decimal"
            value={transAmount ? String(transAmount).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
            onChange={e => { const r = e.target.value.replace(/,/g, ''); if (/^-?\d*\.?\d*$/.test(r)) setTransAmount(r); }}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-4 text-3xl text-center text-slate-900 dark:text-white outline-none focus:border-violet-500 font-mono"
            placeholder="0"
          />
          <input type="text" value={transNote} onChange={e => setTransNote(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-violet-500 text-sm"
            placeholder="ໝາຍເຫດ..."
          />
          {showTransModal.type === 'expense' && showTransModal.wallet_id === 'W-COMP' && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 rounded-xl">
              <label className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 cursor-pointer font-semibold">
                <input type="checkbox" checked={isProfitSplit} onChange={e => setIsProfitSplit(e.target.checked)} className="rounded" />
                ການເບີກປັນຜົນໃຫ້ຮຸ້ນສ່ວນ
              </label>
              {isProfitSplit && (
                <select value={splitPartnerId} onChange={e => setSplitPartnerId(e.target.value)}
                  className="w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-sm outline-none"
                >
                  <option value="">ເລືອກຮຸ້ນສ່ວນ</option>
                  {wallets.filter(w => w.type === 'partner').map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowTransModal(null)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold text-sm border border-slate-200 dark:border-white/10">ຍົກເລີກ</button>
            <button onClick={handleSaveTransaction}
              className={`flex-1 py-3 rounded-xl font-bold text-white text-sm ${showTransModal.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            >ຢືນຢັນ</button>
          </div>
        </BaseModal>
      )}

      {/* ══ Statement Modal ══ */}
      {showStatement && (() => {
        const rows = buildStatement(showStatement);
        const stmtStats = getWalletStats(showStatement, 'all');
        return (
          <BaseModal
            isOpen
            onClose={() => setShowStatement(null)}
            maxWidth="max-w-4xl"
            maxHeight="max-h-[88vh]"
            width="w-full"
            bodyClassName="flex flex-col flex-1 overflow-hidden bg-white dark:bg-slate-900"
            title={
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  Statement — {showStatement.name}
                </h3>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                    ຍອດ: {fmt(stmtStats.bal)} ₭
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
                    In: +{fmt(stmtStats.in)} ₭
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20">
                    Out: -{fmt(stmtStats.out)} ₭
                  </span>
                  <span className="text-xs text-slate-400">{rows.length} ລາຍການ</span>
                </div>
              </div>
            }
            footer={
              <div className="flex items-center justify-between w-full">
                <p className="text-xs text-slate-400">
                  ທຸລະກຳທັງໝົດຂອງ <span className="font-bold text-slate-600 dark:text-slate-300">{showStatement.name}</span>
                </p>
                <button onClick={() => setShowStatement(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
                >ປິດ</button>
              </div>
            }
          >
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-16 text-slate-400 gap-3">
                <svg className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p className="text-sm font-medium">ຍັງບໍ່ມີລາຍການ</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-white/10">
                    <tr className="text-slate-600 dark:text-slate-300">
                      <th className="px-4 py-3 text-left font-bold text-xs">ວັນທີ</th>
                      <th className="px-4 py-3 text-left font-bold text-xs">ປະເພດ</th>
                      <th className="px-4 py-3 text-left font-bold text-xs">ລາຍລະອຽດ</th>
                      <th className="px-4 py-3 text-right font-bold text-xs text-emerald-600 dark:text-emerald-400">ຮັບເຂົ້າ (₭)</th>
                      <th className="px-4 py-3 text-right font-bold text-xs text-rose-600 dark:text-rose-400">ຫັກ/ຈ່າຍ (₭)</th>
                      <th className="px-4 py-3 text-center font-bold text-xs">ຈັດການ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {rows.map((row, i) => (
                      <tr key={row.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-white/3 transition-colors ${row.kind === 'order' ? 'hover:bg-blue-50/40 dark:hover:bg-blue-500/5' : ''}`}
                      >
                        {/* Date */}
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap align-top pt-3.5">
                          <div>{fmtDate(row.date)}</div>
                          <div className="text-[10px] opacity-60">{fmtTime(row.date)}</div>
                        </td>

                        {/* Type */}
                        <td className={`px-4 py-3 whitespace-nowrap align-top pt-3.5 text-[13px] ${row.labelColor}`}>
                          {row.label}
                        </td>

                        {/* Detail */}
                        <td className="px-4 py-3 align-top min-w-[200px]">
                          <div className="font-semibold text-slate-800 dark:text-slate-100 text-[13px]">{row.detail}</div>
                          {row.subDetail && (
                            <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{row.subDetail}</div>
                          )}
                          {/* Deposit breakdown for orders */}
                          {row.isOrder && row.inAmt > 0 && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                              {row.isFullPayment ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  ✅ ຮັບຄົບ {fmt(row.totalSales)} ₭
                                  {row.depositAmt > 0 && ` (ລວມມັດຈຳ ${fmt(row.depositAmt)} ₭)`}
                                </span>
                              ) : row.depositAmt > 0 ? (
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                  💳 ມັດຈຳ: {fmt(row.depositAmt)} ₭
                                  {row.totalSales > row.depositAmt && (
                                    <span className="text-slate-400 ml-1">
                                      (ຄ້າງ {fmt(row.totalSales - row.depositAmt)} ₭)
                                    </span>
                                  )}
                                </span>
                              ) : null}
                            </div>
                          )}
                          {row.badges?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {row.badges.map((b: any, idx: number) => (
                                <span key={idx} className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border font-bold ${b.cls}`}>
                                  {b.text}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Income */}
                        <td className="px-4 py-3 text-right align-top pt-3.5">
                          {row.inAmt > 0 ? (
                            <div>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                                +{fmt(row.inAmt)}
                              </span>
                              {/* Show deposit vs remaining for received orders */}
                              {row.isOrder && row.isFullPayment && row.depositAmt > 0 && (
                                <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                                  <div>มัดจำ: +{fmt(row.depositAmt)}</div>
                                  <div>ຈ່າຍເພີ່ມ: +{fmt(row.totalSales - row.depositAmt)}</div>
                                </div>
                              )}
                              {row.isOrder && !row.isFullPayment && row.depositAmt > 0 && (
                                <div className="text-[10px] text-blue-400 mt-0.5">(ມັດຈຳ)</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>

                        {/* Expense/Cost */}
                        <td className="px-4 py-3 text-right align-top pt-3.5">
                          {row.outAmt > 0 ? (
                            <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums text-sm">
                              -{fmt(row.outAmt)}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center align-top pt-3">
                          {row.isOrder ? (
                            <button
                              title="ແກ້ໄຂອໍເດີ"
                              onClick={() => { setShowStatement(null); if (onEditOrder) onEditOrder(row.rawId); }}
                              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/15 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all mx-auto"
                            >
                              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"/>
                              </svg>
                            </button>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                title="ແກ້ໄຂ"
                                onClick={() => setEditTx({ id: row.rawId, amount: Number(row.inAmt || row.outAmt || 0) })}
                                className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/15 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all"
                              >
                                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"/>
                                </svg>
                              </button>
                              <button
                                title="ລຶບ"
                                onClick={() => setDeleteTx({ id: row.rawId })}
                                className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:border-rose-200 dark:hover:border-rose-500/30 transition-all"
                              >
                                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </BaseModal>
        );
      })()}

      {/* ══ Profit Split Modal ══ */}
      {showProfitSplit && (() => {
        const distributablePool = totalBalance + totalDividends;
        return (
        <BaseModal isOpen onClose={() => setShowProfitSplit(false)}
          title={<h3 className="text-xl font-bold text-slate-900 dark:text-white">🎯 ລະບົບແບ່ງຜົນຮຸ້ນສ່ວນ</h3>}
          maxWidth="max-w-3xl" width="w-full" maxHeight="max-h-[90vh]"
          bodyClassName="p-6 bg-white dark:bg-slate-900 overflow-y-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              { label: 'ຍອດເງິນປັນຜົນລວມ (100%)', val: fmt(distributablePool) + ' ₭', cls: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300' },
              { label: 'ເບີກປັນຜົນໄປແລ້ວ', val: fmt(totalDividends) + ' ₭', cls: 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300' },
              { label: 'ຍອດເງິນຄົງເຫຼືອ', val: fmt(totalBalance) + ' ₭', cls: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
            ].map(c => (
              <div key={c.label} className={`rounded-xl p-4 border ${c.cls}`}>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">{c.label}</p>
                <p className="text-xl font-black mt-1">{c.val}</p>
              </div>
            ))}
          </div>

          {wallets.filter(w => w.type === 'partner').length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">ຍັງບໍ່ມີຮຸ້ນສ່ວນ · ກົດ "+ ກະເປົາ" ເພື່ອເພີ່ມ</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs uppercase">
                  <tr>
                    {['ຮຸ້ນສ່ວນ', 'ທຶນລົງ', 'ສ່ວນແບ່ງ (%)', 'ຄວນໄດ້', 'ເບີກແລ້ວ', 'ຍັງຄ້າງ'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {wallets.filter(w => w.type === 'partner').map(w => {
                    const percent = w.share_percent ?? 50;
                    const shouldGet = (distributablePool * percent) / 100;
                    const withdrawn = transactions
                      .filter(t => t.type === 'profit_split' && t.partner_split_id === w.id)
                      .reduce((s, t) => s + t.amount, 0);
                    const remain = shouldGet - withdrawn;
                    const capital = transactions
                      .filter(t => t.wallet_id === w.id && t.type === 'income')
                      .reduce((s, t) => s + t.amount, 0);
                    return (
                      <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{w.name}</td>
                        <td className="px-4 py-3 text-slate-500">{fmt(capital)} ₭</td>
                        <td className="px-4 py-3">
                          <input type="number" value={percent} min={0} max={100}
                            onChange={async e => { await supabase.from('wallets').update({ share_percent: Number(e.target.value) }).eq('id', w.id); }}
                            className="w-16 text-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-900 dark:text-white outline-none focus:border-violet-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{fmt(shouldGet)} ₭</td>
                        <td className="px-4 py-3 text-rose-500">{fmt(withdrawn)} ₭</td>
                        <td className={`px-4 py-3 font-extrabold ${remain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>{fmt(remain)} ₭</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-4 text-center">ເພື່ອເບີກຈ່າຍ: ໃຫ້ກົດ "ຖອນ/ຈ່າຍ" ທີ່ກະເປົາຫຼັກ ແລ້ວຕິ໊ກ "ການເບີກປັນຜົນ"</p>
        </BaseModal>
        );
      })()}
      {/* ══ Edit Transaction Modal ══ */}
      {editTx && (
        <BaseModal isOpen onClose={() => setEditTx(null)}
          title={<h3 className="text-xl font-bold text-slate-900 dark:text-white">ແກ້ໄຂຍອດເງິນ</h3>}
          maxWidth="max-w-sm" width="w-full"
          bodyClassName="p-6 bg-white dark:bg-slate-900"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">ຍອດເງິນໃໝ່ (₭)</label>
              <input 
                type="text" 
                inputMode="decimal"
                autoFocus
                className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                value={editTx.amount.toLocaleString('en-US')}
                onChange={e => {
                  const num = Number(e.target.value.replace(/,/g, ''));
                  if (!isNaN(num)) setEditTx({ ...editTx, amount: num });
                }}
                onKeyDown={async e => {
                  if (e.key === 'Enter') {
                    setTransactions(prev => prev.map(t => t.id === editTx.id ? { ...t, amount: editTx.amount } : t));
                    setEditTx(null);
                    await supabase.from('transactions').update({ amount: editTx.amount }).eq('id', editTx.id);
                  }
                }}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setEditTx(null)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                ຍົກເລີກ
              </button>
              <button 
                onClick={async () => {
                  setTransactions(prev => prev.map(t => t.id === editTx.id ? { ...t, amount: editTx.amount } : t));
                  setEditTx(null);
                  await supabase.from('transactions').update({ amount: editTx.amount }).eq('id', editTx.id);
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
              >
                ບັນທຶກ
              </button>
            </div>
          </div>
        </BaseModal>
      )}

      {/* ══ Delete Transaction Modal ══ */}
      {deleteTx && (
        <BaseModal isOpen onClose={() => setDeleteTx(null)}
          title={<h3 className="text-xl font-bold text-slate-900 dark:text-white">ຢືນຢັນການລຶບ</h3>}
          maxWidth="max-w-sm" width="w-full"
          bodyClassName="p-6 bg-white dark:bg-slate-900"
        >
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-rose-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </div>
              <p className="text-center text-slate-600 dark:text-slate-400">
                ທ່ານແນ່ໃຈຫຼືບໍ່ທີ່ຈະລຶບລາຍການນີ້?<br/>
                <span className="text-sm">ການກະທຳນີ້ບໍ່ສາມາດແກ້ໄຂໄດ້</span>
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setDeleteTx(null)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                ຍົກເລີກ
              </button>
              <button 
                onClick={async () => {
                  setTransactions(prev => prev.filter(t => t.id !== deleteTx.id));
                  setDeleteTx(null);
                  await supabase.from('transactions').delete().eq('id', deleteTx.id);
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/30 transition-all active:scale-95"
              >
                ລຶບເລີຍ
              </button>
            </div>
          </div>
        </BaseModal>
      )}

    </div>
  );
}
