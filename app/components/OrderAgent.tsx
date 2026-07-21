'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import {
  collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, updateDoc, deleteDoc,
} from 'firebase/firestore';

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
const card  = 'bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-white/8 shadow-sm dark:shadow-none';
const input = 'w-full h-10 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:bg-white dark:focus:bg-slate-800 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10';
const lbl   = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';
const primaryBtn = 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0';

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

export default function OrderAgent() {
  // ── Form state ──────────────────────────────────────────────────────────
  const [agentName,    setAgentName]    = useState('');
  const [phone,        setPhone]        = useState('');
  const [level,        setLevel]        = useState<'General' | 'VIP' | 'VVIP'>('General');
  const [initialSales, setInitialSales] = useState('');
  const [notes,        setNotes]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [message,      setMessage]      = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // ── List state ──────────────────────────────────────────────────────────
  const [agents,      setAgents]      = useState<Agent[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [search,      setSearch]      = useState('');

  // Real-time listener
  useEffect(() => {
    const q = query(collection(db, 'agents'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const mapped = snap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          agentName: data.agentName ?? '',
          phone: data.phone ?? '',
          level: (data.level as Agent['level']) ?? 'General',
          totalSales: data.totalSales ?? 0,
          notes: data.notes ?? '',
          createdAt: data.createdAt ? { seconds: (data.createdAt as any).seconds ?? 0 } : undefined,
        } as Agent;
      });
      setAgents(mapped);
      setListLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Add agent ────────────────────────────────────────────────────────────
  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !phone.trim()) {
      setMessage({ type: 'error', text: 'ກະລຸນາກອກຊື່ ແລະ ເບີໂທໃຫ້ຄົບ' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await addDoc(collection(db, 'agents'), {
        agentName: agentName.trim(),
        phone: phone.trim(),
        level,
        totalSales: initialSales ? Number(initialSales) : 0,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
      });
      setMessage({ type: 'success', text: '✅ ລົງທະບຽນຕົວແທນສຳເລັດແລ້ວ!' });
      setAgentName(''); setPhone(''); setInitialSales(''); setNotes('');
      setLevel('General');
    } catch {
      setMessage({ type: 'error', text: 'ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່' });
    } finally {
      setLoading(false);
    }
  };

  // ── Cycle level ──────────────────────────────────────────────────────────
  const handleCycleLevel = async (id: string, current: Agent['level']) => {
    const next = LEVEL_CFG[current].next as Agent['level'];
    try { await updateDoc(doc(db, 'agents', id), { level: next }); }
    catch (e) { console.error(e); }
  };

  // ── Delete agent ─────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('ຕ້ອງການລຶບຕົວແທນນີ້ອອກຈາກລະບົບແທ້ບໍ?')) return;
    setDeletingId(id);
    try { await deleteDoc(doc(db, 'agents', id)); }
    catch { alert('ລຶບບໍ່ສຳເລັດ'); }
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
              ເພີ່ມຕົວແທນໃໝ່
            </span>
          </div>

          <form onSubmit={handleAddAgent} className="space-y-4">
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
                <input type="number" min="0" value={initialSales} onChange={e => setInitialSales(e.target.value)}
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

            <button type="submit" disabled={loading} className={`${primaryBtn} w-full`}>
              {loading ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>ກຳລັງບັນທຶກ...</>
              ) : (
                <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>ລົງທະບຽນຕົວແທນ</>
              )}
            </button>
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
                      <tr key={agent.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] ${deletingId === agent.id ? 'opacity-50' : ''}`}>
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
                        {/* Delete */}
                        <td className="py-3.5 px-2 text-center">
                          <button
                            onClick={() => handleDelete(agent.id)}
                            disabled={deletingId === agent.id}
                            className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto bg-slate-100 dark:bg-white/8 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
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
    </div>
  );
}