'use client';

import React, {
  useState, useEffect, useMemo, useRef, useCallback
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/app/lib/supabase';
import Swal from 'sweetalert2';
import { BaseModal } from './BaseModal';
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentTextIcon,
  TruckIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/20/solid';
import { ImageGalleryModal, GalleryImage } from './ImageGalleryModal';

// ═══════════════════════════════════════════════════════════════════════
// STATUS META (9 statuses)
// ═══════════════════════════════════════════════════════════════════════
export const STATUS_META = [
  { value: 'ຮັບອໍເດີແລ້ວ',            chip: 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',         dot: 'bg-blue-500'    },
  { value: 'ສັ່ງເຄື່ອງແລ້ວ',           chip: 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',   dot: 'bg-orange-500'  },
  { value: 'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ', chip: 'bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',   dot: 'bg-purple-500'  },
  { value: 'ແຈ້ງລູກຄ້າແລ້ວ',          chip: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300', dot: 'bg-fuchsia-500'  },
  { value: 'ສົ່ງບິນແລ້ວ',              chip: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',          dot: 'bg-cyan-500'    },
  { value: 'ໂອນມັດຈຳແລ້ວ',            chip: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',   dot: 'bg-yellow-500'  },
  { value: 'ເຄື່ອງມາຮອດແລ້ວ',         chip: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',   dot: 'bg-indigo-500'  },
  { value: 'ໄດ້ຮັບເງິນແລ້ວ',           chip: 'bg-lime-50 text-lime-700 dark:bg-lime-500/20 dark:text-lime-300',           dot: 'bg-lime-500'    },
  { value: 'ຍົກເລີກອໍເດີ',             chip: 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',           dot: 'bg-rose-500'    },
];

// ═══════════════════════════════════════════════════════════════════════
// TABLE THEMES (ปรับให้เป็นสีพาสเทลตาม Palette)
// ═══════════════════════════════════════════════════════════════════════
const THEMES: Record<string, { label: string; row: string; th: string }> = {
  default: { label: 'ຄ່າເລີ່ມຕົ້ນ', row: 'group-hover:[&>td]:bg-teal-50/40 dark:group-hover:[&>td]:bg-teal-500/10', th: 'bg-teal-50/20 dark:bg-teal-500/5' },
  blue:    { label: 'ນ້ຳເງິນ',      row: 'group-hover:[&>td]:bg-blue-50/40 dark:group-hover:[&>td]:bg-blue-500/10', th: 'bg-blue-50/20 dark:bg-blue-500/5' },
  green:   { label: 'ຂຽວ',          row: 'group-hover:[&>td]:bg-emerald-50/40 dark:group-hover:[&>td]:bg-emerald-500/10', th: 'bg-emerald-50/20 dark:bg-emerald-500/5' },
  purple:  { label: 'ມ່ວງ',          row: 'group-hover:[&>td]:bg-purple-50/40 dark:group-hover:[&>td]:bg-purple-500/10', th: 'bg-purple-50/20 dark:bg-purple-500/5' },
  rose:    { label: 'ບົວ',           row: 'group-hover:[&>td]:bg-rose-50/40 dark:group-hover:[&>td]:bg-rose-500/10', th: 'bg-rose-50/20 dark:bg-rose-500/5' },
  red:     { label: 'ແດງ',           row: 'group-hover:[&>td]:bg-red-50/40 dark:group-hover:[&>td]:bg-red-500/10', th: 'bg-red-50/20 dark:bg-red-500/5' },
};

// ═══════════════════════════════════════════════════════════════════════
// DESIGN TOKENS (Premium Minimal)
// ═══════════════════════════════════════════════════════════════════════
const card =
  'relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/60 dark:border-white/8 rounded-[28px] shadow-[0_10px_35px_rgba(0,0,0,0.06)] hover:shadow-[0_18px_55px_rgba(0,0,0,0.10)] transition-shadow duration-500';

const pad = 'p-5 sm:p-7';

const inputCls =
  'h-11 w-full bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/70 dark:border-white/10 rounded-[18px] px-4 text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400/70 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-slate-800/90 focus:border-teal-400 dark:focus:border-teal-500 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]';

const btnGhost =
  'h-10 px-4 flex items-center gap-2 rounded-[20px] border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50/80 dark:hover:bg-white/10 transition-all hover:shadow-md active:scale-[0.97]';

// ═══════════════════════════════════════════════════════════════════════
// TYPES (คงเดิม)
// ═══════════════════════════════════════════════════════════════════════
interface OrderItem { id: string; name: string; qty: number; cost: number; price: number; status?: string; image_url?: string; _cost_updated_at?: string; _cost_by?: string; tracking_code?: string; }
interface Order {
  id: string;
  customer_name: string;
  phone: string;
  transport: string;
  village: string;
  district: string;
  province: string;
  order_date: string;
  status: string;
  status_updated_at?: unknown;
  deposit: number;
  shipping_fee: number;
  items: OrderItem[];
  expenses?: Array<{ id: string; name: string; amount: number }>;
  total_cost: number;
  total_profit: number;
  total_sales?: number;
  price?: number;
  total_expenses?: number;
  payment_method?: string;
  wallet?: string;
  created_at?: unknown;
  image_url?: string;
  ordered_by?: string;
  cost_updated_at?: string;
}
interface Wallet { id: string; name: string; type: string; }

// ═══════════════════════════════════════════════════════════════════════
// UTILS (คงเดิม)
// ═══════════════════════════════════════════════════════════════════════
const fmt = (n: number) => n === 0 ? '' : new Intl.NumberFormat('en-US').format(n || 0) + ' ₭';
export const fmtNum = (n: number) => n === 0 ? '' : new Intl.NumberFormat('en-US').format(n || 0);

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
    ? d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatTime(ts: any) {
  const d = tsToDate(ts);
  if (!d) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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

function getWhatsAppUrl(phone: string, text?: string) {
  const digits = phone.replace(/[^0-9]/g, '');
  const baseUrl = digits.startsWith('0') ? `https://wa.me/856${digits.slice(1)}` : `https://wa.me/${digits}`;
  if (text) {
    return `${baseUrl}?text=${encodeURIComponent(text)}`;
  }
  return baseUrl;
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
// TOAST (Premium Minimal)
// ═══════════════════════════════════════════════════════════════════════
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
    >
      <div className={`px-6 py-3.5 rounded-[24px] border shadow-[0_15px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl text-sm font-bold flex items-center gap-3 ${
        type === 'success'
          ? 'bg-emerald-50/95 dark:bg-emerald-900/90 border-emerald-200/60 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
          : 'bg-rose-50/95 dark:bg-rose-900/90 border-rose-200/60 dark:border-rose-700 text-rose-700 dark:text-rose-300'
      }`}>
        {type === 'success' ? <CheckIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
        {msg}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STATUS BADGE (แบบ Premium)
// ═══════════════════════════════════════════════════════════════════════
export function StatusBadge({ status, onClick, loading }: { status: string; onClick?: () => void; loading?: boolean }) {
  const m = STATUS_META.find(s => s.value === status);
  if (!m) return <span className="text-xs text-slate-400">{status}</span>;
  return (
    <motion.button
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={loading || !onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.6875rem] font-bold border-0 transition-all ${m.chip} ${onClick ? 'cursor-pointer hover:shadow-md' : 'cursor-default'} ${loading ? 'opacity-50' : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.value}
      {onClick && !loading && <ChevronDownIcon className="w-2.5 h-2.5 opacity-60" />}
      {loading && <ArrowPathIcon className="w-3 h-3 animate-spin" />}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STATUS MODAL (ปรับดีไซน์)
// ═══════════════════════════════════════════════════════════════════════
export function StatusModal({ current, onSelect, onClose, includeAll }: { current: string; onSelect: (s: string) => void; onClose: () => void; includeAll?: boolean }) {
  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="ປ່ຽນສະຖານະ"
      maxWidth="max-w-[20rem]"
      width="w-80"
      bodyClassName="p-5"
    >
      <div className="space-y-1.5">
        {includeAll && (
          <button
            onClick={() => onSelect('all')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[18px] text-sm font-semibold transition-all ${
              current === 'all'
                ? 'bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 shadow-inner'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            ທຸກສະຖານະ
            {current === 'all' && <CheckIcon className="ml-auto w-4 h-4 text-teal-500" />}
          </button>
        )}
        {STATUS_META.map(s => (
          <button
            key={s.value}
            onClick={() => onSelect(s.value)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[18px] text-sm font-semibold transition-all ${
              current === s.value
                ? 'bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 shadow-inner'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            {s.value}
            {current === s.value && <CheckIcon className="ml-auto w-4 h-4 text-teal-500" />}
          </button>
        ))}
      </div>
    </BaseModal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BILL MODAL (ปรับดีไซน์)
// ═══════════════════════════════════════════════════════════════════════
function BillModal({ order, shopName, shopPhone, onClose }: { order: Order; shopName: string; shopPhone: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const total_sales = (order.items || []).reduce((s, i) => s + i.price * i.qty, 0);
  const remaining = total_sales - (order.deposit || 0);

  const copyText = [
    `🏪 ${shopName || 'PreOrder'}`,
    `📞 ${shopPhone || ''}`,
    `━━━━━━━━━━━━━━━━━`,
    `👤 ຜູ້ຮັບ: ${order.customer_name}`,
    `📱 ເບີ: ${order.phone}`,
    `🏠 ທີ່ຢູ່: ບ.${order.village} ມ.${order.district} ແຂ.${order.province}`,
    `🚚 ຂົນສົ່ງ: ${order.transport}`,
    `━━━━━━━━━━━━━━━━━`,
    ...(order.items || []).map(i => `• ${i.name} x${i.qty} = ${fmtNum(i.price * i.qty)} ₭`),
    `━━━━━━━━━━━━━━━━━`,
    order.deposit > 0 ? `💵 ມັດຈຳ: ${fmtNum(order.deposit)} ₭` : '',
    `💰 COD: ${fmtNum(remaining > 0 ? remaining : total_sales)} ₭`,
  ].filter(Boolean).join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      maxWidth="max-w-[28rem]"
      maxHeight="max-h-[90vh]"
      width="w-full"
      bodyClassName="p-5 space-y-5"
      headerBottom={
        <div className="flex items-center justify-between px-5">
          <div>
            <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{order.id.slice(-8)}</p>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{order.customer_name}</h3>
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 h-9 px-4 rounded-[20px] text-sm font-bold transition-all ${
              copied
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15'
            }`}
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <DocumentTextIcon className="w-4 h-4" />}
            {copied ? 'ຄັດລອກແລ້ວ' : 'ຄັດລອກ'}
          </button>
        </div>
      }
    >
      {/* Customer */}
      <div className="grid grid-cols-2 gap-3">
        {[
          ['📱 ເບີໂທ', order.phone],
          ['🚚 ຂົນສົ່ງ', order.transport],
          ['📍 ທີ່ຢູ່', `ບ.${order.village} ມ.${order.district}`],
          ['📅 ວັນທີ', order.order_date],
        ].map(([l, v]) => (
          <div key={l} className="bg-slate-50/70 dark:bg-slate-800 rounded-[18px] p-3">
            <p className="text-[0.625rem] text-slate-400 font-semibold uppercase tracking-wider">{l}</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{v || '—'}</p>
          </div>
        ))}
      </div>
      {/* Status */}
      <div className="flex items-center gap-3">
        <StatusBadge status={order.status} />
        <span className="text-xs text-slate-400">{formatDate(order.created_at)}</span>
      </div>
      {/* Items */}
      <div>
        <p className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-wider mb-3">ລາຍການສິນຄ້າ</p>
        <div className="space-y-2">
          {(order.items || []).map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 px-4 bg-slate-50/70 dark:bg-slate-800 rounded-[18px]">
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
      <div className="border-t border-slate-100/80 dark:border-white/8 pt-4 space-y-2.5">
        {[
          ['ຍອດຂາຍລວມ', fmtNum(total_sales) + ' ₭', 'text-slate-900 dark:text-white font-bold'],
          ['ຄ່າຂົນສົ່ງ', fmtNum(order.shipping_fee) + ' ₭', 'text-slate-600 dark:text-slate-300'],
          ['ຕົ້ນທຶນ', fmtNum(order.total_cost) + ' ₭', 'text-orange-600 dark:text-orange-400'],
          ['ກຳໄລ', fmtNum(order.total_profit) + ' ₭', order.total_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-rose-600 font-extrabold'],
          ...(order.deposit > 0 ? [['ມັດຈຳ', fmtNum(order.deposit) + ' ₭', 'text-teal-600 dark:text-teal-400']] : []),
          ...(order.deposit > 0 ? [['COD ຄ້າງຈ່າຍ', fmtNum(Math.max(total_sales - order.deposit, 0)) + ' ₭', 'text-rose-600 dark:text-rose-400 font-bold']] : []),
        ].map(([l, v, cls]) => (
          <div key={l} className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">{l}</span>
            <span className={cls}>{v}</span>
          </div>
        ))}
      </div>
    </BaseModal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SHIPPING MODAL (ปรับดีไซน์)
// ═══════════════════════════════════════════════════════════════════════
function ShippingModal({ order, onClose, onUpdateItems }: { order: Order; onClose: () => void; onUpdateItems?: (items: any[]) => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  const [items, setItems] = useState(order.items || []);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<number | null>(null);
  const total_sales = items.reduce((s, i) => s + i.price * i.qty, 0);
  const remaining = total_sales - (order.deposit || 0);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const textLines = [
    `ຜູ້ສັ່ງ: ${order.customer_name} (${order.phone})`,
    `--------------------------`,
    `ຜູ້ຮັບ: ${order.customer_name}`,
    `ໂທ: ${order.phone}`,
    `ທີ່ຢູ່: ບ.${order.village || '-'} ມ.${order.district || '-'} ແຂ.${order.province || '-'}`,
    `ຂົນສົ່ງ: ${order.transport || '-'}`,
    `--------------------------`,
    `*** COD: ${fmtNum(remaining > 0 ? remaining : total_sales)} ₭ ***`,
  ];

  const itemTextLines = items.map((it, idx) => `${idx + 1}. ${(it as any).tracking_code || '-'} (x${it.qty})`);

  const handleSaveItem = async (idx: number) => {
    if (!onUpdateItems) return;
    setSavingIdx(idx);
    try {
      await onUpdateItems(items);
      setSavedIdx(idx);
      setTimeout(() => setSavedIdx(null), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingIdx(null);
    }
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={
        <span className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <TruckIcon className="w-5 h-5 text-teal-500" />
          ລາຍລະອຽດການຈັດສົ່ງ
        </span>
      }
      maxWidth="max-w-[43.75rem]"
      width="w-full"
      bodyClassName="p-5 bg-slate-50/50 dark:bg-slate-900/50"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Address Info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              ຂໍ້ມູນຜູ້ຮັບ & ທີ່ຢູ່
            </h4>
            <button
              onClick={() => {
                navigator.clipboard.writeText(textLines.join('\n'));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs flex items-center gap-1 font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
            >
              {copied ? <CheckIcon className="w-4 h-4" /> : <DocumentTextIcon className="w-4 h-4" />}
              {copied ? 'ຄັດລອກແລ້ວ' : 'ຄັດລອກ'}
            </button>
          </div>
          {/* Order ID Badge */}
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[0.625rem] text-slate-400 font-medium">Order ID:</span>
            <span className="font-mono text-[0.6875rem] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 select-all">{order.id}</span>
          </div>
          <div className="font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-all bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
            {textLines.join('\n')}
          </div>
        </div>

        {/* Right: Items */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/60 dark:border-slate-700/60">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            ລາຍການສິນຄ້າ
          </h4>
          <div className="space-y-2">
            {items.map((item, i) => {
              const imgUrl = item.image_url || (item as any).imageUrl;
              return (
                <div key={i} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  {imgUrl ? (
                    <img src={imgUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-white shrink-0 border border-slate-200 dark:border-slate-700" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center">
                      <span className="text-slate-400 text-[0.625rem]">No img</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="text"
                        placeholder="ປ້ອນລະຫັດສິນຄ້າ..."
                        value={(item as any).tracking_code || ''}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[i] = { ...newItems[i], tracking_code: e.target.value };
                          setItems(newItems);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveItem(i);
                        }}
                        className="w-full text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                      />
                      <button
                        onClick={() => handleSaveItem(i)}
                        disabled={savingIdx === i}
                        title="ບັນທຶກລະຫັດສິນຄ້າ"
                        className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm ${
                          savedIdx === i
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20'
                        }`}
                      >
                        {savingIdx === i ? (
                          <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        ) : savedIdx === i ? (
                          <CheckIcon className="w-4 h-4" />
                        ) : (
                          <CheckIcon className="w-4 h-4 stroke-2" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">ຈຳນວນ: <span className="font-bold text-indigo-500">x{item.qty}</span></p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// RESET MODAL (ปรับดีไซน์)
// ═══════════════════════════════════════════════════════════════════════
function ResetModal({ wallets, onConfirm, onClose }: {
  wallets: Wallet[];
  onConfirm: (partnerName: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState('');
  const partners = wallets.filter(w => w.type === 'partner');
  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">ຕັ້ງຜູ້ສັ່ງ & ລ້າງ 0</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">ເລືອກ Partner ທີ່ຮັບຜິດຊອບລອບໃໝ່ ແລ້ວ Reset ຕົ້ນທຶນ/ກຳໄລເປັນ 0</p>
        </div>
      }
      maxWidth="max-w-[24rem]"
      width="w-full"
      bodyClassName="p-5 space-y-4 bg-white dark:bg-slate-900"
    >
      {partners.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">ຍັງບໍ່ມີ Partner ໃນລະບົບ (ເພີ່ມໃນໜ້າ Wallet)</p>
      ) : (
        <div className="space-y-2">
          {partners.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.name)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-[20px] border-2 transition-all ${
                selected === p.name
                  ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-500/10'
                  : 'border-slate-100/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                {p.name.charAt(0)}
              </div>
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{p.name}</span>
              {selected === p.name && <CheckIcon className="ml-auto w-5 h-5 text-teal-500" />}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className={`${btnGhost} flex-1 justify-center`}>ຍົກເລີກ</button>
        <button
          onClick={() => selected && onConfirm(selected)}
          disabled={!selected}
          className="flex-1 h-11 rounded-[20px] bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-bold shadow-[0_8px_25px_rgba(15,118,110,0.30)] hover:shadow-[0_12px_35px_rgba(15,118,110,0.40)] hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          ລ້າງ & ເລີ່ມໃໝ່
        </button>
      </div>
    </BaseModal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// HISTORY MODAL (ปรับดีไซน์)
// ═══════════════════════════════════════════════════════════════════════
function HistoryModal({ orders, lastReset, onClose }: { orders: Order[]; lastReset: Date | null; onClose: () => void }) {
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (o.status === 'ຍົກເລີກອໍເດີ') return false;
      const d = tsToDate(o.created_at);
      if (!d) return false;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return ym === monthFilter;
    });
  }, [orders, monthFilter]);

  const byDayAndPerson = useMemo(() => {
    const map: Record<string, { dateObj: Date; date: string; person: string; cost: number; profit: number; count: number }> = {};
    filtered.forEach(o => {
      const d = tsToDate(o.created_at);
      if (!d) return;
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      const person = o.items?.find((i: any) => i._cost_by)?._cost_by || o.ordered_by || 'ບໍ່ລະບຸ';
      const key = `${dateStr}_${person}`;
      if (!map[key]) map[key] = { dateObj: new Date(d.getFullYear(), d.getMonth(), d.getDate()), date: dateStr, person, cost: 0, profit: 0, count: 0 };
      map[key].cost += o.total_cost || 0;
      map[key].profit += o.total_profit || 0;
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [filtered]);

  const totals = useMemo(() => byDayAndPerson.reduce((acc, d) => ({ cost: acc.cost + d.cost, profit: acc.profit + d.profit, count: acc.count + d.count }), { cost: 0, profit: 0, count: 0 }), [byDayAndPerson]);

  const todayData = useMemo(() => {
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    return byDayAndPerson.filter(d => d.date === today).reduce((acc, d) => ({ cost: acc.cost + d.cost, profit: acc.profit + d.profit }), { cost: 0, profit: 0 });
  }, [byDayAndPerson]);

  const yesterdayData = useMemo(() => {
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = y.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    return byDayAndPerson.filter(d => d.date === yesterday).reduce((acc, d) => ({ cost: acc.cost + d.cost, profit: acc.profit + d.profit }), { cost: 0, profit: 0 });
  }, [byDayAndPerson]);

  const [activeTab, setActiveTab] = useState<'daily' | 'resets'>('daily');
  const [resetLogs, setResetLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (activeTab === 'resets') {
      const fetchLogs = async () => {
        setLoadingLogs(true);
        const { data } = await supabase.from('settings').select('*').like('id', 'history_log_%');
        if (data) {
          const logs = data.map(d => {
            try {
              return { ...JSON.parse(d.value), id: d.id };
            } catch {
              return null;
            }
          }).filter(Boolean);
          logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setResetLogs(logs);
        }
        setLoadingLogs(false);
      };
      fetchLogs();
    }
  }, [activeTab]);

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            ເບິ່ງປະຫວັດ
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 ml-2">
              <button 
                onClick={() => setActiveTab('daily')} 
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${activeTab === 'daily' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                ລາຍວັນ
              </button>
              <button 
                onClick={() => setActiveTab('resets')} 
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${activeTab === 'resets' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                ການລ້າງຍອດ
              </button>
            </div>
          </h3>
          {lastReset && <p className="text-xs text-slate-400 font-normal mt-0.5">Reset ລ່າສຸດ: {lastReset.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>}
        </div>
      }
      headerRight={
        <input
          type="month"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          className="h-9 bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/10 rounded-[18px] px-3 text-base font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
        />
      }
      maxWidth="max-w-xl"
      width="w-full"
      bodyClassName="p-5 flex flex-col gap-5 h-[70vh] max-h-[37.5rem]"
    >
      {activeTab === 'daily' ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'ມື້ນີ້ — ຕົ້ນທຶນ', val: fmt(todayData.cost), sub: fmt(todayData.profit) + ' ກຳໄລ', cls: 'bg-teal-50/60 dark:bg-teal-500/10' },
              { label: 'ມື້ວານ — ຕົ້ນທຶນ', val: fmt(yesterdayData.cost), sub: fmt(yesterdayData.profit) + ' ກຳໄລ', cls: 'bg-slate-50/60 dark:bg-white/5' },
              { label: 'ລວມເດືອນ', val: fmt(totals.cost), sub: fmt(totals.profit) + ' ກຳໄລ', cls: totals.profit >= 0 ? 'bg-emerald-50/60 dark:bg-emerald-500/10' : 'bg-rose-50/60 dark:bg-rose-500/10' },
            ].map(c => (
              <div key={c.label} className={`rounded-[18px] p-3 ${c.cls}`}>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-white mt-1 tabular-nums">{c.val}</p>
                <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400 tabular-nums">{c.sub}</p>
              </div>
            ))}
          </div>
          {/* Daily breakdown */}
          {byDayAndPerson.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">ບໍ່ມີຂໍ້ມູນໃນເດືອນນີ້</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100/80 dark:border-white/8">
                    <th className="text-left pb-2 pr-3">ວັນທີ</th>
                    <th className="text-left pb-2 pr-3">ຜູ້ສັ່ງ</th>
                    <th className="text-right pb-2 pr-3">ອໍ</th>
                    <th className="text-right pb-2 pr-3">ຕົ້ນທຶນ</th>
                    <th className="text-right pb-2">ກຳໄລ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/60 dark:divide-white/5">
                  {byDayAndPerson.map(d => (
                    <tr key={`${d.date}_${d.person}`} className="hover:bg-slate-50/40 dark:hover:bg-white/3 transition-colors">
                      <td className="py-2.5 pr-3 font-semibold text-slate-700 dark:text-slate-200">{d.date}</td>
                      <td className="py-2.5 pr-3 font-medium text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                          {d.person}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right text-slate-500">{d.count}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-orange-600 dark:text-orange-400 tabular-nums">{fmtNum(d.cost)} ₭</td>
                      <td className={`py-2.5 text-right font-bold tabular-nums ${d.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmtNum(d.profit)} ₭</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200/80 dark:border-white/15 font-extrabold">
                    <td colSpan={2} className="pt-2.5 text-slate-800 dark:text-white">ລວມ</td>
                    <td className="pt-2.5 text-right text-slate-600 dark:text-slate-300">{totals.count}</td>
                    <td className="pt-2.5 text-right text-orange-600 dark:text-orange-400 tabular-nums">{fmtNum(totals.cost)} ₭</td>
                    <td className={`pt-2.5 text-right tabular-nums ${totals.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmtNum(totals.profit)} ₭</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="overflow-y-auto flex-1">
          {loadingLogs ? (
            <p className="text-center text-sm text-slate-400 py-8">ກຳລັງໂຫລດ...</p>
          ) : resetLogs.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">ບໍ່ມີປະຫວັດການລ້າງຍອດ</p>
          ) : (
            <div className="space-y-3">
              {resetLogs.map((log: any, idx: number) => (
                <div key={log.id || idx} className="rounded-[14px] border border-slate-100 dark:border-white/10 p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">{new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold">{log.by || 'ບໍ່ລະບຸ'}</span>
                  </div>
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{fmtNum(log.profit || 0)} ₭ <span className="text-xs font-normal text-slate-400">ກຳໄລ</span></p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ALERT BADGE (ปรับดีไซน์)
// ═══════════════════════════════════════════════════════════════════════
function AlertBadge({ order, now, onQuickCheck }: { order: Order; now: number; onQuickCheck: () => void }) {
  const updatedAt = tsToDate(order.status_updated_at) || tsToDate(order.created_at);

  if (order.status === 'ສົ່ງບິນແລ້ວ' && updatedAt) {
    const delayStr = typeof window !== 'undefined' ? localStorage.getItem('notifyDelay') : '0';
    const delayMins = parseInt(delayStr || '0', 10);
    const mins = (now - updatedAt.getTime()) / 60000;
    const isOverdue = mins >= delayMins;

    if (isOverdue) {
      return (
        <div className="flex items-center mt-1">
          <button
            onClick={onQuickCheck}
            className="inline-flex items-center gap-1.5 text-[0.625rem] font-bold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/30 hover:scale-105 active:scale-95 transition-all animate-pulse cursor-pointer shadow-sm"
          >
            <ExclamationTriangleIcon className="w-3 h-3" /> ແຈ້ງລູກຄ້າມາຮັບເຄື່ອງ!
          </button>
        </div>
      );
    } else {
      return (
        <div className="flex items-center mt-1">
          <button
            onClick={onQuickCheck}
            className="inline-flex items-center gap-1.5 text-[0.625rem] font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <BellIcon className="w-3 h-3" /> ແຈ້ງລູກຄ້າມາຮັບເຄື່ອງ
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
        <span className="inline-flex items-center gap-1 text-[0.625rem] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30 mt-1">
          <ExclamationTriangleIcon className="w-3 h-3" /> ຄ້າງ {days} ມື້!
        </span>
      );
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// INLINE COST INPUT (ปรับดีไซน์)
// ═══════════════════════════════════════════════════════════════════════
export function InlineCostInput({ orderId, value, onSave }: { orderId: string; value: number; onSave: (id: string, val: number) => void }) {
  const [editing, setEditing] = useState(false);
  
  const formatInput = (val: string | number): string => {
    if (val === '' || val === null || val === undefined) return '';
    const str = String(val);
    if (str === '-') return '-';
    const parts = str.split('.');
    const intPart = parts[0];
    const decPart = parts.length > 1 ? '.' + parts[1] : '';
    let formattedInt = intPart;
    if (/^-?\d+$/.test(intPart)) {
      formattedInt = BigInt(intPart).toLocaleString('en-US');
    }
    return formattedInt + decPart;
  };

  const [local, setLocal] = React.useState(() => {
    return value === 0 ? '' : formatInput(value);
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { if (!editing) setLocal(value === 0 ? '' : formatInput(value)); }, [value, editing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^-?\d*\.?\d*$/.test(raw)) {
      setLocal(formatInput(raw));
    }
  };

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
        inputMode="decimal"
        value={local}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') handleBlur(); if (e.key === 'Escape') { setEditing(false); setLocal(formatInput(value)); } }}
        className="w-24 h-7 text-xs text-right px-2 bg-white dark:bg-slate-800 border-2 border-teal-400 rounded-[10px] outline-none tabular-nums font-bold text-slate-800 dark:text-white shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="ກົດເພື່ອແກ້ໄຂ"
      className="group flex items-center justify-center gap-1 min-w-[4.25rem] px-2 py-1 rounded-full border border-rose-200/80 dark:border-rose-900/50 bg-white/70 dark:bg-slate-800/50 text-[0.625rem] sm:text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-sm transition-all"
    >
      {value === 0 ? <span className="text-slate-300 dark:text-slate-600 font-normal text-[0.625rem]">ໃສ່ຕົ້ນທຶນ</span> : fmtNum(value)}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function OrderList({ onEdit, onAdd, initialFilter, initialSearch }: { onEdit?: (id: string) => void; onAdd?: () => void; initialFilter?: { filter: string; ts: number }; initialSearch?: { query: string; ts: number } }) {
  const now = useNow();

  // ── Data ─────────────────────────────────────────────────────────────
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastReset,   setLastReset]   = useState<Date | null>(null);
  const [lastResetBy, setLastResetBy] = useState('');

  // ── Filters ───────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter?.filter || 'all');
  const [dateFilter,   setDateFilter]   = useState<'all' | 'this' | 'prev' | 'custom'>('all');
  const [customMonth,  setCustomMonth]  = useState('');
  const [theme,        setTheme]        = useState<string>('default');

  useEffect(() => {
    if (initialFilter?.filter) {
      setStatusFilter(initialFilter.filter);
    } else {
      setStatusFilter('all');
    }
  }, [initialFilter]);

  useEffect(() => {
    if (initialSearch?.query) {
      setSearch(initialSearch.query);
    } else {
      setSearch('');
    }
  }, [initialSearch]);

  // ── UI state ──────────────────────────────────────────────────────────
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const isInitialLoad = useRef(true);

  const updateItemStatus = async (orderId: string, itemIdx: number, newStatus: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      
      const newItems = [...(order.items || [])];
      const oldStatus = newItems[itemIdx].status;
      newItems[itemIdx] = { ...newItems[itemIdx], status: newStatus };
      
      const terminalStatuses = ['ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ', 'ສົ່ງບິນແລ້ວ', 'ແຈ້ງລູກຄ້າແລ້ວ', 'ໄດ້ຮັບເງິນແລ້ວ'];
      if (newItems.length > 1 && terminalStatuses.includes(newStatus)) {
        const result = await Swal.fire({
          showCancelButton: true,
          reverseButtons: true,
          confirmButtonText: '✅ ປ່ຽນທັງໝົດ',
          cancelButtonText: 'ແຄ່ອັນດຽວ',
          confirmButtonColor: '#8b5cf6', // violet-500
          cancelButtonColor: '#334155', // slate-700
          background: '#0f172a', // slate-900
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; padding: 10px 0;">
              <div style="background: rgba(139, 92, 246, 0.1); padding: 18px; border-radius: 50%; margin-bottom: 24px; box-shadow: 0 0 30px rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.2);">
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h2 style="font-size: 24px; font-weight: 800; margin: 0 0 12px 0; color: #f8fafc; letter-spacing: -0.5px;">ອັບເດດພ້ອມກັນ?</h2>
              <p style="color: #94a3b8; font-size: 15px; margin: 0; line-height: 1.5;">
                ຕ້ອງການປ່ຽນສະຖານະຂອງ <b>ທຸກລາຍການ</b><br/>ໃນອໍເດີນີ້ໃຫ້ກາຍເປັນ
              </p>
              <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 10px 24px; border-radius: 100px; margin-top: 20px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4); letter-spacing: 0.5px;">
                ${newStatus}
              </div>
            </div>
          `,
          customClass: { 
            popup: 'rounded-[32px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-slate-700/50 p-6',
            htmlContainer: '!m-0 !p-0',
            confirmButton: 'rounded-2xl font-bold px-8 py-3.5 ml-2 text-[15px] shadow-lg shadow-violet-500/25 transition-all hover:scale-105',
            cancelButton: 'rounded-2xl font-semibold px-8 py-3.5 mr-2 text-[15px] text-slate-300 transition-all hover:bg-slate-600'
          },
        });
        
        if (result.isConfirmed) {
          newItems.forEach(it => {
            if (it.status !== 'ຍົກເລີກອໍເດີ') {
              it.status = newStatus;
            }
          });
        }
      }
      
      const updateData: any = { items: newItems };
      
      let newMainStatus = order.status;
      
      const allItemsOrdered = newItems.every((item: any) => 
        item.status && item.status !== 'ຮັບອໍເດີແລ້ວ' && item.status !== 'ຍົກເລີກອໍເດີ'
      );
      const noItemsOrdered = newItems.every((item: any) => 
        !item.status || item.status === 'ຮັບອໍເດີແລ້ວ'
      );

      // If all items share the exact same status, use that.
      if (newItems.length > 0 && newItems.every((item: any) => item.status === newStatus)) {
        newMainStatus = newStatus;
      } 
      // Otherwise, if they are a mix but all are ordered/beyond, and the main is still pending, move it forward
      else if (allItemsOrdered && order.status === 'ຮັບອໍເດີແລ້ວ') {
        newMainStatus = 'ສັ່ງເຄື່ອງແລ້ວ';
      }
      // If none are ordered (all reverted), and main is not pending, revert it
      else if (noItemsOrdered && order.status !== 'ຮັບອໍເດີແລ້ວ' && order.status !== 'ຍົກເລີກອໍເດີ') {
        newMainStatus = 'ຮັບອໍເດີແລ້ວ';
      }

      if (newMainStatus !== order.status) {
        updateData.status = newMainStatus;
        updateData.status_updated_at = new Date().toISOString();
      }

      // Optimistic Update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: newItems, status: newMainStatus } : o));
      
      // Dispatch immediately
      window.dispatchEvent(new CustomEvent('local_order_updated', { 
        detail: { type: 'status_update', oldStatus: order.status, newStatus: newMainStatus } 
      }));

      if (newStatus === 'ຍົກເລີກອໍເດີ' && oldStatus !== 'ຍົກເລີກອໍເດີ') {
        const result = await Swal.fire({
          title: '📦 ນຳສິນຄ້າເຂົ້າສາງ?',
          html: `ລູກຄ້າຍົກເລີກ <b>"${newItems[itemIdx].name}"</b><br/>ຕ້ອງການນຳສິນຄ້ານີ້ເຂົ້າສະຕັອກ (Stock) ຫຼືບໍ່?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: '✅ ນຳເຂົ້າສາງ',
          cancelButtonText: '❌ ບໍ່',
          confirmButtonColor: '#10b981',
          cancelButtonColor: '#ef4444',
          background: '#1e293b',
          color: '#f1f5f9',
          customClass: { popup: 'rounded-2xl' },
        });
        if (result.isConfirmed) {
          await supabase.from('stocks').insert([{
            item_name: newItems[itemIdx].name,
            quantity: newItems[itemIdx].qty || 1,
            cost_price: 0,
            selling_price: 0,
            image_url: newItems[itemIdx].image_url || newItems[itemIdx].image_url || '',
            notes: `ຈາກການຍົກເລີກອໍເດີ (Order: ${orderId})`
          }]);
          setToast({ msg: '📦 ນຳສິນຄ້າເຂົ້າສະຕັອກ ແລະ ລຶບອອກຈາກອໍເດີສຳເລັດ', type: 'success' });
          newItems.splice(itemIdx, 1);
          updateData.items = newItems;
        }
      }
      
      await supabase.from('orders').update(updateData).eq('id', orderId);
      setToast({ msg: 'ອັບເດດສະຖານະສິນຄ້າສຳເລັດ', type: 'success' });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error(err);
      setToast({ msg: '❌ ບໍ່ສາມາດອັບເດດສະຖານະສິນຄ້າໄດ້', type: 'error' });
    }
  };

  const [toast,       setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [statusModal, setStatusModal] = useState<string | null>(null);
  const [itemStatusModal, setItemStatusModal] = useState<{ orderId: string, itemIndex: number } | null>(null);
  const [filterStatusModal, setFilterStatusModal] = useState(false);
  const [billModal,   setBillModal]   = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [shippingModal, setShippingModal] = useState<Order | null>(null);
  const [showReset,   setShowReset]   = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [updatingId,  setUpdatingId]  = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [shopName,    setShopName]    = useState('');
  const [shopPhone,   setShopPhone]   = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  const [hideCosts, setHideCosts] = useState(false);
  const [highlightedOrders, setHighlightedOrders] = useState<Record<string, boolean>>({});
  const [copiedNameId, setCopiedNameId] = useState<string | null>(null);

  const handleCopyName = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(name);
    setCopiedNameId(id);
    setTimeout(() => setCopiedNameId(null), 2000);
  };

  useEffect(() => {
    setVisibleCount(50);
  }, [search, statusFilter, dateFilter, customMonth]);


  // ── Load localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('orderTableTheme') || 'default';
      setTheme(savedTheme);
      setShopName(localStorage.getItem('shopName') || 'PreOrder');
      setShopPhone(localStorage.getItem('shopPhone') || '');
      try {
        const storedHighlights = localStorage.getItem('highlightedOrders');
        if (storedHighlights) {
          setHighlightedOrders(JSON.parse(storedHighlights));
        }
      } catch (e) {
        console.error('Failed to load highlighted orders', e);
      }
    }
  }, []);

  const toggleHighlight = (orderId: string, e?: React.MouseEvent) => {
    if (e) {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('a') || target.closest('select')) {
        return;
      }
    }
    setHighlightedOrders(prev => {
      const next = { ...prev };
      if (next[orderId]) {
        delete next[orderId];
      } else {
        next[orderId] = true;
      }
      localStorage.setItem('highlightedOrders', JSON.stringify(next));
      return next;
    });
  };

  const saveTheme = (t: string) => {
    setTheme(t);
    if (typeof window !== 'undefined') localStorage.setItem('orderTableTheme', t);
  };

  // ── Supabase listeners ───────────────────────────────────────────────
  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase.from('orders').select('*');
      if (!error && data) {
        const arr = data.map(d => {
          const created_atVal = d.created_at ? new Date(d.created_at).getTime() : (d.created_at_client || Date.now());
          return { ...d, __created_atVal: created_atVal };
        });
        arr.sort((a: any, b: any) => (b.__created_atVal || 0) - (a.__created_atVal || 0));
        setOrders(arr as any);
        setLoading(false);
        if (isInitialLoad.current) isInitialLoad.current = false;
      }
    };
    fetchOrders();

    const ordersChannel = supabase
      .channel('orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
        fetchOrders();
        const data = payload.new;
        if (data && !isInitialLoad.current) {
          const customer = data.customer_name || data.customer_name || 'ລູກຄ້າ';
          if (payload.eventType === 'UPDATE') {
            setToast({ msg: `🔔 ອໍເດີຂອງທ່ານ ${customer} ຖືກອັບເດດສະຖານະ!`, type: 'success' });
          } else if (payload.eventType === 'INSERT') {
            setToast({ msg: `🆕 ມີອໍເດີໃໝ່ຈາກທ່ານ ${customer}!`, type: 'success' });
          }
        }
      })
      .subscribe();

    const fetchWallets = async () => {
      const { data } = await supabase.from('wallets').select('*');
      if (data) setWallets(data as Wallet[]);
    };
    fetchWallets();

    const walletsChannel = supabase
      .channel('wallets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => {
        fetchWallets();
      })
      .subscribe();

    const fetchCounter = async () => {
      const { data } = await supabase.from('settings').select('*').eq('id', 'costCounter').single();
      if (data) {
        setLastReset(data.last_reset ? new Date(data.last_reset) : null);
        setLastResetBy(data.last_reset_by || '');
      }
    };
    fetchCounter();

    const settingsChannel = supabase
      .channel('settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.costCounter' }, () => {
        fetchCounter();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(walletsChannel);
      supabase.removeChannel(settingsChannel);
    };
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
      const q = search.toLowerCase();
      const matchSearch = !q ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.transport?.toLowerCase().includes(q) ||
        (o.items || []).some(i => i.name?.toLowerCase().includes(q) || (i as any).tracking_code?.toLowerCase().includes(q));

      let matchStatus = false;
      if (statusFilter === 'all') {
        matchStatus = true;
      } else if (statusFilter === 'pending_notify') {
        if (o.status === 'ສົ່ງບິນແລ້ວ') {
          const delayStr = typeof window !== 'undefined' ? localStorage.getItem('notifyDelay') : '0';
          const delayMins = parseInt(delayStr || '0', 10);
          const updatedAt = tsToDate(o.status_updated_at) || tsToDate(o.created_at);
          if (updatedAt) {
            const mins = (Date.now() - updatedAt.getTime()) / 60000;
            matchStatus = mins >= delayMins;
          }
        }
      } else {
        matchStatus = o.status === statusFilter || (o.items || []).some(i => i.status === statusFilter || (statusFilter === 'ຮັບອໍເດີແລ້ວ' && (!i.status || i.status === '')));
      }

      let matchDate = true;
      if (dateFilter === 'this')   matchDate = getYM(o.created_at) === thisYM;
      if (dateFilter === 'prev')   matchDate = getYM(o.created_at) === prevYM;
      if (dateFilter === 'custom') matchDate = getYM(o.created_at) === customMonth;

      return matchSearch && matchStatus && matchDate;
    });
  }, [orders, search, statusFilter, dateFilter, customMonth, thisYM, prevYM]);

  // ── Summary widget ────────────────────────────────────────────────────
  const summaryStats = useMemo(() => {
    const src = lastReset
      ? orders.filter(o => {
          if (o.status === 'ຍົກເລີກອໍເດີ') return false;
          const maxCostTimeStr = o.items?.reduce((max: string, i: any) => (i._cost_updated_at && i._cost_updated_at > max) ? i._cost_updated_at : max, '');
          const costTimeStr = maxCostTimeStr || o.cost_updated_at;
          const costTime = tsToDate(costTimeStr);
          const createTime = tsToDate(o.created_at);
          const d = costTime || createTime;
          return d && d >= lastReset;
        })
      : orders.filter(o => o.status !== 'ຍົກເລີກອໍເດີ');
    return {
      cost:   src.reduce((s, o) => s + (o.total_cost || 0) + (o.shipping_fee || 0), 0),
      profit: src.reduce((s, o) => s + (o.total_profit || 0), 0),
      count:  src.length,
    };
  }, [orders, lastReset]);

  // ── Actions ───────────────────────────────────────────────────────────
  const updateStatus = useCallback(async (orderId: string, newStatus: string) => {
    setStatusModal(null);
    setUpdatingId(orderId);

    const order = orders.find(o => o.id === orderId);
    if (!order) {
      setUpdatingId(null);
      return;
    }

    const updatedItems = (order.items || []).map(item => ({ ...item, status: newStatus }));

    // Optimistic Update for Real-Time feel
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, items: updatedItems } : o));
    
    // Dispatch immediately for global pill real-time feel
    window.dispatchEvent(new CustomEvent('local_order_updated', { 
      detail: { type: 'status_update', oldStatus: order.status, newStatus: newStatus } 
    }));

    try {
      await supabase.from('orders').update({
        status: newStatus,
        status_updated_at: new Date().toISOString(),
        items: updatedItems,
      }).eq('id', orderId);

      // NOTE: No manual transaction needed here.
      // OrderWallet computes income directly from order.status and order.deposit.
      // Creating a transaction record here would cause double-counting.

      setToast({ msg: `ປ່ຽນສະຖານະເປັນ "${newStatus}" ສຳເລັດ`, type: 'success' });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error('updateStatus error:', err);
      setToast({ msg: 'ບໍ່ສາມາຖປ່ຽນສະຖານະໄດ້', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  }, [orders]);

  const saveItemCost = useCallback(async (orderId: string, itemIndex: number, newCostPerUnit: number) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      
      const updatedItems = [...(order.items || [])];
      if (updatedItems[itemIndex]) {
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          cost: newCostPerUnit,
          _cost_updated_at: new Date().toISOString(),
          _cost_by: lastResetBy || ''
        };
      }
      
      const total_cost = updatedItems.reduce((sum, item) => sum + (Number(item.cost || 0) * Number(item.qty || 1)), 0);
      const calculated_sales = updatedItems.reduce((s, i) => s + (Number(i.price || 0) * Number(i.qty || 1)), 0);
      
      const newProfit = calculated_sales
        - total_cost
        - Number(order.shipping_fee || 0)
        - Number(order.total_expenses || 0);

      const updates: any = {
        total_cost,
        total_profit: newProfit,
        items: updatedItems,
      };

      // Auto-update specific item status
      // We only auto-update to 'ສັ່ງເຄື່ອງແລ້ວ' if they put a cost and it was previously pending.
      // We only revert to 'ຮັບອໍເດີແລ້ວ' if they remove the cost AND it was specifically 'ສັ່ງເຄື່ອງແລ້ວ'.
      if (newCostPerUnit > 0 && (!updatedItems[itemIndex].status || updatedItems[itemIndex].status === 'ຮັບອໍເດີແລ້ວ')) {
        updatedItems[itemIndex].status = 'ສັ່ງເຄື່ອງແລ້ວ';
      } else if (newCostPerUnit <= 0 && updatedItems[itemIndex].status === 'ສັ່ງເຄື່ອງແລ້ວ') {
        updatedItems[itemIndex].status = 'ຮັບອໍເດີແລ້ວ';
      }

      // Check if all items are ordered (either by having a cost, or manually set)
      const allItemsOrdered = updatedItems.every(it => 
        it.status && it.status !== 'ຮັບອໍເດີແລ້ວ' && it.status !== 'ຍົກເລີກອໍເດີ'
      );
      
      const noItemsOrdered = updatedItems.every(it => 
        !it.status || it.status === 'ຮັບອໍເດີແລ້ວ'
      );

      if (allItemsOrdered && order.status === 'ຮັບອໍເດີແລ້ວ') {
        updates.status = 'ສັ່ງເຄື່ອງແລ້ວ';
        updates.status_updated_at = new Date().toISOString();
      } else if (noItemsOrdered && order.status !== 'ຮັບອໍເດີແລ້ວ' && order.status !== 'ຍົກເລີກອໍເດີ') {
        updates.status = 'ຮັບອໍເດີແລ້ວ';
        updates.status_updated_at = new Date().toISOString();
      }

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
      await supabase.from('orders').update(updates).eq('id', orderId);
      window.dispatchEvent(new Event('local_order_updated'));
      setToast({ msg: 'ບັນທຶກຕ້ນທຶນແລ້ວ', type: 'success' });
    } catch {
      setToast({ msg: 'ບໍ່ສາມາຖບັນທຶກຕ້ນທຶນໄດ້', type: 'error' });
    }
  }, [orders, lastResetBy]);

  const deleteOrder = useCallback((orderId: string) => {
    // Use custom in-app confirm modal instead of Swal (avoids z-index/SSR issues)
    setDeleteConfirmId(orderId);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    // Optimistic removal — instant UI feedback
    const orderToDelete = orders.find(o => o.id === id);
    setOrders(prev => prev.filter(o => o.id !== id));
    
    if (orderToDelete) {
      window.dispatchEvent(new CustomEvent('local_order_updated', { 
        detail: { type: 'delete_order', status: orderToDelete.status } 
      }));
    }

    try {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) {
        setToast({ msg: 'ບໍ່ສາມາດລຶບໄດ້: ' + error.message, type: 'error' });
      } else {
        setToast({ msg: 'ລຶບອໍເດີສຳເລັດ ✅', type: 'success' });
      }
    } catch {
      setToast({ msg: 'ບໍ່ສາມາດລຶບໄດ້', type: 'error' });
    }
  }, [deleteConfirmId]);


  const handleReset = useCallback(async (personName: string) => {
    try {
      const resetTime = lastReset;
      const profitSinceReset = orders
        .filter(o => {
          if (o.status === 'ຍົກເລີກອໍເດີ') return false;
          const maxCostTimeStr = o.items?.reduce((max: string, i: any) => (i._cost_updated_at && i._cost_updated_at > max) ? i._cost_updated_at : max, '');
          const costTimeStr = maxCostTimeStr || o.cost_updated_at;
          const costTime = tsToDate(costTimeStr);
          const createTime = tsToDate(o.created_at);
          const d = costTime || createTime;
          return resetTime ? (d && d >= resetTime) : true;
        })
        .reduce((s, o) => s + (o.total_profit || 0), 0);

      if (profitSinceReset > 0) {
        await supabase.from('transactions').insert([{
          wallet_id: 'W-COMP',
          type: 'income',
          amount: profitSinceReset,
          note: `ກຳໄລລອບ — ໂດຍ: ${personName}`,
          date: new Date().toISOString(),
        }]);
      }

      let maxTime = Date.now();
      orders.forEach(o => {
        if (o.status === 'ຍົກເລີກອໍເດີ') return;
        const maxCostTimeStr = o.items?.reduce((max: string, i: any) => (i._cost_updated_at && i._cost_updated_at > max) ? i._cost_updated_at : max, '');
        const costTimeStr = maxCostTimeStr || o.cost_updated_at;
        const costTime = tsToDate(costTimeStr);
        const createTime = tsToDate(o.created_at);
        const d = costTime || createTime;
        if (d && d.getTime() > maxTime) {
          maxTime = d.getTime();
        }
      });
      // Add 1 second to the max time to ensure it clears everything
      const nowStr = new Date(maxTime + 1000).toISOString();

      await supabase.from('settings').upsert([
        {
          id: 'costCounter',
          last_reset: nowStr,
          last_reset_by: personName,
        },
        {
          id: `history_log_${Date.now()}`,
          value: JSON.stringify({
            cost: summaryStats.cost,
            profit: profitSinceReset,
            count: summaryStats.count,
            by: personName,
            date: nowStr
          })
        }
      ]);

      setLastReset(new Date(nowStr));
      setLastResetBy(personName);

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

  const pendingNotifyCount = orders.filter(o => o.status === 'ສົ່ງບິນແລ້ວ').length;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 pb-32 max-w-7xl mx-auto px-4 sm:px-6"
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key="toast-notification" msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>



      {/* Modals & Portals */}
      {typeof document !== 'undefined' && createPortal(
        <>
          <AnimatePresence>
            {statusModal && (
              <StatusModal
                key="status-modal"
                current={orders.find(o => o.id === statusModal)?.status || ''}
                onSelect={s => updateStatus(statusModal, s)}
                onClose={() => setStatusModal(null)}
              />
            )}
            {itemStatusModal && (
              <StatusModal
                key="item-status-modal"
                current={orders.find(o => o.id === itemStatusModal.orderId)?.items?.[itemStatusModal.itemIndex]?.status || ''}
                onSelect={s => {
                updateItemStatus(itemStatusModal.orderId, itemStatusModal.itemIndex, s);
                setItemStatusModal(null);
              }}
              onClose={() => setItemStatusModal(null)}
            />
          )}
          {filterStatusModal && (
            <StatusModal
              key="filter-status-modal"
              current={statusFilter}
              onSelect={s => {
                setStatusFilter(s);
                setFilterStatusModal(false);
              }}
              onClose={() => setFilterStatusModal(false)}
              includeAll
            />
          )}
          {billModal && <BillModal key="bill-modal" order={billModal} shopName={shopName} shopPhone={shopPhone} onClose={() => setBillModal(null)} />}
          {shippingModal && <ShippingModal key="shipping-modal" order={shippingModal} onClose={() => setShippingModal(null)} onUpdateItems={async (items) => {
            try {
              await supabase.from('orders').update({ items }).eq('id', shippingModal.id);
              setOrders(prev => prev.map(o => o.id === shippingModal.id ? { ...o, items } : o));
              setShippingModal(prev => prev ? { ...prev, items } : null);
            } catch (err) {
              console.error('Failed to update tracking code:', err);
            }
          }} />}
          <ImageGalleryModal
            key="gallery-modal"
            images={galleryImages}
            initialIndex={galleryIndex}
            isOpen={galleryImages.length > 0}
            onClose={() => setGalleryImages([])}
          />
        {showReset && <ResetModal key="reset-modal" wallets={wallets} onConfirm={handleReset} onClose={() => setShowReset(false)} />}
        {showHistory && <HistoryModal key="history-modal" orders={orders} lastReset={lastReset} onClose={() => setShowHistory(false)} />}
      </AnimatePresence>
      </>, document.body)}

      {/* ── STATS SECTION ── */}
      <div className="mb-5 sm:mb-6 flex flex-col gap-3 sm:gap-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              ພາບລວມລາຍການ <span className="text-slate-400 font-medium text-sm ml-1">(Overview)</span>
            </h2>
            {lastResetBy && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.625rem] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                <UserIcon className="w-3 h-3" /> {lastResetBy}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowReset(true)} className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3 py-2 rounded-[14px] text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors">
              <ArrowPathIcon className="w-4 h-4" /> ຜູ້ສັ່ງ & ລ້າງ 0
            </button>
            <button onClick={() => setShowHistory(true)} className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3 py-2 rounded-[14px] text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
              <ClockIcon className="w-4 h-4" /> ປະຫວັດ
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
          {/* Card 1: Total Orders */}
          <div className="bg-white dark:bg-slate-800/90 rounded-[12px] p-2.5 sm:p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1 sm:gap-2 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="p-1 sm:p-1.5 rounded bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
                <DocumentTextIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[0.625rem] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ອໍເດີທັງໝົດ</span>
            </div>
            <p className="text-[0.9375rem] sm:text-2xl font-black text-slate-800 dark:text-white tabular-nums leading-none ml-0.5">{fmtNum(orders.length)}</p>
          </div>
          
          {/* Card 2: Completed */}
          <div className="bg-white dark:bg-slate-800/90 rounded-[12px] p-2.5 sm:p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1 sm:gap-2 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="p-1 sm:p-1.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-500">
                <CheckIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[0.625rem] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ສຳເລັດແລ້ວ</span>
            </div>
            <p className="text-[0.9375rem] sm:text-2xl font-black text-slate-800 dark:text-white tabular-nums leading-none ml-0.5">{fmtNum(orders.filter(o => o.status === 'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ' || o.status === 'ໄດ້ຮັບເງິນແລ້ວ').length)}</p>
          </div>
          
          {/* Card 3: Pending */}
          <div className="bg-white dark:bg-slate-800/90 rounded-[12px] p-2.5 sm:p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1 sm:gap-2 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="p-1 sm:p-1.5 rounded bg-orange-50 dark:bg-orange-500/10 text-orange-500">
                <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[0.625rem] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ກຳລັງດຳເນີນການ</span>
            </div>
            <p className="text-[0.9375rem] sm:text-2xl font-black text-slate-800 dark:text-white tabular-nums leading-none ml-0.5">{fmtNum(orders.filter(o => o.status !== 'ຍົກເລີກອໍເດີ' && o.status !== 'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ' && o.status !== 'ໄດ້ຮັບເງິນແລ້ວ').length)}</p>
          </div>
          
          {/* Card 4: Revenue */}
          <div className="bg-white dark:bg-slate-800/90 rounded-[12px] p-2.5 sm:p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1 sm:gap-2 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="p-1 sm:p-1.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500">
                <BanknotesIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[0.625rem] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ຍອດຂາຍ</span>
            </div>
            <p className="text-[0.9375rem] sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums leading-none ml-0.5">
              {fmtNum(orders.reduce((s, o) => s + (o.total_sales || o.price || 0), 0))} <span className="text-[0.625rem] sm:text-sm font-bold text-indigo-400">₭</span>
            </p>
          </div>
          
          {/* Card 5: Cost */}
          <div className="bg-white dark:bg-slate-800/90 rounded-[12px] p-2.5 sm:p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1 sm:gap-2 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="p-1 sm:p-1.5 rounded bg-rose-50 dark:bg-rose-500/10 text-rose-500">
                <CurrencyDollarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[0.625rem] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ຕົ້ນທຶນ</span>
            </div>
            <p className="text-[0.9375rem] sm:text-2xl font-black text-rose-600 dark:text-rose-500 tabular-nums leading-none ml-0.5">
              {fmtNum(summaryStats.cost)} <span className="text-[0.625rem] sm:text-sm font-bold text-rose-400">₭</span>
            </p>
          </div>
          
          {/* Card 6: Profit */}
          <div className="bg-white dark:bg-slate-800/90 rounded-[12px] p-2.5 sm:p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1 sm:gap-2 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="p-1 sm:p-1.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
                <ArrowTrendingUpIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[0.625rem] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ກຳໄລ</span>
            </div>
            <p className="text-[0.9375rem] sm:text-2xl font-black text-emerald-600 dark:text-emerald-500 tabular-nums leading-none ml-0.5">
              {fmtNum(summaryStats.profit)} <span className="text-[0.625rem] sm:text-sm font-bold text-emerald-400">₭</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="sticky top-0 sm:top-4 z-40 bg-[var(--background)]/95 backdrop-blur-xl pb-3 pt-1 -mt-1 sm:pt-2 sm:-mt-2 mb-2 sm:mb-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-[16px] sm:rounded-[20px] shadow-sm border border-slate-200 dark:border-slate-700/50">
          
          {/* Search */}
          <div className="relative w-full lg:max-w-md group flex-1">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາ ຊື່, ເບີ, ID, ສິນຄ້າ..."
              style={{ fontSize: '16px', touchAction: 'manipulation' }}
              className="h-10 sm:h-12 w-full bg-slate-50/50 dark:bg-slate-900/50 pl-10 sm:pl-11 pr-8 rounded-[12px] sm:rounded-xl font-medium text-[0.8125rem] sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none border border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="hidden lg:block w-px h-6 bg-slate-200 dark:bg-slate-700" />

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto">
            
            {/* Status */}
            <button
              onClick={() => setFilterStatusModal(true)}
              className="inline-flex items-center justify-between min-w-[6.25rem] sm:min-w-[7.5rem] h-9 sm:h-11 px-2.5 sm:px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/50 rounded-[10px] sm:rounded-xl text-[0.6875rem] sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400 focus:outline-none focus:border-indigo-400 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${statusFilter === 'all' ? 'bg-slate-400' : statusFilter === 'pending_notify' ? 'bg-rose-500' : STATUS_META.find(s => s.value === statusFilter)?.dot || 'bg-teal-500'}`} />
                {statusFilter === 'all' ? 'ທຸກສະຖານະ' : statusFilter === 'pending_notify' ? 'ລໍຖ້າແຈ້ງ' : statusFilter.length > 10 ? statusFilter.substring(0,10)+'...' : statusFilter}
              </div>
              <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            </button>

            {/* Date Pills */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 p-1 rounded-[10px] sm:rounded-[14px] border border-slate-200/80 dark:border-slate-700/50">
              {([['all', 'ທັງໝົດ'], ['this', 'ເດືອນນີ້'], ['prev', 'ເດືອນກ່ອນ']] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setDateFilter(val)}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-[6px] sm:rounded-[10px] text-[0.625rem] sm:text-xs font-bold transition-all ${
                    dateFilter === val
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {dateFilter === 'custom' && (
              <input
                type="month"
                value={customMonth}
                onChange={e => setCustomMonth(e.target.value)}
                className="h-9 sm:h-12 px-2 sm:px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/50 rounded-[10px] sm:rounded-xl text-xs sm:text-base font-semibold text-slate-700 dark:text-slate-200"
              />
            )}

            {/* Theme Dropdown */}
            <div className="relative hidden sm:block">
              <select
                value={theme}
                onChange={e => saveTheme(e.target.value)}
                className="h-9 sm:h-11 pl-3 pr-8 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/50 rounded-[10px] sm:rounded-xl text-sm sm:text-base font-semibold appearance-none outline-none focus:border-indigo-400 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Toggle Hide Costs */}
            <button 
              onClick={() => setHideCosts(prev => !prev)} 
              className={`h-9 sm:h-11 w-9 sm:w-11 flex items-center justify-center border rounded-[10px] sm:rounded-xl transition-colors ${
                hideCosts 
                  ? 'bg-teal-50 border-teal-200 text-teal-600 dark:bg-teal-500/20 dark:border-teal-500/30 dark:text-teal-400' 
                  : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100 dark:bg-slate-900/50 dark:border-slate-700/50 dark:text-slate-400 dark:hover:bg-slate-800'
              }`} 
              title={hideCosts ? "ສະແດງຕົ້ນທຶນ/ກຳໄລ" : "ເຊື່ອງຕົ້ນທຶນ/ກຳໄລ"}
            >
              {hideCosts ? <EyeSlashIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

          </div>
        </div>
      </div>

      {/* ── ORDER TABLE ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className=""
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-teal-500 rounded-full animate-spin" />
            <p className="text-sm font-medium">ກຳລັງໂຫຼດ...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300 dark:text-slate-600">
            <DocumentTextIcon className="w-12 h-12" strokeWidth={1} />
            <p className="text-sm font-semibold text-slate-400">ບໍ່ພົບຂໍ້ມູນ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-4 whitespace-nowrap">
              <thead>
                <tr className={`${themeConfig.th} px-2`}>
                  {['#', 'ລູກຄ້າ / ຂົນສົ່ງ', hideCosts ? 'ລາຍການສິນຄ້າ' : 'ລາຍການສິນຄ້າ / ຕົ້ນທຶນ', hideCosts ? 'ຍອດຂາຍ ₭' : 'ຍອດຂາຍ / ກຳໄລ ₭', 'ຈັດການ'].map(h => (
                    <th key={h} className="px-1.5 py-2 sm:px-4 sm:py-4 text-[0.5625rem] md:text-sm font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&_tr>td]:bg-white dark:[&_tr>td]:bg-slate-900 [&_tr>td]:border-y [&_tr>td]:border-slate-200/80 dark:[&_tr>td]:border-slate-800/80 [&_tr>td:first-child]:border-l [&_tr>td:first-child]:rounded-l-[24px] [&_tr>td:last-child]:border-r [&_tr>td:last-child]:rounded-r-[24px]">
                {filteredOrders.slice(0, visibleCount).map((order, idx) => {
                  const total_sales = (order.items || []).reduce((s, i) => s + i.price * i.qty, 0);
                  const isUpdating = updatingId === order.id;
                  const remaining  = total_sales - (order.deposit || 0);
                  const waUrl = getWhatsAppUrl(order.phone || '');

                  const displayCustomerName = (order.customer_name || '').replace(/^[^:]*:\s*/, '');

                  const shippingCopyText = [
                    `🏪 ${shopName}`, `📞 ${shopPhone}`,
                    '━━━━━━━━━━━',
                    `👤 ຜູ້ຮັບ: ${displayCustomerName}`,
                    `📱 ເບີ: ${order.phone}`,
                    `🏠 ບ.${order.village} ມ.${order.district} ແຂ.${order.province}`,
                    `🚚 ${order.transport}`,
                    '━━━━━━━━━━━',
                    `💰 COD: ${fmtNum(remaining > 0 ? remaining : total_sales)} ₭`,
                  ].filter(Boolean).join('\n');

                  const isHighlighted = highlightedOrders[order.id];
                  const highlightClass = isHighlighted ? '[&>td]:bg-amber-50/70 group-hover:[&>td]:bg-amber-100/70 dark:[&>td]:bg-amber-900/20 dark:group-hover:[&>td]:bg-amber-900/30' : themeConfig.row;

                  const lowerName = (order.customer_name || '').toLowerCase();
                  const isFb = lowerName.includes('ເຟສ') || lowerName.includes('fb') || lowerName.includes('facebook');
                  const isTt = lowerName.includes('ຕຕ') || lowerName.includes('tiktok') || lowerName.includes('tt');

                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={(e) => toggleHighlight(order.id, e)}
                      className={`${highlightClass} transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1`}
                    >
                      {/* # */}
                      <td className="px-1.5 py-1.5 sm:px-4 sm:py-4 text-[0.8125rem] md:text-lg font-bold text-slate-400 tabular-nums w-8 sm:w-10">{idx + 1}</td>

                      {/* Customer & Phone & Shipping & Date */}
                      <td className="pl-1 pr-1 py-1.5 sm:px-4 sm:py-4 w-[5.5rem] max-w-[5.5rem] sm:max-w-none whitespace-normal sm:whitespace-nowrap sm:min-w-[12.5rem] align-top border-r border-slate-200/80 dark:border-slate-700/50">
                        <div className="flex flex-col gap-0.5 sm:gap-1.5">
                          <p className="text-[0.6875rem] sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">{displayCustomerName || '—'}</p>
                          
                          {order.phone && (
                            <span className="text-[0.625rem] sm:text-sm text-slate-500 dark:text-slate-400 truncate max-w-full" title={order.phone}>{order.phone}</span>
                          )}
                          
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                            {isFb && (
                              <button
                                onClick={(e) => handleCopyName(e, order.id, displayCustomerName)}
                                className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-[#1877F2] text-white shadow-sm hover:opacity-80 transition-opacity"
                                title={copiedNameId === order.id ? "ຄັດລອກແລ້ວ" : "ຄັດລອກຊື່ (Facebook)"}
                              >
                                {copiedNameId === order.id ? (
                                  <CheckIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                                    <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/>
                                  </svg>
                                )}
                              </button>
                            )}
                            {isTt && (
                              <button
                                onClick={(e) => handleCopyName(e, order.id, displayCustomerName)}
                                className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-black text-white shadow-sm hover:opacity-80 transition-opacity"
                                title={copiedNameId === order.id ? "ຄັດລອກແລ້ວ" : "ຄັດລອກຊື່ (TikTok)"}
                              >
                                {copiedNameId === order.id ? (
                                  <CheckIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                                    <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/>
                                  </svg>
                                )}
                              </button>
                            )}
                            {order.phone && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-sm transition-colors"
                                title="WhatsApp"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                                  <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                                </svg>
                              </a>
                            )}
                            
                            <button
                              onClick={() => setShippingModal(order)}
                              className="shrink-0 flex items-center justify-center w-6 h-6 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-[6px] sm:rounded-[12px] bg-slate-100/70 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-200 font-bold text-[0.625rem] sm:text-xs border border-slate-200/60 dark:border-white/10"
                              title="ຂໍ້ມູນຂົນສົ່ງ"
                            >
                              <TruckIcon className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5" />
                              <span className="hidden sm:inline sm:ml-1.5">ຂໍ້ມູນຂົນສົ່ງ</span>
                              <ChevronDownIcon className="hidden sm:inline w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 sm:ml-1" />
                            </button>
                          </div>

                          {/* Date & staff badges below icons */}
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <span className="text-[0.5625rem] sm:text-[0.6875rem] text-slate-400 font-medium leading-none">{formatDate(order.created_at)}</span>
                            {(() => {
                              const orderReceiver = order.ordered_by;
                              const itemOrderers = Array.from(new Set(
                                (order.items || []).map((i: any) => i._cost_by).filter(Boolean)
                              ));
                              return (
                                <>
                                  {orderReceiver && (
                                    <span className="inline-flex items-center gap-0.5 text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 w-fit border border-sky-200/60 dark:border-sky-500/30" title="ຜູ້ຮັບອໍເດີ">
                                      <UserIcon className="w-2 h-2" /> {orderReceiver.length > 8 ? orderReceiver.substring(0,8)+'...' : orderReceiver}
                                    </span>
                                  )}
                                  {itemOrderers.map(orderer => (
                                    <span key={orderer} className="inline-flex items-center gap-0.5 text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 w-fit border border-amber-200/60 dark:border-amber-500/30" title="ຜູ້ສັ່ງເຄື່ອງ">
                                      <UserIcon className="w-2 h-2" /> {orderer.length > 8 ? orderer.substring(0,8)+'...' : orderer}
                                    </span>
                                  ))}
                                </>
                              );
                            })()}
                            <div className="mt-0.5 scale-90 sm:scale-100 origin-left">
                              <AlertBadge order={order} now={now} onQuickCheck={() => {
                                const savedTemplate = typeof window !== 'undefined' ? localStorage.getItem('notifyMessageTemplate') : null;
                                const defaultTemplate = `ສະບາຍດີ {customer_name}, ສິນຄ້າທີ່ສັ່ງມາມາຮອດແລ້ວເດີ້! ກະລຸນາເຂົ້າມາຮັບສິນຄ້າດ້ວຍເດີ້ 📦`;
                                const template = savedTemplate || defaultTemplate;
                                const msg = template.replace(/{customer_name}/g, order.customer_name || 'ລູກຄ້າ');
                                
                                const url = getWhatsAppUrl(order.phone || '', msg);
                                window.open(url, '_blank');
                                updateStatus(order.id, 'ແຈ້ງລູກຄ້າແລ້ວ');
                              }} />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Items & Cost Merged */}
                      <td className="pl-1.5 pr-0 py-2 sm:px-4 sm:py-4 align-top">
                        <div className="flex flex-col gap-2.5 sm:gap-3">
                          {(order.items || []).map((item, i) => {
                            const imgUrl = item.image_url || (item as any).imageUrl;
                            return (
                              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 w-full">
                                {/* Item Details (Left) */}
                                <div className="flex items-start gap-1.5 sm:gap-2.5 flex-1 min-w-0 max-w-[17.5rem] sm:max-w-[20rem] xl:max-w-[23.75rem]">
                                  {imgUrl ? (
                                    <img
                                      src={imgUrl}
                                      alt=""
                                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-[8px] border border-slate-200/60 dark:border-white/10 object-cover cursor-pointer hover:ring-2 hover:ring-teal-500 transition-all shrink-0 bg-white mt-0.5"
                                      onClick={() => {
                                        const images: GalleryImage[] = [];
                                        let clickedIndex = 0;
                                        let imgCount = 0;
                                        order.items.forEach((it) => {
                                          const itImg = it.image_url || (it as any).imageUrl;
                                          if (itImg) {
                                            images.push({ url: itImg, title: it.name, subtitle: `ຈຳນວນ: ${it.qty}` });
                                            if (itImg === imgUrl) {
                                              clickedIndex = imgCount;
                                            }
                                            imgCount++;
                                          }
                                        });
                                        setGalleryImages(images);
                                        setGalleryIndex(clickedIndex);
                                      }}
                                      title="ຄລິກເພື່ອເບິ່ງຮູບເຕັມ"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 shrink-0 flex items-center justify-center mt-0.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                    </div>
                                  )}
                                  
                                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                    {/* The name can now wrap naturally since it's aligned perfectly with the cost in a flex container! */}
                                    <span className="text-[0.6875rem] sm:text-[0.8125rem] leading-snug text-slate-700 dark:text-slate-200 font-medium whitespace-normal break-words">
                                      {item.name}
                                    </span>
                                    
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-[0.625rem] sm:text-xs font-bold ${
                                        (() => {
                                          const meta = STATUS_META.find(s => s.value === item.status);
                                          if (!meta) return 'text-teal-600 dark:text-teal-400';
                                          return meta.chip.includes('rose') ? 'text-rose-600 dark:text-rose-400' :
                                                 meta.chip.includes('purple') ? 'text-purple-600 dark:text-purple-400' :
                                                 meta.chip.includes('indigo') ? 'text-indigo-600 dark:text-indigo-400' :
                                                 meta.chip.includes('orange') ? 'text-orange-600 dark:text-orange-400' :
                                                 meta.chip.includes('yellow') ? 'text-yellow-600 dark:text-yellow-400' :
                                                 meta.chip.includes('cyan') ? 'text-cyan-600 dark:text-cyan-400' :
                                                 meta.chip.includes('emerald') ? 'text-emerald-600 dark:text-emerald-400' :
                                                 meta.chip.includes('lime') ? 'text-lime-600 dark:text-lime-400' :
                                                 'text-teal-600 dark:text-teal-400';
                                        })()
                                      }`}>x{item.qty}</span>
                                      <div className="scale-90 sm:scale-100 origin-left shrink-0">
                                        <StatusBadge 
                                          status={item.status || 'ຮັບອໍເດີແລ້ວ'} 
                                          onClick={() => setItemStatusModal({ orderId: order.id, itemIndex: i })} 
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Cost (Right) */}
                                {!hideCosts && (
                                  <div className="pl-[42px] sm:pl-0 sm:w-auto shrink-0 flex items-center">
                                    <InlineCostInput 
                                      orderId={order.id} 
                                      value={item.cost || 0} 
                                      onSave={(id, cost) => saveItemCost(id, i, cost)} 
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* Shipping Fee inline at the bottom of the items cell */}
                          {(order.shipping_fee || 0) > 0 && (
                            <div className="flex justify-end w-full max-w-[17.5rem] sm:max-w-none pr-2">
                              <p className="text-[0.625rem] sm:text-xs text-slate-400 font-medium tabular-nums">+{fmtNum(order.shipping_fee)} ₭ ຂົນສົ່ງ</p>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Sales & Profit Merged */}
                      <td className="px-2 py-1.5 sm:px-4 sm:py-4">
                        <div className="flex flex-col items-center gap-2 sm:gap-3">
                          {/* Sales */}
                          <div className="flex flex-col items-center gap-1 sm:gap-1.5 w-full">
                            <span className="text-[0.5625rem] text-slate-400 font-medium hidden sm:block">ຍອດຂາຍ</span>
                            <p className="text-xs sm:text-base font-black text-slate-900 dark:text-white tabular-nums">
                              {fmtNum(total_sales)}
                            </p>
                            {(order.deposit || 0) > 0 && (
                              <div className="flex flex-col gap-1 w-full max-w-[5rem] sm:max-w-[6.875rem]">
                                <div className="flex items-center justify-between text-[0.5625rem] sm:text-[0.625rem] bg-amber-50/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-500/30">
                                  <span className="font-medium opacity-80">ມັດຈຳ:</span>
                                  <span className="font-bold tabular-nums">{fmtNum(order.deposit)}</span>
                                </div>
                                {remaining > 0 ? (
                                  <div className="flex items-center justify-between text-[0.5625rem] sm:text-xs bg-rose-50/70 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 px-1.5 sm:px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-500/30">
                                    <span className="font-medium opacity-80">ເຫຼືອ:</span>
                                    <span className="font-bold tabular-nums">{fmtNum(remaining)}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center text-[0.5625rem] sm:text-xs bg-emerald-50/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-500/30 font-bold">
                                    ຈ່າຍຄົບແລ້ວ
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Profit */}
                          {!hideCosts && (
                            <div className="flex flex-col items-center gap-0.5 w-full border-t border-slate-100 dark:border-white/5 pt-2 sm:pt-2.5">
                              <span className="text-[0.5625rem] text-slate-400 font-medium">ກຳໄລ</span>
                              <p className={`text-xs sm:text-base font-extrabold tabular-nums ${(order.total_profit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {fmtNum(order.total_profit || 0)} ₭
                              </p>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-1.5 sm:px-4 sm:py-4 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpenId(actionMenuOpenId === order.id ? null : order.id);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-[14px] bg-slate-100/70 dark:bg-white/8 hover:bg-indigo-100/70 dark:hover:bg-indigo-500/20 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-110 active:scale-95"
                          >
                            <EllipsisVerticalIcon className="w-5 h-5" />
                          </button>
                          
                          {actionMenuOpenId === order.id && (
                            <BaseModal
                              isOpen={true}
                              onClose={() => setActionMenuOpenId(null)}
                              title="ຈັດການອໍເດີ"
                              maxWidth="max-w-[20rem]"
                              width="w-full"
                              bodyClassName="p-4 flex flex-col gap-2.5"
                            >
                              {onEdit && (
                                <button
                                  onClick={() => { setActionMenuOpenId(null); onEdit(order.id); }}
                                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-[16px] text-[0.9375rem] font-bold text-slate-700 dark:text-slate-200 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-400 transition-colors border border-amber-100/50 dark:border-amber-500/20 shadow-sm"
                                >
                                  <PencilIcon className="w-5 h-5" /> ແກ້ໄຂອໍເດີ
                                </button>
                              )}
                              <button
                                onClick={() => { setActionMenuOpenId(null); setBillModal(order); }}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-[16px] text-[0.9375rem] font-bold text-slate-700 dark:text-slate-200 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors border border-teal-100/50 dark:border-teal-500/20 shadow-sm"
                              >
                                <EyeIcon className="w-5 h-5" /> ເບິ່ງບິນ
                              </button>
                              <button
                                onClick={() => { setActionMenuOpenId(null); deleteOrder(order.id); }}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-[16px] text-[0.9375rem] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors border border-rose-100/50 dark:border-rose-500/20 shadow-sm"
                              >
                                <TrashIcon className="w-5 h-5" /> ລຶບອໍເດີ
                              </button>
                            </BaseModal>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {visibleCount < filteredOrders.length && (
              <div className="flex justify-center p-6 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => setVisibleCount(prev => prev + 50)}
                  className="px-8 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-full transition-all flex items-center gap-2"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  ໂຫຼດເພີ່ມເຕີມ ({visibleCount} / {filteredOrders.length})
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ══ Custom Delete Confirm Modal ══ */}
      {deleteConfirmId && (
        <BaseModal
          isOpen
          onClose={() => setDeleteConfirmId(null)}
          title={<h3 className="text-xl font-bold text-slate-900 dark:text-white">🗑️ ຍືນຍັນການລຶບ</h3>}
          maxWidth="max-w-sm"
          width="w-full"
          bodyClassName="p-6 bg-white dark:bg-slate-900"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrashIcon className="w-8 h-8" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              ຕ້ອງການລຶບອໍເດີນີ້ອອກຈາກລະບົບແທ້ບໍ? ການກະທຳນີ້ບໍ່ສາມາດຍ້ອນກັບໄດ້!
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              ຍົກເລີກ
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-lg shadow-rose-500/30 transition-all active:scale-95"
            >
              ລຶບເລີຍ
            </button>
          </div>
        </BaseModal>
      )}
    </motion.div>
  );
}