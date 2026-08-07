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
  Bell,
  Loader2,
  CheckCircle,
  XCircle,
  Save,
  Image as ImageIcon,
  UploadCloud,
} from 'lucide-react';
import { uploadImageDirect } from '@/app/lib/uploadImage';

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
  const [shopName, setShopName] = useState('PreOrder');
  const [shopPhone, setShopPhone] = useState('');
  const [exchangeRate, setExchangeRate] = useState('750');
  const [shippingTime, setShippingTime] = useState('1-2 ອາທິດ');
  const [defaultDeposit, setDefaultDeposit] = useState('0');
  const [availableSizes, setAvailableSizes] = useState('S, M, L, XL, XXL');
  const [showProfit, setShowProfit] = useState(true);
  const [darkDefault, setDarkDefault] = useState(false);
  const [notifyDelay, setNotifyDelay] = useState('0'); // local setting
  const [banners, setBanners] = useState<string[]>([]); // global setting array
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | '';
    text: string;
  }>({ type: '', text: '' });

  // ── Cleanup ref for toast timeout ────────────────────────────────────
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load from Firestore & Global Notes ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: d, error } = await supabase.from('system').select('*').eq('id', 'settings').single();
        if (d) {
          setShopName(d.shop_name || 'PreOrder');
          setShopPhone(d.shop_phone || '');
          setExchangeRate(String(d.exchange_rate || 750));
          setShippingTime(d.shipping_time || '1-2 ອາທິດ');
          setDefaultDeposit(String(d.default_deposit || 0));
          setAvailableSizes(d.available_sizes || 'S, M, L, XL, XXL');
          setShowProfit(d.show_profit !== false);
          setDarkDefault(d.dark_default || false);
        }
        
        // Load Global Notify Delay from Notes
        const { data: noteData } = await supabase.from('notes').select('*').eq('title', '___SYSTEM_SETTINGS___').maybeSingle();
        if (noteData && noteData.content) {
          try {
            const settings = JSON.parse(noteData.content);
            if (settings.notifyDelay !== undefined) setNotifyDelay(String(settings.notifyDelay));
          } catch (err) {}
        } else {
          // Fallback to localStorage if no global setting yet
          if (typeof window !== 'undefined') {
            const storedDelay = localStorage.getItem('notifyDelay');
            if (storedDelay) setNotifyDelay(storedDelay);
          }
        }

        // Load Global Banners
        const { data: bannerData } = await supabase.from('notes').select('*').eq('title', '___BANNERS___').maybeSingle();
        if (bannerData && bannerData.content) {
          try {
            const loadedBanners = JSON.parse(bannerData.content);
            if (Array.isArray(loadedBanners)) setBanners(loadedBanners);
          } catch (err) {}
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
      // 1. Try to update system table (might fail if table doesn't exist yet)
      const { error: sysError } = await supabase.from('system').update({
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
      
      if (sysError && sysError.code !== 'PGRST205') {
        console.error('[OrderSettings] system update error:', sysError);
      }
      
      // 2. Save global notify settings to notes
      const globalSettings = { notifyDelay: parseInt(notifyDelay || '0', 10) };
      const { data: existingNote } = await supabase.from('notes').select('id').eq('title', '___SYSTEM_SETTINGS___').maybeSingle();
      if (existingNote) {
        const { error: updateNoteErr } = await supabase.from('notes').update({ content: JSON.stringify(globalSettings) }).eq('id', existingNote.id);
        if (updateNoteErr) throw updateNoteErr;
      } else {
        const { error: insertNoteErr } = await supabase.from('notes').insert([{ title: '___SYSTEM_SETTINGS___', content: JSON.stringify(globalSettings) }]);
        if (insertNoteErr) throw insertNoteErr;
      }

      // 3. Save global banners to notes
      const { data: existingBannerNote } = await supabase.from('notes').select('id').eq('title', '___BANNERS___').maybeSingle();
      if (existingBannerNote) {
        const { error: updateBannerErr } = await supabase.from('notes').update({ content: JSON.stringify(banners) }).eq('id', existingBannerNote.id);
        if (updateBannerErr) throw updateBannerErr;
      } else {
        const { error: insertBannerErr } = await supabase.from('notes').insert([{ title: '___BANNERS___', content: JSON.stringify(banners) }]);
        if (insertBannerErr) throw insertBannerErr;
      }

      // 4. Save shopName/shopPhone to localStorage for copy-text use
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('shopName', shopName);
          localStorage.setItem('shopPhone', shopPhone);
          localStorage.setItem('notifyDelay', notifyDelay);
        } catch {
          // ignore
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
    } catch (err: any) {
      console.error('[OrderSettings] save error:', err);
      setMessage({
        type: 'error',
        text: `ເກີດຂໍ້ຜິດພາດ: ${err?.message || 'ກະລຸນາລອງໃໝ່'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Banner Upload ──────────────────────────────────────────────
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    setMessage({ type: '', text: '' });
    try {
      const url = await uploadImageDirect(file);
      setBanners(prev => [...prev, url]);
      setMessage({ type: 'success', text: 'ອັບໂຫຼດຮູບພາບສຳເລັດແລ້ວ! ຢ່າລືມກົດບັນທຶກ' });
    } catch (err: any) {
      console.error('[OrderSettings] upload error:', err);
      setMessage({ type: 'error', text: `ອັບໂຫຼດບໍ່ສຳເລັດ: ${err.message || 'ລອງໃໝ່ອີກຄັ້ງ'}` });
    } finally {
      setUploadingBanner(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
                placeholder="PreOrder"
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

        {/* ── Section 3: Notifications (Global) ── */}
        <SettingSection
          label="ການແຈ້ງເຕືອນ (ມີຜົນກັບທຸກເຄື່ອງ)"
          color="bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400"
          icon={<Bell className="w-5 h-5" />}
        >
          <div>
            <label className={lbl}>ເວລາໜ່ວງການແຈ້ງເຕືອນ (ພາຍຫຼັງປ່ຽນເປັນ "ສົ່ງບິນແລ້ວ")</label>
            <div className="relative mb-3">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={['0', '5', '15', '30', '60', '120', '1440', '2880', '4320', '5760'].includes(notifyDelay) ? notifyDelay : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setNotifyDelay(e.target.value);
                  } else {
                    setNotifyDelay(''); // Clear for custom input
                  }
                }}
                className={`${inputCls} pl-10 appearance-none`}
              >
                <option value="0">ສະແດງທັນທີ (Real-time)</option>
                <option value="5">ຫຼັງຈາກ 5 ນາທີ</option>
                <option value="15">ຫຼັງຈາກ 15 ນາທີ</option>
                <option value="30">ຫຼັງຈາກ 30 ນາທີ</option>
                <option value="60">ຫຼັງຈາກ 1 ຊົ່ວໂມງ</option>
                <option value="120">ຫຼັງຈາກ 2 ຊົ່ວໂມງ</option>
                <option value="1440">ຫຼັງຈາກ 1 ມື້ (24 ຊົ່ວໂມງ)</option>
                <option value="2880">ຫຼັງຈາກ 2 ມື້ (48 ຊົ່ວໂມງ)</option>
                <option value="4320">ຫຼັງຈາກ 3 ມື້ (72 ຊົ່ວໂມງ)</option>
                <option value="5760">ຫຼັງຈາກ 4 ມື້ (96 ຊົ່ວໂມງ)</option>
                <option value="custom">ກຳນົດເວລາເອງ... (Custom)</option>
              </select>
            </div>
            
            {!['0', '5', '15', '30', '60', '120', '1440', '2880', '4320', '5760'].includes(notifyDelay) && (
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  min="0"
                  value={notifyDelay}
                  onChange={(e) => setNotifyDelay(e.target.value)}
                  placeholder="ລະບຸຈຳນວນນາທີ..."
                  className={inputCls}
                />
                <span className="text-sm text-slate-500 font-medium whitespace-nowrap">ນາທີ</span>
              </div>
            )}
            
            <p className="text-xs text-slate-400">
              ກຳນົດວ່າຈະໃຫ້ປ້າຍແຈ້ງເຕືອນສີແດງສະແດງຕອນໃດ ພາຍຫຼັງກົດສົ່ງບິນແລ້ວ. <br/>(ການຕັ້ງຄ່ານີ້ຈະມີຜົນກັບທຸກເຄື່ອງທີ່ເຂົ້າໃຊ້ງານ)
            </p>
          </div>
        </SettingSection>

        {/* ── Section: Banner Ad ── */}
        <SettingSection
          label="ປ້າຍໂຄສະນາ (Banner Ads)"
          color="bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400"
          icon={<ImageIcon className="w-5 h-5" />}
        >
          <div>
            <label className={lbl}>URL ຮູບພາບໂຄສະນາ (ສະແດງໜ້າຫຼັກ, ສູງສຸດ 5 ປ້າຍ)</label>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  id="newBannerUrl"
                  placeholder="https://... (ໃສ່ລິ້ງ ຫຼື ອັບໂຫຼດ)"
                  className={`${inputCls} pl-10`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value;
                      if (val && banners.length < 5) {
                        setBanners(prev => [...prev, val]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleBannerUpload} 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('newBannerUrl') as HTMLInputElement;
                  if (input && input.value && banners.length < 5) {
                    setBanners(prev => [...prev, input.value]);
                    input.value = '';
                  } else if (banners.length < 5) {
                    fileInputRef.current?.click();
                  }
                }}
                disabled={uploadingBanner || banners.length >= 5}
                className="flex items-center justify-center gap-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                {uploadingBanner ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    ເພີ່ມ
                  </>
                )}
              </button>
            </div>
            
            {banners.length > 0 && (
              <div className="space-y-3 mb-4">
                {banners.map((url, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group aspect-[2/1] max-w-sm">
                    <img src={url} alt={`Banner ${idx+1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setBanners(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-rose-500/90 text-white flex items-center justify-center shadow-md backdrop-blur-sm hover:bg-rose-600 transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
              <strong className="text-slate-700 dark:text-slate-200 block mb-1">💡 ຄຳແນະນຳຂະໜາດຮູບພາບ:</strong>
              • ຂະໜາດທີ່ເໝາະສົມ: <strong>800 x 400 pixels</strong> (ອັດຕາສ່ວນ 2:1)<br/>
              • ຖ້າບໍ່ມີປ້າຍໂຄສະນາ ລະບົບຈະສະແດງປ້າຍຂໍ້ຄວາມມາດຕະຖານແທນ<br/>
              • ສາມາດອັບໂຫຼດຮູບ ຫຼື ເອົາລິ້ງຮູບຈາກບ່ອນອື່ນມາໃສ່ ແລ້ວກົດ Enter ໄດ້
            </div>
          </div>
        </SettingSection>

        {/* ── Section 4: Display & UI ── */}
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