'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { supabase } from '@/app/lib/supabase';

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

const DoughnutChartComponent = lazy(async () => {
  const [mod, chartjs] = await Promise.all([
    import('react-chartjs-2'),
    import('chart.js'),
  ]);
  chartjs.Chart.register(
    chartjs.ArcElement,
    chartjs.Tooltip,
    chartjs.Legend
  );
  return { default: mod.Doughnut };
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
  
  // Explicit refresh trigger for OtherExpenses
  const [txRefreshTrigger, setTxRefreshTrigger] = useState(0);

  useEffect(() => {
    if (txRefreshTrigger === 0) return;
    const refetch = async () => {
      const { data, error } = await supabase.from('transactions').select('*');
      if (data) {
        setWalletTransactions(data.map(d => ({
          id: d.id,
          walletId: d.wallet_id,
          type: d.type,
          amount: Number(d.amount) || 0,
          note: d.note || '',
          date: d.date || new Date().toISOString(),
        })));
      }
    };
    refetch();
  }, [txRefreshTrigger]);

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
      if (o.paymentMethod === 'ຈ່າຍແລ້ວ' || o.PaymentMethod === 'ຈ່າຍແລ້ວ' || o.status === 'ໄດ້ຮັບເງິນແລ້ວ' || o.status === 'ປິດບິນແລ້ວ' || o.status === 'ສຳເລັດ') actualCashIn += price;
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
      .slice(0, 10);
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
    const totalCostValue = stocks.reduce((sum, s) => sum + (s.costPrice || 0) * s.quantity, 0);
    const maxQty      = Math.max(...stocks.map(s => s.quantity), 1);
    return { outOfStock, lowStock, healthy, totalItems, totalValue, totalCostValue, maxQty, total: stocks.length };
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

      {/* 5 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        
        {/* 1. Total Sales */}
        <div className={`${card} p-5 lg:p-6 group flex flex-col justify-between`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400">ຍອດຂາຍລວມ</p>
                <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] flex items-center justify-center">i</div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                <span className="text-base mr-1 text-slate-400 font-bold">₭</span>
                {formatNumber(stats.revenue)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <svg viewBox="0 0 100 20" className="w-full h-8 overflow-visible" preserveAspectRatio="none">
              <path d="M0,15 C20,15 30,5 50,10 C70,15 80,0 100,5" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" className="drop-shadow-[0_2px_4px_rgba(139,92,246,0.5)]" />
            </svg>
            <div className="flex items-center justify-end gap-2 mt-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 2.25a.75.75 0 01.75.75v8.25H21a.75.75 0 01.75.75 9 9 0 11-18 0 9 9 0 019-9zM12.75 2.5v8.75h8.75a9.012 9.012 0 00-8.75-8.75z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Total Cost */}
        <div className={`${card} p-5 lg:p-6 group flex flex-col justify-between`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400">ຕົ້ນທຶນລວມ</p>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                <span className="text-base mr-1 text-slate-400 font-bold">₭</span>
                {formatNumber(stats.cost)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <svg viewBox="0 0 100 20" className="w-full h-8 overflow-visible" preserveAspectRatio="none">
              <path d="M0,10 C20,15 30,5 50,15 C70,25 80,5 100,10" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" className="drop-shadow-[0_2px_4px_rgba(6,182,212,0.5)]" />
            </svg>
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] font-black bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded shadow-sm border border-cyan-100 dark:border-cyan-500/20">
                {stats.costPct.toFixed(1)}%
              </span>
              <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25a2.25 2.25 0 00-2.25 2.25v6.75m0-9h3.755c.915 0 1.765.485 2.227 1.25a16.51 16.51 0 012.802 7.5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 2.5 Stock Cost Value */}
        <div className={`${card} p-5 lg:p-6 group flex flex-col justify-between`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400">ຕົ້ນທຶນຂອງສາງ</p>
                <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] flex items-center justify-center" title="ມູນຄ່າຕົ້ນທຶນສິນຄ້າທີ່ຍັງເຫຼືອໃນສາງ (ຈຳນວນ × ຕົ້ນທຶນ)">i</div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                <span className="text-base mr-1 text-slate-400 font-bold">₭</span>
                {formatNumber(stockStats.totalCostValue)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <svg viewBox="0 0 100 20" className="w-full h-8 overflow-visible" preserveAspectRatio="none">
              <path d="M0,15 C20,10 30,20 50,15 C70,10 80,15 100,5" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" className="drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]" />
            </svg>
            <div className="flex items-center justify-end gap-2 mt-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
              </div>
            </div>
          </div>
        </div>


        {/* 3. Other Expenses */}
        <div className={`${card} p-5 lg:p-6 group flex flex-col justify-between`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400">ຄ່າໃຊ້ຈ່າຍອື່ນໆ</p>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                <span className="text-base mr-1 text-slate-400 font-bold">₭</span>
                {formatNumber(stats.expenses)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <svg viewBox="0 0 100 20" className="w-full h-8 overflow-visible" preserveAspectRatio="none">
              <path d="M0,5 C20,10 30,0 50,10 C70,20 80,5 100,10" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" className="drop-shadow-[0_2px_4px_rgba(16,185,129,0.5)]" />
            </svg>
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] font-black bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded shadow-sm border border-emerald-100 dark:border-emerald-500/20">
                {stats.expPct.toFixed(1)}%
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Expected Profit */}
        <div className={`${card} p-5 lg:p-6 group flex flex-col justify-between`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400">ກຳໄລຄາດໝາຍ</p>
                <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] flex items-center justify-center" title="ຍອດຂາຍ - ຕົ້ນທຶນ - ຄ່າໃຊ້ຈ່າຍ (ທຸກອໍເດີທີ່ບໍ່ຍົກເລີກ)">i</div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                <span className="text-base mr-1 text-slate-400 font-bold">₭</span>
                {formatNumber(stats.expectedProfit)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <svg viewBox="0 0 100 20" className="w-full h-8 overflow-visible" preserveAspectRatio="none">
              <path d="M0,20 C20,10 30,15 50,5 C70,10 80,0 100,5" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" className="drop-shadow-[0_2px_4px_rgba(59,130,246,0.5)]" />
            </svg>
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded shadow-sm border border-blue-100 dark:border-blue-500/20">
                {stats.expectedPct.toFixed(1)}%
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Net Profit */}
        <div className={`${card} p-5 lg:p-6 group flex flex-col justify-between`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400">ກຳໄລຕົວຈິງສຸດທິ</p>
                <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] flex items-center justify-center" title="ເງິນເຂົ້າກະເປົາແທ້ (ຈ່າຍແລ້ວ/ມັດຈຳ) - ຄ່າໃຊ້ຈ່າຍ">i</div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                <span className="text-base mr-1 text-slate-400 font-bold">₭</span>
                {formatNumber(stats.netProfit)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <svg viewBox="0 0 100 20" className="w-full h-8 overflow-visible" preserveAspectRatio="none">
              <path d="M0,15 C20,10 30,20 50,5 C70,10 80,0 100,10" fill="none" stroke="#c026d3" strokeWidth="2" strokeLinecap="round" className="drop-shadow-[0_2px_4px_rgba(192,38,211,0.5)]" />
            </svg>
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] font-black bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 px-1.5 py-0.5 rounded shadow-sm border border-fuchsia-100 dark:border-fuchsia-500/20">
                {stats.netPct.toFixed(1)}%
              </span>
              <div className="w-8 h-8 rounded-full bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </div>
            </div>
          </div>
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
                        borderColor: '#a855f7', // purple-500
                        backgroundColor: (context: any) => {
                          const chart = context.chart;
                          const { ctx, chartArea } = chart;
                          if (!chartArea) return 'rgba(168, 85, 247, 0.1)';
                          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                          gradient.addColorStop(0, 'rgba(168, 85, 247, 0.5)');
                          gradient.addColorStop(1, 'rgba(168, 85, 247, 0.0)');
                          return gradient;
                        },
                        borderWidth: 3,
                        tension: 0,
                        fill: true,
                        pointRadius: 4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#a855f7',
                        pointBorderWidth: 2,
                        pointHoverRadius: 6,
                      },
                      {
                        label: 'ຍອດຂາຍ',
                        data: chartData.sales,
                        borderColor: '#3b82f6', // blue-500
                        backgroundColor: (context: any) => {
                          const chart = context.chart;
                          const { ctx, chartArea } = chart;
                          if (!chartArea) return 'rgba(59, 130, 246, 0.1)';
                          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
                          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
                          return gradient;
                        },
                        borderWidth: 3,
                        tension: 0,
                        fill: true,
                        pointRadius: 4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#3b82f6',
                        pointBorderWidth: 2,
                        pointHoverRadius: 6,
                      },
                      {
                        label: 'ຕົ້ນທຶນ',
                        data: chartData.cost,
                        borderColor: '#06b6d4', // cyan-500
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 5,
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
            ສິນຄ້າຂາຍດີ (Top 10)
          </div>
          <div className="h-[300px] sm:h-[340px] flex items-center justify-center">
            {topProducts.length === 0 ? (
              <EmptyChart text="ຍັງບໍ່ມີການຂາຍໃນຊ່ວງນີ້" />
            ) : (
              <Suspense fallback={<ChartFallback />}>
                <div className="relative w-full h-full">
                  <DoughnutChartComponent
                    data={{
                      labels: topProducts.map((p) => p.name),
                      datasets: [
                        {
                          data: topProducts.map((p) => p.qty),
                          backgroundColor: [
                            '#8b5cf6', // violet
                            '#3b82f6', // blue
                            '#0ea5e9', // sky
                            '#14b8a6', // teal
                            '#10b981', // emerald
                            '#84cc16', // lime
                            '#eab308', // yellow
                            '#f97316', // orange
                            '#ef4444', // red
                            '#d946ef', // fuchsia
                          ],
                          borderWidth: 0,
                          hoverOffset: 8,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '75%',
                      layout: {
                        padding: 10
                      },
                      plugins: {
                        legend: { 
                          position: 'right',
                          labels: {
                            color: '#64748b',
                            font: { size: 12, family: "'Noto Sans Lao', sans-serif", weight: 'bold' as const },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20
                          }
                        },
                        tooltip: { 
                          backgroundColor: '#0f172a',
                          padding: 12,
                          titleFont: { size: 14, family: "'Noto Sans Lao', sans-serif" },
                          bodyFont: { size: 13, family: "'Noto Sans Lao', sans-serif", weight: 'bold' as const },
                          callbacks: {
                            label: function(context) {
                              return ` ${context.label}: ${context.raw} ຊิ้น`;
                            }
                          }
                        },
                      }
                    }}
                  />
                  {/* Center Text for Doughnut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pr-[120px]">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ລວມ</span>
                    <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
                      {topProducts.reduce((sum, p) => sum + p.qty, 0)}
                    </span>
                  </div>
                </div>
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