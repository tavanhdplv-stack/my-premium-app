'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/app/lib/supabase';
import { BaseModal } from './BaseModal';

// --- Interfaces ---
interface Wallet {
  id: string;
  name: string;
  type: 'W-COMP' | 'partner';
  sharePercent?: number;
  createdAt?: string;
}

interface Transaction {
  id: string;
  walletId: string;
  type: 'income' | 'expense' | 'profit_split';
  amount: number;
  note: string;
  date: string;
  partnerSplitId?: string;
}

interface WalletStats {
  bal: number;
  in: number;
  out: number;
  capital: number;
}

// --- Component ---
interface OrderWalletProps {
  onEditOrder?: (orderId: string) => void;
}

function parseOrderDate(str?: string): { day: number; month: number; year: number } | null {
  if (!str) return null;
  if (/^\d{4}-\d{2}/.test(str)) {
    const [yearStr, monthStr, dayStr] = str.substring(0, 10).split('-');
    const year = Number(yearStr), month = Number(monthStr), day = Number(dayStr);
    if (!year || !month) return null;
    return { day, month, year };
  }
  const p = str.split('/');
  if (p.length !== 3) return null;
  const day = Number(p[0]), month = Number(p[1]), year = Number(p[2]);
  if (!day || !month || !year) return null;
  return { day, month, year };
}

function ymOf(str?: string): string | null {
  const d = parseOrderDate(str);
  if (!d) return null;
  return `${d.year}-${String(d.month).padStart(2, '0')}`;
}

export default function OrderWallet({ onEditOrder }: OrderWalletProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));

  // Modal States
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [showTransModal, setShowTransModal] = useState<{ type: 'income' | 'expense'; walletId: string } | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<Wallet | null>(null);
  const [showProfitSplit, setShowProfitSplit] = useState(false);
  const [expandedWalletId, setExpandedWalletId] = useState<string | null>('W-COMP');

  // Form States
  const [newWalletName, setNewWalletName] = useState('');
  const [transAmount, setTransAmount] = useState('');
  const [transNote, setTransNote] = useState('');
  const [isProfitSplitTrans, setIsProfitSplitTrans] = useState(false);
  const [splitPartnerId, setSplitPartnerId] = useState('');

  // --- Supabase Real-time Subscriptions ---
  useEffect(() => {
    const fetchWallets = async () => {
      const { data } = await supabase.from('wallets').select('*');
      if (data) {
        const walletList = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          sharePercent: d.share_percent !== undefined ? d.share_percent : 50,
          createdAt: d.created_at,
        }));
        if (walletList.length === 0) {
          // Seed main wallet
          const { error } = await supabase.from('wallets').insert({
            id: 'W-COMP',
            name: 'ກະເປົາບໍລິສັດ',
            type: 'W-COMP',
            share_percent: 100,
            created_at: new Date().toISOString(),
          });
          if (error) console.error(error);
        } else {
          walletList.sort((a, b) => {
            if (a.type === 'W-COMP') return -1;
            if (b.type === 'W-COMP') return 1;
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return aTime - bTime;
          });
          setWallets(walletList);
        }
      }
    };

    const fetchTransactions = async () => {
      const { data } = await supabase.from('transactions').select('*');
      if (data) {
        const transList = data.map((d: any) => ({
          id: d.id,
          walletId: d.wallet_id,
          type: d.type,
          amount: Number(d.amount) || 0,
          note: d.note || '',
          date: d.date || new Date().toISOString(),
          partnerSplitId: d.partner_split_id || undefined,
        }));
        transList.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(transList);
      }
    };

    const fetchOrders = async () => {
      const { data } = await supabase.from('orders').select('*');
      if (data) {
        const orderList = data.map((d: any) => ({
          id: d.id,
          ...d,
          orderDate: d.order_date,
          totalSales: d.total_sales,
          paymentMethod: d.payment_method,
          totalCost: d.total_cost,
          shippingFee: d.shipping_fee,
          totalExpenses: d.total_expenses,
          totalProfit: d.total_profit,
          customerName: d.customer_name
        }));
        setOrders(orderList);
      }
    };

    fetchWallets();
    fetchTransactions();
    fetchOrders();

    const channel = supabase.channel('order_wallet_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, fetchWallets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchTransactions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (showDetailsModal) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showDetailsModal]);

  // --- คำนวณยอดกระเป๋า (Orders + Transactions) ---
  const getWalletStats = (walletId: string, month: string): WalletStats => {
    let bal = 0, inAmt = 0, outAmt = 0, cap = 0;

    // 1. จากรายการธุรกรรมทำมือ
    transactions.forEach((t) => {
      if (t.walletId !== walletId) return;

      const tMonth = ymOf(t.date || (t as any).Date);
      const isCurrentMonth = month === 'all' || tMonth === month;
      const isPastOrCurrent = month === 'all' || (tMonth && tMonth <= month);

      if (t.type === 'income') {
        if (isPastOrCurrent) bal += t.amount;
        if (isCurrentMonth) {
          inAmt += t.amount;
          if (!t.note.includes('ຄືນທຶນ')) cap += t.amount;
        }
      } else if (t.type === 'expense' || t.type === 'profit_split') {
        if (isPastOrCurrent) bal -= t.amount;
        if (isCurrentMonth) {
          outAmt += t.amount;
        }
      }
    });

    // 2. จากการดำเนินงานออเดอร์จริง
    const walletObj = wallets.find((w) => w.id === walletId);
    if (walletObj) {
      orders.forEach((o) => {
        if (o.status === 'ຍົກເລີກອໍເດີ') return;

        let match = false;
        if (walletObj.type === 'W-COMP') {
          match = !o.wallet || o.wallet === walletObj.name || o.wallet?.includes('ບໍລິສັດ') || o.wallet?.includes('BCEL') || o.wallet?.includes('W-COMP');
        } else {
          const cleanPartnerName = (walletObj?.name || '').split(/[(\s]/)[0];
          match = o.wallet === walletObj.name || !!o.wallet?.includes(cleanPartnerName);
        }

        if (match) {
          const oMonth = ymOf(o.orderDate || (o as any).Date || (o as any)['ວັນທີ'] || (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toISOString() : ''));
          const isCurrentMonth = month === 'all' || oMonth === month;
          const isPastOrCurrent = month === 'all' || (oMonth && oMonth <= month);

          const finalPrice = Number(o.price) || Number(o.totalSales) || Number(o.SellingPrice) || 0;
          const income =
            o.paymentMethod === 'ຈ່າຍແລ້ວ' || o.PaymentMethod === 'ຈ່າຍແລ້ວ' || o.status === 'ໄດ້ຮັບເງິນແລ້ວ' || o.status === 'ປິດບິນແລ້ວ'
              ? finalPrice
              : (Number(o.deposit) || Number(o.DepositAmount) || Number(o['ຍອດມັດຈຳ']) || 0);

          const cost =
            (Number(o.totalCost) || Number(o.CostPrice) || 0) +
            (Number(o.shippingFee) || Number(o.OrderShippingFee) || 0) +
            (Number(o.totalExpenses) || Number(o.AdditionalCost) || 0);

          if (isPastOrCurrent) {
            bal += income;
            bal -= cost;
          }

          if (isCurrentMonth) {
            inAmt += income;
            outAmt += cost;
          }
        }
      });
    }

    return { bal, in: inAmt, out: outAmt, capital: cap };
  };

  const totalBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + getWalletStats(w.id, 'all').bal, 0);
  }, [wallets, transactions, orders]);

  const totalShopProfit = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'ຍົກເລີກອໍເດີ')
      .reduce((sum, o) => sum + (Number(o.totalProfit) || Number((o as any).NetProfit) || 0), 0);
  }, [orders]);

  const totalWithdrawn = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'profit_split' || t.note?.includes('[ປັນຜົນຮຸ້ນສ່ວນ') || t.note?.includes('ຖອນ') || (t as any).Note?.includes('ຖອນ'))
      .reduce((sum, t) => sum + (Number(t.amount) || Number((t as any).Amount) || 0), 0);
  }, [transactions]);

  const totalPercent = useMemo(() => {
    return wallets
      .filter((w) => w.type === 'partner')
      .reduce((sum, w) => sum + (w.sharePercent ?? 50), 0);
  }, [wallets]);

  // --- Handlers ---
  const handleAddWallet = async () => {
    if (!newWalletName.trim()) return;
    const walletId = `W-${Date.now()}`;
    try {
      await supabase.from('wallets').insert({
        id: walletId,
        name: newWalletName.trim(),
        type: 'partner',
        share_percent: 50,
        created_at: new Date().toISOString(),
      });
      setNewWalletName('');
      setShowAddWallet(false);
    } catch (err) {
      console.error('Error creating wallet:', err);
    }
  };

  const handleSaveTransaction = async () => {
    if (!transAmount || !showTransModal) return;
    try {
      await supabase.from('transactions').insert({
        wallet_id: showTransModal.walletId,
        type:
          showTransModal.type === 'income'
            ? 'income'
            : isProfitSplitTrans
            ? 'profit_split'
            : 'expense',
        amount: Number(transAmount),
        note:
          transNote ||
          (showTransModal.type === 'income' ? 'ເຕີມທຶນ' : 'ຖອນອອກ'),
        date: new Date().toISOString(),
        partner_split_id: isProfitSplitTrans ? splitPartnerId : null,
      });
      setShowTransModal(null);
      setTransAmount('');
      setTransNote('');
      setIsProfitSplitTrans(false);
      setSplitPartnerId('');
    } catch (err) {
      console.error('Error saving transaction:', err);
    }
  };

  // --- ดึงรายการธุรกรรมของกระเป๋า ---
  const getWalletTransactions = (walletId: string) => {
    return transactions.filter((t) => t.walletId === walletId).slice(0, 20);
  };

  return (
    <div className="animate-fadeIn mt-4 md:mt-8 text-white font-sans">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-white">ກະເປົາເງິນ &amp; ຮຸ້ນສ່ວນ</h2>
        <p className="text-xs text-slate-400 mt-1">ຈັດການກະແສເງິນສົດ ແລະ ການແບ່ງປັນຜົນຮຸ້ນສ່ວນ — ເຊື່ອມ Firebase ສົດ</p>
      </div>

      {/* Summary Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <span className="text-xs text-blue-200 font-semibold uppercase tracking-wider">ຍອດເງິນລວມທຸກກະເປົາ</span>
          <p className="text-4xl font-black mt-1 font-mono text-white drop-shadow-md">
            {totalBalance.toLocaleString()} ₭
          </p>
          <p className="text-xs text-blue-200 mt-1">
            ກຳໄລລວມ: {totalShopProfit.toLocaleString()} ₭ · ເບີກໄປແລ້ວ: {totalWithdrawn.toLocaleString()} ₭
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-sm text-white outline-none [color-scheme:dark]"
          />
          <button
            onClick={() => setMonthFilter('all')}
            className="text-xs bg-white/10 text-white border border-white/20 px-3 py-2 rounded-lg hover:bg-white/20 transition"
          >
            ທັງໝົດ
          </button>
          <button
            onClick={() => setShowProfitSplit(true)}
            className="text-xs bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 font-bold transition"
          >
            ແບ່ງຜົນຮຸ້ນສ່ວນ
          </button>
          <button
            onClick={() => setShowAddWallet(true)}
            className="text-xs bg-white text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 font-bold transition"
          >
            + ເພີ່ມກະເປົາ
          </button>
        </div>
      </div>

      {/* Wallet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {wallets.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-400 animate-pulse text-sm">
            ກຳລັງໂຫຼດຂໍ້ມູນກະເປົາ...
          </div>
        ) : (
          wallets.map((wallet) => {
            const stats = getWalletStats(wallet.id, monthFilter);
            const isMain = wallet.type === 'W-COMP';
            return (
              <div
                key={wallet.id}
                className={`rounded-3xl p-5 sm:p-6 shadow-2xl border backdrop-blur-xl transition-all duration-300 relative group overflow-hidden ${
                  isMain
                    ? 'bg-gradient-to-br from-indigo-950/90 to-slate-900/95 border-indigo-500/30 hover:border-indigo-400/50 hover:shadow-indigo-500/20'
                    : 'bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.08]'
                }`}
              >
                {/* Background decorative glow */}
                {isMain && (
                  <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none" />
                )}

                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className={`text-xl font-bold flex items-center gap-2 tracking-wide ${isMain ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                      {isMain ? (
                        <svg className="w-5 h-5 text-amber-400 drop-shadow-md" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2l1.22 3.76h3.96l-3.2 2.33 1.22 3.76L10 9.53l-3.2 2.32 1.22-3.76-3.2-2.33h3.96L10 2z"/></svg>
                      ) : (
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                      )}
                      {wallet.name}
                    </h3>
                    <p className="text-[10px] text-slate-400/80 font-mono mt-1 opacity-70">ID: {wallet.id}</p>
                  </div>
                  {isMain && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.25 rounded-full font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
                      Main Wallet
                    </span>
                  )}
                </div>

                {/* Balance */}
                <div className="mb-6 relative z-10">
                  <span className="text-[11px] text-slate-400/90 uppercase tracking-widest font-bold">
                    ຍອດຄົງເຫຼືອ ({monthFilter === 'all' ? 'ທັງໝົດ' : monthFilter})
                  </span>
                  <div className="flex items-end gap-1.5 mt-1">
                    <p className={`text-4xl sm:text-5xl font-black tabular-nums tracking-tight drop-shadow-sm ${stats.bal >= 0 ? (isMain ? 'text-white' : 'text-slate-800 dark:text-white') : 'text-rose-500 dark:text-rose-400'}`}>
                      {stats.bal.toLocaleString()}
                    </p>
                    <span className={`text-lg font-bold mb-1.5 ${stats.bal >= 0 ? (isMain ? 'text-slate-300' : 'text-slate-400 dark:text-slate-300') : 'text-rose-500/70 dark:text-rose-400/70'}`}>₭</span>
                  </div>
                </div>

                {/* Stats List (Vertical layout to prevent overflow) */}
                <div className="space-y-2.5 mb-6 relative z-10">
                  {/* Capital (Partner Only) */}
                  {!isMain && (
                    <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-950/40 rounded-xl px-4 py-3 border border-slate-200 dark:border-white/5 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-blue-600 dark:text-blue-400 font-bold tracking-wider">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        ຍອດເງິນຕົ້ນແທ້:
                      </div>
                      <p className="text-sm sm:text-base font-bold text-blue-700 dark:text-blue-100 tabular-nums">+{stats.capital.toLocaleString()}</p>
                    </div>
                  )}
                  {/* In */}
                  <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/20 rounded-xl px-4 py-3 border border-emerald-200 dark:border-emerald-500/10 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-emerald-600 dark:text-emerald-500/90 font-bold tracking-wider">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12"/></svg>
                      ຮັບເຂົ້າສະສົມ (In):
                    </div>
                    <p className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">+{stats.in.toLocaleString()}</p>
                  </div>
                  {/* Out */}
                  <div className="flex justify-between items-center bg-rose-50 dark:bg-rose-950/20 rounded-xl px-4 py-3 border border-rose-200 dark:border-rose-500/10 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-rose-600 dark:text-rose-500/90 font-bold tracking-wider">
                      <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6"/></svg>
                      ຈ່າຍອອກ (Out):
                    </div>
                    <p className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums">-{stats.out.toLocaleString()}</p>
                  </div>
                </div>

                {/* Actions (2 Rows) */}
                <div className="relative z-10 pt-4 border-t border-white/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowTransModal({ type: 'income', walletId: wallet.id })}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-3 rounded-xl font-bold transition-all active:scale-95 ${
                        isMain 
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
                      <span>{isMain ? 'ຍອດຍົກມາ (ເດີມ)' : 'ເຕີມເງິນ'}</span>
                    </button>
                    <button
                      onClick={() => setShowTransModal({ type: 'expense', walletId: wallet.id })}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-3 rounded-xl font-bold transition-all active:scale-95 ${
                        isMain 
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                      <span>{isMain ? 'ຖອນກຳໄລອອກ' : 'ຖອນອອກ'}</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(wallet)}
                    className={`w-full flex items-center justify-center gap-2 text-xs py-3.5 rounded-xl font-extrabold transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.05)] ${
                      isMain
                        ? 'bg-white text-indigo-950 hover:bg-slate-100'
                        : 'bg-slate-800 text-slate-300 border border-white/5 hover:bg-slate-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                    <span>ລາຍລະອຽດ/ປະຫວັດ</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ===== MODALS ===== */}

      {/* Add Wallet Modal */}
      {showAddWallet && (
        <BaseModal
          isOpen={true}
          onClose={() => setShowAddWallet(false)}
          title={<h3 className="text-lg font-bold text-slate-900 dark:text-white">ສ້າງກະເປົາ / ເພີ່ມຫຸ້ນສ່ວນ</h3>}
          maxWidth="max-w-md"
          width="w-full"
          bodyClassName="p-6 bg-white dark:bg-slate-900"
        >
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">ຊື່ກະເປົາ / ຊື່ຫຸ້ນສ່ວນ</label>
          <input
            type="text"
            value={newWalletName}
            onChange={(e) => setNewWalletName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddWallet()}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white mb-4 outline-none focus:border-blue-500"
            placeholder="ເຊັ່ນ: ສົມຊາຍ"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddWallet(false)}
              className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 font-bold"
            >
              ຍົກເລີກ
            </button>
            <button
              onClick={handleAddWallet}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-bold"
            >
              ຢືນຢັນການສ້າງ
            </button>
          </div>
        </BaseModal>
      )}

      {/* Transaction Modal */}
      {showTransModal && (
        <BaseModal
          isOpen={true}
          onClose={() => setShowTransModal(null)}
          title={
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {showTransModal.type === 'income' ? '💰 ເຕີມທຶນເຂົ້າກະເປົາ' : '💸 ຖອນເງິນອອກຈາກກະເປົາ'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
                ກະເປົາ: <span className="text-slate-900 dark:text-white font-bold">{wallets.find((w) => w.id === showTransModal.walletId)?.name}</span>
              </p>
            </div>
          }
          maxWidth="max-w-md"
          width="w-full"
          bodyClassName="p-6 bg-white dark:bg-slate-900"
        >
          <input
            type="text"
            inputMode="decimal"
            value={transAmount ? String(transAmount).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
            onChange={(e) => {
              const raw = e.target.value.replace(/,/g, '');
              if (/^-?\d*\.?\d*$/.test(raw)) setTransAmount(raw);
            }}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-4 text-3xl text-center text-slate-900 dark:text-white mb-4 outline-none focus:border-blue-500 font-mono"
            placeholder="0"
            autoFocus
          />

          <input
            type="text"
            value={transNote}
            onChange={(e) => setTransNote(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white mb-4 outline-none focus:border-blue-500"
            placeholder="ໝາຍເຫດ..."
          />

          {/* ตัวเลือกปันผลพาร์ทเนอร์ สำหรับ W-COMP ถอน */}
          {showTransModal.type === 'expense' && showTransModal.walletId === 'W-COMP' && (
            <div className="mb-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 rounded-lg">
              <label className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isProfitSplitTrans}
                  onChange={(e) => setIsProfitSplitTrans(e.target.checked)}
                />
                ນີ້ຄືການເບີກປັນຜົນໃຫ້ຮຸ້ນສ່ວນ
              </label>
              {isProfitSplitTrans && (
                <select
                  value={splitPartnerId}
                  onChange={(e) => setSplitPartnerId(e.target.value)}
                  className="w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm outline-none"
                >
                  <option value="">ເລືອກຫຸ້ນສ່ວນທີ່ມາຮັບ</option>
                  {wallets
                    .filter((w) => w.type === 'partner')
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                </select>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setShowTransModal(null)}
              className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 py-3 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 font-bold"
            >
              ຍົກເລີກ
            </button>
            <button
              onClick={handleSaveTransaction}
              className={`flex-1 py-3 rounded-lg font-bold text-white ${
                showTransModal.type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              ຢືນຢັນ
            </button>
          </div>
        </BaseModal>
      )}

      {/* Wallet Details Modal — Statement/Invoices */}
      {showDetailsModal && (
        <BaseModal
          isOpen={true}
          onClose={() => setShowDetailsModal(null)}
          maxWidth="max-w-5xl"
          maxHeight="max-h-[85vh]"
          width="w-full"
          bodyClassName="flex-1 overflow-auto bg-white dark:bg-slate-900"
          title={
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="text-xl">📋</span>
                ລາຍລະອຽດບິນ &amp; ການເຄື່ອນໄຫວ (Statement/Invoices)
              </h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  🏦 ກະເປົາ: {showDetailsModal?.name}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  ສະແດງສະຫຼຸບ
                </span>
              </div>
            </div>
          }
          footer={
            <div className="flex items-center justify-between w-full">
              <p className="text-xs text-slate-400">
                ລາຍການທຸລະກຳທັງໝົດຂອງ <span className="font-bold text-slate-600 dark:text-slate-300">{showDetailsModal?.name}</span>
              </p>
              <button
                onClick={() => setShowDetailsModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold transition-colors text-sm"
              >
                ປິດໜ້າຈໍ
              </button>
            </div>
          }
        >
          {(() => {
                    // Build combined history
                    const history: any[] = [];

                    // Manual transactions
                    getWalletTransactions(showDetailsModal?.id || '').forEach(t => {
                  history.push({
                    id: t.id,
                    date: new Date(t.date),
                    rowType: 'trans',
                    typeLabel: t.type === 'income' ? 'ຮັບເຂົ້າ / ເຕີມທຶນ'
                             : t.type === 'profit_split' ? 'ປັນຜົນຮຸ້ນສ່ວນ'
                             : 'ຄ່າໃຊ້ຈ່າຍອື່ນໆ',
                    typeColor: t.type === 'income' ? 'text-emerald-600 font-bold'
                             : t.type === 'profit_split' ? 'text-amber-600 font-bold'
                             : 'text-slate-600',
                    detail: t.note || '-',
                    subDetail: null,
                    badges: [],
                    inAmt: t.type === 'income' ? t.amount : null,
                    outAmt: t.type !== 'income' ? t.amount : null,
                    rawId: t.id,
                  });
                });

                // Orders for this wallet
                orders.forEach(o => {
                  if (o.status === 'ຍົກເລີກອໍເດີ') return;
                  let match = false;
                  if (showDetailsModal?.type === 'W-COMP') {
                    match = !o.wallet || o.wallet === showDetailsModal?.name || o.wallet.includes('ບໍລິສັດ') || o.wallet.includes('BCEL') || o.wallet.includes('W-COMP');
                  } else {
                    const cleanName = (showDetailsModal?.name || '').split(/[(\s]/)[0];
                    match = o.wallet === showDetailsModal?.name || !!o.wallet?.includes(cleanName);
                  }
                  if (!match) return;

                  const depositAmount = Number(o.deposit) || Number(o.DepositAmount) || Number(o['ຍອດມັດຈຳ']) || 0;
                  const finalPrice = Number(o.price) || Number(o.totalSales) || Number(o.SellingPrice) || 0;
                  const income = o.paymentMethod === 'ຈ່າຍແລ້ວ' || o.PaymentMethod === 'ຈ່າຍແລ້ວ' || o.status === 'ໄດ້ຮັບເງິນແລ້ວ' || o.status === 'ປິດບິນແລ້ວ'
                    ? finalPrice
                    : depositAmount;
                  const cost = (Number(o.totalCost) || Number(o.CostPrice) || 0) + (Number(o.shippingFee) || Number(o.OrderShippingFee) || 0) + (Number(o.totalExpenses) || Number(o.AdditionalCost) || 0);
                  if (income === 0 && cost === 0) return;

                  const d = o.createdAt?.seconds
                    ? new Date(o.createdAt.seconds * 1000)
                    : (o.orderDate ? new Date(o.orderDate) : new Date());

                  const itemsStr = Array.isArray(o.items)
                    ? o.items.map((i: any) => `${i.name} (x${i.qty})`).join(', ')
                    : '';

                  const badges: any[] = [];
                  if (o.status) {
                    const isGreen = o.status === 'ປິດບິນແລ້ວ' || o.status === 'ໄດ້ຮັບເງິນແລ້ວ';
                    badges.push({
                      text: o.status,
                      cls: isGreen
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-amber-50 text-amber-600 border-amber-200',
                    });
                  }
                  if (cost > 0) {
                    badges.push({ text: 'ລົງທຶນສັ່ງເຄື່ອງ', cls: 'bg-rose-50 text-rose-600 border-rose-200' });
                  }
                  if (depositAmount > 0) {
                    badges.push({ text: 'ມັດຈຳແລ້ວ', cls: 'bg-blue-50 text-blue-600 border-blue-200' });
                  }

                  history.push({
                    id: o.id,
                    date: d,
                    rowType: 'order',
                    typeLabel: 'ບິນອໍເດີ',
                    typeColor: 'text-blue-600 font-bold',
                    detail: `[${o.id.slice(-10)}] ${o.customerName || ''}`.trim(),
                    subDetail: itemsStr,
                    badges,
                    inAmt: income > 0 ? income : null,
                    depositAmt: depositAmount > 0 ? depositAmount : 0,
                    remainingAmt: income === finalPrice && finalPrice > depositAmount && depositAmount > 0 ? finalPrice - depositAmount : 0,
                    outAmt: cost > 0 ? cost : null,
                    rawId: o.id,
                    paymentMethod: o.paymentMethod,
                  });
                });

                history.sort((a, b) => b.date.getTime() - a.date.getTime());

                if (history.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 mb-3 opacity-30">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v6h6v10H6z"/>
                      </svg>
                      <p className="text-sm font-medium">ຍັງບໍ່ມີການເຄື່ອນໄຫວ</p>
                    </div>
                  );
                }

                return (
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-600">
                        <th className="px-4 py-3 text-left font-bold whitespace-nowrap">ວັນທີ</th>
                        <th className="px-4 py-3 text-left font-bold whitespace-nowrap">ປະເພດ</th>
                        <th className="px-4 py-3 text-left font-bold">ລາຍລະອຽດ (Invoice Details)</th>
                        <th className="px-4 py-3 text-right font-bold whitespace-nowrap text-emerald-600">ຮັບເຂົ້າ (₭)</th>
                        <th className="px-4 py-3 text-right font-bold whitespace-nowrap text-rose-600">ຫັກອອກ (₭)</th>
                        <th className="px-4 py-3 text-center font-bold whitespace-nowrap">ຈັດການ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr
                          key={`${h.id}-${i}`}
                          className={`border-b border-slate-100 transition-colors ${
                            h.rowType === 'order'
                              ? 'hover:bg-blue-50/40'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Date */}
                          <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap align-top pt-4">
                            {h.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>

                          {/* Type */}
                          <td className={`px-4 py-3.5 whitespace-nowrap align-top pt-4 text-[13px] ${h.typeColor}`}>
                            {h.typeLabel}
                          </td>

                          {/* Detail */}
                          <td className="px-4 py-3.5 min-w-[200px] align-top">
                            <div className="font-semibold text-slate-800 text-[13px]">{h.detail}</div>
                            {h.subDetail && (
                              <div className="text-[11px] text-slate-400 mt-0.5">{h.subDetail}</div>
                            )}
                            {h.badges && h.badges.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {h.badges.map((b: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border font-bold ${b.cls}`}
                                  >
                                    {b.cls.includes('emerald') && '✅ '}{b.text}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Income */}
                          <td className="px-4 py-3.5 text-right align-top pt-4">
                            {h.inAmt != null ? (
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-emerald-600 tabular-nums">
                                  +{h.inAmt.toLocaleString()}
                                </span>
                                {h.depositAmt > 0 && h.remainingAmt > 0 ? (
                                  <div className="text-[10px] text-emerald-600/70 mt-1 flex flex-col items-end leading-tight">
                                    <span>ມັດຈຳ: +{h.depositAmt.toLocaleString()}</span>
                                    <span>ຈ່າຍເພີ່ມ: +{h.remainingAmt.toLocaleString()}</span>
                                  </div>
                                ) : h.depositAmt > 0 && h.remainingAmt === 0 && h.inAmt === h.depositAmt ? (
                                  <div className="text-[10px] text-emerald-600/70 mt-0.5">
                                    (ມັດຈຳ)
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Expense */}
                          <td className="px-4 py-3.5 text-right align-top pt-4">
                            {h.outAmt != null ? (
                              <span className="font-bold text-rose-500 tabular-nums">
                                -{h.outAmt.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-center align-top pt-3.5">
                            {h.rowType === 'trans' ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  title="ແກ້ໄຂ"
                                  onClick={() => {
                                    const newAmt = prompt('ໃສ່ຍອດເງິນໃໝ່ (ກະລຸນາໃສ່ສະເພາະຕົວເລກ):', String(h.inAmt || h.outAmt || 0));
                                    if (newAmt !== null) {
                                      const numAmt = Number(newAmt.replace(/,/g, ''));
                                      if (!isNaN(numAmt)) {
                                        supabase.from('transactions').update({ amount: numAmt }).eq('id', h.rawId);
                                      }
                                    }
                                  }}
                                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-200 transition-all"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                  </svg>
                                </button>
                                <button
                                  title="ລຶບ"
                                  onClick={() => {
                                    if (confirm('ລຶບລາຍການນີ້?')) supabase.from('transactions').delete().eq('id', h.rawId);
                                  }}
                                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  title="ແກ້ໄຂອໍເດີ"
                                  onClick={() => {
                                    setShowDetailsModal(null);
                                    if (onEditOrder) onEditOrder(h.rawId);
                                  }}
                                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-200 transition-all"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                  </svg>
                                </button>
                                <button
                                  title="ດູລາຍລະອຽດ"
                                  onClick={() => {
                                    setShowDetailsModal(null);
                                    if (onEditOrder) onEditOrder(h.rawId);
                                  }}
                                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-200 transition-all mx-auto"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
                                  </svg>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
        </BaseModal>
      )}

      {/* Profit Split Modal */}
      {showProfitSplit && (
        <BaseModal
          isOpen={true}
          onClose={() => setShowProfitSplit(false)}
          title={
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">ລະບົບແບ່ງຜົນຮຸ້ນສ່ວນ (Profit Split)</h3>
          }
          maxWidth="max-w-4xl"
          width="w-full"
          maxHeight="max-h-[90vh]"
          bodyClassName="p-6 bg-white dark:bg-slate-900 overflow-y-auto"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-white/10">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">ກຳໄລໃນກະເປົາປັດຈຸບັນ</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {(totalShopProfit - totalWithdrawn).toLocaleString()} ₭
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-white/10">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">ເບີກປັນຜົນໄປແລ້ວ</div>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400">-{totalWithdrawn.toLocaleString()} ₭</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-500/30 p-4 rounded-lg">
              <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">ກຳໄລສຸດທິທັງໝົດ (100%)</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{totalShopProfit.toLocaleString()} ₭</div>
            </div>
          </div>

          {/* Partners Table */}
          {wallets.filter((w) => w.type === 'partner').length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              ຍັງບໍ່ມີຮຸ້ນສ່ວນ · ກົດ "ເພີ່ມກະເປົາ" ເພື່ອເພີ່ມຮຸ້ນສ່ວນ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="p-2">ຊື່ຮຸ້ນສ່ວນ</th>
                    <th className="p-2">ທຶນລົງ</th>
                    <th className="p-2 text-center">ສ່ວນແບ່ງ (%)</th>
                    <th className="p-2 text-right">ຄວນໄດ້ຮັບ</th>
                    <th className="p-2 text-right">ເບີກແລ້ວ</th>
                    <th className="p-2 text-right">ຍອດເຫຼືອ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {wallets
                    .filter((w) => w.type === 'partner')
                    .map((w) => {
                      const percent = w.sharePercent ?? 50;
                      const shouldGet = (totalShopProfit * percent) / 100;
                      const withdrawn = transactions
                        .filter((t) => (t.type === 'profit_split' && t.partnerSplitId === w.id) || t.note?.includes(`[ປັນຜົນຮຸ້ນສ່ວນ: ${w.id}`))
                        .reduce((sum, t) => sum + (Number(t.amount) || Number((t as any).Amount) || 0), 0);
                      const remain = shouldGet - withdrawn;
                      const partnerCapital = getWalletStats(w.id, 'all').capital;

                      return (
                        <tr key={w.id} className="text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-transparent">
                          <td className="p-2 font-bold text-slate-900 dark:text-white">{w.name}</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">{partnerCapital.toLocaleString()} ₭</td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              value={percent}
                              min={0}
                              max={100}
                              onChange={async (e) => {
                                const val = Number(e.target.value);
                                try {
                                  await supabase.from('wallets').update({ share_percent: val }).eq('id', w.id);
                                } catch (err) {
                                  console.error('Error updating share percent:', err);
                                }
                              }}
                              className="w-16 bg-slate-100 dark:bg-slate-800 text-center px-2 py-1 rounded border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                            />
                          </td>
                          <td className="p-2 text-right text-emerald-600 dark:text-emerald-400 font-bold">{shouldGet.toLocaleString()} ₭</td>
                          <td className="p-2 text-right text-rose-600 dark:text-rose-400">{withdrawn.toLocaleString()} ₭</td>
                          <td className={`p-2 text-right font-bold ${remain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {remain.toLocaleString()} ₭
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex justify-between items-center text-sm">
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
              onClick={() => {
                alert('ລະບົບນີ້ພຽງຄຳນວນໃຫ້ເບິ່ງ. ການເບີກຈ່າຍແທ້ ໃຫ້ໄປກົດ "ຖອນອອກ" ທີ່ກະເປົາບໍລິສັດ ແລ້ວຕິກເລືອກ "ປັນຜົນ"');
              }}
            >
              ຮັບຊາບ / ແນະນຳວິທີໂອນ
            </button>
            <span
              className={`px-3 py-1 rounded-full border ${
                totalPercent === 100
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
              }`}
            >
              ລວມ % {totalPercent === 100 ? 'ຄົບ 100% ✓' : `ບໍ່ຄົບ (ປັດຈຸບັນ: ${totalPercent}%)`}
            </span>
          </div>
        </BaseModal>
      )}
    </div>
  );
}
