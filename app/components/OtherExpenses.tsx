'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, onSnapshot, addDoc, query, orderBy, deleteDoc, doc } from 'firebase/firestore';

interface Wallet {
  id: string;
  name: string;
  type: string;
}

interface ExpenseTransaction {
  id: string;
  note: string;
  amount: number;
  walletId: string;
  date: string;
  type: string;
}

export default function OtherExpenses() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ExpenseTransaction[]>([]);

  useEffect(() => {
    const unsubWallets = onSnapshot(collection(db, 'wallets'), (snap) => {
      const w: Wallet[] = [];
      snap.forEach(d => w.push({ id: d.id, name: d.data().name, type: d.data().type }));
      setWallets(w);
      if (w.length > 0 && !walletId) {
        const comp = w.find(x => x.type === 'W-COMP');
        setWalletId(comp ? comp.id : w[0].id);
      }
    });

    const unsubHistory = onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc')), (snap) => {
      const h: ExpenseTransaction[] = [];
      snap.forEach(d => {
        const data = d.data();
        // Ignore order expenses which usually start with 'Order #' or are related to orders
        if (data.type === 'expense' && !data.note.startsWith('Order #')) {
          h.push({
            id: d.id,
            note: data.note,
            amount: Number(data.amount) || 0,
            walletId: data.walletId,
            date: data.date,
            type: data.type
          });
        }
      });
      setHistory(h);
    });

    return () => {
      unsubWallets();
      unsubHistory();
    };
  }, [walletId]);

  const handleSave = async () => {
    if (!name || !amount || !walletId) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        type: 'expense',
        note: name,
        amount: Number(amount),
        walletId: walletId,
        date: new Date().toISOString()
      });
      setName('');
      setAmount('');
    } catch (error) {
      console.error(error);
      alert('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບລາຍການນີ້? (ເງິນຈະຖືກຄືນເຂົ້າກະເປົາ)')) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (e) {
      console.error(e);
    }
  };

  const field = "w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 outline-none transition-all";
  const label = "block text-[11px] font-bold text-slate-500 mb-1.5";

  return (
    <>
      <div className="bg-white dark:bg-slate-900/50 rounded-[24px] p-4 sm:p-5 border border-slate-200/80 dark:border-white/5 shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center gap-5">
        
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
            <input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className={field} />
          </div>
          <div className="w-full md:w-[200px]">
            <label className={label}>ຫັກຈາກກະເປົາ</label>
            <div className="relative">
              <select value={walletId} onChange={e => setWalletId(e.target.value)} className={`${field} appearance-none pr-10 font-bold text-violet-700 dark:text-violet-400`}>
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
            disabled={!name || !amount || !walletId || loading}
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

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-2xl max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-[#FF7A50]"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ປະຫວັດລາຍຈ່າຍອື່ນໆ
              </h3>
              <button onClick={() => setShowHistory(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500"><svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {history.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">ຍັງບໍ່ມີປະຫວັດລາຍຈ່າຍ</div>
              ) : (
                <div className="space-y-1">
                  {history.map(item => {
                    const w = wallets.find(x => x.id === item.walletId);
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
                        <div>
                          <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.note}</div>
                          <div className="text-[11px] text-slate-500 flex gap-2 mt-0.5">
                            <span>{new Date(item.date).toLocaleString('en-GB')}</span>
                            <span>•</span>
                            <span>ກະເປົາ: {w?.name || 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-extrabold text-rose-500">-{item.amount.toLocaleString()}</span>
                          <button onClick={() => handleDelete(item.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
