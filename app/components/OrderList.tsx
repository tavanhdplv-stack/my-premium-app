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
  { value: 'ຮັບອໍເດີແລ້ວ',            chip: 'bg-teal-50 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',         dot: 'bg-teal-500'    },
  { value: 'ສົ່ງບິນແລ້ວ',              chip: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',          dot: 'bg-cyan-500'    },
  { value: 'ກວດສອບແລ້ວ',               chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { value: 'ໂອນມັດຈຳແລ້ວ',            chip: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',   dot: 'bg-yellow-500'  },
  { value: 'ສັ່ງເຄື່ອງແລ້ວ',           chip: 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',   dot: 'bg-orange-500'  },
  { value: 'ເຄື່ອງມາຮອດແລ້ວ',         chip: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',   dot: 'bg-indigo-500'  },
  { value: 'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ', chip: 'bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',   dot: 'bg-purple-500'  },
  { value: 'ໄດ້ຮັບເງິນແລ້ວ',           chip: 'bg-lime-50 text-lime-700 dark:bg-lime-500/20 dark:text-lime-300',           dot: 'bg-lime-500'    },
  { value: 'ຍົກເລີກອໍເດີ',             chip: 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',           dot: 'bg-rose-500'    },
];

// ═══════════════════════════════════════════════════════════════════════
// TABLE THEMES (ปรับให้เป็นสีพาสเทลตาม Palette)
// ═══════════════════════════════════════════════════════════════════════
const THEMES: Record<string, { label: string; row: string; th: string }> = {
  default: { label: 'ຄ່າເລີ່ມຕົ້ນ', row: 'hover:bg-teal-50/40 dark:hover:bg-teal-500/5', th: 'bg-teal-50/20 dark:bg-teal-500/5' },
  blue:    { label: 'ນ້ຳເງິນ',      row: 'hover:bg-blue-50/40 dark:hover:bg-blue-500/5', th: 'bg-blue-50/20 dark:bg-blue-500/5' },
  green:   { label: 'ຂຽວ',          row: 'hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5', th: 'bg-emerald-50/20 dark:bg-emerald-500/5' },
  purple:  { label: 'ມ່ວງ',          row: 'hover:bg-purple-50/40 dark:hover:bg-purple-500/5', th: 'bg-purple-50/20 dark:bg-purple-500/5' },
  rose:    { label: 'ບົວ',           row: 'hover:bg-rose-50/40 dark:hover:bg-rose-500/5', th: 'bg-rose-50/20 dark:bg-rose-500/5' },
  red:     { label: 'ແດງ',           row: 'hover:bg-red-50/40 dark:hover:bg-red-500/5', th: 'bg-red-50/20 dark:bg-red-500/5' },
};

// ═══════════════════════════════════════════════════════════════════════
// DESIGN TOKENS (Premium Minimal)
// ═══════════════════════════════════════════════════════════════════════
const card =
  'relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/60 dark:border-white/8 rounded-[28px] shadow-[0_10px_35px_rgba(0,0,0,0.06)] hover:shadow-[0_18px_55px_rgba(0,0,0,0.10)] transition-shadow duration-500';

const pad = 'p-5 sm:p-7';

const inputCls =
  'h-11 w-full bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/70 dark:border-white/10 rounded-[18px] px-4 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400/70 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-slate-800/90 focus:border-teal-400 dark:focus:border-teal-500 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]';

const btnGhost =
  'h-10 px-4 flex items-center gap-2 rounded-[20px] border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50/80 dark:hover:bg-white/10 transition-all hover:shadow-md active:scale-[0.97]';

// ═══════════════════════════════════════════════════════════════════════
// TYPES (คงเดิม)
// ═══════════════════════════════════════════════════════════════════════
interface OrderItem { id: string; name: string; qty: number; cost: number; price: number; status?: string; image_url?: string; }
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border-0 transition-all ${m.chip} ${onClick ? 'cursor-pointer hover:shadow-md' : 'cursor-default'} ${loading ? 'opacity-50' : ''}`}
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
export function StatusModal({ current, onSelect, onClose }: { current: string; onSelect: (s: string) => void; onClose: () => void; }) {
  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="ປ່ຽນສະຖານະ"
      maxWidth="max-w-[320px]"
      width="w-80"
      bodyClassName="p-5"
    >
      <div className="space-y-1.5">
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
    `🏪 ${shopName || 'Tawan East Shop'}`,
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
      maxWidth="max-w-[448px]"
      maxHeight="max-h-[90vh]"
      width="w-full"
      bodyClassName="p-5 space-y-5"
      headerBottom={
        <div className="flex items-center justify-between px-5">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{order.id.slice(-8)}</p>
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
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{l}</p>
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
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">ລາຍການສິນຄ້າ</p>
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
function ShippingModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const total_sales = (order.items || []).reduce((s, i) => s + i.price * i.qty, 0);
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

  const handleCopy = () => {
    navigator.clipboard.writeText(textLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      maxWidth="max-w-[340px]"
      width="w-full"
      bodyClassName="p-4 bg-slate-50/30 dark:bg-slate-900/30"
      footer={
        <button
          onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-[20px] font-bold text-sm transition-all ${
            copied
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-slate-50 hover:bg-slate-100 text-teal-600 border border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-teal-400'
          }`}
        >
          {copied ? <CheckIcon className="w-4 h-4" /> : <DocumentTextIcon className="w-4 h-4" />}
          {copied ? 'ຄັດລອກສຳເລັດ' : 'ຄັດລອກຂໍ້ມູນຂົນສົ່ງ'}
        </button>
      }
    >
      <div className="font-mono text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
        {textLines.join('\n')}
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
      maxWidth="max-w-[384px]"
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

  const byDay = useMemo(() => {
    const map: Record<string, { cost: number; profit: number; count: number }> = {};
    filtered.forEach(o => {
      const d = tsToDate(o.created_at);
      if (!d) return;
      const key = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
      if (!map[key]) map[key] = { cost: 0, profit: 0, count: 0 };
      map[key].cost += o.total_cost || 0;
      map[key].profit += o.total_profit || 0;
      map[key].count++;
    });
    return Object.entries(map).map(([date, v]) => ({ date, ...v }));
  }, [filtered]);

  const totals = useMemo(() => byDay.reduce((acc, d) => ({ cost: acc.cost + d.cost, profit: acc.profit + d.profit, count: acc.count + d.count }), { cost: 0, profit: 0, count: 0 }), [byDay]);

  const today = new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
  const todayData    = byDay.find(d => d.date === today);
  const yesterdayData = byDay.find(d => d.date === yesterday);

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">ເບິ່ງປະຫວັດ</h3>
          {lastReset && <p className="text-xs text-slate-400 font-normal mt-0.5">Reset ລ່າສຸດ: {lastReset.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
        </div>
      }
      headerRight={
        <input
          type="month"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          className="h-9 bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/10 rounded-[18px] px-3 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
        />
      }
      maxWidth="max-w-lg"
      width="w-full"
      bodyClassName="p-5 space-y-5"
    >
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'ມື້ນີ້ — ຕົ້ນທຶນ', val: fmt(todayData?.cost || 0), sub: fmt(todayData?.profit || 0) + ' ກຳໄລ', cls: 'bg-teal-50/60 dark:bg-teal-500/10' },
              { label: 'ມື້ວານ — ຕົ້ນທຶນ', val: fmt(yesterdayData?.cost || 0), sub: fmt(yesterdayData?.profit || 0) + ' ກຳໄລ', cls: 'bg-slate-50/60 dark:bg-white/5' },
              { label: 'ລວມເດືອນ', val: fmt(totals.cost), sub: fmt(totals.profit) + ' ກຳໄລ', cls: totals.profit >= 0 ? 'bg-emerald-50/60 dark:bg-emerald-500/10' : 'bg-rose-50/60 dark:bg-rose-500/10' },
            ].map(c => (
              <div key={c.label} className={`rounded-[18px] p-3 ${c.cls}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
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
                  <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100/80 dark:border-white/8">
                    <th className="text-left pb-2 pr-3">ວັນທີ</th>
                    <th className="text-right pb-2 pr-3">ອໍ</th>
                    <th className="text-right pb-2 pr-3">ຕົ້ນທຶນ</th>
                    <th className="text-right pb-2">ກຳໄລ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/60 dark:divide-white/5">
                  {byDay.map(d => (
                    <tr key={d.date} className="hover:bg-slate-50/40 dark:hover:bg-white/3 transition-colors">
                      <td className="py-2.5 pr-3 font-semibold text-slate-700 dark:text-slate-200">{d.date}</td>
                      <td className="py-2.5 pr-3 text-right text-slate-500">{d.count}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-orange-600 dark:text-orange-400 tabular-nums">{fmtNum(d.cost)} ₭</td>
                      <td className={`py-2.5 text-right font-bold tabular-nums ${d.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmtNum(d.profit)} ₭</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200/80 dark:border-white/15 font-extrabold">
                    <td className="pt-2.5 text-slate-800 dark:text-white">ລວມ</td>
                    <td className="pt-2.5 text-right text-slate-600 dark:text-slate-300">{totals.count}</td>
                    <td className="pt-2.5 text-right text-orange-600 dark:text-orange-400 tabular-nums">{fmtNum(totals.cost)} ₭</td>
                    <td className={`pt-2.5 text-right tabular-nums ${totals.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmtNum(totals.profit)} ₭</td>
                  </tr>
                </tfoot>
              </table>
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
    const hrs = (now - updatedAt.getTime()) / 3600000;
    if (hrs > 24) {
      return (
        <div className="flex items-center gap-1.5 mt-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30 animate-pulse">
            <ExclamationTriangleIcon className="w-3 h-3" /> ເກີນ 24 ຊມ!
          </span>
          <button
            onClick={onQuickCheck}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 transition-colors border border-emerald-200/60 dark:border-emerald-500/30"
          >
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
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200/60 dark:border-yellow-500/30">
            <ClockIcon className="w-3 h-3" /> {hh}ຊ {mm}ນ
          </span>
          <button
            onClick={onQuickCheck}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors border border-emerald-200/60 dark:border-emerald-500/30"
          >
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
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30 mt-1">
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
  const [local, setLocal] = React.useState(() => {
    const s = fmtNum(value);
    return s === '' ? '' : s;
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { if (!editing) setLocal(value === 0 ? '' : fmtNum(value)); }, [value, editing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^-?\d*\.?\d*$/.test(raw)) {
      const num = Number(raw);
      setLocal(raw === '' ? '' : isNaN(num) ? local : num.toLocaleString('en-US'));
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
        inputMode="numeric"
        value={local}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') handleBlur(); if (e.key === 'Escape') { setEditing(false); setLocal(fmtNum(value)); } }}
        className="w-28 h-8 text-xs text-right px-3 bg-white dark:bg-slate-800 border-2 border-teal-400 rounded-[14px] outline-none tabular-nums font-bold text-slate-800 dark:text-white shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="ກົດເພື່ອແກ້ໄຂ"
      className="group flex items-center justify-center gap-1.5 min-w-[80px] px-3 py-1.5 rounded-full border border-rose-200/80 dark:border-rose-900/50 bg-white/70 dark:bg-slate-800/50 text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-sm transition-all"
    >
      {value === 0 ? <span className="text-slate-300 dark:text-slate-600 font-normal text-xs">ໃສ່ຕົ້ນທຶນ</span> : fmtNum(value)}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function OrderList({ onEdit, onAdd }: { onEdit?: (id: string) => void; onAdd?: () => void; }) {
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
      
      let newMainStatus = order.status;
      if (newItems.length > 0 && newItems.every((item: any) => item.status === newStatus)) {
        newMainStatus = newStatus;
      }

      if (newMainStatus !== order.status) {
        updateData.status = newMainStatus;
        updateData.status_updated_at = new Date().toISOString();
      }

      // Optimistic Update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: newItems, status: newMainStatus } : o));

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
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error(err);
      setToast({ msg: '❌ ບໍ່ສາມາດອັບເດດສະຖານະສິນຄ້າໄດ້', type: 'error' });
    }
  };

  const [toast,       setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [statusModal, setStatusModal] = useState<string | null>(null);
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
        (o.items || []).some(i => i.name?.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' || 
                          o.status === statusFilter || 
                          (o.items || []).some(i => i.status === statusFilter);

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
          const costTime = tsToDate(o.cost_updated_at);
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
          cost: newCostPerUnit
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
        cost_updated_at: new Date().toISOString(),
      };

      if (lastResetBy) updates.ordered_by = lastResetBy;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
      await supabase.from('orders').update(updates).eq('id', orderId);
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
    setOrders(prev => prev.filter(o => o.id !== id));
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
          const costTime = tsToDate(o.cost_updated_at);
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

      await supabase.from('settings').upsert({
        id: 'costCounter',
        last_reset: new Date().toISOString(),
        last_reset_by: personName,
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

      {/* Modals */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {statusModal && (
            <StatusModal
              key="status-modal"
              current={orders.find(o => o.id === statusModal)?.status || ''}
              onSelect={s => updateStatus(statusModal, s)}
              onClose={() => setStatusModal(null)}
            />
          )}
          {billModal && <BillModal key="bill-modal" order={billModal} shopName={shopName} shopPhone={shopPhone} onClose={() => setBillModal(null)} />}
          {shippingModal && <ShippingModal key="shipping-modal" order={shippingModal} onClose={() => setShippingModal(null)} />}
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
      , document.body)}

      {/* ── STATS SECTION ── */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">ພາບລວມລາຍການ (Overview)</h2>
            {lastResetBy && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                <UserIcon className="w-3 h-3" /> {lastResetBy}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowReset(true)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[12px] text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors">
              <ArrowPathIcon className="w-3.5 h-3.5" /> ຜູ້ສັ່ງ & ລ້າງ 0
            </button>
            <button onClick={() => setShowHistory(true)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[12px] text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
              <ClockIcon className="w-3.5 h-3.5" /> ປະຫວັດ
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Card 1: Total Orders */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ອໍເດີທັງໝົດ</span>
              <DocumentTextIcon className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums leading-none">{fmtNum(orders.length)}</p>
          </div>
          {/* Card 2: Completed */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ສຳເລັດແລ້ວ</span>
              <CheckIcon className="w-4 h-4 text-teal-500" />
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums leading-none">{fmtNum(orders.filter(o => o.status === 'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ' || o.status === 'ໄດ້ຮັບເງິນແລ້ວ').length)}</p>
          </div>
          {/* Card 3: Pending */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ກຳລັງດຳເນີນການ</span>
              <ClockIcon className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums leading-none">{fmtNum(orders.filter(o => o.status !== 'ຍົກເລີກອໍເດີ' && o.status !== 'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ' && o.status !== 'ໄດ້ຮັບເງິນແລ້ວ').length)}</p>
          </div>
          {/* Card 4: Revenue */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ຍອດຂາຍ</span>
              <BanknotesIcon className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums leading-none">
              {fmtNum(orders.reduce((s, o) => s + (o.total_sales || 0), 0))} <span className="text-sm font-bold text-indigo-400 ml-0.5">₭</span>
            </p>
          </div>
          {/* Card 5: Cost */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ຕົ້ນທຶນ</span>
              <CurrencyDollarIcon className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-500 tabular-nums leading-none">
              {fmtNum(summaryStats.cost)} <span className="text-sm font-bold text-rose-400 ml-0.5">₭</span>
            </p>
          </div>
          {/* Card 6: Profit */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ກຳໄລ</span>
              <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500 tabular-nums leading-none">
              {fmtNum(summaryStats.profit)} <span className="text-sm font-bold text-emerald-400 ml-0.5">₭</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-xl pb-4 pt-2 -mt-2">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200 dark:border-slate-700/50">
          
          {/* Search */}
          <div className="relative w-full lg:max-w-md group flex-1">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາ ຊື່, ເບີ, ID, ສິນຄ້າ..."
              className="h-10 sm:h-11 w-full bg-slate-50/50 dark:bg-slate-900/50 pl-11 pr-8 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none border border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="hidden lg:block w-px h-6 bg-slate-200 dark:bg-slate-700" />

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            
            {/* Status */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-10 sm:h-11 pl-3 sm:pl-4 pr-8 sm:pr-9 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/50 rounded-xl text-xs sm:text-sm font-semibold appearance-none outline-none focus:border-indigo-400 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">ທຸກສະຖານະ</option>
                {STATUS_META.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Date Pills */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 p-1 rounded-[14px] border border-slate-200/80 dark:border-slate-700/50">
              {([['all', 'ທັງໝົດ'], ['this', 'ເດືອນນີ້'], ['prev', 'ເດືອນກ່ອນ']] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setDateFilter(val)}
                  className={`px-3 py-1.5 sm:py-2 rounded-[10px] text-[11px] sm:text-xs font-bold transition-all ${
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
                className="h-10 sm:h-11 px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/50 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200"
              />
            )}

            {/* Theme Dropdown (Optional but keep it since it existed) */}
            <div className="relative hidden sm:block">
              <select
                value={theme}
                onChange={e => saveTheme(e.target.value)}
                className="h-10 sm:h-11 pl-3 pr-8 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/50 rounded-xl text-xs sm:text-sm font-semibold appearance-none outline-none focus:border-indigo-400 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Refresh */}
            <button onClick={() => window.location.reload()} className="h-10 sm:h-11 w-10 sm:w-11 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Refresh">
              <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400" />
            </button>

            {/* Add Order Button */}
            {onAdd && (
              <button
                onClick={onAdd}
                className="h-10 sm:h-11 px-4 sm:px-5 ml-auto lg:ml-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:-translate-y-0.5"
              >
                <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>ສ້າງອໍເດີໃໝ່</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── ORDER TABLE ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
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
            <table className="text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className={`border-b border-slate-200/80 dark:border-white/8 ${themeConfig.th}`}>
                  {['#', 'ວັນທີ / ID', 'ລູກຄ້າ & ເບີ', 'ທີ່ຢູ່ / ຂົນສົ່ງ', 'ສິນຄ້າ', 'ຕົ້ນທຶນ ₭', 'ຍອດຂາຍ ₭', 'ກຳໄລ ₭', 'ສະຖານະ', 'ຈັດການ'].map(h => (
                    <th key={h} className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80 dark:divide-white/5">
                {filteredOrders.map((order, idx) => {
                  const total_sales = (order.items || []).reduce((s, i) => s + i.price * i.qty, 0);
                  const isUpdating = updatingId === order.id;
                  const remaining  = total_sales - (order.deposit || 0);
                  const waUrl = getWhatsAppUrl(order.phone || '');

                  const shippingCopyText = [
                    `🏪 ${shopName}`, `📞 ${shopPhone}`,
                    '━━━━━━━━━━━',
                    `👤 ຜູ້ຮັບ: ${order.customer_name}`,
                    `📱 ເບີ: ${order.phone}`,
                    `🏠 ບ.${order.village} ມ.${order.district} ແຂ.${order.province}`,
                    `🚚 ${order.transport}`,
                    '━━━━━━━━━━━',
                    `💰 COD: ${fmtNum(remaining > 0 ? remaining : total_sales)} ₭`,
                  ].filter(Boolean).join('\n');

                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`${themeConfig.row} transition-colors group`}
                    >
                      {/* # */}
                      <td className="px-4 py-4 text-sm text-slate-400 tabular-nums w-10">{idx + 1}</td>

                      {/* Date / ID */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{order.id.slice(-10)}</span>
                          <span className="text-xs text-slate-400">{formatDate(order.created_at)}</span>
                          {order.ordered_by && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 w-fit border border-amber-200/60 dark:border-amber-500/30">
                              <UserIcon className="w-3 h-3" /> {order.ordered_by}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer & Phone */}
                      <td className="px-4 py-4">
                        <div className="flex items-start">
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{order.customer_name || '—'}</p>
                            {order.phone && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-slate-500 dark:text-slate-400">{order.phone}</span>
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 transition-colors"
                                  title="WhatsApp"
                                >
                                  <PhoneIcon className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Shipping / Address */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setShippingModal(order)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[16px] bg-slate-100/70 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200/60 dark:border-white/10"
                        >
                          <TruckIcon className="w-3.5 h-3.5" />
                          ຂໍ້ມູນຂົນສົ່ງ
                          <ChevronDownIcon className="w-3 h-3 text-slate-400" />
                        </button>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-4">
                        <div className="space-y-1.5">
                          {(order.items || []).map((item, i) => {
                            const imgUrl = item.image_url || (item as any).imageUrl;
                            return (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt=""
                                  className="w-6 h-6 rounded-[8px] border border-slate-200/60 dark:border-white/10 object-cover cursor-pointer hover:ring-2 hover:ring-teal-500 transition-all shrink-0 bg-white"
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
                                <span className="text-slate-400 shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1"></span>
                              )}
                              <span className="truncate flex-1 min-w-0 max-w-[150px] leading-tight py-0.5" title={item.name}>
                                {item.name.length > 16 ? item.name.slice(0, 16) + '...' : item.name}
                              </span>
                              <span className={`font-bold shrink-0 ${
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
                              <div className="relative ml-auto shrink-0 group">
                                <select
                                  value={item.status || 'ຮັບອໍເດີແລ້ວ'}
                                  onChange={(e) => updateItemStatus(order.id, i, e.target.value)}
                                  className={`appearance-none text-[10px] font-bold rounded-full pl-4 pr-5 py-0.5 outline-none transition-all cursor-pointer border-0 hover:shadow-md active:scale-95 text-center min-w-[74px] ${
                                    STATUS_META.find(s => s.value === item.status)?.chip ||
                                    'bg-teal-50 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300'
                                  }`}
                                  style={{ textOverflow: 'ellipsis' }}
                                >
                                  {STATUS_META.map(s => (
                                    <option key={s.value} value={s.value}>{s.value}</option>
                                  ))}
                                </select>
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60">
                                  <ChevronDownIcon className="w-2.5 h-2.5" />
                                </div>
                                <div className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full pointer-events-none ${
                                    STATUS_META.find(s => s.value === item.status)?.dot || 'bg-teal-500'
                                }`} />
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Cost (inline edit) */}
                      <td className="px-4 py-4 align-top pt-4">
                        <div className="space-y-1.5 flex flex-col justify-center">
                          {(order.items || []).map((item, i) => (
                            <div key={i} className="flex items-center h-7 mt-[0.5px]">
                              <InlineCostInput 
                                orderId={order.id} 
                                value={item.cost || 0} 
                                onSave={(id, cost) => saveItemCost(id, i, cost)} 
                              />
                            </div>
                          ))}
                          {(order.shipping_fee || 0) > 0 && (
                            <p className="text-[11px] text-slate-400 tabular-nums">+{fmtNum(order.shipping_fee)} ₭ ຂົນສົ່ງ</p>
                          )}
                        </div>
                      </td>

                      {/* Sales */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-center gap-1.5">
                          <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                            {fmtNum(total_sales)}
                          </p>
                          {(order.deposit || 0) > 0 && (
                            <div className="flex flex-col gap-1 w-full max-w-[110px]">
                              <div className="flex items-center justify-between text-[10px] bg-amber-50/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-500/30">
                                <span className="font-medium opacity-80">ມັດຈຳ:</span>
                                <span className="font-bold tabular-nums">{fmtNum(order.deposit)}</span>
                              </div>
                              {remaining > 0 ? (
                                <div className="flex items-center justify-between text-[10px] bg-rose-50/70 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-500/30">
                                  <span className="font-medium opacity-80">ເຫຼືອ:</span>
                                  <span className="font-bold tabular-nums">{fmtNum(remaining)}</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center text-[10px] bg-emerald-50/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-500/30 font-bold">
                                  ຈ່າຍຄົບແລ້ວ
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Profit */}
                      <td className="px-4 py-4">
                        <p className={`text-sm font-extrabold tabular-nums ${(order.total_profit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {fmtNum(order.total_profit || 0)} ₭
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 min-w-[170px]">
                        <StatusBadge status={order.status} loading={isUpdating} onClick={() => setStatusModal(order.id)} />
                        {order.status_updated_at != null && (
                          <p className="text-[10px] text-slate-400 mt-1 tabular-nums">{formatDate(order.status_updated_at as any, true)} {formatTime(order.status_updated_at as any)}</p>
                        )}
                        <AlertBadge order={order} now={now} onQuickCheck={() => updateStatus(order.id, 'ກວດສອບແລ້ວ')} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(order.id)}
                              title="ແກ້ໄຂ"
                              className="w-8 h-8 flex items-center justify-center rounded-[14px] bg-slate-100/70 dark:bg-white/8 hover:bg-amber-100/70 dark:hover:bg-amber-500/20 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-all hover:scale-110 active:scale-95"
                            >
                              <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setBillModal(order)}
                            title="ເບິ່ງບິນ"
                            className="w-8 h-8 flex items-center justify-center rounded-[14px] bg-slate-100/70 dark:bg-white/8 hover:bg-teal-100/70 dark:hover:bg-teal-500/20 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all hover:scale-110 active:scale-95"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteOrder(order.id)}
                            title="ລຶບ"
                            className="w-8 h-8 flex items-center justify-center rounded-[14px] bg-slate-100/70 dark:bg-white/8 hover:bg-rose-100/70 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all hover:scale-110 active:scale-95"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
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