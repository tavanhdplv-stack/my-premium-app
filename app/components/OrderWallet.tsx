'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, onSnapshot, addDoc, setDoc, doc } from 'firebase/firestore';

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
export default function OrderWallet() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));

  // Modal States
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [showTransModal, setShowTransModal] = useState<{ type: 'income' | 'expense'; walletId: string } | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<Wallet | null>(null);
  const [showProfitSplit, setShowProfitSplit] = useState(false);

  // Form States
  const [newWalletName, setNewWalletName] = useState('');
  const [transAmount, setTransAmount] = useState('');
  const [transNote, setTransNote] = useState('');
  const [isProfitSplitTrans, setIsProfitSplitTrans] = useState(false);
  const [splitPartnerId, setSplitPartnerId] = useState('');

  // --- Firestore Real-time Subscriptions ---
  useEffect(() => {
    // 1. Wallets subscription
    const unsubscribeWallets = onSnapshot(collection(db, 'wallets'), (snapshot) => {
      const walletList: Wallet[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        walletList.push({
          id: docSnap.id,
          name: data.name,
          type: data.type,
          sharePercent: data.sharePercent !== undefined ? data.sharePercent : 50,
          createdAt: data.createdAt,
        });
      });

      if (walletList.length === 0) {
        // Seed main wallet if Firestore is empty
        setDoc(doc(db, 'wallets', 'W-COMP'), {
          name: 'ກະເປົາບໍລິສັດ',
          type: 'W-COMP',
          sharePercent: 100,
          createdAt: new Date().toISOString(),
        }).catch((err) => console.error('Error seeding main wallet:', err));
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
    });

    // 2. Transactions subscription
    const unsubscribeTrans = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const transList: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        transList.push({
          id: docSnap.id,
          walletId: data.walletId,
          type: data.type,
          amount: Number(data.amount) || 0,
          note: data.note || '',
          date: data.date || new Date().toISOString(),
          partnerSplitId: data.partnerSplitId || undefined,
        });
      });
      transList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(transList);
    });

    // 3. Orders subscription (คำนวณกำไรจริงจาก orders)
    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const orderList: any[] = [];
      snapshot.forEach((docSnap) => {
        orderList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setOrders(orderList);
    });

    return () => {
      unsubscribeWallets();
      unsubscribeTrans();
      unsubscribeOrders();
    };
  }, []);

  // --- คำนวณยอดกระเป๋า (Orders + Transactions) ---
  const getWalletStats = (walletId: string, month: string): WalletStats => {
    let bal = 0, inAmt = 0, outAmt = 0, cap = 0;

    // 1. จากรายการธุรกรรมทำมือ
    transactions.forEach((t) => {
      if (month !== 'all' && t.date.slice(0, 7) !== month) return;
      if (t.walletId !== walletId) return;

      if (t.type === 'income') {
        bal += t.amount;
        inAmt += t.amount;
        if (!t.note.includes('ຄືນທຶນ')) cap += t.amount;
      } else if (t.type === 'expense' || t.type === 'profit_split') {
        bal -= t.amount;
        outAmt += t.amount;
      }
    });

    // 2. จากการดำเนินงานออเดอร์จริง
    const walletObj = wallets.find((w) => w.id === walletId);
    if (walletObj) {
      orders.forEach((o) => {
        if (o.status === 'ຍົກເລີກອໍເດີ') return;
        if (month !== 'all' && o.orderDate && o.orderDate.slice(0, 7) !== month) return;

        let match = false;
        if (walletObj.type === 'W-COMP') {
          match = o.wallet?.includes('ບໍລິສັດ') || o.wallet?.includes('BCEL') || !o.wallet;
        } else {
          const cleanPartnerName = walletObj.name.split(/[(\s]/)[0];
          match = o.wallet?.includes(cleanPartnerName);
        }

        if (match) {
          const income =
            o.paymentMethod === 'ຈ່າຍແລ້ວ'
              ? Number(o.price) || 0
              : Number(o.deposit) || 0;
          bal += income;
          inAmt += income;

          const cost =
            (Number(o.totalCost) || 0) +
            (Number(o.shippingFee) || 0) +
            (Number(o.totalExpenses) || 0);
          bal -= cost;
          outAmt += cost;
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
      .reduce((sum, o) => sum + (Number(o.totalProfit) || 0), 0);
  }, [orders]);

  const totalWithdrawn = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'profit_split')
      .reduce((sum, t) => sum + t.amount, 0);
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
      await setDoc(doc(db, 'wallets', walletId), {
        name: newWalletName.trim(),
        type: 'partner',
        sharePercent: 50,
        createdAt: new Date().toISOString(),
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
      await addDoc(collection(db, 'transactions'), {
        walletId: showTransModal.walletId,
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
        partnerSplitId: isProfitSplitTrans ? splitPartnerId : null,
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
                className={`rounded-2xl p-5 shadow-xl border transition-all duration-200 relative group ${
                  isMain
                    ? 'bg-gradient-to-br from-slate-900 to-indigo-950 border-indigo-500/50'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                }`}
              >
                {isMain && (
                  <span className="absolute top-4 right-4 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    👑 ກະເປົາຫຼັກ
                  </span>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white">{wallet.name}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">{wallet.id}</p>
                </div>

                <div className="mb-4">
                  <span className="text-xs text-slate-400">ຍອດຄົງເຫຼືອ ({monthFilter === 'all' ? 'ທັງໝົດ' : monthFilter})</span>
                  <p className={`text-3xl font-black font-mono ${stats.bal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stats.bal.toLocaleString()} ₭
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-black/20 rounded-lg p-2">
                    <p className="text-[10px] text-slate-400">ທຶນແທ້</p>
                    <p className="text-xs font-bold text-blue-300">{stats.capital.toLocaleString()}</p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <p className="text-[10px] text-slate-400">ຮັບເຂົ້າ</p>
                    <p className="text-xs font-bold text-emerald-400">+{stats.in.toLocaleString()}</p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <p className="text-[10px] text-slate-400">ຈ່າຍອອກ</p>
                    <p className="text-xs font-bold text-rose-400">-{stats.out.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTransModal({ type: 'income', walletId: wallet.id })}
                    className="flex-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-2 rounded-lg hover:bg-emerald-500/20 font-bold transition"
                  >
                    ເຕີມທຶນ
                  </button>
                  <button
                    onClick={() => setShowTransModal({ type: 'expense', walletId: wallet.id })}
                    className="flex-1 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 py-2 rounded-lg hover:bg-rose-500/20 font-bold transition"
                  >
                    ຖອນອອກ
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(wallet)}
                    className="text-xs bg-white/5 text-slate-300 border border-white/10 py-2 px-3 rounded-lg hover:bg-white/10 transition"
                  >
                    ລາຍລະອຽດ
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Recent Transactions Summary */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-white/5">
          📋 ລາຍການທຸລະກຳລ່າສຸດ
        </h3>
        {transactions.length === 0 ? (
          <p className="text-center py-8 text-slate-500 text-sm">ຍັງບໍ່ມີລາຍການທຸລະກຳ</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {transactions.slice(0, 15).map((t) => {
              const wallet = wallets.find((w) => w.id === t.walletId);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        t.type === 'income'
                          ? 'bg-emerald-400'
                          : t.type === 'profit_split'
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                    />
                    <div>
                      <p className="text-slate-200 font-medium">{t.note || (t.type === 'income' ? 'ເຕີມທຶນ' : 'ຖອນອອກ')}</p>
                      <p className="text-[10px] text-slate-500">
                        {wallet?.name || t.walletId} · {new Date(t.date).toLocaleDateString('lo-LA')}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-mono font-bold text-sm ${
                      t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} ₭
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}

      {/* Add Wallet Modal */}
      {showAddWallet && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddWallet(false)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">ສ້າງກະເປົາ / ເພີ່ມຫຸ້ນສ່ວນ</h3>
            <label className="block text-xs text-slate-400 mb-1">ຊື່ກະເປົາ / ຊື່ຫຸ້ນສ່ວນ</label>
            <input
              type="text"
              value={newWalletName}
              onChange={(e) => setNewWalletName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddWallet()}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white mb-4 outline-none focus:border-blue-500"
              placeholder="ເຊັ່ນ: ສົມຊາຍ"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddWallet(false)}
                className="flex-1 bg-white/5 text-slate-300 border border-white/10 py-2 rounded-lg hover:bg-white/10 font-bold"
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
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowTransModal(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">
              {showTransModal.type === 'income' ? '💰 ເຕີມທຶນເຂົ້າກະເປົາ' : '💸 ຖອນເງິນອອກຈາກກະເປົາ'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              ກະເປົາ: <span className="text-white font-bold">{wallets.find((w) => w.id === showTransModal.walletId)?.name}</span>
            </p>

            <input
              type="number"
              value={transAmount}
              onChange={(e) => setTransAmount(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-4 text-3xl text-center text-white mb-4 outline-none focus:border-blue-500 font-mono"
              placeholder="0"
              autoFocus
            />

            <input
              type="text"
              value={transNote}
              onChange={(e) => setTransNote(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white mb-4 outline-none focus:border-blue-500"
              placeholder="ໝາຍເຫດ..."
            />

            {/* ตัวเลือกปันผลพาร์ทเนอร์ สำหรับ W-COMP ถอน */}
            {showTransModal.type === 'expense' && showTransModal.walletId === 'W-COMP' && (
              <div className="mb-4 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                <label className="flex items-center gap-2 text-sm text-amber-400 cursor-pointer">
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
                    className="w-full mt-2 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"
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
                className="flex-1 bg-white/5 text-slate-300 border border-white/10 py-3 rounded-lg hover:bg-white/10 font-bold"
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
          </div>
        </div>
      )}

      {/* Wallet Details Modal */}
      {showDetailsModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailsModal(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">ປະຫວັດກະເປົາ: {showDetailsModal.name}</h3>
                <p className="text-xs text-slate-500">{showDetailsModal.id}</p>
              </div>
              <button onClick={() => setShowDetailsModal(null)} className="text-slate-400 hover:text-white text-2xl">
                &times;
              </button>
            </div>

            {/* Stats summary */}
            {(() => {
              const allStats = getWalletStats(showDetailsModal.id, 'all');
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">ຍອດຄົງເຫຼືອ</p>
                    <p className={`text-lg font-bold font-mono ${allStats.bal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {allStats.bal.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">ທຶນລົງ</p>
                    <p className="text-lg font-bold font-mono text-blue-300">{allStats.capital.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">ຮັບເຂົ້າທັງໝົດ</p>
                    <p className="text-lg font-bold font-mono text-emerald-400">+{allStats.in.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">ຈ່າຍອອກທັງໝົດ</p>
                    <p className="text-lg font-bold font-mono text-rose-400">-{allStats.out.toLocaleString()}</p>
                  </div>
                </div>
              );
            })()}

            {/* Transaction history */}
            <h4 className="text-sm font-bold text-slate-300 mb-3">ລາຍການທຸລະກຳ</h4>
            {getWalletTransactions(showDetailsModal.id).length === 0 ? (
              <p className="text-center py-6 text-slate-500 text-sm">ຍັງບໍ່ມີລາຍການ</p>
            ) : (
              <div className="space-y-2">
                {getWalletTransactions(showDetailsModal.id).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-sm py-2 border-b border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          t.type === 'income'
                            ? 'bg-emerald-400'
                            : t.type === 'profit_split'
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`}
                      />
                      <div>
                        <p className="text-slate-200">{t.note || t.type}</p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(t.date).toLocaleString('lo-LA')}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} ₭
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profit Split Modal */}
      {showProfitSplit && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowProfitSplit(false)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">ລະບົບແບ່ງຜົນຮຸ້ນສ່ວນ (Profit Split)</h3>
              <button onClick={() => setShowProfitSplit(false)} className="text-slate-400 hover:text-white text-2xl">
                &times;
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="text-xs text-slate-400 mb-1">ກຳໄລໃນກະເປົາປັດຈຸບັນ</div>
                <div className="text-xl font-bold text-emerald-400">
                  {(totalShopProfit - totalWithdrawn).toLocaleString()} ₭
                </div>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="text-xs text-slate-400 mb-1">ເບີກປັນຜົນໄປແລ້ວ</div>
                <div className="text-xl font-bold text-rose-400">-{totalWithdrawn.toLocaleString()} ₭</div>
              </div>
              <div className="bg-blue-900/50 border border-blue-500/30 p-4 rounded-lg">
                <div className="text-xs text-blue-300 mb-1">ກຳໄລສຸດທິທັງໝົດ (100%)</div>
                <div className="text-xl font-bold text-white">{totalShopProfit.toLocaleString()} ₭</div>
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
                  <thead className="text-xs text-slate-400 uppercase border-b border-white/10">
                    <tr>
                      <th className="p-2">ຊື່ຮຸ້ນສ່ວນ</th>
                      <th className="p-2">ທຶນລົງ</th>
                      <th className="p-2 text-center">ສ່ວນແບ່ງ (%)</th>
                      <th className="p-2 text-right">ຄວນໄດ້ຮັບ</th>
                      <th className="p-2 text-right">ເບີກແລ້ວ</th>
                      <th className="p-2 text-right">ຍອດເຫຼືອ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {wallets
                      .filter((w) => w.type === 'partner')
                      .map((w) => {
                        const percent = w.sharePercent ?? 50;
                        const shouldGet = (totalShopProfit * percent) / 100;
                        const withdrawn = transactions
                          .filter((t) => t.type === 'profit_split' && t.partnerSplitId === w.id)
                          .reduce((sum, t) => sum + t.amount, 0);
                        const remain = shouldGet - withdrawn;
                        const partnerCapital = getWalletStats(w.id, 'all').capital;

                        return (
                          <tr key={w.id} className="text-slate-200">
                            <td className="p-2 font-bold text-white">{w.name}</td>
                            <td className="p-2 text-slate-400">{partnerCapital.toLocaleString()} ₭</td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                value={percent}
                                min={0}
                                max={100}
                                onChange={async (e) => {
                                  const val = Number(e.target.value);
                                  try {
                                    await setDoc(doc(db, 'wallets', w.id), { sharePercent: val }, { merge: true });
                                  } catch (err) {
                                    console.error('Error updating share percent:', err);
                                  }
                                }}
                                className="w-16 bg-slate-800 text-center px-2 py-1 rounded border border-white/10 text-white outline-none"
                              />
                            </td>
                            <td className="p-2 text-right text-emerald-400 font-bold">{shouldGet.toLocaleString()} ₭</td>
                            <td className="p-2 text-right text-rose-400">{withdrawn.toLocaleString()} ₭</td>
                            <td className={`p-2 text-right font-bold ${remain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {remain.toLocaleString()} ₭
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 text-right text-sm">
              <span
                className={`px-3 py-1 rounded-full border ${
                  totalPercent === 100
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                ລວມ % {totalPercent === 100 ? 'ຄົບ 100% ✓' : `ບໍ່ຄົບ (ປັດຈຸບັນ: ${totalPercent}%)`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}