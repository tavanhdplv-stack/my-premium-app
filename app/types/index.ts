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
export function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof (ts as Timestamp).toDate === 'function') {
    return (ts as Timestamp).toDate();
  }
  if (typeof (ts as { seconds: number }).seconds === 'number') {
    return new Date((ts as { seconds: number }).seconds * 1000);
  }
  if (typeof ts === 'string' || typeof ts === 'number') {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
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
  status?: string;
  image_url?: string;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
}

export interface Order {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  transport?: string;
  customer_address?: string;
  customer_district?: string;
  customer_province?: string;
  order_date?: string;
  status?: string;
  payment_method?: 'COD' | 'ຈ່າຍແລ້ວ';
  wallet_id?: string;
  transfer_amount?: number;
  shipping_cost?: number;
  total_cost?: number;
  total_expenses?: number;
  total_profit?: number;
  /** Computed sum of (item.price * item.qty) across all items */
  price?: number;
  image_url?: string;
  items?: OrderItem[];
  expenses?: Expense[];
  created_at?: string;
  status_updated_at?: string;
  /** Optional notes JSON string from Supabase */
  notes?: string;
  agent_id?: string;
  ordered_by?: string;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface Wallet {
  id: string;
  name: string;
  type: 'W-COMP' | 'partner';
  share_percent?: number;
  created_at?: string;
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
  wallet_id: string;
  type: 'income' | 'expense' | 'profit_split';
  amount: number;
  notes: string;
  date: string;
  partner_split_id?: string;
}

// ─── Stock ────────────────────────────────────────────────────────────────────

export interface StockItem {
  id: string;
  item_name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  image_url?: string;
  notes?: string;
  created_at?: string;
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export type AgentLevel = 'General' | 'VIP' | 'VVIP';

export interface Agent {
  id: string;
  agent_name: string;
  phone: string;
  level: AgentLevel;
  total_sales: number;
  notes: string;
  created_at?: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  shop_name: string;
  shop_phone: string;
  exchange_rate: number;
  shipping_time: string;
  default_deposit: number;
  available_sizes: string;
  show_profit: boolean;
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
