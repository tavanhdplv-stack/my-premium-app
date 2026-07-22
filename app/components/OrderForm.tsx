'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import type { Agent } from '@/app/types';

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

interface StockItem {
  id: string;
  itemName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  imageUrl: string;
}

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  cost: number;
  price: number;
  imageUrl?: string;
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
  if (num === null || num === undefined || num === '') return '';
  const str = String(num);
  const parts = str.split('.');
  const intPart = parts[0].replace(/[^0-9-]/g, '');
  const decPart = parts.length > 1 ? '.' + parts[1].replace(/[^0-9]/g, '') : '';
  let formattedInt = intPart;
  if (intPart !== '' && intPart !== '-') {
    formattedInt = BigInt(intPart).toLocaleString('en-US');
  }
  return formattedInt + decPart;
};
const parseNumericInput = (val: string): string | null => {
  const raw = val.replace(/,/g, '');
  if (raw === '' || raw === '-') return raw;
  if (/^-?\d*\.?\d*$/.test(raw)) return raw;
  return null;
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
      inputMode="decimal"
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

export default function OrderForm({ editId, preSelectedAgentId, onSuccess }: { editId?: string, preSelectedAgentId?: string, onSuccess?: () => void }) {
  // --- State ---
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  // Load existing order for edit
  useEffect(() => {
    if (!editId) return;
    const fetchOrder = async () => {
      try {
        const snap = await getDoc(doc(db, 'orders', editId));
        if (snap.exists()) {
          const d = snap.data();
          setCustomerName(d.customerName || '');
          setPhone(d.phone || '');
          setTransport(d.transport || TRANSPORTS[0]);
          setVillage(d.village || '');
          setDistrict(d.district || '');
          setProvince(d.province || PROVINCES[0]);
          setOrderDate(d.orderDate || new Date().toLocaleDateString('en-GB'));
          setStatus(d.status || STATUSES[0]);
          setWallet(d.wallet || '');
          setPaymentMethod(d.paymentMethod || 'COD');
          setDeposit(d.deposit?.toString() || '');
          setShippingFee(d.shippingFee?.toString() || '');
          setItems(d.items?.length ? d.items : [{ id: Date.now().toString(), name: '', qty: 1, cost: 0, price: 0 }]);
          setExpenses(d.expenses || []);
          setImageUrl(d.imageUrl || '');
          setAgentId(d.agentId || '');
          setOrderedBy(d.orderedBy || '');
        }
      } catch (err) {
        console.error('Error loading order:', err);
      }
    };
    fetchOrder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // Stock data
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState<string>('');
  const [showStockDropdown, setShowStockDropdown] = useState<string | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockSearch, setStockSearch] = useState('');

  const handleSelectFromStock = (stock: StockItem) => {
    const newItem: OrderItem = {
      id: Date.now().toString(),
      name: stock.itemName,
      qty: 1,
      cost: stock.costPrice,
      price: stock.sellingPrice,
      imageUrl: stock.imageUrl
    };
    if (items.length === 1 && items[0].name === '' && items[0].cost === 0 && items[0].price === 0) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }
    setShowStockModal(false);
    setStockSearch('');
  };


  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'stocks'), (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          itemName: d.itemName || '',
          quantity: Number(d.quantity) || 0,
          costPrice: Number(d.costPrice) || 0,
          sellingPrice: Number(d.sellingPrice) || 0,
          imageUrl: d.imageUrl || ''
        } as StockItem;
      });
      setStocks(data);
    });
    return () => unsub();
  }, []);



  useEffect(() => {
    const unsubAgents = onSnapshot(collection(db, 'agents'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Agent));
      setAgents(data);
    });
    return () => unsubAgents();
  }, []);

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
  const [orderedBy, setOrderedBy] = useState('');

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
    setCustomerName(''); setPhone(''); setAgentId(''); setVillage(''); setDistrict('');
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
    setItems(prev => prev.map(item => item.id === id ? { ...item, [fieldName]: val } : item));
  };

  const applyStockToItem = (id: string, stock: StockItem) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, name: stock.itemName, cost: stock.costPrice || 0, price: stock.sellingPrice || 0, imageUrl: stock.imageUrl || '' }
        : item
    ));
    setShowStockDropdown(null);
  };

  const handleItemImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingItemId(id);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      updateItem(id, 'imageUrl', data.url);
      
      setMessage({ type: 'success', text: 'ອັບໂຫຼດຮູບສຳເລັດ' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage({ type: 'error', text: 'ເກີດຂໍ້ຜິດພາດໃນການອັບໂຫຼດຮູບ' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setUploadingItemId(null);
    }
  };


  const handleBulkImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setLoading(true);
    setMessage({ type: 'info', text: 'ກຳລັງອັບໂຫຼດຮູບພາບ...' });
    
    try {
      const newItems: OrderItem[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          newItems.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: '',
            qty: 1,
            cost: 0,
            price: 0,
            imageUrl: data.url
          });
        }
      }
      
      setItems(prev => {
        if (prev.length === 1 && prev[0].name === '' && prev[0].cost === 0 && prev[0].price === 0 && !prev[0].imageUrl) {
          return newItems;
        }
        return [...prev, ...newItems];
      });
      
      setMessage({ type: 'success', text: `ອັບໂຫຼດສຳເລັດ ${newItems.length} ຮູບພາບ!` });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'ເກີດຂໍ້ຜິດພາດໃນການອັບໂຫຼດບາງຮູບພາບ' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
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
      const orderData = {
        customerName: customerName || 'ລູກຄ້າທົ່ວໄປ',
        productName: firstItem.name,
        size: 'N/A',
        price: Number(totalSales),
        paymentMethod: paymentMethod,
        status: status,
        phone, transport, village, district, province, orderDate, wallet,
        deposit: Number(deposit) || 0,
        shippingFee: totalShipping,
        items: items,
        expenses: expenses,
        totalCost,
        totalProfit,
        totalExpenses,
        imageUrl: imageUrl || '',
        agentId: agentId || null,
        isPreOrder: agentId ? true : false,
        orderedBy: orderedBy || '',
      };

      if (editId) {
        // Update existing order
        await updateDoc(doc(db, 'orders', editId), {
          ...orderData,
          updatedAt: serverTimestamp(),
        });
        setMessage({ type: 'success', text: '✅ ແກ້ໄຂອໍເດີສຳເລັດແລ້ວ!' });
      } else {
        // Create new order
        await addDoc(collection(db, 'orders'), {
          ...orderData,
          createdAt: serverTimestamp(),
        });
        if (agentId && totalSales > 0) {
          const agentRef = doc(db, 'agents', agentId);
          await updateDoc(agentRef, {
            totalSales: increment(totalSales)
          });
        }
        setMessage({ type: 'success', text: '🎉 ບັນທຶກອໍເດີສຳເລັດແລ້ວ!' });
      }

      setTimeout(() => { resetForm(); if (onSuccess) onSuccess(); }, 2000);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: '❌ ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 animate-[fadeIn_0.35s_ease-out]">
      {/* Floating status toast */}
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 lg:pb-16 flex flex-col gap-5 lg:gap-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={resetForm} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            </button>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {editId ? 'ແກ້ໄຂອໍເດີ' : 'ສ້າງບິນໃໝ່'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetForm} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            </button>
            <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.909A2.25 2.25 0 012.25 8.643V6.75m19.5 0v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.909A2.25 2.25 0 012.25 8.643V6.75" /></svg>
            </button>
          </div>
        </div>

        {/* AI Parser Card */}
        <section className={`${card} p-3 sm:p-4 flex flex-col md:flex-row items-center gap-4 relative overflow-hidden`}>
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-400"></div>
          <div className="flex items-center gap-4 shrink-0 pl-2 w-full md:w-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M12.012 2c-5.506 0-9.98 4.475-9.98 9.982 0 1.944.545 3.84 1.55 5.518L2 22l4.646-1.55a9.929 9.929 0 005.366 1.551h.004c5.505 0 9.98-4.476 9.98-9.983 0-5.507-4.475-9.982-9.98-9.982z"/></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">ນຳເຂົ້າອັດຕະໂນມັດ</p>
              <p className="text-xs text-slate-400">ວາງຂໍ້ຄວາມຈາກລູກຄ້າ</p>
            </div>
          </div>
          <input
            type="text"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="ວາງຂໍ້ຄວາມທີ່ນີ້..."
            className="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm text-slate-700 placeholder-slate-400 outline-none focus:bg-white focus:border-emerald-400 transition-colors w-full"
          />
          <button onClick={handleParseData} className="h-12 px-6 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white text-sm font-bold transition-all duration-150 shrink-0 w-full md:w-auto flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            ດຶງຂໍ້ມູນ
          </button>
        </section>

        {/* Customer Info Card */}
        <section className={`${card} ${pad}`}>
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm0-13a3 3 0 100 6 3 3 0 000-6zm0 4a1 1 0 110-2 1 1 0 010 2zm-4.5 5c0-1.527 2.128-2.5 4.5-2.5s4.5.973 4.5 2.5v1h-9v-1z"/></svg>
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">ຂໍ້ມູນລູກຄ້າ ແລະ ການຈັດສົ່ງ</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">ກອກຂໍ້ມູນລູກຄ້າ, ຕົວແທນ ແລະ ທີ່ຢູ່ຈັດສົ່ງ</p>
            </div>
          </div>

          {/* Row 1: Agent + Orderer + Customer Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className={label}>🤝 ຕົວແທນ (Agent)</label>
              <div className="relative">
                <select 
                  value={agentId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAgentId(val);
                    const ag = agents.find(a => a.id === val);
                    if (ag) {
                      setCustomerName(ag.agentName);
                      setPhone(ag.phone);
                    }
                  }}
                  className={`${field} appearance-none pr-8 ${agentId ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold' : ''}`}
                >
                  <option value="">— ລູກຄ້າທົ່ວໄປ —</option>
                  {agents.map(ag => <option key={ag.id} value={ag.id}>{ag.agentName} ({ag.level})</option>)}
                </select>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
              </div>
            </div>

            <div>
              <label className={label}>👤 ຜູ້ສັ່ງ (ໃຜຄີຍ)</label>
              <input type="text" value={orderedBy} onChange={e => setOrderedBy(e.target.value)} placeholder="ຊື່ຜູ້ຄີຍອໍເດີ" className={`${field} bg-indigo-50/60`} />
            </div>

            <div>
              <label className={label}>📦 ຊື່ລູກຄ້າ (ຜູ້ຮັບ)</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="ຊື່ຜູ້ຮັບສິນຄ້າ" className={field} />
            </div>

            <div>
              <label className={label}>📞 ເບີໂທຕິດຕໍ່</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="020-XXXXXXXX" className={field} />
            </div>
          </div>

          {/* Row 2: Transport + Village + District + Province */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={label}>🚚 ຂົນສົ່ງ</label>
              <div className="relative">
                <SelectField value={transport} onChange={setTransport} options={TRANSPORTS} className="text-violet-600 font-bold bg-violet-50/60" />
              </div>
            </div>

            <div>
              <label className={label}>🏘️ ບ້ານ</label>
              <input type="text" value={village} onChange={e => setVillage(e.target.value)} placeholder="ຊື່ບ້ານ" className={field} />
            </div>

            <div>
              <label className={label}>🌆 ເມືອງ</label>
              <input type="text" value={district} onChange={e => setDistrict(e.target.value)} placeholder="ຊື່ເມືອງ" className={field} />
            </div>

            <div>
              <label className={label}>🗺️ ແຂວງ</label>
              <SelectField value={province} onChange={setProvince} options={PROVINCES} className="" />
            </div>
          </div>
        </section>

        {/* Order Items Card */}
        <section className={`${card} ${pad}`}>
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-500"><path d="M21 7.24a2.25 2.25 0 00-1.12-1.95l-6.75-3.9a2.25 2.25 0 00-2.26 0l-6.75 3.9A2.25 2.25 0 003 7.24v9.52a2.25 2.25 0 001.12 1.95l6.75 3.9a2.25 2.25 0 002.26 0l6.75-3.9A2.25 2.25 0 0021 16.76V7.24zm-9 11.26L5.25 14.6V9.4l6.75 3.9v5.2zm1.5-6.06L6.75 8.54l6.75-3.9 6.75 3.9-6.75 3.9zm.75 6.06v-5.2l6.75-3.9v5.2l-6.75 3.9z"/></svg>
              ລາຍການສິນຄ້າ
              <span className="ml-1 normal-case tracking-normal text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {items.length} ລາຍການ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer h-9 px-3.5 rounded-lg bg-sky-50 text-sky-600 text-xs font-bold hover:bg-sky-100 active:scale-95 transition-all duration-150 flex items-center gap-1.5 shrink-0">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z"/></svg>
                ອັບໂຫຼດຫຼາຍຮູບ
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleBulkImageUpload} />
              </label>
              <button onClick={() => setShowStockModal(true)} className="h-9 px-3.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 active:scale-95 transition-all duration-150 flex items-center gap-1.5 shrink-0">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                ເພີ່ມຈາກສະຕັອກ
              </button>
              <button onClick={addItem} className="h-9 px-3.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 active:scale-95 transition-all duration-150 flex items-center gap-1.5 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                ເພີ່ມລາຍການ
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item) => {
              const itemProfit = (item.price - item.cost) * item.qty;
              return (
                <div key={item.id} className="relative bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-violet-300/80 hover:shadow-md transition-all duration-200 group">
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.id)}
                      title="ລຶບລາຍການ"
                      className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 bg-white/80 rounded-full p-1.5 hover:bg-rose-50 transition-colors z-10"
                    >
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
                    {/* Image Uploader & Name */}
                    <div className="lg:col-span-5 flex items-start gap-4 pr-6 lg:pr-0">
                      <div className="w-20 h-20 shrink-0 relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-violet-50/50 hover:border-violet-300 transition-all duration-200 overflow-hidden group/img">
                        {item.imageUrl ? (
                          <>
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                            <button onClick={() => updateItem(item.id, 'imageUrl', '')} className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity" title="ລຶບຮູບ">
                              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </>
                        ) : uploadingItemId === item.id ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                          </div>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-slate-400 group-hover/img:text-violet-600 transition-colors" title="ເພີ່ມຮູບ">
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mb-1"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                            <span className="text-[10px] font-bold">ເພີ່ມຮູບ</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleItemImageUpload(item.id, e)} disabled={uploadingItemId !== null} />
                          </label>
                        )}
                      </div>
                      <div className="flex-1 mt-1 min-w-0 relative">
                        <label className={label}>ຊື່ສິນຄ້າ</label>
                        <input
                          type="text"
                          value={item.name}
                          onFocus={() => setShowStockDropdown(item.id)}
                          onBlur={() => setTimeout(() => setShowStockDropdown(null), 200)}
                          onChange={(e) => {
                            updateItem(item.id, 'name', e.target.value);
                            setShowStockDropdown(item.id);
                          }}
                          placeholder="ເຊັ່ນ: ເສື້ອຢືດ..."
                          className={`${field} font-bold text-slate-800 focus:bg-white w-full`}
                        />
                        {showStockDropdown === item.id && (
                          <div className="absolute z-20 left-0 right-0 top-[100%] mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100">
                            {stocks.filter(s => (s.itemName || "").toLowerCase().includes((item.name || "").toLowerCase())).length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-500">ບໍ່ພົບສິນຄ້າໃນສະຕັອກ</div>
                            ) : (
                              stocks.filter(s => (s.itemName || "").toLowerCase().includes((item.name || "").toLowerCase())).map(stock => (
                                <div
                                  key={stock.id}
                                  className="flex items-center gap-3 p-3 hover:bg-violet-50 cursor-pointer transition-colors"
                                  onClick={() => applyStockToItem(item.id, stock)}
                                >
                                  {stock.imageUrl ? (
                                    <img src={stock.imageUrl} className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0" alt="" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-300"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-800 truncate">{stock.itemName}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">ສະຕັອກ: {stock.quantity}</span>
                                      <span className="text-[10px] text-slate-500">ລາຄາ: {new Intl.NumberFormat('lo-LA').format(stock.sellingPrice)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financials Grid */}
                    <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4 items-start">
                      <div>
                        <label className={label}>ຈຳນວນ</label>
                        <input type="number" min="1" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))} className={`${field} text-center tabular-nums font-bold text-slate-800 w-full`} />
                      </div>
                      <div>
                        <label className={`${label} text-rose-500`}>ຕົ້ນທຶນ</label>
                        <MoneyInput value={item.cost} onChange={(v) => updateItem(item.id, 'cost', Number(v))} placeholder="0" className="font-semibold text-rose-500 w-full" />
                      </div>
                      <div>
                        <label className={label}>ລາຄາຂາຍ</label>
                        <MoneyInput value={item.price} onChange={(v) => updateItem(item.id, 'price', Number(v))} placeholder="0" className="font-semibold text-slate-900 w-full" />
                      </div>
                      <div className="flex flex-col h-[70px] justify-end pb-1.5 sm:items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">ກຳໄລ</span>
                        <span className={`text-base font-extrabold tabular-nums tracking-tight ${itemProfit > 0 ? 'text-emerald-600' : itemProfit < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {itemProfit > 0 && '+'}{formatNumber(itemProfit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-dashed border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-600">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.63c0-.621-.504-1.125-1.125-1.125H4.125C3.504 5.818 3 6.322 3 6.943v10.982a1.125 1.125 0 001.125 1.125h1.5m8.25-13.5V18.75m0-13.5h-2.25" /></svg>
              ຄ່າຂົນສົ່ງບິນນີ້
            </div>
            <MoneyInput value={shippingFee} onChange={setShippingFee} className="w-32 sm:w-40" />
          </div>
        </section>

        {/* Order Details Card */}
        <section className={`${card} ${pad}`}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0">ວັນທີຮັບອໍເດີ</label>
              </div>
              <input type="text" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={`${field} font-bold text-slate-800 text-center`} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400"><path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2zm-7 2h-2v-2h2v2zm0-4h-2V8h2v2z"/></svg>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0">ສະຖານະອໍເດີ</label>
              </div>
              <SelectField value={status} onChange={setStatus} options={STATUSES} className="font-bold text-blue-600 bg-blue-50/50" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-purple-500"><path d="M21 7.28V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2.28A2 2 0 0022 15V9a2 2 0 00-1-1.72zM20 15h-4V9h4v6zM5 19V5h14v2h-6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h6v2H5z"/></svg>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0">ກະເປົາຮັບເງິນ</label>
              </div>
              <SelectField value={wallet} onChange={setWallet} options={walletOptions.length > 0 ? walletOptions.map(w => w.name) : ['—']} className="font-semibold text-purple-700 bg-purple-50/50" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-500"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0">ການຊຳລະ</label>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 h-11">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                  className={`flex-1 h-full text-[13px] font-bold rounded-lg transition-all duration-150 ${paymentMethod === 'COD' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.63c0-.621-.504-1.125-1.125-1.125H4.125C3.504 5.818 3 6.322 3 6.943v10.982a1.125 1.125 0 001.125 1.125h1.5m8.25-13.5V18.75m0-13.5h-2.25" /></svg>
                    COD
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ຈ່າຍແລ້ວ')}
                  className={`flex-1 h-full text-[13px] font-bold rounded-lg transition-all duration-150 ${paymentMethod === 'ຈ່າຍແລ້ວ' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                    ຈ່າຍແລ້ວ
                  </span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-500"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.64-2.1 1.64-1.64 0-2.1-.92-2.16-1.7H8.22c.07 1.63 1.25 2.82 2.68 3.19V19h2.34v-1.65c1.76-.32 2.92-1.41 2.92-2.96 0-2.36-1.89-3.07-3.85-3.53z"/></svg>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0">ຍອດມັດຈຳ (₭)</label>
              </div>
              <MoneyInput value={deposit} onChange={setDeposit} className="text-amber-600 bg-amber-50/50" />
            </div>
          </div>
        </section>

        {/* Summary & Save Card */}
        <section className={`${card} ${pad} overflow-hidden relative`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative flex flex-col xl:flex-row items-center justify-between gap-8 xl:gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 w-full xl:w-auto flex-1">
              <div className="flex flex-col items-center xl:items-start text-center xl:text-left">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">ຍອດຂາຍ</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 tabular-nums">
                  {formatNumber(totalSales)} <span className="text-lg">K</span>
                </span>
              </div>
              <div className="flex flex-col items-center xl:items-start text-center xl:text-left">
                <span className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">ມັດຈຳ</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-500 tabular-nums">
                  {formatNumber(deposit || 0)} <span className="text-lg">K</span>
                </span>
              </div>
              <div className="flex flex-col items-center xl:items-start text-center xl:text-left">
                <span className="text-[11px] font-bold text-rose-500 uppercase tracking-widest mb-1">ຕົ້ນທຶນ</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-rose-500 tabular-nums">
                  {formatNumber(totalOutlay)} <span className="text-lg">K</span>
                </span>
              </div>
              <div className="flex flex-col items-center xl:items-start text-center xl:text-left">
                <span className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>ກຳໄລຄາດໝາຍ</span>
                <span className={`text-3xl sm:text-4xl font-black tabular-nums tracking-tight ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {totalProfit > 0 && '+'}{formatNumber(totalProfit)} <span className="text-xl">K</span>
                </span>
              </div>
            </div>
            
            <div className="w-full xl:w-auto shrink-0">
              <button onClick={handleSave} disabled={loading || uploadingItemId !== null} className="w-full xl:w-56 h-14 sm:h-16 text-lg rounded-[20px] bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all">
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ກຳລັງບັນທຶກ...
                  </>
                ) : uploadingItemId !== null ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ອັບໂຫຼດຮູບ...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l4.5-6.3z" clipRule="evenodd" />
                    </svg>
                    {editId ? 'ບັນທຶກການແກ້ໄຂ' : 'ບັນທຶກ'}
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* Stock Selection Modal */}
      {showStockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">ເລືອກສິນຄ້າຈາກສະຕັອກ</h3>
                  <p className="text-xs text-slate-500">ຄລິກທີ່ສິນຄ້າເພື່ອເພີ່ມລົງໃນບິນ</p>
                </div>
              </div>
              <button onClick={() => setShowStockModal(false)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* Search */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                <input
                  type="text"
                  value={stockSearch}
                  onChange={e => setStockSearch(e.target.value)}
                  placeholder="ຄົ້ນຫາຊື່ສິນຄ້າ..."
                  className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-400 outline-none transition-colors"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
              {stocks.filter(s => (s.itemName || "").toLowerCase().includes((stockSearch || "").toLowerCase())).length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                  </div>
                  <p className="text-slate-500 font-bold">ບໍ່ພົບສິນຄ້າທີ່ຄົ້ນຫາ</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stocks.filter(s => (s.itemName || "").toLowerCase().includes((stockSearch || "").toLowerCase())).map(stock => (
                    <div
                      key={stock.id}
                      onClick={() => handleSelectFromStock(stock)}
                      className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all active:scale-95"
                    >
                      {stock.imageUrl ? (
                        <img src={stock.imageUrl} className="w-14 h-14 rounded-lg object-cover bg-slate-50 shrink-0" alt="" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 shrink-0 border border-slate-100">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">{stock.itemName}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            ສະຕັອກ: {stock.quantity}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            ₭{new Intl.NumberFormat('lo-LA').format(stock.sellingPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
