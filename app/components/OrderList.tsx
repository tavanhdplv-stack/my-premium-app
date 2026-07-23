'use client';

import React, {
  useState, useEffect, useMemo, useRef, useCallback
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/firebase';
import {
  collection, addDoc, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, setDoc, getDoc
} from 'firebase/firestore';
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
  totalSales?: number;
  price?: number;
  totalExpenses?: number;
  paymentMethod?: string;
  wallet?: string;
  createdAt?: unknown;
  imageUrl?: string;
  orderedBy?: string;
}
interface Wallet { id: string; name: string; type: string; }

// ═══════════════════════════════════════════════════════════════════════
// UTILS (คงเดิม)
// ═══════════════════════════════════════════════════════════════════════
const fmt = (n: number) => n === 0 ? '' : new Intl.NumberFormat('en-US').format(n || 0) + ' ₭';
const fmtNum = (n: number) => n === 0 ? '' : new Intl.NumberFormat('en-US').format(n || 0);

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
function StatusBadge({ status, onClick, loading }: { status: string; onClick?: () => void; loading?: boolean }) {
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
function StatusModal({ current, onSelect, onClose }: { current: string; onSelect: (s: string) => void; onClose: () => void; }) {
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
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{order.customerName}</h3>
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
          ['📅 ວັນທີ', order.orderDate],
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
        <span className="text-xs text-slate-400">{formatDate(order.createdAt)}</span>
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
          ['ຍອດຂາຍລວມ', fmtNum(totalSales) + ' ₭', 'text-slate-900 dark:text-white font-bold'],
          ['ຄ່າຂົນສົ່ງ', fmtNum(order.shippingFee) + ' ₭', 'text-slate-600 dark:text-slate-300'],
          ['ຕົ້ນທຶນ', fmtNum(order.totalCost) + ' ₭', 'text-orange-600 dark:text-orange-400'],
          ['ກຳໄລ', fmtNum(order.totalProfit) + ' ₭', order.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-rose-600 font-extrabold'],
          ...(order.deposit > 0 ? [['ມັດຈຳ', fmtNum(order.deposit) + ' ₭', 'text-teal-600 dark:text-teal-400']] : []),
          ...(order.deposit > 0 ? [['COD ຄ້າງຈ່າຍ', fmtNum(Math.max(totalSales - order.deposit, 0)) + ' ₭', 'text-rose-600 dark:text-rose-400 font-bold']] : []),
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
  const totalSales = (order.items || []).reduce((s, i) => s + i.price * i.qty, 0);
  const remaining = totalSales - (order.deposit || 0);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

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
  const updatedAt = tsToDate(order.statusUpdatedAt) || tsToDate(order.createdAt);

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
function InlineCostInput({ orderId, value, onSave }: { orderId: string; value: number; onSave: (id: string, val: number) => void }) {
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
      
      if (newItems.length > 0 && newItems.every((item: any) => item.status === newStatus)) {
        if (newStatus === 'ເຄື່ອງມາແລ້ວ') {
          updateData.status = 'ເຄື່ອງມາຮອດແລ້ວ';
        } else if (newStatus === 'ສັ່ງເຄື່ອງແລ້ວ') {
          updateData.status = 'ສັ່ງເຄື່ອງແລ້ວ';
        } else if (newStatus === 'ສົ່ງໃຫ້ລູກຄ້າແລ້ວ') {
          updateData.status = 'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ';
        }
      }

      if (newStatus === 'ຍົກເລີກ' && oldStatus !== 'ຍົກເລີກ') {
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
  const [statusModal, setStatusModal] = useState<string | null>(null);
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

    getDoc(doc(db, 'settings', 'costCounter')).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setLastReset(tsToDate(d.lastReset));
        setLastResetBy(d.lastResetBy || '');
      }
    });

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
      const q = search.toLowerCase();
      const matchSearch = !q ||
        o.customerName?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.transport?.toLowerCase().includes(q) ||
        (o.items || []).some(i => i.name?.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' || 
                          o.status === statusFilter || 
                          (o.items || []).some(i => i.status === statusFilter);

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
      const order = orders.find(o => o.id === orderId);
      const newProfit = (order?.totalSales ?? order?.price ?? 0)
        - cost
        - (order?.shippingFee ?? 0)
        - (order?.totalExpenses ?? 0);
      
      const updates: any = {
        totalCost: cost,
        totalProfit: newProfit,
      };

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
    const result = await Swal.fire({
      title: '🗑️ ລຶບອໍເດີ?',
      text: 'ຕ້ອງການລຶບອໍເດີນີ້ອອກຈາກລະບົບແທ້ບໍ? ການກະທຳນີ້ບໍ່ສາມາດຍ້ອນກັບໄດ້!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '🗑️ ລຶບເລີຍ',
      cancelButtonText: '↩️ ຍົກເລີກ',
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#94A3B8',
      background: '#FFFFFF',
      color: '#0F172A',
      customClass: {
        popup: 'rounded-[30px] shadow-xl',
        title: 'text-lg font-bold',
        htmlContainer: 'text-sm text-slate-500',
        confirmButton: 'rounded-[20px] px-6 py-2.5 font-bold shadow-lg shadow-rose-500/25',
        cancelButton: 'rounded-[20px] px-6 py-2.5 font-bold',
      },
    });
    if (!result.isConfirmed) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setToast({ msg: 'ລຶບອໍເດີສຳເລັດ', type: 'success' });
    } catch {
      setToast({ msg: 'ບໍ່ສາມາດລຶບໄດ້', type: 'error' });
    }
  }, []);

  const handleReset = useCallback(async (personName: string) => {
    try {
      const resetTime = lastReset;
      const profitSinceReset = orders
        .filter(o => {
          if (o.status === 'ຍົກເລີກອໍເດີ') return false;
          const d = tsToDate(o.createdAt);
          return resetTime ? (d && d >= resetTime) : true;
        })
        .reduce((s, o) => s + (o.totalProfit || 0), 0);

      if (profitSinceReset > 0) {
        await addDoc(collection(db, 'transactions'), {
          walletId: 'W-COMP',
          type: 'income',
          amount: profitSinceReset,
          note: `ກຳໄລລອບ — ໂດຍ: ${personName}`,
          date: new Date().toISOString(),
        });
      }

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 pb-32 max-w-7xl mx-auto px-4 sm:px-6"
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Modals */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {statusModal && (
            <StatusModal
              current={orders.find(o => o.id === statusModal)?.status || ''}
              onSelect={s => updateStatus(statusModal, s)}
              onClose={() => setStatusModal(null)}
            />
          )}
          {billModal && <BillModal order={billModal} shopName={shopName} shopPhone={shopPhone} onClose={() => setBillModal(null)} />}
          {shippingModal && <ShippingModal order={shippingModal} onClose={() => setShippingModal(null)} />}
          {previewImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-zoom-out"
              onClick={() => setPreviewImage(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="relative max-w-4xl max-h-[85vh]"
              >
                <button
                  className="absolute -top-3 -right-3 sm:-top-5 sm:-right-5 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white hover:bg-rose-500 hover:text-white hover:scale-110 transition-all shadow-2xl z-10"

                onClick={() => setPreviewImage(null)}
              >
                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[85vh] object-contain rounded-[24px] shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
              />
            </motion.div>
          </motion.div>
        )}
        {showReset && <ResetModal wallets={wallets} onConfirm={handleReset} onClose={() => setShowReset(false)} />}
        {showHistory && <HistoryModal orders={orders} lastReset={lastReset} onClose={() => setShowHistory(false)} />}
      </AnimatePresence>
      , document.body)}

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`${card} ${pad} relative overflow-hidden`}
      >
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-teal-100/40 dark:bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-100/30 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[24px] bg-gradient-to-br from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/25 shrink-0">
              <DocumentTextIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">ລາຍການອໍເດີ</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">ຈັດການອໍເດີທັງໝົດ · {filteredOrders.length} ລາຍການ</p>
            </div>
          </div>
          {/* Shop settings inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={shopName}
              onChange={e => { setShopName(e.target.value); localStorage.setItem('shopName', e.target.value); }}
              placeholder="ຊື່ຮ້ານ"
              className={`${inputCls} w-36`}
            />
            <input
              value={shopPhone}
              onChange={e => { setShopPhone(e.target.value); localStorage.setItem('shopPhone', e.target.value); }}
              placeholder="ເບີໂທຮ້ານ"
              className={`${inputCls} w-32`}
            />
          </div>
        </div>
      </motion.div>

      {/* ── SUMMARY WIDGET ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-teal-50/80 to-emerald-50/80 dark:from-teal-950/30 dark:to-emerald-950/30 border border-teal-100/60 dark:border-teal-900/30 p-5 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-teal-200/30 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[24px] bg-gradient-to-br from-teal-400 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 shrink-0">
              <ChartBarIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">ສະຫຼຸບຍອດປັດຈຸບັນ</h3>
                {lastResetBy && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/80 dark:bg-white/10 text-teal-600 dark:text-teal-300 border border-teal-100/60 dark:border-teal-500/30 shadow-sm">
                    <UserIcon className="w-3 h-3" /> {lastResetBy}
                  </span>
                )}
                <button
                  onClick={() => setShowReset(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30 hover:bg-rose-100 transition-colors shadow-sm"
                >
                  <ArrowPathIcon className="w-3 h-3" /> ຜູ້ສັ່ງ & ລ້າງ 0
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/30 hover:bg-indigo-100 transition-colors shadow-sm"
                >
                  <ClockIcon className="w-3 h-3" /> ເບິ່ງປະຫວັດ
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">ລວມມູນຄ່າທັງໝົດທີ່ເພີ່ມຫຼ້າສຸດ (ອັບເດດທຸກໆວິນາທີ)</p>
            </div>
          </div>
          <div className="flex items-center gap-8 lg:ml-auto">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 mb-1 text-rose-500">
                <CurrencyDollarIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">ຕົ້ນທຶນ</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-500 tabular-nums leading-none tracking-tight">{fmtNum(summaryStats.cost)}</span>
                <span className="text-rose-500 font-bold text-sm mb-1">₭</span>
              </div>
            </div>
            <div className="w-px h-12 bg-rose-200/60 dark:bg-rose-500/20" />
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 mb-1 text-emerald-500">
                <ArrowTrendingUpIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">ກຳໄລ</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl sm:text-4xl font-black text-emerald-500 dark:text-emerald-400 tabular-nums leading-none tracking-tight">{fmtNum(summaryStats.profit)}</span>
                <span className="text-emerald-500 font-bold text-sm mb-1">₭</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── FILTER BAR ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className={`${card} ${pad}`}
      >
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + Refresh */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm group">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ຄົ້ນຫາ ຊື່, ເບີ, ID, ສິນຄ້າ..."
                className={`${inputCls} w-full pl-11`}
              />
            </div>
            <button
              onClick={() => setSearch('')}
              className={btnGhost}
              title="Refresh"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: Date pills + Status + Theme */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date pills */}
            <div className="flex items-center bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/10 rounded-[20px] p-1 gap-1">
              {([['all', 'ທັງໝົດ'], ['this', 'ເດືອນນີ້'], ['prev', 'ເດືອນກ່ອນ']] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setDateFilter(val)}
                  className={`px-3 py-1.5 rounded-[16px] text-xs font-bold transition-all ${
                    dateFilter === val
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <input
              type="month"
              value={customMonth}
              onChange={e => { setCustomMonth(e.target.value); setDateFilter('custom'); }}
              className={`${inputCls} w-40 text-xs`}
              title="ເລືອກເດືອນ"
            />

            {/* Status dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className={`${inputCls} pl-4 pr-8 appearance-none cursor-pointer font-semibold min-w-[140px]`}
              >
                <option value="all">ທຸກສະຖານະ</option>
                {STATUS_META.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Theme dropdown */}
            <div className="relative">
              <select
                value={theme}
                onChange={e => saveTheme(e.target.value)}
                className={`${inputCls} pl-4 pr-8 appearance-none cursor-pointer font-semibold`}
              >
                {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <span className="ml-auto text-xs text-slate-400 font-medium tabular-nums">{filteredOrders.length} / {orders.length} ລາຍການ</span>
          </div>
        </div>
      </motion.div>

      {/* ── ORDER TABLE ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className={`${card} overflow-hidden`}
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
              <tbody className="divide-y divide-slate-100/80 dark:divide-white/5">
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
                      <td className="px-4 py-4 min-w-[120px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{order.id.slice(-10)}</span>
                          <span className="text-xs text-slate-400">{formatDate(order.createdAt)}</span>
                          {order.orderedBy && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 w-fit border border-amber-200/60 dark:border-amber-500/30">
                              <UserIcon className="w-3 h-3" /> {order.orderedBy}
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
                      <td className="px-4 py-4 min-w-[140px]">
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
                      <td className="px-4 py-4 min-w-[300px]">
                        <div className="space-y-1.5">
                          {(order.items || []).map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt=""
                                  className="w-6 h-6 rounded-[8px] border border-slate-200/60 dark:border-white/10 object-cover cursor-pointer hover:ring-2 hover:ring-teal-500 transition-all shrink-0 bg-white"
                                  onClick={() => setPreviewImage(item.imageUrl!)}
                                  title="ຄລິກເພື່ອເບິ່ງຮູບເຕັມ"
                                />
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
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                                      : item.status === 'ສົ່ງໃຫ້ລູກຄ້າແລ້ວ'
                                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                                      : item.status === 'ເຄື່ອງມາແລ້ວ'
                                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                                      : item.status === 'ສັ່ງເຄື່ອງແລ້ວ'
                                      ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
                                      : 'bg-teal-50 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300'
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
                                  <ChevronDownIcon className="w-2.5 h-2.5" />
                                </div>
                                <div className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full pointer-events-none ${
                                    item.status === 'ຍົກເລີກ' ? 'bg-rose-500' :
                                    item.status === 'ສົ່ງໃຫ້ລູກຄ້າແລ້ວ' ? 'bg-purple-500' :
                                    item.status === 'ເຄື່ອງມາແລ້ວ' ? 'bg-indigo-500' :
                                    item.status === 'ສັ່ງເຄື່ອງແລ້ວ' ? 'bg-orange-500' : 'bg-teal-500'
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
                        <p className={`text-sm font-extrabold tabular-nums ${(order.totalProfit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {fmtNum(order.totalProfit || 0)} ₭
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 min-w-[170px]">
                        <StatusBadge status={order.status} loading={isUpdating} onClick={() => setStatusModal(order.id)} />
                        {order.statusUpdatedAt != null && (
                          <p className="text-[10px] text-slate-400 mt-1 tabular-nums">{formatDate(order.statusUpdatedAt as any, true)} {formatTime(order.statusUpdatedAt as any)}</p>
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
    </motion.div>
  );
}