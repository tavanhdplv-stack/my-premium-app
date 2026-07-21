'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';

// --- Constants ---
const PROVINCES = [
  'ນະຄອນຫຼວງວຽງຈັນ', 'ຜົ້ງສາລີ', 'ຫຼວງນ້ຳທາ', 'ອຸດົມໄຊ', 'ບໍ່ແກ້ວ', 'ຫຼວງພະບາງ', 'ຫົວພັນ', 'ໄຊຍະບູລີ',
  'ຊຽງຂວາງ', 'ວຽງຈັນ', 'ບໍລິຄຳໄຊ', 'ຄຳມ່ວນ', 'ສະຫວັນນະເຂດ', 'ສາລະວັນ', 'ເຊກອງ', 'ຈຳປາສັກ', 'ອັດຕະປື', 'ໄຊສົມບູນ'
];
const TRANSPORTS = ['ANOUSITH Express', 'HAL Express', 'Unt Express', 'ຮຸ່ງອາລຸນ', 'ມີໄຊ', 'ຝາກລົດໂດຍສານ', 'ຮັບເອງ'];
const STATUSES = [
  'ຮັບອໍເດີແລ້ວ',
  'ສົ່ງບິນແລ້ວ',
  'ກວດສອບແລ້ວ',
  'ໂອນມັດຈຳແລ້ວ',
  'ສັ່ງເຄື່ອງແລ້ວ',
  'ເຄື່ອງມາຮອດແລ້ວ',
  'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ',
  'ໄດ້ຮັບເງິນແລ້ວ',
  'ຍົກເລີກອໍເດີ'
];
// WALLETS is now loaded dynamically from Firestore (see state below)

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  cost: number;
  price: number;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
}

// =====================================================================
// Design tokens — one source of truth so every field/card/button in the
// form shares the exact same height, radius, border and focus treatment.
// =====================================================================
const card = 'bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-white/8 shadow-sm dark:shadow-none';
const pad = 'p-5 sm:p-6 lg:p-7';
const label = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5';
const field =
  'w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors duration-150 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10';
const sectionTitle = 'flex items-center gap-2.5 text-[13px] font-bold text-slate-800 uppercase tracking-wide';
const chip = 'w-9 h-9 rounded-xl flex items-center justify-center shrink-0';
const primaryBtn =
  'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-violet-600 text-white text-sm font-bold shadow-md shadow-violet-500/25 hover:bg-violet-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:shadow-none disabled:active:scale-100 motion-reduce:transition-none';
const ghostBtn =
  'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none';

// --- Pure helpers (module scope — no need to recreate on every render) ---
const formatNumber = (num: number | string) => {
  if (!num) return '0';
  return Number(num).toLocaleString('en-US');
};
const parseNumericInput = (val: string): string | null => {
  const raw = val.replace(/,/g, '');
  return isNaN(Number(raw)) ? null : raw;
};

// --- Reusable field primitives ---
function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
}: {
  value: string | number;
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatNumber(value)}
      onChange={(e) => {
        const raw = parseNumericInput(e.target.value);
        if (raw !== null) onChange(raw);
      }}
      placeholder={placeholder}
      className={`${field} text-right tabular-nums font-bold ${className}`}
    />
  );
}

function SelectField({
  value,
  onChange,
  options,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${field} appearance-none pr-9 cursor-pointer ${className}`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

interface WalletOption {
  id: string;
  name: string;
}

export default function OrderForm({ editId }: { editId?: string }) {
  // --- State ---
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Dynamic wallets from Firestore
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);

  // Customer & Order
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [transport, setTransport] = useState(TRANSPORTS[0]);
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState(PROVINCES[0]);

  const [orderDate, setOrderDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [status, setStatus] = useState(STATUSES[0]);
  const [wallet, setWallet] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ຈ່າຍແລ້ວ'>('COD');
  const [deposit, setDeposit] = useState<string>('');
  const [shippingFee, setShippingFee] = useState<string>('');

  // Items & Expenses
  const [items, setItems] = useState<OrderItem[]>([{ id: Date.now().toString(), name: '', qty: 1, cost: 0, price: 0 }]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const [imageUrl, setImageUrl] = useState<string>('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Load wallets from Firestore
  useEffect(() => {
    const q = query(collection(db, 'wallets'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: WalletOption[] = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setWalletOptions(list);
      // Auto-select first wallet if none selected yet
      setWallet(prev => prev || list[0]?.name || '');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const resetForm = () => {
    setRawText('');
    setCustomerName(''); setPhone(''); setVillage(''); setDistrict('');
    setItems([{ id: Date.now().toString(), name: '', qty: 1, cost: 0, price: 0 }]);
    setDeposit(''); setShippingFee(''); setPaymentMethod('COD');
    setExpenses([]); setExpenseName(''); setExpenseAmount('');
    setImageUrl('');
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl('');
    }
    setMessage({ type: '', text: '' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: '❌ ກະລຸນາເລືອກໄຟລ໌ຮູບພາບເທົ່ານັ້ນ' });
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    setImageUrl('');
    setIsUploading(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || res.statusText || 'Upload failed');
      }

      if (data.url) {
        setImageUrl(data.url);
        setMessage({ type: 'success', text: '✅ ອັບໂຫຼດຮູບສຳເລັດ!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 2500);
      } else {
        throw new Error(data.error || 'Unknown upload response');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setMessage({ type: 'error', text: `❌ ເກີດຂໍ້ຜິດພາດໃນການອັບໂຫຼດຮູບ: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl('');
    }
    setImageUrl('');
  };

  // --- AI Parser Logic (unchanged) ---
  const handleParseData = () => {
    if (!rawText.trim()) return;
    let t = rawText;

    const phoneMatch = t.match(/(020|030)\d{7,8}/);
    if (phoneMatch) setPhone(phoneMatch[0]);

    const nameMatch = t.match(/(?:ຊື່ລູກຄ້າ|ຊື່|Name)[:\s]*([^\n]+)/i);
    if (nameMatch) setCustomerName(nameMatch[1].trim());

    const villageMatch = t.match(/(?:ບ້ານ|ບ\.)[:\s]*([^\n ,]+)/i);
    if (villageMatch) setVillage(villageMatch[1].trim());
    const districtMatch = t.match(/(?:ເມືອງ|ມ\.)[:\s]*([^\n ,]+)/i);
    if (districtMatch) setDistrict(districtMatch[1].trim());

    if (t.toUpperCase().includes('ANOUSITH') || t.includes('ອານຸສິດ') || t.includes('ສາຂາ')) setTransport('ANOUSITH Express');
    else if (t.toUpperCase().includes('HAL') || t.includes('ຮຸ່ງອາລຸນ')) setTransport('HAL Express');

    const depositMatch = t.match(/(?:ມັດຈຳ|ວາງມັດຈຳ)[:\s]*([\d,]+)/);
    if (depositMatch) setDeposit(depositMatch[1].replace(/,/g, ''));

    if (t.includes('ຈ່າຍແລ້ວ') || t.includes('ໂອນແລ້ວ')) setPaymentMethod('ຈ່າຍແລ້ວ');

    const lines = t.split('\n');
    const newItems: OrderItem[] = [];
    const ignoreWords = ['ຊື່', 'ເບີ', 'ບ້ານ', 'ເມືອງ', 'ແຂວງ', 'ມັດຈຳ', 'ສາຂາ', 'ໂອນ', 'ຈ່າຍ'];

    lines.forEach(line => {
      const isIgnore = ignoreWords.some(w => line.includes(w));
      if (!isIgnore && line.length > 3) {
        let qty = 1;
        const qtyMatch = line.match(/(?:x|X)\s*(\d+)|\s*(\d+)\s*(?:x|X|ໜ່ວຍ|ໂຕ|ອັນ)/);
        if (qtyMatch) qty = Number(qtyMatch[1] || qtyMatch[2]);

        let price = 0;
        const priceMatch = line.match(/(\d{2,3}(?:,\d{3})+|\d{4,})/);
        if (priceMatch) price = Number(priceMatch[1].replace(/,/g, ''));

        let name = line.replace(/(?:x|X)\s*\d+|\s*\d+\s*(?:x|X|ໜ່ວຍ|ໂຕ|ອັນ)/g, '')
                       .replace(/\d{2,3}(?:,\d{3})+|\d{4,}/g, '')
                       .replace(/ກີບ|kip|ລວມ/gi, '')
                       .trim();
        name = name.replace(/^[-*:\s]+/, '');

        if (name) {
          newItems.push({ id: Date.now().toString() + Math.random(), name, qty, cost: 0, price });
        }
      }
    });

    if (newItems.length > 0) setItems(newItems);
    setMessage({ type: 'success', text: '✨ ດຶງຂໍ້ມູນສຳເລັດແລ້ວ! ກະລຸນາກວດສອບຄວາມຖືກຕ້ອງ.' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // --- Items Logic ---
  const updateItem = (id: string, fieldName: keyof OrderItem, val: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [fieldName]: val } : item));
  };
  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };
  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', qty: 1, cost: 0, price: 0 }]);
  };

  // --- Expenses Logic ---
  const addExpense = () => {
    if (!expenseName.trim() || !expenseAmount) return;
    setExpenses([...expenses, { id: Date.now().toString(), name: expenseName, amount: Number(expenseAmount) }]);
    setExpenseName('');
    setExpenseAmount('');
  };
  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  // --- Calculations (unchanged) ---
  const totalSales = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalCost = items.reduce((sum, item) => sum + (item.cost * item.qty), 0);
  const totalShipping = Number(shippingFee) || 0;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalProfit = totalSales - totalCost - totalShipping - totalExpenses;
  const totalOutlay = totalCost + totalShipping + totalExpenses;
  const imageSource = imagePreviewUrl || imageUrl;

  // --- Save Action ---
  const handleSave = async () => {
    setLoading(true);
    try {
      const firstItem = items[0] || { name: 'ສິນຄ້າທົ່ວໄປ', price: 0 };

      await addDoc(collection(db, 'orders'), {
        customerName: customerName || 'ລູກຄ້າທົ່ວໄປ',
        productName: firstItem.name,
        size: 'N/A',
        price: Number(totalSales),
        paymentMethod: paymentMethod,
        status: status,
        createdAt: serverTimestamp(),
        phone, transport, village, district, province, orderDate, wallet,
        deposit: Number(deposit) || 0,
        shippingFee: totalShipping,
        items: items,
        expenses: expenses,
        totalCost,
        totalProfit,
        totalExpenses,
        imageUrl: imageUrl || '',
      });

      setMessage({ type: 'success', text: '🎉 ບັນທຶກອໍເດີສຳເລັດແລ້ວ!' });
      setTimeout(() => resetForm(), 2000);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: '❌ ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 animate-[fadeIn_0.35s_ease-out]">
      {/* Floating status toast — never shifts layout */}
      {message.text && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] animate-[toastIn_0.2s_ease-out]">
          <div
            className={`px-5 py-3 rounded-2xl border shadow-lg shadow-slate-900/5 text-sm font-bold backdrop-blur-sm ${
              message.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-700'
                : 'bg-rose-50/95 border-rose-200 text-rose-700'
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-28 lg:pb-16">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-7 lg:mb-9">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900">
              {editId ? 'ແກ້ໄຂອໍເດີ' : 'ບັນທຶກອໍເດີໃໝ່'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              ປ້ອນຂໍ້ມູນລູກຄ້າ ແລະ ລາຍການສິນຄ້າໃຫ້ຄົບຖ້ວນ — ລະບົບຄິດໄລ່ກຳໄລໃຫ້ອັດຕະໂນມັດ
            </p>
          </div>
          <button onClick={resetForm} className={`${ghostBtn} self-start sm:self-auto`}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            ລ້າງຂໍ້ມູນ
          </button>
        </div>

        {/* AI parser — full-width entry point above the two-column workspace */}
        <div className={`${card} ${pad} mb-6 lg:mb-8`}>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`${chip} bg-violet-50 text-violet-600 mt-6`}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-800 mb-0.5">ດຶງຂໍ້ມູນອັດຕະໂນມັດ</h3>
                <p className="text-xs text-slate-400 mb-2">
                  ວາງຂໍ້ຄວາມແຊັດຈາກລູກຄ້າ — ລະບົບຄົ້ນຫາຊື່, ເບີ, ທີ່ຢູ່ ແລະ ລາຍການສິນຄ້າໃຫ້ອັດຕະໂນມັດ
                </p>
                <textarea
                  rows={2}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="ວາງຂໍ້ຄວາມແຊັດຈາກລູກຄ້າທີ່ນີ້..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-700 placeholder-slate-400 outline-none focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-colors resize-none"
                />
              </div>
            </div>
            <button onClick={handleParseData} className={`${primaryBtn} w-full md:w-auto shrink-0`}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              ດຶງຂໍ້ມູນ
            </button>
          </div>
        </div>

        {/* Two-column workspace: task flow (left) + sticky order ticket (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* ---------------- LEFT: data entry flow ---------------- */}
          <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8">
            {/* Customer info */}
            <section className={`${card} ${pad} focus-within:border-violet-200 focus-within:ring-2 focus-within:ring-violet-100 transition-colors`}>
              <div className={`${sectionTitle} mb-5 pb-4 border-b border-slate-100`}>
                <span className={`${chip} bg-emerald-50 text-emerald-600`}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </span>
                ຂໍ້ມູນລູກຄ້າ
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className={label}>ຊື່ລູກຄ້າ</label>
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="ກະລຸນາປ້ອນຊື່..." className={field} />
                </div>
                <div className="col-span-2">
                  <label className={label}>ເບີໂທຕິດຕໍ່</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="020 xxxxxxxx" className={field} />
                </div>
                <div>
                  <label className={label}>ບ້ານ</label>
                  <input type="text" value={village} onChange={e => setVillage(e.target.value)} className={field} />
                </div>
                <div>
                  <label className={label}>ເມືອງ</label>
                  <input type="text" value={district} onChange={e => setDistrict(e.target.value)} className={field} />
                </div>
                <div>
                  <label className={label}>ແຂວງ</label>
                  <SelectField value={province} onChange={setProvince} options={PROVINCES} />
                </div>
                <div>
                  <label className={label}>ຂົນສົ່ງ</label>
                  <SelectField value={transport} onChange={setTransport} options={TRANSPORTS} className="font-bold text-violet-700" />
                </div>
              </div>
            </section>

            {/* Product image upload */}
            <section className={`${card} ${pad}`}>
              <div className={`${sectionTitle} mb-5 pb-4 border-b border-slate-100`}>
                <span className={`${chip} bg-violet-50 text-violet-600`}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </span>
                ຮູບພາບສິນຄ້າ
              </div>

              {imageSource ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                  <img
                    src={imageSource}
                    alt="ຮູບສິນຄ້າ"
                    className="w-full max-h-64 object-contain"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <label className="cursor-pointer px-4 py-2 rounded-lg bg-white/90 text-sm font-bold text-slate-700 hover:bg-white transition-colors">
                      ປ່ຽນຮູບ
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={removeImage}
                      disabled={isUploading}
                      className="px-4 py-2 rounded-lg bg-rose-500/90 text-white text-sm font-bold hover:bg-rose-600 transition-colors"
                    >
                      ລຶບ
                    </button>
                  </div>
                  <div className="px-3 py-2 bg-white border-t border-slate-100">
                    {isUploading ? (
                      <p className="text-[11px] text-slate-500 font-semibold truncate">↻ ກຳລັງອັບໂຫຼດຮູບ...</p>
                    ) : imageUrl ? (
                      <p className="text-[11px] text-emerald-600 font-semibold truncate">✓ ອັບໂຫຼດສຳເລັດ — ພ້ອມບັນທຶກ</p>
                    ) : (
                      <p className="text-[11px] text-slate-500 font-semibold truncate">🖼️ ດູເຊິ່ງຮູບພາບກ່ອນອັບໂຫຼດ</p>
                    )}
                  </div>
                </div>
              ) : (
                <label
                  className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-all duration-200
                    ${isUploading
                      ? 'border-violet-300 bg-violet-50/50 cursor-wait'
                      : 'border-slate-200 bg-slate-50 hover:border-violet-400 hover:bg-violet-50/30'
                    }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                  {isUploading ? (
                    <>
                      <div className="w-10 h-10 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                      <p className="text-sm font-bold text-violet-600">ກຳລັງອັບໂຫຼດໄປ Cloudinary...</p>
                      <p className="text-xs text-slate-400">ກະລຸນາລໍຖ້າສັກຄູ່...</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-700">ຄລິກເພື່ອເລືອກຮູບພາບ</p>
                        <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP — ອັບໂຫຼດໄປ Cloudinary</p>
                      </div>
                    </>
                  )}
                </label>
              )}
            </section>

            {/* Order items */}
            <section className={`${card} ${pad}`}>
              <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className={sectionTitle}>
                  <span className={`${chip} bg-blue-50 text-blue-600`}>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </span>
                  ລາຍການສິນຄ້າ
                  <span className="normal-case tracking-normal text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {items.length} ລາຍການ
                  </span>
                </div>
                <button onClick={addItem} className="h-9 px-3.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 active:scale-95 transition-all duration-150 flex items-center gap-1.5 shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  ເພີ່ມລາຍການ
                </button>
              </div>

              {/* Desktop column headers */}
              <div className="hidden lg:grid grid-cols-12 gap-3 px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="col-span-4">ຊື່ສິນຄ້າ</div>
                <div className="col-span-1 text-center">ຈຳນວນ</div>
                <div className="col-span-2 text-right">ຕົ້ນທຶນ (₭)</div>
                <div className="col-span-2 text-right">ລາຄາຂາຍ (₭)</div>
                <div className="col-span-2 text-right">ກຳໄລ</div>
                <div className="col-span-1" />
              </div>

              {/* Desktop rows */}
              <div className="hidden lg:block rounded-xl overflow-hidden border border-slate-100 divide-y divide-slate-100">
                {items.map((item) => {
                  const itemProfit = (item.price - item.cost) * item.qty;
                  return (
                    <div key={item.id} className="grid grid-cols-12 gap-3 items-center px-3 py-2.5 hover:bg-slate-50/80 transition-colors group">
                      <div className="col-span-4">
                        <input type="text" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} placeholder="ເຊັ່ນ: ເສື້ອຢືດ..." className={`${field} h-10`} />
                      </div>
                      <div className="col-span-1">
                        <input type="number" min="1" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))} className={`${field} h-10 text-center tabular-nums`} />
                      </div>
                      <div className="col-span-2">
                        <MoneyInput value={item.cost} onChange={(v) => updateItem(item.id, 'cost', Number(v))} className="h-10" />
                      </div>
                      <div className="col-span-2">
                        <MoneyInput value={item.price} onChange={(v) => updateItem(item.id, 'price', Number(v))} className="h-10" />
                      </div>
                      <div className="col-span-2 text-right">
                        <span className={`text-sm font-extrabold tabular-nums ${itemProfit > 0 ? 'text-emerald-600' : itemProfit < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {itemProfit > 0 && '+'}{formatNumber(itemProfit)}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {items.length > 1 && (
                          <button
                            onClick={() => removeItem(item.id)}
                            aria-label="ລຶບລາຍການ"
                            title="ລຶບລາຍການ"
                            className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1.5 rounded-lg hover:bg-rose-50"
                          >
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden space-y-3">
                {items.map((item) => {
                  const itemProfit = (item.price - item.cost) * item.qty;
                  return (
                    <div key={item.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                      <input type="text" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} placeholder="ຊື່ສິນຄ້າ..." className={field} />
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" min="1" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))} placeholder="ຈຳນວນ" className={`${field} text-center tabular-nums`} />
                        <MoneyInput value={item.cost} onChange={(v) => updateItem(item.id, 'cost', Number(v))} placeholder="ຕົ້ນທຶນ" />
                        <MoneyInput value={item.price} onChange={(v) => updateItem(item.id, 'price', Number(v))} placeholder="ລາຄາ" />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                        <span className="text-xs font-semibold text-slate-500">
                          ກຳໄລ: <span className={`font-extrabold tabular-nums ${itemProfit > 0 ? 'text-emerald-600' : itemProfit < 0 ? 'text-rose-500' : 'text-slate-400'}`}>{formatNumber(itemProfit)}</span>
                        </span>
                        {items.length > 1 && (
                          <button onClick={() => removeItem(item.id)} className="text-rose-500 hover:text-rose-600 text-xs font-bold">
                            ລຶບລາຍການ
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Shipping fee */}
              <div className="mt-6 pt-5 border-t border-dashed border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.63c0-.621-.504-1.125-1.125-1.125H4.125C3.504 5.818 3 6.322 3 6.943v10.982a1.125 1.125 0 001.125 1.125h1.5m8.25-13.5V18.75m0-13.5h-2.25" />
                  </svg>
                  <label className="text-sm font-semibold text-slate-600">ຄ່າຂົນສົ່ງບິນນີ້</label>
                </div>
                <MoneyInput value={shippingFee} onChange={setShippingFee} className="w-32 sm:w-40" />
              </div>
            </section>

            {/* Other expenses */}
            <section className={`${card} ${pad} bg-gradient-to-br from-rose-50/50 via-white to-white border-rose-100`}>
              <div className={`${sectionTitle} mb-5 pb-4 border-b border-rose-100/70`}>
                <span className={`${chip} bg-rose-100 text-rose-600`}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                  </svg>
                </span>
                ລາຍຈ່າຍອື່ນໆ
              </div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={expenseName}
                  onChange={e => setExpenseName(e.target.value)}
                  placeholder="ຄ່າຫຍັງ..."
                  className={`${field} flex-1 bg-white/80 border-rose-200 focus:border-rose-400 focus:ring-rose-500/10`}
                />
                <MoneyInput
                  value={expenseAmount}
                  onChange={setExpenseAmount}
                  className="w-24 bg-white/80 border-rose-200 focus:border-rose-400 focus:ring-rose-500/10"
                />
                <button
                  type="button"
                  onClick={addExpense}
                  disabled={!expenseName || !expenseAmount}
                  aria-label="ເພີ່ມລາຍຈ່າຍ"
                  className="w-11 h-11 shrink-0 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/20 hover:bg-rose-600 active:scale-90 transition-all duration-150 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>

              {expenses.length === 0 ? (
                <p className="text-xs text-center text-rose-400/70 py-6 border border-dashed border-rose-200/70 rounded-xl">ຍັງບໍ່ມີລາຍຈ່າຍ</p>
              ) : (
                <div className="space-y-1.5">
                  {expenses.map(exp => (
                    <div key={exp.id} className="flex items-center justify-between gap-3 text-sm bg-white/80 px-3.5 py-2.5 rounded-xl border border-rose-100/70 shadow-sm">
                      <span className="text-rose-700 font-medium truncate">{exp.name}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold tabular-nums text-rose-600">{formatNumber(exp.amount)} ₭</span>
                        <button onClick={() => removeExpense(exp.id)} aria-label="ລຶບລາຍຈ່າຍ" className="text-rose-300 hover:text-rose-600 transition-colors">
                          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ---------------- RIGHT: sticky order ticket ---------------- */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/60 overflow-hidden">
                {/* perforated ticket edge — the one deliberate flourish */}
                <div
                  className="h-2"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, #7c3aed 0 10px, transparent 10px 18px)',
                    opacity: 0.85,
                  }}
                />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[11px] font-bold text-violet-500 uppercase tracking-widest">ໃບສັ່ງອໍເດີ</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{editId ? `ອໍເດີ #${editId}` : 'ອໍເດີໃໝ່'}</p>
                    </div>
                    <span className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div>
                      <label className={label}>ວັນທີຮັບ</label>
                      <input type="text" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={`${field} text-center font-bold tabular-nums`} />
                    </div>
                    <div>
                      <label className={label}>ສະຖານະ</label>
                      <SelectField value={status} onChange={setStatus} options={STATUSES} className="font-bold" />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className={label}>ວິທີຊຳລະເງິນ</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('COD')}
                        className={`flex-1 h-9 text-sm font-bold rounded-lg transition-all duration-150 ${paymentMethod === 'COD' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        ປາຍທາງ (COD)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('ຈ່າຍແລ້ວ')}
                        className={`flex-1 h-9 text-sm font-bold rounded-lg transition-all duration-150 ${paymentMethod === 'ຈ່າຍແລ້ວ' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        ຈ່າຍແລ້ວ
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div>
                      <label className={label}>ຍອດມັດຈຳ</label>
                      <MoneyInput value={deposit} onChange={setDeposit} className="text-amber-600" />
                    </div>
                    <div>
                      <label className={label}>ຮັບເຂົ້າກະເປົາ</label>
                      <SelectField value={wallet} onChange={setWallet} options={walletOptions.length > 0 ? walletOptions.map(w => w.name) : ['—']} className="font-semibold" />
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-200 -mx-6 mb-5" />

                  <div className="space-y-2.5 mb-5 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>ຍອດຂາຍລວມ</span>
                      <span className="font-bold text-slate-800 tabular-nums">{formatNumber(totalSales)} ₭</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>ຕົ້ນທຶນ + ສົ່ງ + ລາຍຈ່າຍ</span>
                      <span className="font-bold text-rose-500 tabular-nums">-{formatNumber(totalOutlay)} ₭</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-200 -mx-6 mb-5" />

                  <div className={`rounded-2xl p-4 mb-5 border ${totalProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <p className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ກຳໄລຄາດໝາຍ
                    </p>
                    <p className={`text-3xl font-extrabold tabular-nums ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {totalProfit > 0 && '+'}{formatNumber(totalProfit)} <span className="text-base font-bold">₭</span>
                    </p>
                  </div>

                  <button onClick={handleSave} disabled={loading || isUploading} className={`${primaryBtn} w-full h-12 text-base`}>
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ກຳລັງບັນທຶກ...
                      </>
                    ) : isUploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ກຳລັງອັບໂຫຼດຮູບ...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                        </svg>
                        {editId ? 'ບັນທຶກການແກ້ໄຂ' : 'ບັນທຶກອໍເດີໃໝ່'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky action bar — mirrors the ticket's totals + save, always in reach */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-8px_24px_-8px_rgba(15,23,42,0.08)]">
        <div className="px-4 py-3 flex items-center gap-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ກຳໄລຄາດໝາຍ</p>
            <p className={`text-lg font-extrabold tabular-nums truncate ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalProfit > 0 && '+'}{formatNumber(totalProfit)} ₭
            </p>
          </div>
          <button onClick={handleSave} disabled={loading || isUploading} className={`${primaryBtn} shrink-0 px-6`}>
            {loading || isUploading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
              </svg>
            )}
            ບັນທຶກ
          </button>
        </div>
      </div>

    </div>
  );
}