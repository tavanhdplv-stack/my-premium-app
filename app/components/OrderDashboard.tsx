'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { supabase } from '@/app/lib/supabase';
import OtherExpenses from './OtherExpenses';

// --- Wallet types (shared with OrderWallet) ---
interface WalletDoc {
  id: string;
  name: string;
  type: 'W-COMP' | 'partner';
  sharePercent?: number;
}
interface TransactionDoc {
  id: string;
  walletId: string;
  type: 'income' | 'expense' | 'profit_split';
  amount: number;
  note: string;
  date: string;
  [key: string]: any;
}

// --- Stock types ---
interface StockItem {
  id: string;
  itemName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  imageUrl?: string;
  notes?: string;
}

// Lazy load charts — register BEFORE returning component to avoid race condition
const LineChartComponent = lazy(async () => {
  const [mod, chartjs] = await Promise.all([
    import('react-chartjs-2'),
    import('chart.js'),
  ]);
  chartjs.Chart.register(
    chartjs.CategoryScale,
    chartjs.LinearScale,
    chartjs.PointElement,
    chartjs.LineElement,
    chartjs.BarElement,
    chartjs.Tooltip,
    chartjs.Legend,
    chartjs.Filler
  );
  return { default: mod.Line };
});

const BarChartComponent = lazy(async () => {
  const [mod, chartjs] = await Promise.all([
    import('react-chartjs-2'),
    import('chart.js'),
  ]);
  chartjs.Chart.register(
    chartjs.CategoryScale,
    chartjs.LinearScale,
    chartjs.PointElement,
    chartjs.LineElement,
    chartjs.BarElement,
    chartjs.Tooltip,
    chartjs.Legend,
    chartjs.Filler
  );
  return { default: mod.Bar };
});

const ChartFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-xl">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-violet-500 rounded-full animate-spin mx-auto mb-2" />
      <p className="text-sm text-slate-500 dark:text-slate-400">ກຳລັງໂຫຼດກຣາບ...</p>
    </div>
  </div>
);

// =====================================================================
// Design tokens — premium SaaS with dark mode
// =====================================================================
const card = 'premium-card glass';
const pad = 'p-5 sm:p-6 lg:p-8';
const chip = 'w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0';
const sectionTitle =
  'flex items-center gap-2.5 text-[15px] font-bold premium-gradient-text uppercase tracking-wide font-heading';
const pillActive = 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shadow-md scale-105 transition-all';
const pillIdle =
  'text-slate-500 dark:text-slate-400 hover:text-[var(--primary)] hover:bg-white dark:hover:bg-white/10 transition-all';

// --- Data shape (matches OrderForm.tsx) ---
interface OrderItem {
  id: string;
  name: string;
  qty: number;
  cost: number;
  price: number;
}
interface OrderExpense {
  id: string;
  name: string;
  amount: number;
}
interface OrderDoc {
  id: string;
  customerName?: string;
  phone?: string;
  price?: number;
  paymentMethod?: 'COD' | 'ຈ່າຍແລ້ວ';
  status?: string;
  orderDate?: string;
  deposit?: number;
  shippingFee?: number;
  totalCost?: number;
  totalExpenses?: number;
  totalProfit?: number;
  wallet?: string;
  items?: OrderItem[];
  createdAt?: any;
  [key: string]: any;
}


interface OrderDashboardProps {
  onViewAll?: () => void;
}

// =====================================================================
// STATUS DEFINITIONS — align with OrderList (9 statuses in Lao)
// =====================================================================
const CANCELLED_STATUS = 'ຍົກເລີກອໍເດີ';

// All 9 statuses using Lao values
const STATUS_META: {
  value: string;
  label: string;
  chip: string;
  icon: 'inbox' | 'download' | 'check' | 'alert' | 'box' | 'truck' | 'send' | 'complete' | 'cancel';
}[] = [
  { value: 'ຮັບອໍເດີແລ້ວ', label: 'รับออเดอร์แล้ว (ຮັບອໍເດີ)', chip: 'bg-blue-50 text-blue-600', icon: 'inbox' },
  { value: 'ສົ່ງບິນແລ້ວ', label: 'ส่งบินแล้ว (ສົ່ງບິນ)', chip: 'bg-cyan-50 text-cyan-600', icon: 'download' },
  { value: 'ກວດສອບແລ້ວ', label: 'ตรวจสอบแล้ว (ກວດສອບ)', chip: 'bg-emerald-50 text-emerald-600', icon: 'check' },
  { value: 'ໂອນມັດຈຳແລ້ວ', label: 'โอนมัดจำแล้ว (ໂອນມັດຈຳ)', chip: 'bg-yellow-50 text-yellow-600', icon: 'alert' },
  { value: 'ສັ່ງເຄື່ອງແລ້ວ', label: 'สั่งของแล้ว (ສັ່ງເຄື່ອງ)', chip: 'bg-orange-50 text-orange-600', icon: 'box' },
  { value: 'ເຄື່ອງມາຮອດແລ້ວ', label: 'ของมาถึงแล้ว (ເຄື່ອງມາຮອດ)', chip: 'bg-indigo-50 text-indigo-600', icon: 'truck' },
  { value: 'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ', label: 'ส่งให้ลูกค้าแล้ว (ສົ່ງເຄື່ອງ)', chip: 'bg-purple-50 text-purple-600', icon: 'send' },
  { value: 'ໄດ້ຮັບເງິນແລ້ວ', label: 'ได้รับเงินแล้ว (ໄດ້ຮັບເງິນ)', chip: 'bg-lime-50 text-lime-600', icon: 'complete' },
];

// --- Helpers ---
const formatNumber = (num: number | string) => {
  if (!num) return '0';
  return Number(num).toLocaleString('en-US');
};

function parseOrderDate(str?: string): { day: number; month: number; year: number } | null {
  if (!str) return null;
  // Handle ISO format YYYY-MM-DD or YYYY-MM-DDT...
  if (/^\d{4}-\d{2}/.test(str)) {
    const [yearStr, monthStr, dayStr] = str.substring(0, 10).split('-');
    const year = Number(yearStr), month = Number(monthStr), day = Number(dayStr);
    if (!year || !month) return null;
    return { day, month, year };
  }
  // Handle DD/MM/YYYY
  const p = str.split('/');
  if (p.length !== 3) return null;
  const day = Number(p[0]),
    month = Number(p[1]),
    year = Number(p[2]);
  if (!day || !month || !year) return null;
  return { day, month, year };
}

function ymOf(str?: string): string | null {
  const d = parseOrderDate(str);
  if (!d) return null;
  return `${d.year}-${String(d.month).padStart(2, '0')}`;
}

function StatusIcon({ icon, className }: { icon: string; className?: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    strokeWidth: 2,
    stroke: 'currentColor',
    className,
  } as const;
  switch (icon) {
    case 'inbox':
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 9.75h4.5l1.5 3h4.5l1.5-3h4.5M3.75 9.75v8.25A1.5 1.5 0 005.25 19.5h13.5a1.5 1.5 0 001.5-1.5V9.75M3.75 9.75L6 4.5h12l2.25 5.25"
          />
        </svg>
      );
    case 'box':
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'truck':
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.63c0-.621-.504-1.125-1.125-1.125H4.125C3.504 5.818 3 6.322 3 6.943v10.982a1.125 1.125 0 001.125 1.125h1.5m8.25-13.5V18.75m0-13.5h-2.25"
          />
        </svg>
      );
    case 'check':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path
            fillRule="evenodd"
            d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'download':
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 19.5V16.5M17.25 7.5L12 12.75 6.75 7.5"
          />
        </svg>
      );
    case 'alert':
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      );
    case 'send':
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 12L3.269 3.125A59.769 59.769 0 0121.94 12c0 1.408-.293 2.782-.867 4.125M6 12l7.07-7.07m0 0L18 6M12 12l7.07 7.07M12 12L5.03 18.03"
          />
        </svg>
      );
    case 'complete':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006h5.404c1.135 0 1.605 1.488.742 2.195l-4.374 3.161 1.579 4.784c.448 1.077-.268 2.228-1.343 2.228-.375 0-.711-.174-.959-.453l-4.575-3.102a1.255 1.255 0 00-1.493 0l-4.575 3.102c-.248.279-.584.453-.959.453-1.075 0-1.791-1.151-1.343-2.228l1.579-4.784-4.374-3.161c-.863-.707-.393-2.195.742-2.195h5.404l2.082-5.006z" />
        </svg>
      );
    default:
      return null;
  }
}

const STATUS_CHIP_DARK: Record<string, string> = {
  'ຮັບອໍເດີແລ້ວ': 'dark:bg-blue-500/15 dark:text-blue-300',
  'ສົ່ງບິນແລ້ວ': 'dark:bg-cyan-500/15 dark:text-cyan-300',
  'ກວດສອບແລ້ວ': 'dark:bg-emerald-500/15 dark:text-emerald-300',
  'ໂອນມັດຈຳແລ້ວ': 'dark:bg-yellow-500/15 dark:text-yellow-300',
  'ສັ່ງເຄື່ອງແລ້ວ': 'dark:bg-orange-500/15 dark:text-orange-300',
  'ເຄື່ອງມາຮອດແລ້ວ': 'dark:bg-indigo-500/15 dark:text-indigo-300',
  'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ': 'dark:bg-purple-500/15 dark:text-purple-300',
  'ໄດ້ຮັບເງິນແລ້ວ': 'dark:bg-lime-500/15 dark:text-lime-300',
  'ຍົກເລີກອໍເດີ': 'dark:bg-rose-500/15 dark:text-rose-300',
};

function getProductSummary(items?: OrderItem[]) {
  if (!items?.length) return '—';
  if (items.length === 1) return items[0].name;
  return `${items[0].name} +${items.length - 1}`;
}

export default function OrderDashboard({ onViewAll }: OrderDashboardProps) {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [wallets, setWallets] = useState<WalletDoc[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<TransactionDoc[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Real‑time listeners from Firestore
  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase.from('orders').select('*');
      if (error) {
        if (process.env.NODE_ENV !== 'production') console.error('[OrderDashboard] orders error:', error);
        setLoading(false);
        return;
      }
      const list = data.map(d => ({
        id: d.id,
        customerName: d.customer_name,
        phone: d.phone,
        price: d.price,
        paymentMethod: d.payment_method,
        status: d.status,
        orderDate: d.order_date,
        deposit: d.deposit,
        shippingFee: d.shipping_fee,
        totalCost: d.total_cost,
        totalExpenses: d.total_expenses,
        totalProfit: d.total_profit,
        wallet: d.wallet,
        items: d.items,
        createdAt: d.created_at,
        __createdAtVal: new Date(d.created_at).getTime()
      }));
      list.sort((a, b) => b.__createdAtVal - a.__createdAtVal);
      setOrders(list as any);
      setLoading(false);
    };

    const fetchWallets = async () => {
      const { data, error } = await supabase.from('wallets').select('*');
      if (error) {
        if (process.env.NODE_ENV !== 'production') console.error('[OrderDashboard] wallets error:', error);
        return;
      }
      const list = data.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        sharePercent: d.share_percent ?? 50,
      }));
      list.sort((a, b) => (a.type === 'W-COMP' ? -1 : b.type === 'W-COMP' ? 1 : 0));
      setWallets(list as any);
    };

    const fetchTransactions = async () => {
      const { data, error } = await supabase.from('transactions').select('*');
      if (error) {
        if (process.env.NODE_ENV !== 'production') console.error('[OrderDashboard] transactions error:', error);
        return;
      }
      setWalletTransactions(data.map(d => ({
        id: d.id,
        walletId: d.wallet_id,
        type: d.type,
        amount: Number(d.amount) || 0,
        note: d.note || '',
        date: d.date || new Date().toISOString(),
      })));
    };

    const fetchStocks = async () => {
      const { data, error } = await supabase.from('stocks').select('*');
      if (error) {
        if (process.env.NODE_ENV !== 'production') console.error('[OrderDashboard] stocks error:', error);
        return;
      }
      setStocks(data.map(d => ({
        id: d.id,
        itemName: d.item_name,
        quantity: d.quantity,
        costPrice: d.cost_price,
        sellingPrice: d.selling_price,
        imageUrl: d.image_url,
        notes: d.notes,
      })));
    };

    fetchOrders();
    fetchWallets();
    fetchTransactions();
    fetchStocks();

    const channel = supabase.channel('dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, fetchWallets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchTransactions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stocks' }, fetchStocks)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const thisYm = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const lastYm = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Orders that fall inside the selected period (or all, if monthFilter === '')
  const periodOrders = useMemo(() => {
    if (!monthFilter) return orders;
    return orders.filter((o) => ymOf(o.orderDate || (o as any).Date || (o as any)['ວັນທີ'] || ((o.createdAt as any)?.seconds ? new Date((o.createdAt as any).seconds * 1000).toISOString() : '')) === monthFilter);
  }, [orders, monthFilter]);

  // Active orders exclude Cancelled
  const activeOrders = useMemo(
    () => periodOrders.filter((o) => o.status !== CANCELLED_STATUS),
    [periodOrders]
  );

  // Financial stats
  const stats = useMemo(() => {
    let revenue = 0,
      cost = 0,
      expenses = 0,
      actualCashIn = 0;
    
    // 1. Order expenses
    activeOrders.forEach((o) => {
      const price = o.price || o.totalSales || o.SellingPrice || 0;
      const orderCost = (o.totalCost || o.CostPrice || 0) + (o.shippingFee || o.OrderShippingFee || 0);
      const orderExp = o.totalExpenses || o.AdditionalCost || 0;
      revenue += price;
      cost += orderCost;
      expenses += orderExp;
      if (o.paymentMethod === 'ຈ່າຍແລ້ວ' || o.PaymentMethod === 'ຈ່າຍແລ້ວ' || o.status === 'ໄດ້ຮັບເງິນແລ້ວ' || o.status === 'ປິດບິນແລ້ວ') actualCashIn += price;
      else if ((o.deposit || o.DepositAmount || o['ຍອດມັດຈຳ'] || 0) > 0) actualCashIn += o.deposit || o.DepositAmount || o['ຍອດມັດຈຳ'] || 0;
    });

    // 2. Manual expenses from OtherExpenses
    walletTransactions.forEach(t => {
      const isWithdrawal = t.type === 'profit_split' || t.note?.includes('[ປັນຜົນຮຸ້ນສ່ວນ') || t.note?.includes('ຖອນ') || t.Note?.includes('ຖອນ');
      if ((t.type === 'expense' || t.Type === 'Expense') && !t.note?.startsWith('Order #') && !isWithdrawal) {
        if (!monthFilter || ymOf(t.date || t.Date) === monthFilter) {
          expenses += Number(t.amount) || Number(t.Amount) || 0;
        }
      }
    });

    const expectedProfit = revenue - cost - expenses;
    const netProfit = actualCashIn - cost - expenses;
    return {
      revenue,
      cost,
      expenses,
      expectedProfit,
      netProfit,
      costPct: revenue > 0 ? (cost / revenue) * 100 : 0,
      expPct: revenue > 0 ? (expenses / revenue) * 100 : 0,
      expectedPct: revenue > 0 ? (expectedProfit / revenue) * 100 : 0,
      netPct: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    };
  }, [activeOrders, walletTransactions, monthFilter]);

  // Status counts – now using the English status values
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_META.forEach((s) => (counts[s.value] = 0));
    let cancelled = 0;
    periodOrders.forEach((o) => {
      if (o.status === CANCELLED_STATUS) cancelled++;
      else if (o.status && counts[o.status] !== undefined) counts[o.status]++;
    });
    return { counts, cancelled, total: periodOrders.length };
  }, [periodOrders]);

  // Top 5 products
  const topProducts = useMemo(() => {
    const map: Record<string, number> = {};
    activeOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        if (!it.name || !it.qty) return;
        map[it.name] = (map[it.name] || 0) + it.qty;
      });
    });
    return Object.entries(map)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [activeOrders]);

  // Chart data: daily if monthFilter set, otherwise monthly
  const chartData = useMemo(() => {
    const buckets: Record<string, { sales: number; cost: number; profit: number }> = {};
    let labels: string[] = [];

    if (monthFilter) {
      const [y, m] = monthFilter.split('-').map(Number);
      const days = new Date(y, m, 0).getDate();
      labels = Array.from({ length: days }, (_, i) => String(i + 1));
      labels.forEach((l) => (buckets[l] = { sales: 0, cost: 0, profit: 0 }));
      activeOrders.forEach((o) => {
        const d = parseOrderDate(o.orderDate || o.Date || o['ວັນທີ']);
        if (!d) return;
        const key = String(d.day);
        if (!buckets[key]) return;
        const price = o.price || o.totalSales || o.SellingPrice || 0;
        const c = (o.totalCost || o.CostPrice || 0) + (o.shippingFee || o.OrderShippingFee || 0) + (o.totalExpenses || o.AdditionalCost || 0);
        buckets[key].sales += price;
        buckets[key].cost += c;
        buckets[key].profit += (o.totalProfit !== undefined ? o.totalProfit : (o.NetProfit !== undefined ? o.NetProfit : (price - c)));
      });
    } else {
      activeOrders.forEach((o) => {
        const d = parseOrderDate(o.orderDate || o.Date || o['ວັນທີ']);
        if (!d) return;
        const key = `${String(d.month).padStart(2, '0')}/${String(d.year).slice(-2)}`;
        if (!buckets[key]) buckets[key] = { sales: 0, cost: 0, profit: 0 };
        const price = o.price || 0;
        const c = (o.totalCost || 0) + (o.shippingFee || 0) + (o.totalExpenses || 0);
        buckets[key].sales += price;
        buckets[key].cost += c;
        buckets[key].profit += price - c;
      });
      labels = Object.keys(buckets).sort((a, b) => {
        const [ma, ya] = a.split('/');
        const [mb, yb] = b.split('/');
        return (
          new Date(`20${ya}-${ma}-01`).getTime() -
          new Date(`20${yb}-${mb}-01`).getTime()
        );
      });
    }

    return {
      labels,
      sales: labels.map((l) => buckets[l]?.sales || 0),
      cost: labels.map((l) => buckets[l]?.cost || 0),
      profit: labels.map((l) => buckets[l]?.profit || 0),
    };
  }, [activeOrders, monthFilter]);

  const setQuickFilter = (ym: string) => setMonthFilter(ym);

  // --- Wallet balance calculation (mirrors OrderWallet logic) ---
  const getWalletBalance = useCallback((walletId: string): number => {
    let bal = 0;
    const walletObj = wallets.find((w) => w.id === walletId);
    // From manual transactions
    walletTransactions.forEach((t) => {
      if (t.walletId !== walletId) return;
      if (t.type === 'income') bal += t.amount;
      else bal -= t.amount;
    });
    // From order operational cash flow
    if (walletObj) {
      orders.forEach((o) => {
        if (o.status === 'ຍົກເລີກອໍເດີ') return;
        let match = false;
        if (walletObj.type === 'W-COMP') {
          match = !o.wallet || o.wallet === walletObj.name || (o.wallet as string)?.includes('ບໍລິສັດ') || (o.wallet as string)?.includes('BCEL') || (o.wallet as string)?.includes('W-COMP');
        } else {
          const cleanName = (walletObj.name || '').split('(')[0].trim();
          match = o.wallet === walletObj.name || !!(o.wallet as string)?.includes(cleanName);
        }
        if (match) {
          const finalPrice = o.price || o.totalSales || o.SellingPrice || 0;
          const income = o.paymentMethod === 'ຈ່າຍແລ້ວ' || o.PaymentMethod === 'ຈ່າຍແລ້ວ' || o.status === 'ໄດ້ຮັບເງິນແລ້ວ' || o.status === 'ປິດບິນແລ້ວ' ? finalPrice : (o.deposit || o.DepositAmount || o['ຍອດມັດຈຳ'] || 0);
          const cost = (o.totalCost || o.CostPrice || 0) + (o.shippingFee || o.OrderShippingFee || 0) + (o.totalExpenses || o.AdditionalCost || 0);
          bal += income - cost;
        }
      });
    }
    return bal;
  }, [wallets, walletTransactions, orders]);

  const totalWalletBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + getWalletBalance(w.id), 0);
  }, [wallets, walletTransactions, orders, getWalletBalance]);

  // --- Stock stats ---
  const stockStats = useMemo(() => {
    const outOfStock  = stocks.filter(s => s.quantity === 0);
    const lowStock    = stocks.filter(s => s.quantity > 0 && s.quantity <= 5);
    const healthy     = stocks.filter(s => s.quantity > 5);
    const totalItems  = stocks.reduce((sum, s) => sum + s.quantity, 0);
    const totalValue  = stocks.reduce((sum, s) => sum + s.sellingPrice * s.quantity, 0);
    const maxQty      = Math.max(...stocks.map(s => s.quantity), 1);
    return { outOfStock, lowStock, healthy, totalItems, totalValue, maxQty, total: stocks.length };
  }, [stocks]);

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return tb - ta;
      })
      .slice(0, 8);
  }, [orders]);

  return (
    <div className={`animate-[fadeIn_0.35s_ease-out] space-y-6 pb-32 lg:space-y-8 transition-opacity duration-500 ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Other Expenses Widget */}
      <OtherExpenses />

      {/* Header + filters */}
      <div className={`${card} ${pad} relative overflow-hidden`}>
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-violet-100/60 dark:bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                ແດຊບອດພາບລວມ
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                ຍອດຂາຍ, ຕົ້ນທຶນ ແລະ ກຳໄລຂອງ Tawan East Shop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl p-1.5 w-full lg:w-auto">
            <button
              onClick={() => setQuickFilter(thisYm)}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                monthFilter === thisYm ? pillActive : pillIdle
              }`}
            >
              ເດືອນນີ້
            </button>
            <button
              onClick={() => setQuickFilter(lastYm)}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                monthFilter === lastYm ? pillActive : pillIdle
              }`}
            >
              ເດືອນກ່ອນ
            </button>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="hidden sm:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-violet-400 cursor-pointer"
            />
            <button
              onClick={() => setQuickFilter('')}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                monthFilter === '' ? pillActive : pillIdle
              }`}
            >
              ທັງໝົດ
            </button>
          </div>
        </div>
      </div>

      {/* 3 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
        <div className={`${card} ${pad}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`${chip} bg-blue-50 text-blue-600`}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6.75A2.25 2.25 0 0018.75 4.5H5.25A2.25 2.25 0 003 6.75V9"
                />
              </svg>
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            ຍອດຂາຍລວມ
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {formatNumber(stats.revenue)} ₭
          </p>
        </div>

        <div className={`${card} ${pad}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`${chip} bg-orange-50 text-orange-600`}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
            </span>
            <span className="text-[11px] font-black bg-orange-100 text-orange-700 px-2.5 py-1 rounded-lg">
              {stats.costPct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            ຕົ້ນທຶນສິນຄ້າ + ຄ່າຂົນສົ່ງ
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-orange-600">
            {formatNumber(stats.cost)} ₭
          </p>
        </div>

        <div className={`${card} ${pad}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`${chip} bg-rose-50 text-rose-600`}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
                />
              </svg>
            </span>
            <span className="text-[11px] font-black bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg">
              {stats.expPct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            ຄ່າໃຊ້ຈ່າຍອື່ນໆ
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-rose-600">
            {formatNumber(stats.expenses)} ₭
          </p>
        </div>
      </div>

      {/* 2 profit cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between mb-6">
            <div>
              <p className="text-[11px] font-bold text-blue-100 uppercase tracking-widest">
                ກຳໄລຄາດໝາຍ
              </p>
              <p className="text-[11px] text-blue-200 mt-0.5">
                ຍອດຂາຍ - ຕົ້ນທຶນ - ຄ່າໃຊ້ຈ່າຍ (ທຸກອໍເດີທີ່ບໍ່ຍົກເລີກ)
              </p>
            </div>
            <span className="text-[11px] font-black bg-white text-indigo-700 px-2.5 py-1 rounded-lg shrink-0">
              {stats.expectedPct.toFixed(1)}%
            </span>
          </div>
          <p className="relative text-3xl sm:text-4xl font-extrabold tabular-nums">
            {formatNumber(stats.expectedProfit)}{' '}
            <span className="text-base font-bold">₭</span>
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between mb-6">
            <div>
              <p className="text-[11px] font-bold text-emerald-100 uppercase tracking-widest">
                ກຳໄລຕົວຈິງສຸດທິ
              </p>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                ເງິນເຂົ້າກະເປົາແທ້ (ຈ່າຍແລ້ວ/ມັດຈຳ) - ຄ່າໃຊ້ຈ່າຍ
              </p>
            </div>
            <span className="text-[11px] font-black bg-white text-emerald-700 px-2.5 py-1 rounded-lg shrink-0">
              {stats.netPct.toFixed(1)}%
            </span>
          </div>
          <p className="relative text-3xl sm:text-4xl font-extrabold tabular-nums">
            {formatNumber(stats.netProfit)}{' '}
            <span className="text-base font-bold">₭</span>
          </p>
        </div>
      </div>

      {/* Wallet Summary Section */}
      {wallets.length > 0 && (
        <div className={`${card} ${pad}`}>
          <div className="flex items-center justify-between mb-5">
            <div className={sectionTitle}>
              <span className={`${chip} bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300`}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </span>
              ສະຫຼຸບກະເປົາເງິນ
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">ຍອດລວມທຸກກະເປົາ</p>
              <p className={`text-xl font-extrabold tabular-nums ${
                totalWalletBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatNumber(totalWalletBalance)} ₭
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {wallets.map((w) => {
              const bal = getWalletBalance(w.id);
              const isMain = w.type === 'W-COMP';
              return (
                <div
                  key={w.id}
                  className={`rounded-xl p-4 border flex items-center justify-between gap-3 ${
                    isMain
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30'
                      : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/8'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                      isMain ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                    }`}>
                      {isMain ? '👑' : '👤'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{w.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{w.id}</p>
                    </div>
                  </div>
                  <p className={`text-base font-extrabold tabular-nums font-mono ${
                    bal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {formatNumber(bal)} ₭
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}



      {/* Order status widget */}
      <div className={`${card} ${pad}`}>
        <div className="flex items-center justify-between mb-5">
          <div className={sectionTitle}>
            <span className={`${chip} bg-slate-100 text-slate-500`}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
                />
              </svg>
            </span>
            ສະຖານະອໍເດີ
          </div>
          <span className="text-xs font-black bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-3.5 py-1.5 rounded-lg">
            ອໍເດີທັງໝົດ:{' '}
            <span className="text-violet-600 dark:text-violet-400 ml-1">{statusCounts.total}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {STATUS_META.map((s) => (
            <div
              key={s.value}
              className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/8 rounded-xl p-3.5 flex flex-col items-center text-center hover:border-slate-200 dark:hover:border-white/15 transition-colors"
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${s.chip}`}
              >
                <StatusIcon icon={s.icon} className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                {s.label}
              </p>
              <p className="text-xl font-extrabold tabular-nums text-slate-800 dark:text-slate-100 mt-1">
                {statusCounts.counts[s.value] || 0}
              </p>
            </div>
          ))}
          <div className="bg-rose-50/60 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl p-3.5 flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mb-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-rose-500 leading-tight">ຍົກເລີກ</p>
            <p className="text-xl font-extrabold tabular-nums text-rose-600 mt-1">
              {statusCounts.cancelled}
            </p>
          </div>
        </div>
      </div>

      {/* ── Stock Status Widget ── */}
      <div className={`${card} ${pad}`}>
        <div className="flex items-center justify-between mb-5">
          <div className={sectionTitle}>
            <span className={`${chip} bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400`}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </span>
            ສະຖານະສາງສິນຄ້າ
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-3.5 py-1.5 rounded-lg">
              ລວມ <span className="text-violet-600 dark:text-violet-400 ml-1">{stockStats.total}</span> ລາຍການ
            </span>
          </div>
        </div>

        {stocks.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1} stroke="currentColor" className="w-7 h-7 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">ຍັງບໍ່ມີສິນຄ້າໃນສາງ</p>
          </div>
        ) : (
          <>
            {/* Summary chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                {
                  label: 'ສິນຄ້າທັງໝົດ',
                  value: stockStats.total + ' ລາຍການ',
                  sub: stockStats.totalItems.toLocaleString() + ' ຊິ້ນ',
                  bg: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20',
                  text: 'text-violet-700 dark:text-violet-300',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                    </svg>
                  ),
                },
                {
                  label: 'ມູນຄ່າສາງ',
                  value: stockStats.totalValue.toLocaleString() + ' ₭',
                  sub: 'ລາຄາຂາຍ × ຈຳນວນ',
                  bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
                  text: 'text-emerald-700 dark:text-emerald-300',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  ),
                },
                {
                  label: 'ໃກ້ຈະໝົດ',
                  value: stockStats.lowStock.length + ' ລາຍການ',
                  sub: '≤ 5 ຊິ້ນ',
                  bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
                  text: 'text-amber-700 dark:text-amber-300',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  ),
                },
                {
                  label: 'ໝົດສາງ',
                  value: stockStats.outOfStock.length + ' ລາຍການ',
                  sub: 'ຈຳນວນ = 0',
                  bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20',
                  text: 'text-rose-700 dark:text-rose-300',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  ),
                },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl p-4 border flex items-start gap-3 ${s.bg}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white/60 dark:bg-black/20 ${s.text}`}>
                    {s.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{s.label}</p>
                    <p className={`text-base font-extrabold tabular-nums leading-tight ${s.text}`}>{s.value}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stock list with progress bars */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {[...stocks]
                .sort((a, b) => a.quantity - b.quantity)
                .slice(0, 10)
                .map((item) => {
                  const pct = Math.min((item.quantity / stockStats.maxQty) * 100, 100);
                  const isOut  = item.quantity === 0;
                  const isLow  = item.quantity > 0 && item.quantity <= 5;
                  const barColor = isOut
                    ? 'bg-rose-500'
                    : isLow
                    ? 'bg-amber-400'
                    : 'bg-emerald-500';
                  const qtyColor = isOut
                    ? 'text-rose-600 dark:text-rose-400'
                    : isLow
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400';
                  return (
                    <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                      {/* Thumbnail */}
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0 relative">
                        {item.imageUrl?.startsWith('http') ? (
                          <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">📦</div>
                        )}
                      </div>
                      {/* Name + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{item.itemName}</span>
                          <span className={`text-sm font-extrabold tabular-nums shrink-0 ${qtyColor}`}>
                            {item.quantity.toLocaleString()} ຊິ້ນ
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-white/8 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: isOut ? '100%' : `${pct}%`, opacity: isOut ? 0.4 : 1 }}
                          />
                        </div>
                      </div>
                      {/* Status badge */}
                      {isOut ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 shrink-0">ໝົດ</span>
                      ) : isLow ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 shrink-0 animate-pulse">ໃກ້ໝົດ</span>
                      ) : null}
                    </div>
                  );
                })}
              {stocks.length > 10 && (
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 pt-2">
                  ສະແດງ 10 ລາຍການທຳອິດ (ຈາກ {stocks.length} ທັງໝົດ)
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className={`${card} ${pad} lg:col-span-2`}>
          <div className={`${sectionTitle} mb-5`}>
            <span className={`${chip} bg-blue-50 text-blue-600`}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </span>
            ກຣາບສະຫຼຸບຍອດຂາຍ ແລະ ກຳໄລ
          </div>
          <div className="h-[300px] sm:h-[340px]">
            {chartData.labels.length === 0 ? (
              <EmptyChart text="ຍັງບໍ່ມີຂໍ້ມູນໃນຊ່ວງນີ້" />
            ) : (
              <Suspense fallback={<ChartFallback />}>
                <LineChartComponent
                  data={{
                    labels: chartData.labels,
                    datasets: [
                      {
                        label: 'ກຳໄລ',
                        data: chartData.profit,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16,185,129,0.12)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointBackgroundColor: '#10b981',
                      },
                      {
                        label: 'ຍອດຂາຍ',
                        data: chartData.sales,
                        borderColor: '#3b82f6',
                        backgroundColor: 'transparent',
                        borderWidth: 2.5,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#3b82f6',
                      },
                      {
                        label: 'ຕົ້ນທຶນ',
                        data: chartData.cost,
                        borderColor: '#f43f5e',
                        backgroundColor: 'transparent',
                        borderWidth: 2.5,
                        borderDash: [5, 5],
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#f43f5e',
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                      legend: {
                        position: 'top' as const,
                        labels: {
                          color: '#64748b',
                          usePointStyle: true,
                          boxWidth: 8,
                          padding: 16,
                          font: { weight: 'bold' as const, size: 11 },
                        },
                      },
                      tooltip: {
                        backgroundColor: '#0f172a',
                        padding: 10,
                        callbacks: {
                          label: (c: any) =>
                            ` ${c.dataset.label}: ${Number(c.parsed.y).toLocaleString()} ₭`,
                        },
                      },
                    },
                    scales: {
                      x: {
                        ticks: { color: '#94a3b8', font: { size: 11 } },
                        grid: { display: false },
                      },
                      y: {
                        ticks: {
                          color: '#94a3b8',
                          font: { size: 11 },
                          callback: (v: number | string) =>
                            Number(v) >= 1000000
                              ? `${(Number(v) / 1000000).toFixed(1)}M`
                              : Number(v) >= 1000
                              ? `${(Number(v) / 1000).toFixed(0)}k`
                              : v,
                        },
                        grid: { color: '#e2e8f0' },
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </Suspense>
            )}
          </div>
        </div>

        <div className={`${card} ${pad}`}>
          <div className={`${sectionTitle} mb-5`}>
            <span className={`${chip} bg-amber-50 text-amber-600`}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H11.25m4.007 0a2.25 2.25 0 00-4.007 0M7.5 14.25v-2.625a3.375 3.375 0 013.375-3.375h2.25a3.375 3.375 0 013.375 3.375v2.625"
                />
              </svg>
            </span>
            ສິນຄ້າຂາຍດີ (Top 5)
          </div>
          <div className="h-[300px] sm:h-[340px]">
            {topProducts.length === 0 ? (
              <EmptyChart text="ຍັງບໍ່ມີການຂາຍໃນຊ່ວງນີ້" />
            ) : (
              <Suspense fallback={<ChartFallback />}>
                <BarChartComponent
                  data={{
                    labels: topProducts.map((p) => p.name),
                    datasets: [
                      {
                        data: topProducts.map((p) => p.qty),
                        backgroundColor: [
                          '#3b82f6',
                          '#10b981',
                          '#f59e0b',
                          '#8b5cf6',
                          '#ec4899',
                        ],
                        borderRadius: 6,
                        barPercentage: 0.6,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: 'y' as const,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { backgroundColor: '#0f172a', padding: 10 },
                    },
                    scales: {
                      x: {
                        ticks: { color: '#94a3b8', precision: 0 },
                        grid: { color: '#e2e8f0' },
                        beginAtZero: true,
                      },
                      y: {
                        ticks: {
                          color: '#64748b',
                          font: { size: 11, weight: 'bold' as const },
                        },
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}


function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-10 h-10"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{text}</p>
    </div>
  );
}