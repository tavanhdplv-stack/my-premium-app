'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// ── Design tokens ─────────────────────────────────────────────────────────
const card    = 'bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-white/8 shadow-sm dark:shadow-none';
const inputCls = 'w-full h-10 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:bg-white dark:focus:bg-slate-800 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10';
const lbl     = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';
const primaryBtn = 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0';
const sectionHead = 'flex items-center gap-2.5 text-[13px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide';

// ── Setting section wrapper ───────────────────────────────────────────────
function SettingSection({ icon, label, color, children }: {
  icon: React.ReactNode;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${card} p-5 sm:p-6`}>
      <div className={`${sectionHead} mb-5 pb-4 border-b border-slate-100 dark:border-white/8`}>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </span>
        {label}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, desc }: {
  checked: boolean; onChange: () => void; label: string; desc: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/8">
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${checked ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

export default function OrderSettings() {
  // ── State ─────────────────────────────────────────────────────────────
  const [shopName,        setShopName]        = useState('Tawan East Shop');
  const [shopPhone,       setShopPhone]       = useState('');
  const [exchangeRate,    setExchangeRate]    = useState('750');
  const [shippingTime,    setShippingTime]    = useState('1-2 ອາທິດ');
  const [defaultDeposit,  setDefaultDeposit]  = useState('0');
  const [availableSizes,  setAvailableSizes]  = useState('S, M, L, XL, XXL');
  const [showProfit,      setShowProfit]      = useState(true);
  const [darkDefault,     setDarkDefault]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [fetching,        setFetching]        = useState(true);
  const [message,         setMessage]         = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // ── Load from Firestore ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'system', 'settings'));
        if (snap.exists()) {
          const d = snap.data();
          setShopName(d.shopName     || 'Tawan East Shop');
          setShopPhone(d.shopPhone   || '');
          setExchangeRate(String(d.exchangeRate || 750));
          setShippingTime(d.shippingTime || '1-2 ອາທິດ');
          setDefaultDeposit(String(d.defaultDeposit || 0));
          setAvailableSizes(d.availableSizes || 'S, M, L, XL, XXL');
          setShowProfit(d.showProfit !== false);
          setDarkDefault(d.darkDefault || false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    })();
  }, []);

  // ── Save to Firestore ─────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await setDoc(doc(db, 'system', 'settings'), {
        shopName, shopPhone,
        exchangeRate: Number(exchangeRate),
        shippingTime,
        defaultDeposit: Number(defaultDeposit),
        availableSizes,
        showProfit, darkDefault,
        updatedAt: new Date(),
      });
      // Also save shopName/shopPhone to localStorage for copy-text use
      if (typeof window !== 'undefined') {
        localStorage.setItem('shopName',  shopName);
        localStorage.setItem('shopPhone', shopPhone);
      }
      setMessage({ type: 'success', text: '✅ ບັນທຶກການຕັ້ງຄ່າລະບົບສຳເລັດແລ້ວ!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3500);
    } catch {
      setMessage({ type: 'error', text: 'ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-sm font-medium">ກຳລັງໂຫຼດການຕັ້ງຄ່າ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 max-w-3xl">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          ຕັ້ງຄ່າລະບົບ
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          ປັບແຕ່ງຂໍ້ມູນຮ້ານ · ເງື່ອນໄຂ · ການສະແດງຜົນ — sync ທຸກເຄື່ອງ Firestore
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Section 1: Shop Info ── */}
        <SettingSection
          label="ຂໍ້ມູນຮ້ານຄ້າ"
          color="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
            </svg>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>ຊື່ຮ້ານຄ້າ</label>
              <input type="text" value={shopName} onChange={e => setShopName(e.target.value)}
                placeholder="Tawan East Shop" className={inputCls} />
            </div>
            <div>
              <label className={lbl}>ເບີໂທຮ້ານ</label>
              <input type="text" value={shopPhone} onChange={e => setShopPhone(e.target.value)}
                placeholder="020..." className={inputCls} />
            </div>
          </div>
          <div>
            <label className={lbl}>ອັດຕາແລກປ່ຽນ (1 THB = ? LAK)</label>
            <div className="relative">
              <input type="number" min="1" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)}
                placeholder="750" className={inputCls} />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">LAK/THB</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">ໃຊ້ຄຳນວນ COD ແລະ ສະແດງຜົນລາຄາ</p>
          </div>
        </SettingSection>

        {/* ── Section 2: Order Conditions ── */}
        <SettingSection
          label="ເງື່ອນໄຂສັ່ງຊື້"
          color="bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>ໄລຍະເວລາລໍຄອຍ</label>
              <input type="text" value={shippingTime} onChange={e => setShippingTime(e.target.value)}
                placeholder="1-2 ອາທິດ" className={inputCls} />
            </div>
            <div>
              <label className={lbl}>ມັດຈຳເລີ່ມຕົ້ນ (%)</label>
              <div className="relative">
                <input type="number" min="0" max="100" value={defaultDeposit} onChange={e => setDefaultDeposit(e.target.value)}
                  placeholder="0" className={inputCls} />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>
          </div>
          <div>
            <label className={lbl}>ໄຊ້ສິນຄ້າທີ່ມີ (ໃຊ້ , ຄັ່ນ)</label>
            <input type="text" value={availableSizes} onChange={e => setAvailableSizes(e.target.value)}
              placeholder="S, M, L, XL, XXL" className={inputCls} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {availableSizes.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                <span key={s} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </SettingSection>

        {/* ── Section 3: Display & UI ── */}
        <SettingSection
          label="ການສະແດງຜົນ & UI"
          color="bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
            </svg>
          }
        >
          <Toggle
            checked={showProfit}
            onChange={() => setShowProfit(!showProfit)}
            label="ສະແດງກຳໄລ / ຕົ້ນທຶນ"
            desc="ເປີດ/ປິດສ່ວນຄຳນວນກຳໄລໃນໜ້າອໍເດີ ແລະ ສາງ"
          />
          <Toggle
            checked={darkDefault}
            onChange={() => setDarkDefault(!darkDefault)}
            label="ໃຊ້ Dark Mode ເປັນຄ່າຕັ້ງຕົ້ນ"
            desc="ເປີດໃຊ້ Dark Mode ໂດຍອັດຕະໂນມັດສຳລັບຜູ້ໃຊ້ໃໝ່"
          />
        </SettingSection>

        {/* ── System Info card ── */}
        <div className={`${card} p-5 sm:p-6`}>
          <div className={`${sectionHead} mb-4`}>
            <span className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </span>
            ຂໍ້ມູນລະບົບ
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Version', value: 'v1.0.0' },
              { label: 'Framework', value: 'Next.js 16' },
              { label: 'Database', value: 'Firebase' },
              { label: 'Storage', value: 'Cloudinary' },
              { label: 'Styling', value: 'Tailwind v4' },
              { label: 'Runtime', value: 'Node.js' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/8">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
          }`}>
            <span className="text-lg">{message.type === 'success' ? '✅' : '❌'}</span>
            {message.text}
          </div>
        )}

        {/* Save button */}
        <button type="submit" disabled={loading} className={`${primaryBtn} w-full`}>
          {loading ? (
            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>ກຳລັງບັນທຶກ...</>
          ) : (
            <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>ບັນທຶກການຕັ້ງຄ່າລະບົບ</>
          )}
        </button>
      </form>
    </div>
  );
}