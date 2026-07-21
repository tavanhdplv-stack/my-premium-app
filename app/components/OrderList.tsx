'use client';

import React, {
  useState, useEffect, useMemo, useRef, useCallback
} from 'react';
import { db } from '@/firebase';
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, setDoc, getDoc
} from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════════════
// STATUS META (9 statuses)
// ═══════════════════════════════════════════════════════════════════════
export const STATUS_META = [
  { value: 'ຮັບອໍເດີແລ້ວ',            chip: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',         dot: 'bg-blue-500'    },
  { value: 'ສົ່ງບິນແລ້ວ',              chip: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',          dot: 'bg-cyan-500'    },
  { value: 'ກວດສອບແລ້ວ',               chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { value: 'ໂອນມັດຈຳແລ້ວ',            chip: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',   dot: 'bg-yellow-500'  },
  { value: 'ສັ່ງເຄື່ອງແລ້ວ',           chip: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',   dot: 'bg-orange-500'  },
  { value: 'ເຄື່ອງມາຮອດແລ້ວ',         chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',   dot: 'bg-indigo-500'  },
  { value: 'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ', chip: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',   dot: 'bg-purple-500'  },
  { value: 'ໄດ້ຮັບເງິນແລ້ວ',           chip: 'bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-300',           dot: 'bg-lime-500'    },
  { value: 'ຍົກເລີກອໍເດີ',             chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',           dot: 'bg-rose-500'    },
];

// ═══════════════════════════════════════════════════════════════════════
// TABLE THEMES
// ═══════════════════════════════════════════════════════════════════════
const THEMES: Record<string, { label: string; row: string; th: string }> = {
  default: { label: 'ຄ່າເລີ່ມຕົ້ນ', row: 'hover:bg-slate-50 dark:hover:bg-white/[0.025]', th: '' },
  blue:    { label: 'ນ້ຳເງິນ',      row: 'hover:bg-blue-50/60 dark:hover:bg-blue-500/8', th: 'bg-blue-50/50 dark:bg-blue-500/8' },
  green:   { label: 'ຂຽວ',          row: 'hover:bg-emerald-50/60 dark:hover:bg-emerald-500/8', th: 'bg-emerald-50/50 dark:bg-emerald-500/8' },
  purple:  { label: 'ມ່ວງ',          row: 'hover:bg-purple-50/60 dark:hover:bg-purple-500/8', th: 'bg-purple-50/50 dark:bg-purple-500/8' },
  rose:    { label: 'ບົວ',           row: 'hover:bg-rose-50/60 dark:hover:bg-rose-500/8', th: 'bg-rose-50/50 dark:bg-rose-500/8' },
  red:     { label: 'ແດງ',           row: 'hover:bg-red-50/60 dark:hover:bg-red-500/8', th: 'bg-red-50/50 dark:bg-red-500/8' },
};

// ═══════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════
const card    = 'bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-white/8 shadow-sm';
const pad     = 'p-5 sm:p-6';
const inputCls = 'h-9 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all';
const btnGhost = 'h-9 px-4 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-all';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════
interface OrderItem { id: string; name: string; qty: number; cost: number; price: number; }
interface Order {
  id: string;
  customerName: string;
  phone: string;
  transport: string;
  village: string;
  district: string;
  province: string;
  orderDate: string;
  status: string;
  statusUpdatedAt?: any;
  deposit: number;
  shippingFee: number;
  items: OrderItem[];
  totalCost: number;
  totalProfit: number;
  createdAt: any;
  imageUrl?: string;
  orderedBy?: string;
}
interface Wallet { id: string; name: string; type: string; }

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════
const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n || 0) + ' ₭';
const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(n || 0);

function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000);
  return null;
}

function formatDate(ts: any, short = false) {
  const d = tsToDate(ts);
  if (!d) return '—';
  return short
    ? d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
    : d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatTime(ts: any) {
  const d = tsToDate(ts);
  if (!d) return '';
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function getYM(ts: any) {
  const d = tsToDate(ts);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getInitials(name: string) {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

function getWhatsAppUrl(phone: string) {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) return `https://wa.me/856${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

function hoursAgo(ts: any): number {
  const d = tsToDate(ts);
  if (!d) return 0;
  return (Date.now() - d.getTime()) / 3600000;
}

// ═══════════════════════════════════════════════════════════════════════
// COUNTDOWN HOOK
// ═══════════════════════════════════════════════════════════════════════
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ═══════════════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════════════
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] pointer-events-none animate-[toastIn_0.3s_ease-out]">
      <div className={`px-5 py-3 rounded-2xl border shadow-xl text-sm font-bold backdrop-blur-sm flex items-center gap-2 ${type === 'success' ? 'bg-emerald-50/95 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50/95 dark:bg-rose-900/90 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-300'}`}>
        {type === 'success' ? '✅' : '❌'} {msg}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STATUS BADGE (clickable)
// ═══════════════════════════════════════════════════════════════════════
function StatusBadge({ status, onClick, loading }: { status: string; onClick?: () => void; loading?: boolean }) {
  const m = STATUS_META.find(s => s.value === status);
  if (!m) return <span className="text-xs text-slate-400">{status}</span>;
  return (
    <button
      onClick={onClick}
      disabled={loading || !onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border-0 transition-all ${m.chip} ${onClick ? 'hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer' : 'cursor-default'} ${loading ? 'opacity-50' : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.value}
      {onClick && !loading && <svg className="w-2.5 h-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>}
      {loading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STATUS MODAL
// ═══════════════════════════════════════════════════════════════════════
function StatusModal({ current, onSelect, onClose }: { current: string; onSelect: (s: string) => void; onClose: () => void; }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-72 p-4 animate-[scaleIn_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-800 dark:text-white">ປ່ຽນສະຖານະ</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="space-y-1">
          {STATUS_META.map(s => (
            <button key={s.value} onClick={() => onSelect(s.value)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${current === s.value ? 'bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              {s.value}
              {current === s.value && <span className="ml-auto text-[10px] bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full">ປັດຈຸບັນ</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BILL MODAL
// ═══════════════════════════════════════════════════════════════════════
function BillModal({ order, shopName, shopPhone, onClose }: { order: Order; shopName: string; shopPhone: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const totalSales = (order.items || []).reduce((s, i) => s + i.price * i.qty, 0);
  const remaining = totalSales - (order.deposit || 0);

  const copyText = [
    `🏪 ${shopName || 'Tawan East Shop'}`,
    `📞 ${shopPhone || ''}`,
    `━━━━━━━━━━━━━━━━━`,
    `👤 ຜູ້ຮັບ: ${order.customerName}`,
    `📱 ເບີ: ${order.phone}`,
    `🏠 ທີ່ຢູ່: ບ.${order.village} ມ.${order.district} ແຂ.${order.province}`,
    `🚚 ຂົນສົ່ງ: ${order.transport}`,
    `━━━━━━━━━━━━━━━━━`,
    ...(order.items || []).map(i => `• ${i.name} x${i.qty} = ${fmtNum(i.price * i.qty)} ₭`),
    `━━━━━━━━━━━━━━━━━`,
    order.deposit > 0 ? `💵 ມັດຈຳ: ${fmtNum(order.deposit)} ₭` : '',
    `💰 COD: ${fmtNum(remaining > 0 ? remaining : totalSales)} ₭`,
  ].filter(Boolean).join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto animate-[scaleIn_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/8 bg-white dark:bg-slate-900 rounded-t-2xl z-10">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{order.id.slice(-8)}</p>
            <h3 className="font-extrabold text-slate-900 dark:text-white">{order.customerName}</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopy} className={`flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-bold transition-all ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15'}`}>
              {copied ? '✅ ຄັດລອກແລ້ວ' : '📋 ຄັດລອກ'}
            </button>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            {[['📱 ເບີໂທ', order.phone], ['🚚 ຂົນສົ່ງ', order.transport], ['📍 ທີ່ຢູ່', `ບ.${order.village} ມ.${order.district}`], ['📅 ວັນທີ', order.orderDate]].map(([l, v]) => (
              <div key={l} className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">{l}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{v || '—'}</p>
              </div>
            ))}
          </div>
          {/* Status */}
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <span className="text-xs text-slate-400">{formatDate(order.createdAt)}</span>
          </div>
          {/* Items */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">ລາຍການສິນຄ້າ</p>
            <div className="space-y-1.5">
              {(order.items || []).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.name}</p>
                    <p className="text-xs text-slate-400">x{item.qty} × {fmtNum(item.price)} ₭</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{fmtNum(item.price * item.qty)} ₭</p>
                </div>
              ))}
            </div>
          </div>
          {/* Financials */}
          <div className="border-t border-slate-100 dark:border-white/8 pt-4 space-y-2">
            {[
              ['ຍອດຂາຍລວມ', fmtNum(totalSales) + ' ₭', 'text-slate-900 dark:text-white font-bold'],
              ['ຄ່າຂົນສົ່ງ', fmtNum(order.shippingFee) + ' ₭', 'text-slate-600 dark:text-slate-300'],
              ['ຕົ້ນທຶນ', fmtNum(order.totalCost) + ' ₭', 'text-orange-600 dark:text-orange-400'],
              ['ກຳໄລ', fmtNum(order.totalProfit) + ' ₭', order.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-rose-600 font-extrabold'],
              ...(order.deposit > 0 ? [['ມັດຈຳ', fmtNum(order.deposit) + ' ₭', 'text-violet-600 dark:text-violet-400']] : []),
              ...(order.deposit > 0 ? [['COD ຄ້າງຈ່າຍ', fmtNum(Math.max(totalSales - order.deposit, 0)) + ' ₭', 'text-red-600 dark:text-red-400 font-bold']] : []),
            ].map(([l, v, cls]) => (
              <div key={l} className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{l}</span>
                <span className={cls}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// RESET MODAL
// ═══════════════════════════════════════════════════════════════════════
function ResetModal({ wallets, onConfirm, onClose }: {
  wallets: Wallet[];
  onConfirm: (partnerName: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState('');
  const partners = wallets.filter(w => w.type === 'partner');
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm animate-[scaleIn_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 dark:border-white/8">
          <h3 className="font-extrabold text-slate-900 dark:text-white">ຕັ້ງຜູ້ສັ່ງ & ລ້າງ 0</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ເລືອກ Partner ທີ່ຮັບຜິດຊອບລອບໃໝ່ ແລ້ວ Reset ຕົ້ນທຶນ/ກຳໄລເປັນ 0</p>
        </div>
        <div className="p-5 space-y-3">
          {partners.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">ຍັງບໍ່ມີ Partner ໃນລະບົບ (ເພີ່ມໃນໜ້າ Wallet)</p>
          ) : (
            partners.map(p => (
              <button key={p.id} onClick={() => setSelected(p.name)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${selected === p.name ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15' : 'border-slate-100 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'}`}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {p.name.charAt(0)}
                </div>
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{p.name}</span>
                {selected === p.name && <span className="ml-auto text-violet-500">✓</span>}
              </button>
            ))
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className={`${btnGhost} flex-1 justify-center`}>ຍົກເລີກ</button>
            <button onClick={() => selected && onConfirm(selected)} disabled={!selected}
              className="flex-1 h-9 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0">
              ລ້າງ &amp; ເລີ່ມໃໝ່
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// HISTORY MODAL
// ═══════════════════════════════════════════════════════════════════════
function HistoryModal({ orders, lastReset, onClose }: { orders: Order[]; lastReset: Date | null; onClose: () => void }) {
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (o.status === 'ຍົກເລີກອໍເດີ') return false;
      const d = tsToDate(o.createdAt);
      if (!d) return false;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return ym === monthFilter;
    });
  }, [orders, monthFilter]);

  const byDay = useMemo(() => {
    const map: Record<string, { cost: number; profit: number; count: number }> = {};
    filtered.forEach(o => {
      const d = tsToDate(o.createdAt);
      if (!d) return;
      const key = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
      if (!map[key]) map[key] = { cost: 0, profit: 0, count: 0 };
      map[key].cost += o.totalCost || 0;
      map[key].profit += o.totalProfit || 0;
      map[key].count++;
    });
    return Object.entries(map).map(([date, v]) => ({ date, ...v }));
  }, [filtered]);

  const totals = useMemo(() => byDay.reduce((acc, d) => ({ cost: acc.cost + d.cost, profit: acc.profit + d.profit, count: acc.count + d.count }), { cost: 0, profit: 0, count: 0 }), [byDay]);

  // Today & yesterday
  const today = new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
  const todayData    = byDay.find(d => d.date === today);
  const yesterdayData = byDay.find(d => d.date === yesterday);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg max-h-[90vh] flex flex-col animate-[scaleIn_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/8 shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">ເບິ່ງປະຫວັດ</h3>
            {lastReset && <p className="text-xs text-slate-400 mt-0.5">Reset ລ່າສຸດ: {lastReset.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
              className="h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none" />
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'ມື້ນີ້ — ຕົ້ນທຶນ', val: fmt(todayData?.cost || 0), sub: fmt(todayData?.profit || 0) + ' ກຳໄລ', cls: 'bg-blue-50 dark:bg-blue-500/10' },
              { label: 'ມື້ວານ — ຕົ້ນທຶນ', val: fmt(yesterdayData?.cost || 0), sub: fmt(yesterdayData?.profit || 0) + ' ກຳໄລ', cls: 'bg-slate-50 dark:bg-white/5' },
              { label: 'ລວມເດືອນ', val: fmt(totals.cost), sub: fmt(totals.profit) + ' ກຳໄລ', cls: totals.profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10' },
            ].map(c => (
              <div key={c.label} className={`rounded-xl p-3 ${c.cls}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{c.label}</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-white mt-1 tabular-nums">{c.val}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{c.sub}</p>
              </div>
            ))}
          </div>
          {/* Daily breakdown */}
          {byDay.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">ບໍ່ມີຂໍ້ມູນໃນເດືອນນີ້</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/8">
                    <th className="text-left pb-2 pr-3">ວັນທີ</th>
                    <th className="text-right pb-2 pr-3">ອໍ</th>
                    <th className="text-right pb-2 pr-3">ຕົ້ນທຶນ</th>
                    <th className="text-right pb-2">ກຳໄລ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {byDay.map(d => (
                    <tr key={d.date} className="hover:bg-slate-50 dark:hover:bg-white/3 transition-colors">
                      <td className="py-2.5 pr-3 font-semibold text-slate-700 dark:text-slate-200">{d.date}</td>
                      <td className="py-2.5 pr-3 text-right text-slate-500">{d.count}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-orange-600 dark:text-orange-400 tabular-nums">{fmtNum(d.cost)} ₭</td>
                      <td className={`py-2.5 text-right font-bold tabular-nums ${d.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmtNum(d.profit)} ₭</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-white/15 font-extrabold">
                    <td className="pt-2.5 text-slate-800 dark:text-white">ລວມ</td>
                    <td className="pt-2.5 text-right text-slate-600 dark:text-slate-300">{totals.count}</td>
                    <td className="pt-2.5 text-right text-orange-600 dark:text-orange-400 tabular-nums">{fmtNum(totals.cost)} ₭</td>
                    <td className={`pt-2.5 text-right tabular-nums ${totals.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmtNum(totals.profit)} ₭</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ALERT BADGE (countdown / overdue)
// ═══════════════════════════════════════════════════════════════════════
function AlertBadge({ order, now, onQuickCheck }: { order: Order; now: number; onQuickCheck: () => void }) {
  const updatedAt = tsToDate(order.statusUpdatedAt) || tsToDate(order.createdAt);

  if (order.status === 'ສົ່ງບິນແລ້ວ' && updatedAt) {
    const hrs = (now - updatedAt.getTime()) / 3600000;
    if (hrs > 24) {
      return (
        <div className="flex items-center gap-1.5 mt-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 animate-pulse">
            🔴 ເກີນ 24 ຊມ!
          </span>
          <button onClick={onQuickCheck} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors border border-emerald-200 dark:border-emerald-500/30">
            ກວດສອບ ✓
          </button>
        </div>
      );
    } else {
      const remaining = 24 - hrs;
      const hh = Math.floor(remaining);
      const mm = Math.floor((remaining % 1) * 60);
      return (
        <div className="flex items-center gap-1.5 mt-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/30">
            ⏳ {hh}ຊ {mm}ນ
          </span>
          <button onClick={onQuickCheck} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 transition-colors border border-emerald-200 dark:border-emerald-500/30">
            ກວດສອບ ✓
          </button>
        </div>
      );
    }
  }

  if (order.status === 'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ' && updatedAt) {
    const hrs = (now - updatedAt.getTime()) / 3600000;
    if (hrs > 48) {
      const days = Math.floor(hrs / 24);
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 mt-1">
          ⚠️ ຄ້າງ {days} ມື້!
        </span>
      );
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// INLINE COST INPUT
// ═══════════════════════════════════════════════════════════════════════
function InlineCostInput({ orderId, value, onSave }: { orderId: string; value: number; onSave: (id: string, val: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { if (!editing) setLocal(String(value)); }, [value, editing]);

  const handleBlur = () => {
    setEditing(false);
    const num = Number(local.replace(/,/g, ''));
    if (!isNaN(num) && num !== value) onSave(orderId, num);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') handleBlur(); if (e.key === 'Escape') { setEditing(false); setLocal(String(value)); } }}
        className="w-28 h-7 text-xs text-right px-2 bg-white dark:bg-slate-800 border-2 border-violet-400 rounded-lg outline-none tabular-nums font-bold text-slate-800 dark:text-white"
      />
    );
  }

  return (
    <button onClick={() => setEditing(true)} title="ກົດເພື່ອແກ້ໄຂ"
      className="group flex items-center gap-1 text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
      {fmtNum(value)} ₭
      <svg className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COPY BUTTON
// ═══════════════════════════════════════════════════════════════════════
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <button onClick={handle} title="ຄັດລອກ"
      className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 dark:bg-white/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-all shrink-0">
      {copied ? <span className="text-[9px] text-emerald-600">✓</span> : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"/></svg>}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function OrderList() {
  const now = useNow();

  // ── Data ─────────────────────────────────────────────────────────────
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastReset,   setLastReset]   = useState<Date | null>(null);
  const [lastResetBy, setLastResetBy] = useState('');

  // ── Filters ───────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter,   setDateFilter]   = useState<'all' | 'this' | 'prev' | 'custom'>('all');
  const [customMonth,  setCustomMonth]  = useState('');
  const [theme,        setTheme]        = useState<string>('default');

  // ── UI state ──────────────────────────────────────────────────────────
  const [toast,       setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [statusModal, setStatusModal] = useState<string | null>(null);     // orderId
  const [billModal,   setBillModal]   = useState<Order | null>(null);
  const [showReset,   setShowReset]   = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [updatingId,  setUpdatingId]  = useState<string | null>(null);
  const [shopName,    setShopName]    = useState('');
  const [shopPhone,   setShopPhone]   = useState('');

  // ── Load localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('orderTableTheme') || 'default';
      setTheme(savedTheme);
      setShopName(localStorage.getItem('shopName') || 'Tawan East Shop');
      setShopPhone(localStorage.getItem('shopPhone') || '');
    }
  }, []);

  const saveTheme = (t: string) => {
    setTheme(t);
    if (typeof window !== 'undefined') localStorage.setItem('orderTableTheme', t);
  };

  // ── Firestore listeners ───────────────────────────────────────────────
  useEffect(() => {
    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      snap => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
        setLoading(false);
      },
      err => { console.error(err); setLoading(false); }
    );

    const unsubWallets = onSnapshot(collection(db, 'wallets'), snap => {
      setWallets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Wallet)));
    });

    // Load costCounter
    getDoc(doc(db, 'settings', 'costCounter')).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setLastReset(tsToDate(d.lastReset));
        setLastResetBy(d.lastResetBy || '');
      }
    });

    // Listen to costCounter changes
    const unsubCounter = onSnapshot(doc(db, 'settings', 'costCounter'), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setLastReset(tsToDate(d.lastReset));
        setLastResetBy(d.lastResetBy || '');
      }
    });

    return () => { unsubOrders(); unsubWallets(); unsubCounter(); };
  }, []);

  // ── Date helpers ──────────────────────────────────────────────────────
  const thisYM = useMemo(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const prevYM = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // ── Filtered orders ───────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Search
      const q = search.toLowerCase();
      const matchSearch = !q ||
        o.customerName?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.transport?.toLowerCase().includes(q) ||
        (o.items || []).some(i => i.name?.toLowerCase().includes(q));

      // Status
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;

      // Date
      let matchDate = true;
      if (dateFilter === 'this')   matchDate = getYM(o.createdAt) === thisYM;
      if (dateFilter === 'prev')   matchDate = getYM(o.createdAt) === prevYM;
      if (dateFilter === 'custom') matchDate = getYM(o.createdAt) === customMonth;

      return matchSearch && matchStatus && matchDate;
    });
  }, [orders, search, statusFilter, dateFilter, customMonth, thisYM, prevYM]);

  // ── Summary widget ────────────────────────────────────────────────────
  const summaryStats = useMemo(() => {
    const src = lastReset
      ? orders.filter(o => {
          if (o.status === 'ຍົກເລີກອໍເດີ') return false;
          const d = tsToDate(o.createdAt);
          return d && d >= lastReset;
        })
      : orders.filter(o => o.status !== 'ຍົກເລີກອໍເດີ');
    return {
      cost:   src.reduce((s, o) => s + (o.totalCost || 0) + (o.shippingFee || 0), 0),
      profit: src.reduce((s, o) => s + (o.totalProfit || 0), 0),
      count:  src.length,
    };
  }, [orders, lastReset]);

  // ── Actions ───────────────────────────────────────────────────────────
  const updateStatus = useCallback(async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    setStatusModal(null);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        statusUpdatedAt: new Date(),
      });
      setToast({ msg: `ປ່ຽນສະຖານະເປັນ "${newStatus}" ສຳເລັດ`, type: 'success' });
    } catch {
      setToast({ msg: 'ບໍ່ສາມາດປ່ຽນສະຖານະໄດ້', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const saveCost = useCallback(async (orderId: string, cost: number) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { totalCost: cost });
      setToast({ msg: 'ບັນທຶກຕົ້ນທຶນແລ້ວ', type: 'success' });
    } catch {
      setToast({ msg: 'ບໍ່ສາມາດບັນທຶກຕົ້ນທຶນໄດ້', type: 'error' });
    }
  }, []);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!confirm('ຕ້ອງການລຶບອໍເດີນີ້ອອກຈາກລະບົບແທ້ບໍ?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setToast({ msg: 'ລຶບອໍເດີສຳເລັດ', type: 'success' });
    } catch {
      setToast({ msg: 'ບໍ່ສາມາດລຶບໄດ້', type: 'error' });
    }
  }, []);

  const handleReset = useCallback(async (partnerName: string) => {
    try {
      await setDoc(doc(db, 'settings', 'costCounter'), {
        lastReset: new Date(),
        lastResetBy: partnerName,
      });
      setShowReset(false);
      setToast({ msg: `ລ້າງຍອດ 0 ໂດຍ ${partnerName} ສຳເລັດ!`, type: 'success' });
    } catch {
      setToast({ msg: 'ບໍ່ສາມາດ Reset ໄດ້', type: 'error' });
    }
  }, []);

  const themeConfig = THEMES[theme] || THEMES.default;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5 pb-8">
      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modals */}
      {statusModal && (
        <StatusModal
          current={orders.find(o => o.id === statusModal)?.status || ''}
          onSelect={s => updateStatus(statusModal, s)}
          onClose={() => setStatusModal(null)}
        />
      )}
      {billModal && <BillModal order={billModal} shopName={shopName} shopPhone={shopPhone} onClose={() => setBillModal(null)} />}
      {showReset && <ResetModal wallets={wallets} onConfirm={handleReset} onClose={() => setShowReset(false)} />}
      {showHistory && <HistoryModal orders={orders} lastReset={lastReset} onClose={() => setShowHistory(false)} />}

      {/* ── HEADER ── */}
      <div className={`${card} ${pad} relative overflow-hidden`}>
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-violet-100/50 dark:bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">ລາຍການອໍເດີ</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">ຈັດການອໍເດີທັງໝົດ · {filteredOrders.length} ລາຍການ</p>
            </div>
          </div>
          {/* Shop settings inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <input value={shopName} onChange={e => { setShopName(e.target.value); localStorage.setItem('shopName', e.target.value); }}
              placeholder="ຊື່ຮ້ານ" className={`${inputCls} w-36`} />
            <input value={shopPhone} onChange={e => { setShopPhone(e.target.value); localStorage.setItem('shopPhone', e.target.value); }}
              placeholder="ເບີໂທຮ້ານ" className={`${inputCls} w-32`} />
          </div>
        </div>
      </div>

      {/* ── SUMMARY WIDGET (3.2) ── */}
      <div className={`${card} ${pad}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ຜູ້ຮັບຜິດຊອບ:</span>
              {lastResetBy ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />{lastResetBy}
                </span>
              ) : (
                <span className="text-xs text-slate-400">ຍັງບໍ່ໄດ້ຕັ້ງ</span>
              )}
            </div>
            {lastReset && (
              <span className="text-[11px] text-slate-400">Reset: {lastReset.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowReset(true)}
              className="h-9 px-4 flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-sm shadow-violet-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
              ຕັ້ງຜູ້ສັ່ງ & ລ້າງ 0
            </button>
            <button onClick={() => setShowHistory(true)} className={btnGhost}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              ເບິ່ງປະຫວັດ
            </button>
          </div>
        </div>
        {/* Summary numbers */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'ອໍເດີ (ໃນລອບ)', val: String(summaryStats.count), sub: '', cls: 'text-violet-700 dark:text-violet-300' },
            { label: 'ຕົ້ນທຶນ + ຂົນສົ່ງ', val: fmtNum(summaryStats.cost) + ' ₭', sub: 'ນັບຈາກ Reset', cls: 'text-orange-600 dark:text-orange-400' },
            { label: 'ກຳໄລສຸດທິ', val: fmtNum(summaryStats.profit) + ' ₭', sub: 'ນັບຈາກ Reset', cls: summaryStats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400' },
          ].map(c => (
            <div key={c.label} className="bg-slate-50 dark:bg-white/5 rounded-xl p-3.5 border border-slate-100 dark:border-white/8">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{c.label}</p>
              <p className={`text-lg font-extrabold tabular-nums ${c.cls}`}>{c.val}</p>
              {c.sub && <p className="text-[10px] text-slate-400 mt-0.5">{c.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ── FILTER BAR (3.1) ── */}
      <div className={`${card} ${pad}`}>
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + Refresh */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm group">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ຄົ້ນຫາ ຊື່, ເບີ, ID, ສິນຄ້າ..."
                className={`${inputCls} w-full pl-10`} />
            </div>
            <button onClick={() => setSearch('')} title="Refresh" className={btnGhost}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
            </button>
          </div>

          {/* Row 2: Date pills + Status + Theme */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date pills */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl p-1 gap-1">
              {([['all', 'ທັງໝົດ'], ['this', 'ເດືອນນີ້'], ['prev', 'ເດືອນກ່ອນ']] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => setDateFilter(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === val ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                  {lbl}
                </button>
              ))}
            </div>
            <input type="month" value={customMonth}
              onChange={e => { setCustomMonth(e.target.value); setDateFilter('custom'); }}
              className={`${inputCls} w-40 text-xs`} title="ເລືອກເດືອນ" />

            {/* Status dropdown */}
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className={`${inputCls} pl-3 pr-8 appearance-none cursor-pointer font-semibold min-w-[140px]`}>
                <option value="all">ທຸກສະຖານະ</option>
                {STATUS_META.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </div>

            {/* Theme dropdown */}
            <div className="relative">
              <select value={theme} onChange={e => saveTheme(e.target.value)}
                className={`${inputCls} pl-3 pr-8 appearance-none cursor-pointer font-semibold`}>
                {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </div>

            <span className="ml-auto text-xs text-slate-400 font-medium tabular-nums">{filteredOrders.length} / {orders.length} ລາຍການ</span>
          </div>
        </div>
      </div>

      {/* ── ORDER TABLE (3.4) ── */}
      <div className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-sm font-medium">ກຳລັງໂຫຼດ...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300 dark:text-slate-600">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            <p className="text-sm font-semibold text-slate-400">ບໍ່ພົບຂໍ້ມູນ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b border-slate-200/80 dark:border-white/8 ${themeConfig.th}`}>
                  {['#', 'ວັນທີ / ID', 'ລູກຄ້າ & ເບີ', 'ທີ່ຢູ່ / ຂົນສົ່ງ', 'ສິນຄ້າ', 'ຕົ້ນທຶນ ₭', 'ຍອດຂາຍ ₭', 'ກຳໄລ ₭', 'ສະຖານະ', 'ຈັດການ'].map(h => (
                    <th key={h} className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredOrders.map((order, idx) => {
                  const totalSales = (order.items || []).reduce((s, i) => s + i.price * i.qty, 0);
                  const isUpdating = updatingId === order.id;
                  const remaining  = totalSales - (order.deposit || 0);
                  const waUrl = getWhatsAppUrl(order.phone || '');

                  const shippingCopyText = [
                    `🏪 ${shopName}`, `📞 ${shopPhone}`,
                    '━━━━━━━━━━━',
                    `👤 ຜູ້ຮັບ: ${order.customerName}`,
                    `📱 ເບີ: ${order.phone}`,
                    `🏠 ບ.${order.village} ມ.${order.district} ແຂ.${order.province}`,
                    `🚚 ${order.transport}`,
                    '━━━━━━━━━━━',
                    `💰 COD: ${fmtNum(remaining > 0 ? remaining : totalSales)} ₭`,
                  ].filter(Boolean).join('\n');

                  return (
                    <tr key={order.id} className={`${themeConfig.row} transition-colors group`}>

                      {/* # */}
                      <td className="px-4 py-4 text-sm text-slate-400 tabular-nums w-10">{idx + 1}</td>

                      {/* Date / ID */}
                      <td className="px-4 py-4 min-w-[120px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{order.id.slice(-10)}</span>
                          <span className="text-xs text-slate-400">{formatDate(order.createdAt)}</span>
                          {order.orderedBy && (
                            <span className="inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 w-fit">{order.orderedBy}</span>
                          )}
                        </div>
                      </td>

                      {/* Customer & Phone */}
                      <td className="px-4 py-4 min-w-[150px]">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {getInitials(order.customerName)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{order.customerName || '—'}</p>
                            {order.phone && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-slate-500 dark:text-slate-400">{order.phone}</span>
                                <a href={waUrl} target="_blank" rel="noreferrer"
                                  className="w-5 h-5 flex items-center justify-center rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 transition-colors" title="WhatsApp">
                                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Shipping / Address */}
                      <td className="px-4 py-4 min-w-[140px]">
                        <div className="flex items-start gap-1.5">
                          <details className="group/details">
                            <summary className="list-none cursor-pointer flex items-center gap-1.5">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 px-2 py-0.5 rounded-md">{order.transport || '—'}</span>
                              <svg className="w-3 h-3 text-slate-400 transition-transform group-open/details:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
                            </summary>
                            <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                              {order.village  && <p>🏘 ບ.{order.village}</p>}
                              {order.district && <p>📍 ມ.{order.district}</p>}
                              {order.province && <p>🗺 ແຂ.{order.province}</p>}
                            </div>
                          </details>
                          <CopyBtn text={shippingCopyText} />
                        </div>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-4 min-w-[140px]">
                        <div className="space-y-1">
                          {(order.items || []).slice(0, 2).map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                              <span className="truncate max-w-[90px]">{item.name}</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100 shrink-0">×{item.qty}</span>
                            </div>
                          ))}
                          {(order.items || []).length > 2 && (
                            <span className="text-[11px] text-slate-400">+{order.items.length - 2} ລາຍການ</span>
                          )}
                        </div>
                      </td>

                      {/* Cost (inline edit) */}
                      <td className="px-4 py-4">
                        <div className="space-y-0.5">
                          <InlineCostInput orderId={order.id} value={order.totalCost || 0} onSave={saveCost} />
                          {(order.shippingFee || 0) > 0 && (
                            <p className="text-[11px] text-slate-400 tabular-nums">+{fmtNum(order.shippingFee)} ₭ ຂົນສົ່ງ</p>
                          )}
                        </div>
                      </td>

                      {/* Sales */}
                      <td className="px-4 py-4">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{fmtNum(totalSales)} ₭</p>
                          {(order.deposit || 0) > 0 && (
                            <div className="space-y-0.5">
                              <span className="text-[11px] bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 px-1.5 py-0.5 rounded font-bold tabular-nums">ມ.{fmtNum(order.deposit)} ₭</span>
                              {remaining > 0 && <p className="text-[11px] text-slate-500 tabular-nums">ຄ້າງ {fmtNum(remaining)} ₭</p>}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Profit */}
                      <td className="px-4 py-4">
                        <p className={`text-sm font-extrabold tabular-nums ${(order.totalProfit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {fmtNum(order.totalProfit || 0)} ₭
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 min-w-[170px]">
                        <StatusBadge status={order.status} loading={isUpdating} onClick={() => setStatusModal(order.id)} />
                        {order.statusUpdatedAt && (
                          <p className="text-[10px] text-slate-400 mt-1 tabular-nums">{formatDate(order.statusUpdatedAt, true)} {formatTime(order.statusUpdatedAt)}</p>
                        )}
                        <AlertBadge order={order} now={now} onQuickCheck={() => updateStatus(order.id, 'ກວດສອບແລ້ວ')} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setBillModal(order)} title="ເບິ່ງບິນ"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/8 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          </button>
                          <button onClick={() => deleteOrder(order.id)} title="ລຶບ"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/8 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
