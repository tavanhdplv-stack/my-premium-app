// app/types/index.ts
// Shared TypeScript interfaces for the entire application.
// Single source of truth — import from here instead of re-declaring in each component.

import type { Timestamp } from 'firebase/firestore';

// ─── Firestore Timestamp union ────────────────────────────────────────────────
// Firestore Timestamps can be a real Timestamp object (server-side),
// a plain seconds/nanoseconds object (optimistic client write before server ack),
// or null/undefined when the field hasn't been set yet.
export type FirestoreTimestamp =
  | Timestamp
  | { seconds: number; nanoseconds?: number; toDate?: () => Date }
  | null
  | undefined;

// ─── Helper: safely convert any timestamp variant to a JS Date ────────────────
export function tsToDate(ts: FirestoreTimestamp): Date | null {
  if (!ts) return null;
  if (typeof (ts as Timestamp).toDate === 'function') {
    return (ts as Timestamp).toDate();
  }
  if (typeof (ts as { seconds: number }).seconds === 'number') {
    return new Date((ts as { seconds: number }).seconds * 1000);
  }
  return null;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  cost: number;
  price: number;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
}

export interface Order {
  id: string;
  customerName?: string;
  phone?: string;
  transport?: string;
  village?: string;
  district?: string;
  province?: string;
  orderDate?: string;
  status?: string;
  paymentMethod?: 'COD' | 'ຈ່າຍແລ້ວ';
  wallet?: string;
  deposit?: number;
  shippingFee?: number;
  totalCost?: number;
  totalExpenses?: number;
  totalProfit?: number;
  /** Computed sum of (item.price * item.qty) across all items */
  totalSales?: number;
  imageUrl?: string;
  items?: OrderItem[];
  expenses?: Expense[];
  createdAt?: FirestoreTimestamp;
  createdAtClient?: number;
  statusUpdatedAt?: FirestoreTimestamp;
  /** Internal helper set client-side for stable sorting — never written to Firestore */
  __createdAtVal?: number;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface Wallet {
  id: string;
  name: string;
  type: 'W-COMP' | 'partner';
  sharePercent?: number;
  createdAt?: string;
}

export interface WalletStats {
  bal: number;
  in: number;
  out: number;
  capital: number;
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  walletId: string;
  type: 'income' | 'expense' | 'profit_split';
  amount: number;
  note: string;
  date: string;
  partnerSplitId?: string;
}

// ─── Stock ────────────────────────────────────────────────────────────────────

export interface StockItem {
  id: string;
  itemName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  imageUrl?: string;
  notes?: string;
  createdAt?: FirestoreTimestamp;
  /** Internal helper for sorting */
  __createdAtVal?: number;
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export type AgentLevel = 'General' | 'VIP' | 'VVIP';

export interface Agent {
  id: string;
  agentName: string;
  phone: string;
  level: AgentLevel;
  totalSales: number;
  notes: string;
  createdAt?: FirestoreTimestamp;
  /** Internal helper for sorting */
  __createdAtVal?: number;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  shopName: string;
  shopPhone: string;
  exchangeRate: number;
  shippingTime: string;
  defaultDeposit: number;
  availableSizes: string;
  showProfit: boolean;
}

// ─── Status ───────────────────────────────────────────────────────────────────

export interface OrderStatus {
  id: string;
  label: string;
  english: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
  order: number;
  description: string;
  isCancelled: boolean;
}
