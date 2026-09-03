'use client';

import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { ImageGalleryModal, GalleryImage } from './ImageGalleryModal';
import { supabase } from '@/app/lib/supabase';
import { STATUS_META, StatusBadge, StatusModal, InlineCostInput, fmtNum } from './OrderList';

// ── Types ────────────────────────────────────────────────────────────────
interface Agent {
  id: string;
  agentName: string;
  phone: string;
  level: 'General' | 'VIP' | 'VVIP';
  totalSales: number;
  notes: string;
  createdAt?: { seconds: number };
}

// ── Design tokens ─────────────────────────────────────────────────────────
const card  = 'premium-card glass';
const input = 'w-full h-10 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:bg-white dark:focus:bg-slate-800 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10';
const lbl   = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';
const primaryBtn = 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0';
const secondaryBtn = 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed';

// ── Level config ──────────────────────────────────────────────────────────
const LEVEL_CFG = {
  General: {
    next: 'VIP',
    badge: 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10',
    dot: 'bg-slate-400',
    label: 'General',
  },
  VIP: {
    next: 'VVIP',
    badge: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    dot: 'bg-amber-400',
    label: 'VIP',
  },
  VVIP: {
    next: 'General',
    badge: 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
    dot: 'bg-purple-500',
    label: 'VVIP ⭐',
  },
} as const;

export default function OrderAgent({ onCreateOrder, onEdit }: { onCreateOrder?: (agentId: string) => void, onEdit?: (orderId: string) => void }) {
  // ── Form state ──────────────────────────────────────────────────────────
  const [agentName,    setAgentName]    = useState('');
  const [phone,        setPhone]        = useState('');
  const [level,        setLevel]        = useState<'General' | 'VIP' | 'VVIP'>('General');
  const [initialSales, setInitialSales] = useState('');
  const [notes,        setNotes]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [message,      setMessage]      = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // ── List state ────────────────────────────────────────────
  const [agents,      setAgents]      = useState<Agent[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingAgentId,  setEditingAgentId]  = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [orders, setOrders] = useState<any[]>([]);
  const [statusModal, setStatusModal] = useState<string | null>(null);

  const updateItemStatus = async (orderId: string, itemIdx: number, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const newItems = [...order.items];
    newItems[itemIdx] = { ...newItems[itemIdx], status: newStatus };
    
    let newMainStatus = order.status;
    if (newItems.length > 0 && newItems.every((it: any) => it.status === newStatus)) {
      newMainStatus = newStatus;
    }
    
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: newItems, status: newMainStatus } : o));
    
    try {
      await supabase.from('orders').update({ items: newItems, status: newMainStatus }).eq('id', orderId);
    } catch (err) {
      console.error('updateItemStatus error:', err);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    setStatusModal(null);
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const updatedItems = (order.items || []).map((item: any) => ({ ...item, status: newStatus }));

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, items: updatedItems } : o));
    
    try {
      await supabase.from('orders').update({ status: newStatus, items: updatedItems }).eq('id', orderId);
    } catch (err) {
      console.error('updateStatus error:', err);
    }
  };

  const saveItemCost = async (orderId: string, itemIndex: number, newCostPerUnit: number) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      
      const updatedItems = [...(order.items || [])];
      if (updatedItems[itemIndex]) {
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          cost: newCostPerUnit,
          _cost_updated_at: new Date().toISOString()
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

      setOrders(prev => prev.map(o => o.id === orderId ? { 
        ...o, 
        totalCost: total_cost, 
        totalProfit: newProfit, 
        items: updatedItems 
      } : o));
      
      await supabase.from('orders').update(updates).eq('id', orderId);
    } catch (err) {
      console.error('saveItemCost error:', err);
    }
  };

  // Fetch orders for agent history
  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase.from('orders').select('*');
      if (data) {
        setOrders(data.map(d => ({
          ...d,
          agentId: d.agent_id,
          orderDate: d.order_date,
          customerName: d.customer_name,
          totalCost: d.total_cost,
          totalProfit: d.total_profit,
          imageUrl: d.image_url,
          createdAt: d.created_at ? { seconds: new Date(d.created_at).getTime() / 1000 } : undefined,
        })));
      }
    };
    fetchOrders();

    const channel = supabase.channel('orders-agent')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

    // --- Manual Fetch Function ---
  const fetchAgentsData = async () => {
    const { data, error } = await supabase.from('agents').select('*').order('created_at', { ascending: false });
    if (error) {
      if (process.env.NODE_ENV !== 'production') console.error('[OrderAgent] fetch error:', error);
      setListLoading(false);
      return;
    }
    if (data) {
       const mapped = data.map(d => ({
          id: d.id,
          agentName: d.agent_name ?? d.name ?? '',
          phone: d.phone ?? '',
          level: d.level ?? 'General',
          totalSales: d.total_sales ?? d.initial_sales ?? 0,
          notes: d.notes ?? '',
          createdAt: d.created_at ? { seconds: new Date(d.created_at).getTime() / 1000 } : undefined,
       })) as Agent[];
       setAgents(mapped);
    }
    setListLoading(false);
  };

  // Real-time listener
  useEffect(() => {
    fetchAgentsData();
    
    const channel = supabase.channel('agents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, fetchAgentsData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Submit (Add or Edit) agent ────────────────────────────────────────────────────────────
  const handleSubmitAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !phone.trim()) {
      setMessage({ type: 'error', text: 'ກະລຸນາກອກຊື່ ແລະ ເບີໂທໃຫ້ຄົບ' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      if (editingAgentId) {
        const { error } = await supabase.from('agents').update({
          agent_name: agentName.trim(),
          phone: phone.trim(),
          level,
          total_sales: initialSales ? Number(initialSales) : 0,
          notes: notes.trim(),
        }).eq('id', editingAgentId);
        
        if (error) throw error;
        setMessage({ type: 'success', text: '✅ ແກ້ໄຂຂໍ້ມູນຕົວແທນສຳເລັດແລ້ວ!' });
      } else {
        const { error } = await supabase.from('agents').insert({
          agent_name: agentName.trim(),
          phone: phone.trim(),
          level,
          total_sales: initialSales ? Number(initialSales) : 0,
          notes: notes.trim(),
        });
        
        if (error) throw error;
        setMessage({ type: 'success', text: '✅ ລົງທະບຽນຕົວແທນສຳເລັດແລ້ວ!' });
      }
      
      setAgentName(''); setPhone(''); setInitialSales(''); setNotes('');
      setLevel('General');
      setEditingAgentId(null);
      
      // Update manually to ensure UI syncs immediately
      fetchAgentsData();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAgentId(agent.id);
    setAgentName(agent.agentName);
    setPhone(agent.phone);
    setLevel(agent.level);
    setInitialSales(agent.totalSales.toString());
    setNotes(agent.notes || '');
    setMessage({ type: '', text: '' });
  };
  
  const handleCancelEdit = () => {
    setEditingAgentId(null);
    setAgentName(''); setPhone(''); setInitialSales(''); setNotes('');
    setLevel('General');
    setMessage({ type: '', text: '' });
  };

  // ── Cycle level ──────────────────────────────────────────────────────────
  const handleCycleLevel = async (id: string, current: Agent['level']) => {
    const next = LEVEL_CFG[current].next as Agent['level'];
    try { 
      await supabase.from('agents').update({ level: next }).eq('id', id); 
      fetchAgentsData();
    }
    catch (e) { console.error(e); }
  };

  // ── Delete agent (uses confirmDeleteId state instead of native confirm) ──
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try { 
      await supabase.from('agents').delete().eq('id', id); 
      fetchAgentsData();
    }
    catch { setMessage({ type: 'error', text: 'ລົບບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່' }); }
    finally { setDeletingId(null); }
  };

  // ── Filtered ─────────────────────────────────────────────────────────────
  const filtered = agents.filter(a =>
    a.agentName.toLowerCase().includes(search.toLowerCase()) ||
    a.phone.includes(search) ||
    a.notes?.toLowerCase().includes(search.toLowerCase())
  );

  const totalSalesAll = agents.reduce((s, a) => s + (a.totalSales || 0), 0);
  const vvipCount = agents.filter(a => a.level === 'VVIP').length;
  const vipCount  = agents.filter(a => a.level === 'VIP').length;

  return (
    <div className="space-y-6 pb-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            ຕົວແທນຈຳໜ່າຍ
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            ບໍລິຫານ Partner · ຍອດຂາຍສະສົມ · ລະດັບສະມາຊິກ
          </p>
        </div>
        {/* Quick stats */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-500/30">
            👥 {agents.length} ຕົວແທນ
          </span>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-500/30">
            ⭐ {vvipCount} VVIP
          </span>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-500/30">
            🏅 {vipCount} VIP
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ═══ LEFT — Add Agent Form ═══ */}
        <div className={`${card} p-5 sm:p-6`}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-violet-600 dark:text-violet-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </div>
              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                {editingAgentId ? 'ແກ້ໄຂຂໍ້ມູນຕົວແທນ' : 'ເພີ່ມຕົວແທນໃໝ່'}
              </span>
            </div>
  
            <form onSubmit={handleSubmitAgent} className="space-y-4">
            <div>
              <label className={lbl}>ຊື່ຕົວແທນ / ນາມແຝງ <span className="text-rose-400">*</span></label>
              <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
                placeholder="ກອກຊື່ຕົວແທນ..." className={input} />
            </div>

            <div>
              <label className={lbl}>ເບີໂທຕິດຕໍ່ <span className="text-rose-400">*</span></label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="020..." className={input} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>ລະດັບ</label>
                <div className="relative">
                  <select value={level} onChange={e => setLevel(e.target.value as Agent['level'])}
                    className={`${input} appearance-none pr-8 cursor-pointer`}>
                    <option value="General">General</option>
                    <option value="VIP">VIP</option>
                    <option value="VVIP">VVIP</option>
                  </select>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <label className={lbl}>ຍອດຂາຍເລີ່ມຕົ້ນ</label>
                <input type="text" inputMode="decimal" value={initialSales ? String(initialSales).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} onChange={e => {
                  const raw = e.target.value.replace(/,/g, '');
                  if (/^-?\d*\.?\d*$/.test(raw)) setInitialSales(raw);
                }}
                  placeholder="0" className={input} />
              </div>
            </div>

            <div>
              <label className={lbl}>ໝາຍເຫດ / ຊ່ອງທາງ</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Facebook, Line ID..." className={input} />
            </div>

            {message.text && (
              <div className={`p-3 rounded-xl text-xs font-medium border ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-2">
              {editingAgentId && (
                <button type="button" onClick={handleCancelEdit} className={`${secondaryBtn} w-1/3`}>
                  ຍົກເລີກ
                </button>
              )}
              <button type="submit" disabled={loading} className={`${primaryBtn} ${editingAgentId ? 'w-2/3' : 'w-full'}`}>
                {loading ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>ກຳລັງບັນທຶກ...</>
                ) : (
                  editingAgentId 
                    ? <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>ບັນທຶກການແກ້ໄຂ</>
                    : <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>ລົງທະບຽນຕົວແທນ</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ═══ RIGHT — Agent Table ═══ */}
        <div className={`${card} p-5 sm:p-6 lg:col-span-2`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-600 dark:text-indigo-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                ທຳເນียບຕົວແທນ
              </span>
            </div>
            {/* Search */}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ຄົ້ນຫາ..."
                className="h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-violet-400 transition-colors w-44" />
            </div>
          </div>

          {/* Total sales banner */}
          {agents.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 mb-4 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 border border-violet-100 dark:border-violet-500/20">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">ຍອດຂາຍລວມທຸກຕົວແທນ</span>
              <span className="text-lg font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">
                {totalSalesAll.toLocaleString()} ₭
              </span>
            </div>
          )}

          {listLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl skeleton-shimmer" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {search ? 'ບໍ່ພົບຕົວແທນທີ່ຄົ້ນຫາ' : 'ຍັງບໍ່ມີຕົວແທນໃນລະບົບ'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/8 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 px-2">ຊື່ຕົວແທນ</th>
                    <th className="pb-3 px-2">ລະດັບ</th>
                    <th className="pb-3 px-2 hidden sm:table-cell">ເບີໂທ</th>
                    <th className="pb-3 px-2 text-right">ຍອດຂາຍສະສົມ</th>
                    <th className="pb-3 px-2 text-center">ຈັດການ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {filtered.map(agent => {
                    const cfg = LEVEL_CFG[agent.level] || LEVEL_CFG.General;
                    return (
                      <tr key={agent.id} onClick={() => setSelectedAgent(agent)} className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] ${deletingId === agent.id ? 'opacity-50' : ''}`}>
                        {/* Avatar + Name */}
                        <td className="py-3.5 px-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                              {(agent.agentName?.charAt(0) ?? '').toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">{agent.agentName}</p>
                              {agent.notes && <p className="text-[11px] text-slate-400 truncate max-w-[120px]">{agent.notes}</p>}
                            </div>
                          </div>
                        </td>
                        {/* Level badge — click to cycle */}
                        <td className="py-3.5 px-2">
                          <button
                            onClick={() => handleCycleLevel(agent.id, agent.level)}
                            title="ຄລິກເພື່ອປ່ຽນລະດັບ"
                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all hover:scale-105 active:scale-95 ${cfg.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </button>
                        </td>
                        {/* Phone */}
                        <td className="py-3.5 px-2 hidden sm:table-cell">
                          <a href={`tel:${agent.phone}`} className="text-sm text-slate-500 dark:text-slate-400 font-mono hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                            {agent.phone}
                          </a>
                        </td>
                        {/* Sales */}
                        <td className="py-3.5 px-2 text-right">
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {(agent.totalSales || 0).toLocaleString()} ₭
                          </span>
                        </td>
                        {/* Manage */}
                        <td className="py-3.5 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={(e) => handleEditClick(agent, e)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/8 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(agent.id); }}
                              disabled={deletingId === agent.id}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/8 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
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

      {/* Agent Profile Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedAgent(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-[scaleIn_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
             {/* Header */}
             <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-black">{selectedAgent.agentName.charAt(0)}</span>
                    ໂປຣໄຟລ໌ຕົວແທນ: {selectedAgent.agentName}
                  </h3>
                  <div className="flex gap-2 mt-2">
                    <span className={LEVEL_CFG[selectedAgent.level].badge + ' px-2 py-0.5 rounded text-xs font-bold'}>{LEVEL_CFG[selectedAgent.level].label}</span>
                    <span className="text-xs text-slate-500">📞 {selectedAgent.phone}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedAgent(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10">&times;</button>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 dark:bg-slate-800/30">
               <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/10">
                    <div className="text-xs text-slate-500 mb-1">ຍອດຂາຍສະສົມທັງໝົດ</div>
                    <div className="text-lg font-bold text-emerald-500">{selectedAgent.totalSales.toLocaleString()} ₭</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/10">
                    <div className="text-xs text-slate-500 mb-1">ຈຳນວນອໍເດີທັງໝົດ</div>
                    <div className="text-lg font-bold text-blue-500">
                      {orders.filter(o => o.agentId === selectedAgent.id).length} ບິນ
                    </div>
                  </div>
               </div>

               <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">ປະຫວັດບິນອໍເດີ (Order History)</h4>
               
               {(() => {
                  const agentOrders = orders.filter(o => o.agentId === selectedAgent.id).sort((a,b) => {
                     const d1 = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.orderDate ? new Date(a.orderDate).getTime() : 0);
                     const d2 = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.orderDate ? new Date(b.orderDate).getTime() : 0);
                     return d2 - d1;
                  });

                  if(agentOrders.length === 0) return <p className="text-center py-10 text-slate-500">ຍັງບໍ່ມີອໍເດີ</p>;

                  return (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                           <tr>
                             <th className="px-4 py-3 font-bold">ວັນທີ</th>
                             <th className="px-4 py-3 font-bold">ອໍເດີ ID</th>
                             <th className="px-4 py-3 font-bold w-full">ລາຍການສິນຄ້າ</th>
                             <th className="px-4 py-3 font-bold text-right">ຕົ້ນທຶນ (₭)</th>
                             <th className="px-4 py-3 font-bold text-right">ຍອດຂາຍ (₭)</th>
                             <th className="px-4 py-3 font-bold text-right">ກຳໄລ (₭)</th>
                             <th className="px-4 py-3 font-bold text-center">ສະຖານະ</th>
                             <th className="px-4 py-3 font-bold text-center">ຈັດການ</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {agentOrders.map((o, idx) => {
                            const statuses = [
                              'ລໍຖ້າຈ່າຍເງິນ', 'ຈ່າຍແລ້ວ', 'ລໍຖ້າເຄື່ອງເຂົ້າ', 'ເຄື່ອງເຂົ້າແລ້ວ',
                              'ກຳລັງຈັດສົ່ງ', 'ໄດ້ຮັບເງິນແລ້ວ', 'ປິດບິນແລ້ວ', 'ຍົກເລີກອໍເດີ', 'ສົ່ງເຄມ'
                            ];
                            return (
                            <tr key={`${o.id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="px-4 py-4 text-slate-600 dark:text-slate-400 align-top">
                                {o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleDateString('en-GB') : (o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-GB') : '-')}
                              </td>
                              <td className="px-4 py-4 font-bold text-blue-600 dark:text-blue-400 align-top">[{o.id.slice(-8)}]</td>
                              <td className="px-4 py-4 whitespace-normal min-w-[250px] align-top">
                                <div className="space-y-1.5">
                                  <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">{o.customerName || '-'}</div>
                                  {(o.items || []).map((item: any, i: number) => {
                                    const imgUrl = item.image_url || item.imageUrl;
                                    return (
                                      <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                        {imgUrl ? (
                                          <img 
                                            src={imgUrl} 
                                            alt="" 
                                            className="w-6 h-6 rounded-[8px] border border-slate-200/60 dark:border-white/10 object-cover cursor-pointer hover:ring-2 hover:ring-violet-500 transition-all shrink-0 bg-white"
                                            onClick={() => {
                                              const images: GalleryImage[] = [];
                                              let clickedIndex = 0;
                                              let imgCount = 0;
                                              if (o.imageUrl) {
                                                images.push({ url: o.imageUrl, title: 'ຫຼັກຖານການໂອນ', subtitle: o.customerName });
                                                imgCount++;
                                              }
                                              o.items.forEach((it: any) => {
                                                const itImg = it.image_url || it.imageUrl;
                                                if (itImg) {
                                                  images.push({ url: itImg, title: it.name, subtitle: `ຈຳນວນ: ${it.qty}` });
                                                  if (itImg === imgUrl) {
                                                    clickedIndex = imgCount;
                                                  }
                                                  imgCount++;
                                                }
                                              });
                                              if (images.length === 0 && imgUrl) {
                                                images.push({ url: imgUrl, title: item.name, subtitle: o.customerName });
                                              }
                                              setGalleryImages(images);
                                              setGalleryIndex(clickedIndex);
                                            }}
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
                                            if (!meta) return 'text-violet-600 dark:text-violet-400';
                                            return meta.chip.includes('rose') ? 'text-rose-600 dark:text-rose-400' :
                                                   meta.chip.includes('purple') ? 'text-purple-600 dark:text-purple-400' :
                                                   meta.chip.includes('indigo') ? 'text-indigo-600 dark:text-indigo-400' :
                                                   meta.chip.includes('orange') ? 'text-orange-600 dark:text-orange-400' :
                                                   meta.chip.includes('yellow') ? 'text-yellow-600 dark:text-yellow-400' :
                                                   meta.chip.includes('cyan') ? 'text-cyan-600 dark:text-cyan-400' :
                                                   meta.chip.includes('emerald') ? 'text-emerald-600 dark:text-emerald-400' :
                                                   meta.chip.includes('lime') ? 'text-lime-600 dark:text-lime-400' :
                                                   'text-violet-600 dark:text-violet-400';
                                          })()
                                        }`}>x{item.qty}</span>
                                        <div className="relative ml-auto shrink-0 group">
                                          <select
                                            value={item.status || 'ຮັບອໍເດີແລ້ວ'}
                                            onChange={(e) => updateItemStatus(o.id, i, e.target.value)}
                                            className={`appearance-none text-[10px] font-bold rounded-full pl-4 pr-5 py-0.5 outline-none transition-all cursor-pointer border-0 hover:shadow-md active:scale-95 text-center min-w-[74px] ${
                                              STATUS_META.find(s => s.value === item.status)?.chip ||
                                              'bg-teal-50 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300'
                                            }`}
                                          >
                                            {STATUS_META.map(s => (
                                              <option key={s.value} value={s.value} className="font-semibold text-slate-700 bg-white">
                                                {s.value}
                                              </option>
                                            ))}
                                          </select>
                                          <div className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none ${
                                            STATUS_META.find(s => s.value === item.status)?.dot || 'bg-teal-500'
                                          }`} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top pt-4">
                                <div className="space-y-1.5 flex flex-col items-end justify-center">
                                  {(o.items || []).map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-end h-7 mt-[0.5px]">
                                      <InlineCostInput 
                                        orderId={o.id} 
                                        value={item.cost || 0} 
                                        onSave={(id, cost) => saveItemCost(id, i, cost)} 
                                      />
                                    </div>
                                  ))}
                                  {(o.shipping_fee || 0) > 0 && (
                                    <p className="text-[11px] text-slate-400 tabular-nums text-right">+{fmtNum(o.shipping_fee)} ₭ ຂົນສົ່ງ</p>
                                  )}
                                </div>
                              </td>

                              {/* Sales */}
                              <td className="px-4 py-4 align-top text-right pt-5">
                                <div className="flex flex-col items-end gap-1.5">
                                  <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                                    {fmtNum(o.price || 0)}
                                  </p>
                                  {(o.deposit || 0) > 0 && (
                                    <div className="flex flex-col gap-1 w-full max-w-[110px]">
                                      <div className="flex items-center justify-between text-[10px] bg-amber-50/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-500/30">
                                        <span className="font-medium opacity-80">ມັດຈຳ:</span>
                                        <span className="font-bold tabular-nums">{fmtNum(o.deposit)}</span>
                                      </div>
                                      {((o.price || 0) - o.deposit) > 0 ? (
                                        <div className="flex items-center justify-between text-[10px] bg-rose-50/70 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-500/30">
                                          <span className="font-medium opacity-80">ເຫຼືອ:</span>
                                          <span className="font-bold tabular-nums">{fmtNum((o.price || 0) - o.deposit)}</span>
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
                              <td className="px-4 py-4 align-top text-right pt-5">
                                <p className={`text-sm font-extrabold tabular-nums ${(o.totalProfit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {fmtNum(o.totalProfit || 0)} ₭
                                </p>
                              </td>
                              <td className="px-4 py-4 text-center align-top">
                                <StatusBadge status={o.status} onClick={() => setStatusModal(o.id)} />
                              </td>
                              <td className="px-4 py-4 text-center align-top">
                                <button onClick={() => { setSelectedAgent(null); if(onEdit) onEdit(o.id); }} title="ແກ້ໄຂອໍເດີ"
                                  className="w-8 h-8 mx-auto flex items-center justify-center rounded-lg bg-slate-100 hover:bg-violet-100 text-slate-500 hover:text-violet-600 transition-all">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                </button>
                              </td>
                            </tr>
                          )})}
                        </tbody>
                      </table>
                    </div>
                  );
               })()}

             </div>
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        images={galleryImages}
        initialIndex={galleryIndex}
        isOpen={galleryImages.length > 0}
        onClose={() => setGalleryImages([])}
      />

      {/* Status Modal */}
      {statusModal && (
        <StatusModal
          current={orders.find(o => o.id === statusModal)?.status || 'ລໍຖ້າຈ່າຍເງິນ'}
          onSelect={(s) => updateStatus(statusModal, s)}
          onClose={() => setStatusModal(null)}
        />
      )}
    </div>
  );
}
