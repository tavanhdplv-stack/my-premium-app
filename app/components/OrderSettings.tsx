'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  Store,
  Phone,
  DollarSign,
  Clock,
  Percent,
  Ruler,
  Eye,
  Moon,
  Info,
  Loader2,
  CheckCircle,
  XCircle,
  Save,
} from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────
const card =
  'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-sm rounded-2xl p-5 sm:p-6 transition-all';

const inputCls =
  'w-full h-10 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:bg-white dark:focus:bg-slate-800 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10';

const lbl =
  'block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';

const primaryBtn =
  'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0';

const sectionHead =
  'flex items-center gap-2.5 text-[13px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide';

// ── Setting section wrapper ───────────────────────────────────────────────
function SettingSection({
  icon,
  label,
  color,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className={card}>
      <div
        className={`${sectionHead} mb-5 pb-4 border-b border-slate-100 dark:border-white/8`}
      >
        <span
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/60 dark:bg-white/[0.03] border border-slate-100 dark:border-white/8 transition-colors hover:bg-slate-100/60 dark:hover:bg-white/5">
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {label}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {desc}
        </p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${
          checked ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function OrderSettings() {
  // ── State ─────────────────────────────────────────────────────────────
  const [shopName, setShopName] = useState('Tawan East Shop');
  const [shopPhone, setShopPhone] = useState('');
  const [exchangeRate, setExchangeRate] = useState('750');
  const [shippingTime, setShippingTime] = useState('1-2 ອາທິດ');
  const [defaultDeposit, setDefaultDeposit] = useState('0');
  const [availableSizes, setAvailableSizes] = useState('S, M, L, XL, XXL');
  const [showProfit, setShowProfit] = useState(true);
  const [darkDefault, setDarkDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | '';
    text: string;
  }>({ type: '', text: '' });

  // ── Cleanup ref for toast timeout ────────────────────────────────────
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load from Firestore ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: d, error } = await supabase.from('system').select('*').eq('id', 'settings').single();
        if (d) {
          setShopName(d.shop_name || 'Tawan East Shop');
          setShopPhone(d.shop_phone || '');
          setExchangeRate(String(d.exchange_rate || 750));
          setShippingTime(d.shipping_time || '1-2 ອາທິດ');
          setDefaultDeposit(String(d.default_deposit || 0));
          setAvailableSizes(d.available_sizes || 'S, M, L, XL, XXL');
          setShowProfit(d.show_profit !== false);
          setDarkDefault(d.dark_default || false);
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production')
          console.error('[OrderSettings] load error:', e);
        setMessage({
          type: 'error',
          text: '⚠️ ໂຫລດການຕັ້ງຄ່າບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່ອີກຄັ້ງ',
        });
      } finally {
        setFetching(false);
      }
    })();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // ── Save to Firestore ─────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase.from('system').update({
        shop_name: shopName,
        shop_phone: shopPhone,
        exchange_rate: parseFloat(exchangeRate) || 0,
        shipping_time: shippingTime,
        default_deposit: parseFloat(defaultDeposit) || 0,
        available_sizes: availableSizes,
        show_profit: showProfit,
        dark_default: darkDefault,
        updated_at: new Date().toISOString(),
      }).eq('id', 'settings');
      if (error) throw error;
      // Also save shopName/shopPhone to localStorage for copy-text use
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('shopName', shopName);
          localStorage.setItem('shopPhone', shopPhone);
        } catch {
          // localStorage may be unavailable in restricted environments
        }
      }
      setMessage({
        type: 'success',
        text: 'ບັນທຶກການຕັ້ງຄ່າລະບົບສຳເລັດແລ້ວ!',
      });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(
        () => setMessage({ type: '', text: '' }),
        3500
      );
    } catch {
      setMessage({
        type: 'error',
        text: 'ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່',
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
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
          icon={<Store className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>ຊື່ຮ້ານຄ້າ</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Tawan East Shop"
                className={inputCls}
              />
            </div>
            <div>
              <label className={lbl}>ເບີໂທຮ້ານ</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  placeholder="020..."
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>
          </div>
          <div>
            <label className={lbl}>ອັດຕາແລກປ່ຽນ (1 THB = ? LAK)</label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                inputMode="decimal"
                value={exchangeRate ? String(exchangeRate).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, '');
                  if (/^-?\d*\.?\d*$/.test(raw)) setExchangeRate(raw);
                }}
                placeholder="750"
                className={`${inputCls} pl-10`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                LAK/THB
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              ໃຊ້ຄຳນວນ COD ແລະ ສະແດງຜົນລາຄາ
            </p>
          </div>
        </SettingSection>

        {/* ── Section 2: Order Conditions ── */}
        <SettingSection
          label="ເງື່ອນໄຂສັ່ງຊື້"
          color="bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
          icon={<Clock className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>ໄລຍະເວລາລໍຄອຍ</label>
              <input
                type="text"
                value={shippingTime}
                onChange={(e) => setShippingTime(e.target.value)}
                placeholder="1-2 ອາທິດ"
                className={inputCls}
              />
            </div>
            <div>
              <label className={lbl}>ມັດຈຳເລີ່ມຕົ້ນ (%)</label>
              <div className="relative">
                <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={defaultDeposit}
                  onChange={(e) => setDefaultDeposit(e.target.value)}
                  placeholder="0"
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>
          </div>
          <div>
            <label className={lbl}>ໄຊ້ສິນຄ້າທີ່ມີ (ໃຊ້ , ຄັ່ນ)</label>
            <div className="relative">
              <Ruler className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={availableSizes}
                onChange={(e) => setAvailableSizes(e.target.value)}
                placeholder="S, M, L, XL, XXL"
                className={`${inputCls} pl-10`}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {availableSizes
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => (
                  <span
                    key={s}
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5"
                  >
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
          icon={<Eye className="w-5 h-5" />}
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
        <div className={card}>
          <div className={`${sectionHead} mb-4`}>
            <span className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
              <Info className="w-5 h-5" />
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
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-3 bg-slate-50/60 dark:bg-white/[0.03] border border-slate-100 dark:border-white/8"
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5 tabular-nums">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-50/80 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                : 'bg-rose-50/80 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {/* Save button */}
        <button
          type="submit"
          disabled={loading}
          className={`${primaryBtn} w-full`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              ກຳລັງບັນທຶກ...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              ບັນທຶກການຕັ້ງຄ່າລະບົບ
            </>
          )}
        </button>
      </form>
    </div>
  );
}