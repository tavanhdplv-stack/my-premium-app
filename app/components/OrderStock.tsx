'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/firebase';
import {
    collection, addDoc, serverTimestamp,
    onSnapshot, updateDoc, deleteDoc, doc,
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import {
    PlusIcon, PencilIcon, TrashIcon,
    MagnifyingGlassIcon, XMarkIcon,
    PhotoIcon, ArrowUpTrayIcon,
    CheckCircleIcon, ExclamationTriangleIcon,
    ShoppingBagIcon, CubeIcon,
    CurrencyDollarIcon, DocumentTextIcon,
    MinusIcon, PlusIcon as PlusIconSmall,
    EyeIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import imageCompression from 'browser-image-compression';
import { uploadImageDirect } from '@/app/lib/uploadImage';

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

// ── Animation variants ────────────────────────────────────────────────
const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.06,
            delayChildren: 0.1
        }
    }
};

const cardHover: any = {
    rest: { scale: 1, boxShadow: '0 10px 35px rgba(0,0,0,0.06)' },
    hover: { scale: 1.01, boxShadow: '0 20px 55px rgba(0,0,0,0.10)', transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

const itemRowVariants: any = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.25 } }
};

// ── Design tokens ──────────────────────────────────────────────────────
const card = 'relative overflow-hidden bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/40 dark:border-white/8 rounded-[28px] shadow-[0_10px_35px_rgba(0,0,0,0.06)] hover:shadow-[0_18px_55px_rgba(0,0,0,0.10)] transition-shadow duration-500';

const inputCls = 'w-full h-11 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/70 dark:border-white/10 rounded-[18px] px-4 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400/70 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-slate-800/90 focus:border-teal-400 dark:focus:border-teal-500 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]';

const labelCls = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em] mb-1.5';

const primaryBtn = 'relative inline-flex items-center justify-center gap-2.5 h-11 px-6 rounded-[20px] bg-gradient-to-br from-teal-600 to-emerald-600 text-white text-sm font-bold shadow-[0_8px_25px_rgba(15,118,110,0.30)] hover:shadow-[0_12px_35px_rgba(15,118,110,0.40)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:-translate-y-0 overflow-hidden group';

const secondaryBtn = 'relative inline-flex items-center justify-center gap-2.5 h-11 px-6 rounded-[20px] bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-200 dark:hover:bg-white/15 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300';

const iconBtn = 'relative w-9 h-9 rounded-[14px] flex items-center justify-center text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95';

// ── Stat Card ──────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
    const colorMap: Record<string, string> = {
        teal: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400',
        emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
        rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
        indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
    };

    return (
        <motion.div
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="bg-white/70 dark:bg-slate-800/40 backdrop-blur-sm rounded-[24px] p-4 border border-white/60 dark:border-white/6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
        >
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-[16px] flex items-center justify-center shrink-0 ${colorMap[color] || colorMap.teal}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white leading-tight">{value}</p>
                </div>
            </div>
        </motion.div>
    );
}

// ── Main Component ──────────────────────────────────────────────────
export default function OrderStock() {
    // ── Form state ──────────────────────────────────────────────────────
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [notes, setNotes] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const [imageSizeOption, setImageSizeOption] = useState<'small' | 'medium' | 'large'>('medium');
    const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // ── List state ──────────────────────────────────────────────────────
    const [stocks, setStocks] = useState<StockItem[]>([]);
    const [listLoading, setListLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isFormExpanded, setIsFormExpanded] = useState(true);

    // Revoke object URL on unmount / change
    useEffect(() => {
        return () => { if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl); };
    }, [imagePreviewUrl]);

    // Close preview modal on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewModalUrl(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Real-time Firestore listener
    useEffect(() => {
        const q = collection(db, 'stocks');
        const unsub = onSnapshot(
            q,
            (snap) => {
                const docs = snap.docs.map(d => {
                    const ddata = d.data();
                    const createdAt = ddata.createdAt as { seconds?: number } | null;
                    const createdAtVal = createdAt?.seconds ? createdAt.seconds * 1000 : (ddata.createdAtClient as number || Date.now());
                    return {
                        id: d.id,
                        itemName: ddata.itemName || '',
                        quantity: typeof ddata.quantity === 'number' ? ddata.quantity : 0,
                        costPrice: typeof ddata.costPrice === 'number' ? ddata.costPrice : 0,
                        sellingPrice: typeof ddata.sellingPrice === 'number' ? ddata.sellingPrice : 0,
                        imageUrl: ddata.imageUrl || '',
                        notes: ddata.notes || '',
                        __createdAtVal: createdAtVal,
                    } as StockItem & { __createdAtVal: number };
                });
                docs.sort((a, b) => (b as StockItem & { __createdAtVal: number }).__createdAtVal - (a as StockItem & { __createdAtVal: number }).__createdAtVal);
                setStocks(docs as StockItem[]);
                setListLoading(false);
            },
            (err) => {
                if (process.env.NODE_ENV !== 'production') console.error('[OrderStock] snapshot error:', err);
                setListLoading(false);
            }
        );
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

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragActive(false);
        if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]);
    };

    // ── Upload to Cloudinary via API route ─────────────────────────────
    const uploadImage = async (file: File): Promise<string> => {
        setUploadProgress(10);
        try {
            const url = await uploadImageDirect(file);
            setUploadProgress(100);
            return url;
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ');
        }
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
            let finalImageUrl = editingId ? stocks.find(s => s.id === editingId)?.imageUrl || '' : '';
            if (imageFile) {
                finalImageUrl = await uploadImage(imageFile);
            }

            if (editingId) {
                await updateDoc(doc(db, 'stocks', editingId), {
                    itemName: itemName.trim(),
                    quantity: Number(quantity),
                    costPrice: costPrice ? Number(costPrice) : 0,
                    sellingPrice: Number(sellingPrice),
                    imageUrl: finalImageUrl,
                    notes: notes.trim(),
                });
                setMessage({ type: 'success', text: '✅ ແກ້ໄຂຂໍ້ມູນສິນຄ້າສຳເລັດແລ້ວ!' });
            } else {
                await addDoc(collection(db, 'stocks'), {
                    itemName: itemName.trim(),
                    quantity: Number(quantity),
                    costPrice: costPrice ? Number(costPrice) : 0,
                    sellingPrice: Number(sellingPrice),
                    imageUrl: finalImageUrl,
                    notes: notes.trim(),
                    createdAt: serverTimestamp(),
                    createdAtClient: Date.now(),
                });
                setMessage({ type: 'success', text: '✅ ບັນທຶກສິນຄ້າເຂົ້າສາງສຳເລັດແລ້ວ!' });
            }

            resetForm();
        } catch (err) {
            if (process.env.NODE_ENV !== 'production') console.error(err);
            setMessage({ type: 'error', text: `ເກີດຂໍ້ຜິດພາດ: ${err instanceof Error ? err.message : 'ບໍ່ສາມາດບັນທຶກໄດ້'}` });
            setUploadProgress(0);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setItemName('');
        setQuantity('');
        setCostPrice('');
        setSellingPrice('');
        setNotes('');
        setImageFile(null);
        setImagePreviewUrl('');
        setUploadProgress(0);
        setImageSizeOption('medium');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsFormExpanded(true);
    };

    const handleEdit = (item: StockItem) => {
        setEditingId(item.id);
        setItemName(item.itemName);
        setQuantity(item.quantity.toString());
        setCostPrice(item.costPrice ? item.costPrice.toString() : '');
        setSellingPrice(item.sellingPrice ? item.sellingPrice.toString() : '');
        setNotes(item.notes || '');
        setImageFile(null);
        setImagePreviewUrl(item.imageUrl || '');
        setIsFormExpanded(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── Quick quantity update ───────────────────────────────────────────
    const updateQty = async (id: string, current: number, delta: number) => {
        const next = current + delta;
        if (next < 0) return;
        await updateDoc(doc(db, 'stocks', id), { quantity: next });
    };

    // ── Delete item ─────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            title: 'ລຶບສິນຄ້ານີ້?',
            text: 'ຕ້ອງການລຶບສິນຄ້ານີ້ອອກຈາກສາງແທ້ບໍ? ການກະທຳນີ້ບໍ່ສາມາດຍ້ອນກັບໄດ້!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ລຶບເລີຍ',
            cancelButtonText: 'ຍົກເລີກ',
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#94A3B8',
            background: '#ffffff',
            color: '#0F172A',
            customClass: {
                popup: 'rounded-[28px] shadow-xl',
                title: 'text-lg font-bold',
                htmlContainer: 'text-sm text-slate-500',
                confirmButton: 'rounded-[20px] px-6 py-2.5 font-bold shadow-lg shadow-rose-500/25',
                cancelButton: 'rounded-[20px] px-6 py-2.5 font-bold',
            },
        });
        if (!result.isConfirmed) return;
        setDeletingId(id);
        try { await deleteDoc(doc(db, 'stocks', id)); } catch {
            Swal.fire({
                title: 'ລຶບບໍ່ສຳເລັດ',
                text: 'ກະລຸນາລອງໃໝ່',
                icon: 'error',
                confirmButtonColor: '#EF4444',
                confirmButtonText: 'ຕົກລົງ',
                customClass: { popup: 'rounded-[28px]', confirmButton: 'rounded-[20px] px-6 py-2.5 font-bold' }
            });
        } finally { setDeletingId(null); }
    };

    // ── Filtered list ───────────────────────────────────────────────────
    const filtered = stocks.filter(s =>
        s.itemName.toLowerCase().includes(search.toLowerCase()) ||
        s.notes?.toLowerCase().includes(search.toLowerCase())
    );

    // ── Totals ──────────────────────────────────────────────────────────
    const totalItems = stocks.reduce((s, i) => s + i.quantity, 0);
    const totalValue = stocks.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
    const lowStock = stocks.filter(i => i.quantity > 0 && i.quantity <= 5).length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-8 pb-32 max-w-7xl mx-auto px-4 sm:px-6"
        >

            {/* ── Header ── */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
            >
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[20px] bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-500/20 dark:to-emerald-500/20 flex items-center justify-center shrink-0 shadow-inner">
                            <CubeIcon className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                ສາງສິນຄ້າ
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                ຈັດການສາງ · ອັບໂຫຼດຮູບ · ຕິດຕາມ real-time
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats chips */}
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="flex gap-2 flex-wrap"
                >
                    <span className="text-xs font-bold px-4 py-2 rounded-[16px] bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-500/20 shadow-sm">
                        📦 {stocks.length} ລາຍການ
                    </span>
                    <span className="text-xs font-bold px-4 py-2 rounded-[16px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-500/20 shadow-sm">
                        🏷 {totalItems.toLocaleString()} ຊິ້ນ
                    </span>
                    {lowStock > 0 && (
                        <span className="text-xs font-bold px-4 py-2 rounded-[16px] bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-500/20 shadow-sm animate-pulse">
                            ⚠️ ໃກ້ໝົດ {lowStock} ລາຍການ
                        </span>
                    )}
                </motion.div>
            </motion.div>

            {/* ── Preview Modal ── */}
            <AnimatePresence>
                {previewModalUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setPreviewModalUrl(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="max-w-[90%] max-h-[90%] p-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={previewModalUrl}
                                alt="Preview"
                                className="max-w-full max-h-[80vh] rounded-[24px] shadow-2xl"
                            />
                            <div className="mt-4 text-right">
                                <button
                                    onClick={() => setPreviewModalUrl(null)}
                                    className="px-5 py-2.5 bg-white/90 dark:bg-slate-800/90 rounded-[20px] text-sm font-bold shadow-lg hover:scale-105 transition-all"
                                >
                                    ປິດ
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* ══════════════════════════════════
                    LEFT — Add Stock Form
                ══════════════════════════════════ */}
                <motion.div
                    layout
                    className={`${card} p-6 sm:p-7 lg:sticky lg:top-4`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    {/* Form header with toggle */}
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-[16px] bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-500/20 dark:to-emerald-500/20 flex items-center justify-center shrink-0">
                                {editingId ? (
                                    <PencilIcon className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
                                ) : (
                                    <PlusIcon className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
                                )}
                            </div>
                            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-[0.06em]">
                                {editingId ? 'ແກ້ໄຂສິນຄ້າ' : 'ເພີ່ມສິນຄ້າໃໝ່'}
                            </span>
                            {editingId && (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                    ແກ້ໄຂ
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsFormExpanded(!isFormExpanded)}
                            className="w-8 h-8 rounded-[12px] bg-slate-100 dark:bg-white/8 hover:bg-slate-200 dark:hover:bg-white/15 flex items-center justify-center transition-colors"
                        >
                            <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isFormExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    <AnimatePresence>
                        {isFormExpanded && (
                            <motion.form
                                ref={formRef}
                                onSubmit={handleAddStock}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                className="space-y-4 overflow-hidden"
                            >

                                {/* Item Name */}
                                <div>
                                    <label className={labelCls}>
                                        ຊື່ສິນຄ້າ <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={itemName}
                                        onChange={e => setItemName(e.target.value)}
                                        placeholder="ເຊັ່ນ: ເສື້ອຍືດພິມລາຍ ເບີ M"
                                        className={inputCls}
                                        disabled={loading}
                                    />
                                </div>

                                {/* Image Upload Zone */}
                                <div>
                                    <label className={labelCls}>ຮູບສິນຄ້າ</label>
                                    <motion.div
                                        whileHover={{ scale: 1.005 }}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`relative rounded-[24px] border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden
                                            ${dragActive
                                                ? 'border-teal-400 bg-teal-50 dark:bg-teal-500/10 scale-[1.01] shadow-[0_0_0_8px_rgba(20,184,166,0.08)]'
                                                : imagePreviewUrl
                                                    ? 'border-emerald-400/50 bg-emerald-50/50 dark:bg-emerald-500/5'
                                                    : 'border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30 hover:border-teal-300 dark:hover:border-teal-500/40 hover:bg-teal-50/30 dark:hover:bg-teal-500/5'
                                            }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            id="product-image"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => { if (e.target.files?.[0]) handleFileSelection(e.target.files[0]); }}
                                            disabled={loading}
                                        />

                                        {imagePreviewUrl ? (
                                            <div className="relative">
                                                <img
                                                    src={imagePreviewUrl}
                                                    alt="preview"
                                                    className="w-full h-48 object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                                                <button
                                                    type="button"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        URL.revokeObjectURL(imagePreviewUrl);
                                                        setImageFile(null);
                                                        setImagePreviewUrl('');
                                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                                    }}
                                                    className="absolute top-3 right-3 w-8 h-8 rounded-[14px] bg-black/50 hover:bg-rose-600 text-white text-xs flex items-center justify-center transition-colors backdrop-blur-sm"
                                                >
                                                    <XMarkIcon className="w-4 h-4" />
                                                </button>
                                                <p className="absolute bottom-3 left-3 text-white text-xs font-medium drop-shadow-lg">
                                                    {imageFile?.name}
                                                </p>
                                                <div className="absolute top-3 left-3 flex items-center gap-2">
                                                    <select
                                                        value={imageSizeOption}
                                                        onChange={e => setImageSizeOption(e.target.value as any)}
                                                        className="text-xs bg-white/90 dark:bg-slate-800/90 rounded-[12px] px-3 py-1.5 font-medium border-0 shadow-md"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="small">Small</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="large">Large</option>
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation();
                                                            setPreviewModalUrl(imagePreviewUrl); }}
                                                        className="text-xs bg-white/90 dark:bg-slate-800/90 rounded-[12px] px-3 py-1.5 font-medium shadow-md flex items-center gap-1.5"
                                                    >
                                                        <EyeIcon className="w-3.5 h-3.5" /> ຂະຫຍາຍ
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
                                                <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-500/20 dark:to-emerald-500/20 flex items-center justify-center mb-1">
                                                    <PhotoIcon className="w-7 h-7 text-teal-600 dark:text-teal-400" />
                                                </div>
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    ລາກວາງ ຫຼື ຄລິກເພື່ອເລືອກຮູບ
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    JPG · PNG · WEBP · ສູງສຸດ 5MB
                                                </p>
                                            </div>
                                        )}
                                    </motion.div>

                                    {/* Upload progress bar */}
                                    {loading && uploadProgress > 0 && uploadProgress < 100 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-3"
                                        >
                                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                                <span className="font-medium">ກຳລັງອັບໂຫຼດຮູບ...</span>
                                                <span className="font-bold text-teal-600 dark:text-teal-400">{uploadProgress}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${uploadProgress}%` }}
                                                    transition={{ duration: 0.3 }}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Quantity & Cost */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelCls}>
                                            ຈຳນວນ <span className="text-rose-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={quantity ? String(quantity).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                                            onChange={e => {
                                                const raw = e.target.value.replace(/,/g, '');
                                                if (/^-?\d*\.?\d*$/.test(raw)) setQuantity(raw);
                                            }}
                                            placeholder="0"
                                            className={inputCls}
                                            disabled={loading}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>ທຶນ (ຖ້າມີ)</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={costPrice ? String(costPrice).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                                            onChange={e => {
                                                const raw = e.target.value.replace(/,/g, '');
                                                if (/^-?\d*\.?\d*$/.test(raw)) setCostPrice(raw);
                                            }}
                                            placeholder="0"
                                            className={inputCls}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* Selling Price */}
                                <div>
                                    <label className={labelCls}>
                                        ລາຄາຂາຍ <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={sellingPrice ? String(sellingPrice).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                                        onChange={e => {
                                            const raw = e.target.value.replace(/,/g, '');
                                            if (/^-?\d*\.?\d*$/.test(raw)) setSellingPrice(raw);
                                        }}
                                        placeholder="0"
                                        className={inputCls}
                                        disabled={loading}
                                    />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className={labelCls}>ໝາຍເຫດ</label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="ສີ, ແຫຼ່ງນຳເຂົ້າ, 1688..."
                                        className={inputCls}
                                        disabled={loading}
                                    />
                                </div>

                                {/* Message */}
                                <AnimatePresence>
                                    {message.text && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className={`p-3.5 rounded-[18px] text-sm font-medium border flex items-center gap-2.5 ${
                                                message.type === 'success'
                                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20'
                                                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-500/20'
                                            }`}
                                        >
                                            {message.type === 'success' ? (
                                                <CheckCircleIcon className="w-5 h-5 shrink-0" />
                                            ) : (
                                                <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
                                            )}
                                            {message.text}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Submit & Cancel */}
                                <div className="flex gap-3 pt-1">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`${primaryBtn} flex-1 min-h-[48px]`}
                                    >
                                        {loading ? (
                                            <>
                                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                {uploadProgress > 0 ? `ອັບໂຫຼດ ${uploadProgress}%...` : 'ກຳລັງບັນທຶກ...'}
                                            </>
                                        ) : (
                                            <>
                                                {editingId ? (
                                                    <>
                                                        <PencilIcon className="w-4 h-4" />
                                                        ບັນທຶກການແກ້ໄຂ
                                                    </>
                                                ) : (
                                                    <>
                                                        <PlusIcon className="w-4 h-4" />
                                                        ບັນທຶກເຂົ້າສາງ
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </button>
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className={`${secondaryBtn} min-h-[48px]`}
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                            ຍົກເລີກ
                                        </button>
                                    )}
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ══════════════════════════════════
                    RIGHT — Stock Table
                ══════════════════════════════════ */}
                <motion.div
                    className={`${card} p-6 sm:p-7 lg:col-span-2`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                >
                    {/* Table header + search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-[16px] bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-500/20 dark:to-violet-500/20 flex items-center justify-center shrink-0">
                                <ShoppingBagIcon className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-[0.06em]">
                                ລາຍການໃນສາງ
                            </span>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/8 text-slate-500 dark:text-slate-400">
                                {filtered.length} ລາຍການ
                            </span>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400/70 pointer-events-none" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="ຄົ້ນຫາສິນຄ້າ..."
                                className="h-10 pl-10 pr-4 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/70 dark:border-white/8 rounded-[18px] text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400/70 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-slate-800/90 focus:border-teal-400 dark:focus:border-teal-500 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.10)] w-full sm:w-52"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                                >
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats Row */}
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-3 gap-3 mb-6"
                    >
                        <StatCard icon={ShoppingBagIcon} label="ທັງໝົດ" value={`${stocks.length} ລາຍການ`} color="teal" />
                        <StatCard icon={CubeIcon} label="ຈຳນວນລວມ" value={`${totalItems.toLocaleString()} ຊິ້ນ`} color="emerald" />
                        <StatCard icon={CurrencyDollarIcon} label="ມູນຄ່າສາງ" value={`${totalValue.toLocaleString()} ກີບ`} color="indigo" />
                    </motion.div>

                    {/* Table */}
                    {listLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 rounded-[20px] bg-slate-100 dark:bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20"
                        >
                            <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/60 dark:to-slate-700/60 flex items-center justify-center mx-auto mb-4">
                                <ShoppingBagIcon className="w-10 h-10 text-slate-400" />
                            </div>
                            <p className="text-base font-bold text-slate-600 dark:text-slate-300">
                                {search ? 'ບໍ່ພົບສິນຄ້າທີ່ຄົ້ນຫາ' : 'ຍັງບໍ່ມີສິນຄ້າໃນສາງ'}
                            </p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                                {!search && 'ເພີ່ມສິນຄ້າດ້ວຍຟອມດ້ານຊ້າຍ'}
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            variants={staggerContainer}
                            initial="initial"
                            animate="animate"
                            className="overflow-x-auto -mx-1"
                        >
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-white/6 text-[11px] font-bold text-slate-400 uppercase tracking-[0.06em]">
                                        <th className="pb-4 px-2">ຮູບ</th>
                                        <th className="pb-4 px-2">ຊື່ສິນຄ້າ</th>
                                        <th className="pb-4 px-2 text-center">ຈຳນວນ</th>
                                        <th className="pb-4 px-2">ລາຄາຂາຍ</th>
                                        <th className="pb-4 px-2 hidden md:table-cell">ທຶນ</th>
                                        <th className="pb-4 px-2 hidden lg:table-cell">ໝາຍເຫດ</th>
                                        <th className="pb-4 px-2 text-center">ຈັດການ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-white/4">
                                    <AnimatePresence mode="popLayout">
                                        {filtered.map(item => {
                                            const qtyColor = item.quantity === 0
                                                ? 'text-rose-500 dark:text-rose-400'
                                                : item.quantity <= 5
                                                    ? 'text-amber-500 dark:text-amber-400'
                                                    : 'text-emerald-600 dark:text-emerald-400';

                                            return (
                                                <motion.tr
                                                    key={item.id}
                                                    variants={itemRowVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit="exit"
                                                    layout
                                                    className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.03] ${deletingId === item.id ? 'opacity-40 pointer-events-none' : ''}`}
                                                >
                                                    {/* Image */}
                                                    <td className="py-3 px-2">
                                                        <motion.div
                                                            whileHover={{ scale: 1.05 }}
                                                            className="w-14 h-14 rounded-[18px] overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-white/8 relative shrink-0 cursor-pointer shadow-sm hover:shadow-md transition-all"
                                                            onClick={() => item.imageUrl?.startsWith('http') && setPreviewModalUrl(item.imageUrl)}
                                                        >
                                                            {item.imageUrl?.startsWith('http') ? (
                                                                <Image
                                                                    src={item.imageUrl}
                                                                    alt={item.itemName}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="56px"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src =
                                                                            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzk0YTNiOCIgZD0iTTIwIDRINGMtMS4xIDAtMiAuOS0yIDJ2MTJjMCAxLjEuOSAyIDIgMmgxNmMxLjEgMCAyLS45IDItMlY2YzAtMS4xLS45LTItMi0yek04LjUgMTMuNWwtMi41IDMuMDFMMTEgMThsMyA0IDQtNUgyMGwtMTEuNS0zLjV6Ii8+PC9zdmc+';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-2xl">
                                                                    📦
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    </td>

                                                    {/* Name */}
                                                    <td className="py-3 px-2">
                                                        <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                                                            {item.itemName}
                                                        </p>
                                                    </td>

                                                    {/* Quantity controls */}
                                                    <td className="py-3 px-2">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => updateQty(item.id, item.quantity, -1)}
                                                                className={`${iconBtn} bg-slate-100 dark:bg-white/6 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400`}
                                                            >
                                                                <MinusIcon className="w-3.5 h-3.5" />
                                                            </motion.button>
                                                            <span className={`w-10 text-center text-sm font-bold tabular-nums ${qtyColor}`}>
                                                                {item.quantity}
                                                            </span>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => updateQty(item.id, item.quantity, 1)}
                                                                className={`${iconBtn} bg-slate-100 dark:bg-white/6 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400`}
                                                            >
                                                                <PlusIconSmall className="w-3.5 h-3.5" />
                                                            </motion.button>
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
                                                        <span className="text-xs text-slate-400 truncate block">
                                                            {item.notes || '—'}
                                                        </span>
                                                    </td>

                                                    {/* Manage */}
                                                    <td className="py-3 px-2 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleEdit(item)}
                                                                className={`${iconBtn} bg-slate-100 dark:bg-white/6 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400`}
                                                                title="ແກ້ໄຂສິນຄ້າ"
                                                            >
                                                                <PencilIcon className="w-3.5 h-3.5" />
                                                            </motion.button>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleDelete(item.id)}
                                                                disabled={deletingId === item.id}
                                                                className={`${iconBtn} bg-slate-100 dark:bg-white/6 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-40`}
                                                                title="ລຶບສິນຄ້ານີ້"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </motion.button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </motion.div>
                    )}

                    {/* Low-stock warning */}
                    <AnimatePresence>
                        {lowStock > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="mt-5 flex items-center gap-3 p-4 rounded-[20px] bg-amber-50/80 dark:bg-amber-500/8 border border-amber-200/60 dark:border-amber-500/20 backdrop-blur-sm"
                            >
                                <div className="w-9 h-9 rounded-[14px] bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                    ມີ <strong className="font-bold">{lowStock} ລາຍການ</strong> ທີ່ຈຳນວນສາງໃກ້ຈະໝົດ (≤5 ຊິ້ນ) ກະລຸນາຕື່ມສາງ
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

            </div>
        </motion.div>
    );
}