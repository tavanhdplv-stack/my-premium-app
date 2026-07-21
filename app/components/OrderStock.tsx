'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { db } from '@/firebase';
import {
  collection, addDoc, serverTimestamp, query,
  orderBy, onSnapshot, updateDoc, deleteDoc, doc,
} from 'firebase/firestore';

// ── Types ──────────────────────────────────────────────────────────────
interface StockItem {
  id: string;
  itemName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  imageUrl: string;
  notes: string;
  createdAt?: { seconds: number };
}

// ── Design tokens (matches global theme) ──────────────────────────────
const card = 'bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-white/8 shadow-sm dark:shadow-none';
const inputCls = 'w-full h-10 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:bg-white dark:focus:bg-slate-800 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10';
const labelCls = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';
const primaryBtn = 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0';
const iconBtn = 'w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all';

export default function OrderStock() {
  // ── Form state ──────────────────────────────────────────────────────
  const [itemName, setItemName]       = useState('');
  const [quantity, setQuantity]       = useState('');
  const [costPrice, setCostPrice]     = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [notes, setNotes]             = useState('');
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [dragActive, setDragActive]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0–100
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── List state ──────────────────────────────────────────────────────
  const [stocks, setStocks]           = useState<StockItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch]           = useState('');
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  // Revoke object URL on unmount / change
  useEffect(() => {
    return () => { if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl); };
  }, [imagePreviewUrl]);

  // Real-time Firestore listener
  useEffect(() => {
    const q = query(collection(db, 'stocks'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setStocks(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockItem)));
      setListLoading(false);
    });
    return () => unsub();
  }, []);

  // ── File helpers ────────────────────────────────────────────────────
  const handleFileSelection = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'ຮອງຮັບສະເພາະໄຟລ໌ JPG, PNG, WEBP ເທົ່ານັ້ນ' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'ຂະໜາດໄຟລ໌ຕ້ອງບໍ່ເກີນ 5MB' });
      return;
    }
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setMessage({ type: '', text: '' });
  };

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); };
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]);
  };

  // ── Upload to Cloudinary via API route ─────────────────────────────
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    setUploadProgress(10);
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    setUploadProgress(80);

    const data = await response.json();
    const url = data?.secure_url ?? data?.url;
    if (!response.ok || !url) {
      throw new Error(typeof data?.error === 'string' ? data.error : 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ');
    }
    setUploadProgress(100);
    return url;
  };

  // ── Submit form ─────────────────────────────────────────────────────
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !quantity || !sellingPrice) {
      setMessage({ type: 'error', text: 'ກະລຸນາກອກຊື່ສິນຄ້າ, ຈຳນວນ ແລະ ລາຄາຂາຍໃຫ້ຄົບ' });
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setMessage({ type: '', text: '' });

    try {
      let finalImageUrl = '';
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      await addDoc(collection(db, 'stocks'), {
        itemName: itemName.trim(),
        quantity: Number(quantity),
        costPrice: costPrice ? Number(costPrice) : 0,
        sellingPrice: Number(sellingPrice),
        imageUrl: finalImageUrl,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
      });

      setMessage({ type: 'success', text: '✅ ບັນທຶກສິນຄ້າເຂົ້າສາງສຳເລັດແລ້ວ!' });
      // Reset
      setItemName(''); setQuantity(''); setCostPrice(''); setSellingPrice(''); setNotes('');
      setImageFile(null); setImagePreviewUrl(''); setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: `ເກີດຂໍ້ຜິດພາດ: ${err instanceof Error ? err.message : 'ບໍ່ສາມາດບັນທຶກໄດ້'}` });
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // ── Quick quantity update ───────────────────────────────────────────
  const updateQty = async (id: string, current: number, delta: number) => {
    const next = current + delta;
    if (next < 0) return;
    await updateDoc(doc(db, 'stocks', id), { quantity: next });
  };

  // ── Delete item ─────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('ຕ້ອງການລຶບສິນຄ້ານີ້ອອກຈາກສາງແທ້ບໍ?')) return;
    setDeletingId(id);
    try { await deleteDoc(doc(db, 'stocks', id)); }
    catch { alert('ລຶບບໍ່ສຳເລັດ'); }
    finally { setDeletingId(null); }
  };

  // ── Filtered list ───────────────────────────────────────────────────
  const filtered = stocks.filter(s =>
    s.itemName.toLowerCase().includes(search.toLowerCase()) ||
    s.notes?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Totals ──────────────────────────────────────────────────────────
  const totalItems = stocks.reduce((s, i) => s + i.quantity, 0);
  const totalValue = stocks.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
  const lowStock   = stocks.filter(i => i.quantity > 0 && i.quantity <= 5).length;

  return (
    <div className="space-y-6 pb-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            ສາງສິນຄ້າ
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            ຈັດການສາງ · ອັບໂຫຼດຮູບສິນຄ້າ · ຕິດຕາມສາງ real-time
          </p>
        </div>
        {/* Stats chips */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-500/30">
            📦 {stocks.length} ລາຍການ
          </span>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-500/30">
            🏷 {totalItems.toLocaleString()} ຊິ້ນ
          </span>
          {lowStock > 0 && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-500/30 animate-pulse">
              ⚠️ ໃກ້ໝົດ {lowStock} ລາຍການ
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ══════════════════════════════════
            LEFT — Add Stock Form
        ══════════════════════════════════ */}
        <div className={`${card} p-5 sm:p-6`}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-violet-600 dark:text-violet-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              ເພີ່ມສິນຄ້າໃໝ່
            </span>
          </div>

          <form onSubmit={handleAddStock} className="space-y-4">

            {/* Item Name */}
            <div>
              <label className={labelCls}>ຊື່ສິນຄ້າ <span className="text-rose-400">*</span></label>
              <input
                type="text"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                placeholder="ເຊັ່ນ: ເສື້ອຍືດພິມລາຍ ເບີ M..."
                className={inputCls}
              />
            </div>

            {/* Image Upload Zone */}
            <div>
              <label className={labelCls}>ຮູບສິນຄ້າ (Cloudinary)</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all overflow-hidden
                  ${dragActive
                    ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/10 scale-[1.01]'
                    : imagePreviewUrl
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                    : 'border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-slate-800/40 hover:border-violet-300 dark:hover:border-violet-500/50 hover:bg-violet-50/50 dark:hover:bg-violet-500/5'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  id="product-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFileSelection(e.target.files[0]); }}
                />

                {imagePreviewUrl ? (
                  /* ── Preview ── */
                  <div className="relative">
                    <img
                      src={imagePreviewUrl}
                      alt="preview"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        URL.revokeObjectURL(imagePreviewUrl);
                        setImageFile(null); setImagePreviewUrl('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-rose-600 text-white text-xs flex items-center justify-center transition-colors"
                    >
                      ✕
                    </button>
                    <p className="absolute bottom-2 left-3 text-white text-xs font-medium drop-shadow">
                      {imageFile?.name}
                    </p>
                  </div>
                ) : (
                  /* ── Placeholder ── */
                  <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-violet-600 dark:text-violet-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">ລາກວາງ ຫຼື ຄລິກເພື່ອເລືອກຮູບ</p>
                    <p className="text-xs text-slate-400">JPG · PNG · WEBP · ສູງສຸດ 5MB</p>
                  </div>
                )}
              </div>

              {/* Upload progress bar */}
              {loading && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>ກຳລັງອັບໂຫຼດຮູບ...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quantity & Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>ຈຳນວນ (ຊິ້ນ) <span className="text-rose-400">*</span></label>
                <input
                  type="number" min="0"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>ທຶນ (ຖ້າມີ)</label>
                <input
                  type="number" min="0"
                  value={costPrice}
                  onChange={e => setCostPrice(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Selling Price */}
            <div>
              <label className={labelCls}>ລາຄາຂາຍ <span className="text-rose-400">*</span></label>
              <input
                type="number" min="0"
                value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>ໝາຍເຫດ</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ສີ, ແຫຼ່ງນຳເຂົ້າ 1688..."
                className={inputCls}
              />
            </div>

            {/* Message */}
            {message.text && (
              <div className={`p-3 rounded-xl text-xs font-medium border ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
              }`}>
                {message.text}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} className={`${primaryBtn} w-full`}>
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {uploadProgress > 0 ? `ອັບໂຫຼດ ${uploadProgress}%...` : 'ກຳລັງບັນທຶກ...'}
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  ບັນທຶກເຂົ້າສາງ
                </>
              )}
            </button>
          </form>
        </div>

        {/* ══════════════════════════════════
            RIGHT — Stock Table
        ══════════════════════════════════ */}
        <div className={`${card} p-5 sm:p-6 lg:col-span-2`}>

          {/* Table header + search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-600 dark:text-indigo-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
              </div>
              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                ລາຍການໃນສາງ
              </span>
            </div>
            {/* Search */}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ຄົ້ນຫາສິນຄ້າ..."
                className="h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-violet-400 transition-colors w-48"
              />
            </div>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'ທັງໝົດ', value: `${stocks.length} ລາຍການ`, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
              { label: 'ຈຳນວນລວມ', value: `${totalItems.toLocaleString()} ຊິ້ນ`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
              { label: 'ມູນຄ່າສາງ', value: `${totalValue.toLocaleString()} ກີບ`, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">{s.label}</p>
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          {listLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {search ? 'ບໍ່ພົບສິນຄ້າທີ່ຄົ້ນຫາ' : 'ຍັງບໍ່ມີສິນຄ້າໃນສາງ'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {!search && 'ເພີ່ມສິນຄ້າດ້ວຍຟອມດ້ານຊ້າຍ'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/8 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 px-2">ຮູບ</th>
                    <th className="pb-3 px-2">ຊື່ສິນຄ້າ</th>
                    <th className="pb-3 px-2 text-center">ຈຳນວນ</th>
                    <th className="pb-3 px-2">ລາຄາຂາຍ</th>
                    <th className="pb-3 px-2 hidden md:table-cell">ທຶນ</th>
                    <th className="pb-3 px-2 hidden lg:table-cell">ໝາຍເຫດ</th>
                    <th className="pb-3 px-2 text-center">ຈັດການ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {filtered.map(item => {
                    const qtyColor = item.quantity === 0
                      ? 'text-rose-500 dark:text-rose-400'
                      : item.quantity <= 5
                      ? 'text-amber-500 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400';

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] ${deletingId === item.id ? 'opacity-50' : ''}`}
                      >
                        {/* Image */}
                        <td className="py-3 px-2">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 relative shrink-0">
                            {item.imageUrl?.startsWith('http') ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.itemName}
                                fill
                                className="object-cover"
                                sizes="48px"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzk0YTNiOCIgZD0iTTIwIDRINGMtMS4xIDAtMiAuOS0yIDJ2MTJjMCAxLjEuOSAyIDIgMmgxNmMxLjEgMCAyLS45IDItMlY2YzAtMS4xLS45LTItMi0yek04LjUgMTMuNWwtMi41IDMuMDFMMTEgMThsMyA0IDQtNUgyMGwtMTEuNS0zLjV6Ii8+PC9zdmc+';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xl">
                                📦
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Name */}
                        <td className="py-3 px-2">
                          <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">{item.itemName}</p>
                        </td>

                        {/* Quantity controls */}
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => updateQty(item.id, item.quantity, -1)}
                              className={`${iconBtn} bg-slate-100 dark:bg-white/8 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400`}
                            >−</button>
                            <span className={`w-10 text-center text-sm font-bold tabular-nums ${qtyColor}`}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQty(item.id, item.quantity, 1)}
                              className={`${iconBtn} bg-slate-100 dark:bg-white/8 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400`}
                            >+</button>
                          </div>
                        </td>

                        {/* Selling price */}
                        <td className="py-3 px-2">
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {item.sellingPrice.toLocaleString()}
                          </span>
                        </td>

                        {/* Cost */}
                        <td className="py-3 px-2 hidden md:table-cell">
                          <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                            {item.costPrice ? item.costPrice.toLocaleString() : '—'}
                          </span>
                        </td>

                        {/* Notes */}
                        <td className="py-3 px-2 hidden lg:table-cell max-w-[140px]">
                          <span className="text-xs text-slate-400 truncate block">{item.notes || '—'}</span>
                        </td>

                        {/* Delete */}
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className={`${iconBtn} bg-slate-100 dark:bg-white/8 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 mx-auto`}
                            title="ລຶບສິນຄ້ານີ້"
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

          {/* Low-stock warning */}
          {lowStock > 0 && (
            <div className="mt-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <span className="text-amber-500 text-lg shrink-0">⚠️</span>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                ມີ <strong>{lowStock} ລາຍການ</strong> ທີ່ຈຳນວນສາງໃກ້ຈະໝົດ (≤5 ຊິ້ນ) ກະລຸນາຕື່ມສາງ
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}