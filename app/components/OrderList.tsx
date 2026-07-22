'use client';

import React, {
  useState, useEffect, useMemo, useRef, useCallback
} from 'react';
import { db } from '@/firebase';
import {
  collection, addDoc, query, orderBy, onSnapshot,
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
interface OrderItem { id: string; name: string; qty: number; cost: number; price: number; status?: string; imageUrl?: string; }
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
  statusUpdatedAt?: unknown;
  deposit: number;
  shippingFee: number;
  items: OrderItem[];
  expenses?: Array<{ id: string; name: string; amount: number }>;
  totalCost: number;
  totalProfit: number;
  totalSales?: number;   // sum of item.price * item.qty
  price?: number;        // legacy alias for totalSales
  totalExpenses?: number;
  paymentMethod?: string;
  wallet?: string;
  createdAt?: unknown;
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
  if (typeof ts === 'string' || typeof ts === 'number') {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
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
// SHIPPING MODAL
// ═══════════════════════════════════════════════════════════════════════
function ShippingModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const totalSales = (order.items || []).reduce((s, i) => s + i.price * i.qty, 0);
  const remaining = totalSales - (order.deposit || 0);

  const textLines = [
    `ຜູ້ສັ່ງ: ${order.customerName} (${order.phone})`,
    `--------------------------`,
    `ຜູ້ຮັບ: ${order.customerName}`,
    `ໂທ: ${order.phone}`,
    `ທີ່ຢູ່: ບ.${order.village || '-'} ມ.${order.district || '-'} ແຂ.${order.province || '-'}`,
    `ຂົນສົ່ງ: ${order.transport || '-'}`,
    `--------------------------`,
    `*** COD: ${fmtNum(remaining > 0 ? remaining : totalSales)} ₭ ***`,
  ];
  
  const handleCopy = () => {
    navigator.clipboard.writeText(textLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-[300px] overflow-hidden animate-[scaleIn_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
          <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5"><span className="text-base">📍</span> ລາຍລະອຽດການຈັດສົ່ງ</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="font-mono text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
            {textLines.join('\n')}
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5">
          <button onClick={handleCopy} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${copied ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 hover:bg-slate-100 text-indigo-600 border border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-indigo-400'}`}>
            {copied ? '✅ ຄັດລອກສຳເລັດ' : '📋 ຄັດລອກຂໍ້ມູນຂົນສົ່ງ'}
          </button>
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
      className="group flex items-center justify-center gap-1 min-w-[70px] px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-800/50 text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-sm transition-all">
      {fmtNum(value)}
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
export default function OrderList({ onEdit }: { onEdit?: (id: string) => void }) {
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
  const isInitialLoad = useRef(true);

  const updateItemStatus = async (orderId: string, itemIdx: number, newStatus: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      
      const newItems = [...(order.items || [])];
      const oldStatus = newItems[itemIdx].status;
      newItems[itemIdx] = { ...newItems[itemIdx], status: newStatus };
      
      const updateData: any = { items: newItems };
      
      // Auto-update global status if all items have the same status
      if (newItems.length > 0 && newItems.every((item: any) => item.status === newStatus)) {
        if (newStatus === 'ເຄື່ອງມາແລ້ວ') {
          updateData.status = 'ເຄື່ອງມາຮອດແລ້ວ';
        } else if (newStatus === 'ສັ່ງເຄື່ອງແລ້ວ') {
          updateData.status = 'ສັ່ງເຄື່ອງແລ້ວ';
        } else if (newStatus === 'ສົ່ງໃຫ້ລູກຄ້າແລ້ວ') {
          updateData.status = 'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ';
        }
      }

      // Add to stock if cancelled
      if (newStatus === 'ຍົກເລີກ' && oldStatus !== 'ຍົກເລີກ') {
        const confirmStock = window.confirm(`ລູກຄ້າຍົກເລີກສິນຄ້າ "${newItems[itemIdx].name}". ຕ້ອງການນຳສິນຄ້ານີ້ເຂົ້າສະຕັອກ (Stock) ຫຼືບໍ່? (ຖ້າຕົກລົງ, ສິນຄ້າຈະຖືກລຶບອອກຈາກອໍເດີນີ້)`);
        if (confirmStock) {
          const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
          await addDoc(collection(db, 'stocks'), {
            itemName: newItems[itemIdx].name,
            quantity: newItems[itemIdx].qty || 1,
            costPrice: 0,
            sellingPrice: 0,
            imageUrl: newItems[itemIdx].imageUrl || '',
            notes: `ຈາກການຍົກເລີກອໍເດີ (Order: ${orderId})`,
            createdAt: serverTimestamp(),
          });
          setToast({ msg: '📦 ນຳສິນຄ້າເຂົ້າສະຕັອກ ແລະ ລຶບອອກຈາກອໍເດີສຳເລັດ', type: 'success' });
          
          // Remove the cancelled item from the order entirely
          newItems.splice(itemIdx, 1);
          updateData.items = newItems;
        }
      }
      
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, updateData);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error(err);
      setToast({ msg: '❌ ບໍ່ສາມາດອັບເດດສະຖານະສິນຄ້າໄດ້', type: 'error' });
    }
  };
  const [toast,       setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [statusModal, setStatusModal] = useState<string | null>(null);     // orderId
  const [billModal,   setBillModal]   = useState<Order | null>(null);
  const [shippingModal, setShippingModal] = useState<Order | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
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
      collection(db, 'orders'),
      snap => {
        const arr = snap.docs.map(d => {
          const data: any = d.data();
          const createdAtVal = (data.createdAt && data.createdAt.seconds) ? data.createdAt.seconds * 1000 : (data.createdAtClient || Date.now());
          return { id: d.id, ...data, __createdAtVal: createdAtVal } as Order & { __createdAtVal?: number };
        });
        arr.sort((a: any, b: any) => (b.__createdAtVal || 0) - (a.__createdAtVal || 0));
        setOrders(arr as Order[]);
        setLoading(false);

        // Real-time Toast Notifications
        if (isInitialLoad.current) {
          isInitialLoad.current = false;
        } else if (!snap.metadata.hasPendingWrites) {
          snap.docChanges().forEach(change => {
            const data = change.doc.data();
            const customer = data.customerName || 'ລູກຄ້າ';
            if (change.type === 'modified') {
              setToast({ msg: `🔔 ອໍເດີຂອງທ່ານ ${customer} ຖືກອັບເດດສະຖານະ!`, type: 'success' });
            } else if (change.type === 'added') {
              setToast({ msg: `🆕 ມີອໍເດີໃໝ່ຈາກທ່ານ ${customer}!`, type: 'success' });
            }
          });
        }
      },
      err => { console.error(err); setLoading(false); }
    );

    const unsubWallets = onSnapshot(
      collection(db, 'wallets'),
      snap => {
        setWallets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Wallet)));
      },
      err => {
        if (process.env.NODE_ENV !== 'production') console.error('[OrderList] wallets snapshot error:', err);
      }
    );

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
      const matchStatus = statusFilter === 'all' || 
                          o.status === statusFilter || 
                          (o.items || []).some(i => i.status === statusFilter);

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
    setStatusModal(null);
    setUpdatingId(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        statusUpdatedAt: new Date(),
      });
      setToast({ msg: `ປ່ຽນສະຖານະເປັນ "${newStatus}" ສຳເລັດ`, type: 'success' });
    } catch {
      setToast({ msg: 'ບໍ່ສາມາຖປ່ຽນສະຖານະໄດ້', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const saveCost = useCallback(async (orderId: string, cost: number) => {
    try {
      // Find order to recalculate profit correctly
      const order = orders.find(o => o.id === orderId);
      const newProfit = (order?.totalSales ?? order?.price ?? 0)
        - cost
        - (order?.shippingFee ?? 0)
        - (order?.totalExpenses ?? 0);
      
      const updates: any = {
        totalCost: cost,
        totalProfit: newProfit,
      };

      // Auto-assign the active purchaser if not already set, or overwrite if requested by workflow
      if (lastResetBy) {
        updates.orderedBy = lastResetBy;
      }

      await updateDoc(doc(db, 'orders', orderId), updates);
      setToast({ msg: 'ບັນທຶກຕ້ນທຶນແລ້ວ', type: 'success' });
    } catch {
      setToast({ msg: 'ບໍ່ສາມາຖບັນທຶກຕ້ນທຶນໄດ້', type: 'error' });
    }
  }, [orders, lastResetBy]);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!confirm('ຕ້ອງການລຶບອໍເດີນີ້ອອກຈາກລະບົບແທ້ບໍ?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setToast({ msg: 'ລຶບອໍເດີສຳເລັດ', type: 'success' });
    } catch {
      setToast({ msg: 'ບໍ່ສາມາດລຶບໄດ້', type: 'error' });
    }
  }, []);

  const handleReset = useCallback(async (personName: string) => {
    try {
      // Calculate profit since last reset
      const resetTime = lastReset;
      const profitSinceReset = orders
        .filter(o => {
          if (o.status === 'ຍົກເລີກອໍເດີ') return false;
          const d = tsToDate(o.createdAt);
          return resetTime ? (d && d >= resetTime) : true;
        })
        .reduce((s, o) => s + (o.totalProfit || 0), 0);

      // Record profit as income to W-COMP wallet if positive
      if (profitSinceReset > 0) {
        await addDoc(collection(db, 'transactions'), {
          walletId: 'W-COMP',
          type: 'income',
          amount: profitSinceReset,
          note: `ກຳໄລລອບ — ໂດຍ: ${personName}`,
          date: new Date().toISOString(),
        });
      }

      // Save reset record
      await setDoc(doc(db, 'settings', 'costCounter'), {
        lastReset: new Date(),
        lastResetBy: personName,
      });

      setShowReset(false);
      setToast({
        msg: `✅ ລ້າງຍອດ 0 ໂດຍ ${personName} — ກຳໄລ ${profitSinceReset.toLocaleString()} ₭ ເຂົ້າກະເປົາບໍລິສັດ!`,
        type: 'success'
      });
    } catch {
      setToast({ msg: 'ບໍ່ສາມາດ Reset ໄດ້', type: 'error' });
    }
  }, [orders, lastReset]);

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
      {shippingModal && <ShippingModal order={shippingModal} onClose={() => setShippingModal(null)} />}
      
      {/* Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out] cursor-zoom-out" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[85vh] animate-[zoomIn_0.2s_ease-out]">
            <button className="absolute -top-3 -right-3 sm:-top-5 sm:-right-5 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white text-slate-900 hover:bg-rose-500 hover:text-white hover:scale-110 transition-all shadow-2xl z-10" onClick={() => setPreviewImage(null)}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10" />
          </div>
        </div>
      )}
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
      <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/></svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">ສະຫຼຸບຍອດປັດຈຸບັນ</h2>
                
                {lastResetBy ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30 shadow-sm">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0-2a3 3 0 110-6 3 3 0 010 6zm9 11v-1a5 5 0 00-5-5H8a5 5 0 00-5 5v1a1 1 0 001 1h16a1 1 0 001-1zm-14-1a3 3 0 013-3h6a3 3 0 013 3H7z"/></svg>
                    {lastResetBy}
                  </span>
                ) : null}

                <button onClick={() => setShowReset(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-200 transition-colors shadow-sm">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05.02.01.03.03.04.04 1.14.83 1.93 1.94 1.93 3.41V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                  ຜູ້ສັ່ງ & ລ້າງ 0
                </button>
                
                <button onClick={() => setShowHistory(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 transition-colors shadow-sm">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  ເບິ່ງປະຫວັດ
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">ລວມມູນຄ່າທັງໝົດທີ່ເພີ່ມຫຼ້າສຸດ (ອັບເດດທຸກໆວິນາທີ)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8 lg:ml-auto">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 mb-1 text-rose-500">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                <span className="text-xs font-bold uppercase tracking-wider">ຕົ້ນທຶນ</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-500 tabular-nums leading-none tracking-tight">{fmtNum(summaryStats.cost)}</span>
                <span className="text-rose-500 font-bold text-sm mb-1">₭</span>
              </div>
            </div>
            
            <div className="w-px h-12 bg-rose-200 dark:bg-rose-500/20"></div>
            
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 mb-1 text-emerald-500">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span className="text-xs font-bold uppercase tracking-wider">ກຳໄລ</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl sm:text-4xl font-black text-emerald-500 dark:text-emerald-400 tabular-nums leading-none tracking-tight">{fmtNum(summaryStats.profit)}</span>
                <span className="text-emerald-500 font-bold text-sm mb-1">₭</span>
              </div>
            </div>
          </div>
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
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 w-fit border border-amber-200 dark:border-amber-500/30">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0-2a3 3 0 110-6 3 3 0 010 6zm9 11v-1a5 5 0 00-5-5H8a5 5 0 00-5 5v1a1 1 0 001 1h16a1 1 0 001-1zm-14-1a3 3 0 013-3h6a3 3 0 013 3H7z"/></svg>
                              {order.orderedBy}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer & Phone */}
                      <td className="px-4 py-4 min-w-[150px]">
                        <div className="flex items-start">
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
                        <button onClick={() => setShippingModal(order)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-white/10">
                          ຂໍ້ມູນຂົນສົ່ງ
                          <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
                        </button>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-4 min-w-[300px]">
                        <div className="space-y-1.5">
                          {(order.items || []).map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt="" className="w-6 h-6 rounded border border-slate-200 dark:border-white/10 object-cover cursor-pointer hover:ring-2 hover:ring-violet-500 transition-all shrink-0 bg-white" onClick={() => setPreviewImage(item.imageUrl!)} title="ຄລິກເພື່ອເບິ່ງຮູບເຕັມ" />
                              ) : (
                                <span className="text-slate-400 shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1"></span>
                              )}
                              <span className="break-words flex-1 leading-tight py-0.5">{item.name}</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">x{item.qty}</span>
                              
                              <div className="relative ml-auto shrink-0 group">
                                <select 
                                  value={item.status || 'ຮັບອໍເດີແລ້ວ'}
                                  onChange={(e) => updateItemStatus(order.id, i, e.target.value)}
                                  className={`appearance-none text-[10px] font-bold rounded-full pl-4 pr-5 py-0.5 outline-none transition-all cursor-pointer border-0 hover:shadow-md active:scale-95 text-center min-w-[74px] ${
                                    item.status === 'ຍົກເລີກ'
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                                      : item.status === 'ສົ່ງໃຫ້ລູກຄ້າແລ້ວ'
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                                      : item.status === 'ເຄື່ອງມາແລ້ວ' 
                                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' 
                                      : item.status === 'ສັ່ງເຄື່ອງແລ້ວ'
                                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                                  }`}
                                  style={{ textOverflow: 'ellipsis' }}
                                >
                                  <option value="ຮັບອໍເດີແລ້ວ">ຮັບແລ້ວ</option>
                                  <option value="ສັ່ງເຄື່ອງແລ້ວ">ສັ່ງແລ້ວ</option>
                                  <option value="ເຄື່ອງມາແລ້ວ">ມາແລ້ວ</option>
                                  <option value="ສົ່ງໃຫ້ລູກຄ້າແລ້ວ">ສົ່ງແລ້ວ</option>
                                  <option value="ຍົກເລີກ">ຍົກເລີກ</option>
                                </select>
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60">
                                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
                                </div>
                                <div className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full pointer-events-none ${
                                    item.status === 'ຍົກເລີກ' ? 'bg-rose-500' :
                                    item.status === 'ສົ່ງໃຫ້ລູກຄ້າແລ້ວ' ? 'bg-purple-500' :
                                    item.status === 'ເຄື່ອງມາແລ້ວ' ? 'bg-indigo-500' :
                                    item.status === 'ສັ່ງເຄື່ອງແລ້ວ' ? 'bg-orange-500' : 'bg-blue-500'
                                }`} />
                              </div>
                            </div>
                          ))}
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
                        <div className="flex flex-col items-center gap-1.5">
                          <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                            {fmtNum(totalSales)}
                          </p>
                          {(order.deposit || 0) > 0 && (
                            <div className="flex flex-col gap-1 w-full max-w-[110px]">
                              <div className="flex items-center justify-between text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/30">
                                <span className="font-medium opacity-80">ມັດຈຳ:</span>
                                <span className="font-bold tabular-nums">{fmtNum(order.deposit)}</span>
                              </div>
                              {remaining > 0 ? (
                                <div className="flex items-center justify-between text-[10px] bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-500/30">
                                  <span className="font-medium opacity-80">ເຫຼືອ:</span>
                                  <span className="font-bold tabular-nums">{fmtNum(remaining)}</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30 font-bold">
                                  ຈ່າຍຄົບແລ້ວ
                                </div>
                              )}
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
                        {order.statusUpdatedAt != null && (
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          <p className="text-[10px] text-slate-400 mt-1 tabular-nums">{formatDate(order.statusUpdatedAt as any, true)} {formatTime(order.statusUpdatedAt as any)}</p>
                        )}
                        <AlertBadge order={order} now={now} onQuickCheck={() => updateStatus(order.id, 'ກວດສອບແລ້ວ')} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onEdit && (
                            <button onClick={() => onEdit(order.id)} title="ແກ້ໄຂ"
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/8 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-all">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.14l-2.81.93.93-2.81a4.5 4.5 0 011.14-1.89l12.66-12.66z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5"/></svg>
                            </button>
                          )}
                          <button onClick={() => setBillModal(order)} title="ເບິ່ງບິນ"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/8 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          </button>
                          <button onClick={() => deleteOrder(order.id)} title="ລຶບ"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/8 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
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
