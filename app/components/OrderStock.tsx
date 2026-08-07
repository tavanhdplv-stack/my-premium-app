'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/app/lib/supabase';
import { uploadImageDirect } from '@/app/lib/uploadImage';
import { ImageGalleryModal } from './ImageGalleryModal';
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
    status?: 'Ordering' | 'InStock';
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
    const [status, setStatus] = useState<'Ordering' | 'InStock'>('InStock');
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

    // Real-time Supabase listener
    const fetchStocks = useCallback(async () => {
        const { data, error } = await supabase.from('stocks').select('*');
            if (data && !error) {
                const arr = data.map((d: any) => {
                    const createdAtVal = d.created_at ? new Date(d.created_at).getTime() : (d.created_at_client || Date.now());
                    
                    let rawNotes = d.notes || '';
                    let status: 'Ordering' | 'InStock' = 'InStock';
                    if (rawNotes.startsWith('#ORDERING#')) {
                        status = 'Ordering';
                        rawNotes = rawNotes.replace('#ORDERING#', '').trim();
                    } else if (rawNotes.startsWith('#INSTOCK#')) {
                        status = 'InStock';
                        rawNotes = rawNotes.replace('#INSTOCK#', '').trim();
                    }

                    return {
                        id: d.id,
                        itemName: d.itemName || d.item_name || '',
                        quantity: typeof d.quantity === 'number' ? d.quantity : 0,
                        costPrice: typeof d.costPrice === 'number' ? d.costPrice : (d.cost_price || 0),
                        sellingPrice: typeof d.sellingPrice === 'number' ? d.sellingPrice : (d.selling_price || 0),
                        imageUrl: d.imageUrl || d.image_url || '',
                        notes: rawNotes,
                        status: status,
                        __createdAtVal: createdAtVal,
                    } as StockItem & { __createdAtVal: number };
                });
                arr.sort((a, b) => b.__createdAtVal - a.__createdAtVal);
                setStocks(arr);
                setListLoading(false);
            } else {
                if (process.env.NODE_ENV !== 'production') console.error('[OrderStock] fetch error:', error);
                setListLoading(false);
            }
    }, []);

    // Real-time Supabase listener
    useEffect(() => {
        fetchStocks();

        const channel = supabase
            .channel('stocks_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stocks' }, () => {
                fetchStocks();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchStocks]);

    // Handle Esc to close inline preview modal
    useEffect(() => {
        if (!previewModalUrl) return;
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewModalUrl(null); };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
        return () => { 
            window.removeEventListener('keydown', handleEsc); 
            document.body.style.overflow = '';
        };
    }, [previewModalUrl]);

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
        } catch (error: any) {
            throw new Error(error.message || 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ');
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
                const { error } = await supabase.from('stocks').update({
                    quantity: Number(quantity),
                    notes: (status === 'Ordering' ? '#ORDERING# ' : '#INSTOCK# ') + notes.trim(),
                    item_name: itemName.trim(),
                    cost_price: costPrice ? Number(costPrice) : 0,
                    selling_price: Number(sellingPrice),
                    image_url: finalImageUrl
                }).eq('id', editingId);
                
                if (error) throw error;
                setMessage({ type: 'success', text: '✅ ແກ້ໄຂຂໍ້ມູນສິນຄ້າສຳເລັດແລ້ວ!' });
            } else {
                const { error } = await supabase.from('stocks').insert({
                    quantity: Number(quantity),
                    notes: (status === 'Ordering' ? '#ORDERING# ' : '#INSTOCK# ') + notes.trim(),
                    item_name: itemName.trim(),
                    cost_price: costPrice ? Number(costPrice) : 0,
                    selling_price: Number(sellingPrice),
                    image_url: finalImageUrl,
                    created_at: new Date().toISOString()
                });
                
                if (error) throw error;

                // --- Deduct from Company Wallet ---
                if (costPrice && Number(costPrice) > 0) {
                    const totalCost = Number(costPrice) * Number(quantity);
                    const { data: compWallet } = await supabase.from('wallets').select('id').eq('type', 'W-COMP').limit(1).single();
                    if (compWallet) {
                        await supabase.from('transactions').insert({
                            wallet_id: compWallet.id,
                            type: 'expense',
                            amount: totalCost,
                            notes: `ຊື້ສິນຄ້າເຂົ້າສາງ: ${itemName.trim()} (${quantity} ອັນ)`,
                            date: new Date().toISOString()
                        });
                    }
                }
                // ----------------------------------
                setMessage({ type: 'success', text: '✅ ບັນທຶກສິນຄ້າເຂົ້າສາງສຳເລັດແລ້ວ!' });
            }

            resetForm();
            fetchStocks(); // <-- explicitly fetch
        } catch (err: any) {
            if (process.env.NODE_ENV !== 'production') console.error(err);
            setMessage({ type: 'error', text: `ເກີດຂໍ້ຜິດພາດ: ${err?.message || 'ບໍ່ສາມາດບັນທຶກໄດ້'}` });
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
        setStatus('InStock');
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
        setStatus(item.status || 'InStock');
        setImageFile(null);
        setImagePreviewUrl(item.imageUrl || '');
        setIsFormExpanded(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── Quick quantity update ───────────────────────────────────────────
    const updateQty = async (item: StockItem, delta: number) => {
        const next = item.quantity + delta;
        if (next < 0) return;
        
        try {
            const { error } = await supabase.from('stocks').update({ quantity: next }).eq('id', item.id);
            if (error) throw error;

            // --- Auto Deduct from Company Wallet if increasing quantity ---
            if (delta > 0 && item.costPrice && Number(item.costPrice) > 0) {
                const totalCost = Number(item.costPrice) * delta;
                const { data: compWallet } = await supabase.from('wallets').select('id').eq('type', 'W-COMP').limit(1).single();
                if (compWallet) {
                    await supabase.from('transactions').insert({
                        wallet_id: compWallet.id,
                        type: 'expense',
                        amount: totalCost,
                        notes: `ຕື່ມສິນຄ້າເຂົ້າສາງ: ${item.itemName.trim()} (+${delta} ອັນ)`,
                        date: new Date().toISOString()
                    });
                }
            }

            fetchStocks(); // update UI instantly
        } catch (err: any) {
            console.error('Failed to update qty:', err);
        }
    };

    // Quick status update
    const updateStatus = async (item: StockItem, newStatus: 'Ordering' | 'InStock') => {
        const updatedNotes = (newStatus === 'Ordering' ? '#ORDERING# ' : '#INSTOCK# ') + (item.notes || '').trim();
        const { error } = await supabase.from('stocks').update({ notes: updatedNotes }).eq('id', item.id);
        if (!error) {
            fetchStocks();
        }
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
        try { 
            await supabase.from('stocks').delete().eq('id', id); 
            fetchStocks();
        } catch {
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
    //  Totals 
    const stockStats = {
        total: stocks.length,
        totalItems: stocks.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: stocks.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0),
        totalCost: stocks.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0),
        expectedProfit: stocks.reduce((sum, item) => sum + (item.sellingPrice - (item.costPrice || 0)) * item.quantity, 0),
        lowStock: stocks.filter(s => s.quantity > 0 && s.quantity <= 5),
        outOfStock: stocks.filter(s => s.quantity === 0),
        maxQty: Math.max(...stocks.map(s => s.quantity), 1)
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-8 pb-8 max-w-7xl mx-auto px-4 sm:px-6"
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
                        🏷 {stockStats.totalItems.toLocaleString()} ຊິ້ນ
                    </span>
                    {stockStats.lowStock.length > 0 && (
                        <span className="text-xs font-bold px-4 py-2 rounded-[16px] bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-500/20 shadow-sm animate-pulse">
                            ⚠️ ໃກ້ໝົດ {stockStats.lowStock.length} ລາຍການ
                        </span>
                    )}
                </motion.div>
            </motion.div>

            {/* ── Preview Modal ── */}
            <ImageGalleryModal
                isOpen={!!previewModalUrl}
                onClose={() => setPreviewModalUrl(null)}
                images={previewModalUrl ? [{ url: previewModalUrl, title: 'ຮູບພາບສິນຄ້າ' }] : []}
            />

            {/* ── Stock Status Widget (Moved from Dashboard) ── */}
            <div className="bg-white/70 dark:bg-slate-800/40 backdrop-blur-sm rounded-[24px] p-5 sm:p-7 border border-white/60 dark:border-white/6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3 text-lg font-bold text-slate-800 dark:text-white">
                        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                            </svg>
                        </span>
                        ສະຖານະສາງສິນຄ້າ
                    </div>
                </div>

                {stocks.length === 0 ? (
                    <div className="py-10 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1} stroke="currentColor" className="w-7 h-7 text-slate-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                            </svg>
                        </div>
                        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">ຍັງບໍ່ມີສິນຄ້າໃນສາງ</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                            {[
                                {
                                    label: 'ສິນຄ້າທັງໝົດ',
                                    value: stockStats.total + ' ລາຍການ',
                                    sub: stockStats.totalItems.toLocaleString() + ' ຊິ້ນ',
                                    bg: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20',
                                    text: 'text-violet-700 dark:text-violet-300',
                                    icon: (
                                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                                        </svg>
                                    ),
                                },
                                {
                                    label: 'ມູນຄ່າຂາຍລວມ',
                                    value: stockStats.totalValue.toLocaleString() + ' ₭',
                                    sub: 'ລາຄາຂາຍ × ຈຳນວນ',
                                    bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
                                    text: 'text-emerald-700 dark:text-emerald-300',
                                    icon: (
                                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                                        </svg>
                                    ),
                                },
                                {
                                    label: 'ຕົ້ນທຶນລວມ (ຈົມ)',
                                    value: stockStats.totalCost.toLocaleString() + ' ₭',
                                    sub: 'ຕົ້ນທຶນ × ຈຳນວນ',
                                    bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20',
                                    text: 'text-rose-700 dark:text-rose-300',
                                    icon: (
                                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25H9m6 3H9m3 6l-3-3h1.5a3 3 0 100-6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ),
                                },
                                {
                                    label: 'ຄາດການກຳໄລ',
                                    value: stockStats.expectedProfit.toLocaleString() + ' ₭',
                                    sub: 'ມູນຄ່າ - ຕົ້ນທຶນ',
                                    bg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
                                    text: 'text-indigo-700 dark:text-indigo-300',
                                    icon: (
                                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                                        </svg>
                                    ),
                                },
                                {
                                    label: 'ໃກ້ຈະໝົດ',
                                    value: stockStats.lowStock.length + ' ລາຍການ',
                                    sub: '≤ 5 ຊິ້ນ',
                                    bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
                                    text: 'text-amber-700 dark:text-amber-300',
                                    icon: (
                                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                        </svg>
                                    ),
                                },
                                {
                                    label: 'ໝົດສາງ',
                                    value: stockStats.outOfStock.length + ' ລາຍການ',
                                    sub: 'ຈຳນວນ = 0',
                                    bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
                                    text: 'text-slate-700 dark:text-slate-300',
                                    icon: (
                                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                        </svg>
                                    ),
                                },
                            ].map((s) => (
                                <div key={s.label} className={`rounded-xl p-4 border flex flex-col xl:flex-row xl:items-start gap-3 ${s.bg}`}>
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white/60 dark:bg-black/20 ${s.text}`}>
                                        {s.icon}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{s.label}</p>
                                        <p className={`text-base font-extrabold tabular-nums leading-tight ${s.text} truncate`}>{s.value}</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{s.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {[...stocks]
                                .sort((a, b) => a.quantity - b.quantity)
                                .slice(0, 10)
                                .map((item) => {
                                    const pct = Math.min((item.quantity / stockStats.maxQty) * 100, 100);
                                    const isOut = item.quantity === 0;
                                    const isLow = item.quantity > 0 && item.quantity <= 5;
                                    const barColor = isOut
                                        ? 'bg-rose-500'
                                        : isLow
                                        ? 'bg-amber-400'
                                        : 'bg-emerald-500';
                                    const qtyColor = isOut
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : isLow
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-emerald-600 dark:text-emerald-400';
                                    return (
                                        <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0 relative">
                                                {item.imageUrl?.startsWith('http') ? (
                                                    <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">📦</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{item.itemName}</span>
                                                    <span className={`text-sm font-extrabold tabular-nums shrink-0 ${qtyColor}`}>
                                                        {item.quantity.toLocaleString()} ຊິ້ນ
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/8 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                                        style={{ width: isOut ? '100%' : `${pct}%`, opacity: isOut ? 0.4 : 1 }}
                                                    />
                                                </div>
                                            </div>
                                            {isOut ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 shrink-0">ໝົດ</span>
                                            ) : isLow ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 shrink-0 animate-pulse">ໃກ້ໝົດ</span>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            {stocks.length > 10 && (
                                <p className="text-center text-xs text-slate-400 dark:text-slate-500 pt-2">
                                    ສະແດງ 10 ລາຍການທຳອິດ (ຈາກ {stocks.length} ທັງໝົດ)
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>

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
                                            value={quantity ? (() => {
                                              const str = String(quantity);
                                              const parts = str.split('.');
                                              parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                              return parts.join('.');
                                            })() : ''}
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
                                            value={costPrice ? (() => {
                                              const str = String(costPrice);
                                              const parts = str.split('.');
                                              parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                              return parts.join('.');
                                            })() : ''}
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
                                        value={sellingPrice ? (() => {
                                          const str = String(sellingPrice);
                                          const parts = str.split('.');
                                          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                          return parts.join('.');
                                        })() : ''}
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

                                {/* Status */}
                                <div>
                                    <label className={labelCls}>ສະຖານະ</label>
                                    <select
                                        value={status}
                                        onChange={e => setStatus(e.target.value as 'Ordering' | 'InStock')}
                                        className={inputCls}
                                        disabled={loading}
                                    >
                                        <option value="InStock">ເຄື່ອງເຂົ້າແລ້ວ</option>
                                        <option value="Ordering">ກຳລັງສັ່ງເຄື່ອງ</option>
                                    </select>
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
                        <StatCard icon={CubeIcon} label="ຈຳນວນລວມ" value={`${stockStats.totalItems.toLocaleString()} ຊິ້ນ`} color="emerald" />
                        <StatCard icon={CurrencyDollarIcon} label="ມູນຄ່າສາງ" value={`${stockStats.totalValue.toLocaleString()} ກີບ`} color="indigo" />
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
                                        <th className="pb-4 px-2 text-center">ສະຖານະ</th>
                                        <th className="pb-4 px-2">ລາຄາຂາຍ</th>
                                        <th className="pb-4 px-2 hidden md:table-cell">ທຶນ</th>
                                        <th className="pb-4 px-2">ກຳໄລ</th>
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
                                                                onClick={() => updateQty(item, -1)}
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
                                                                onClick={() => updateQty(item, 1)}
                                                                className={`${iconBtn} bg-slate-100 dark:bg-white/6 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400`}
                                                            >
                                                                <PlusIconSmall className="w-3.5 h-3.5" />
                                                            </motion.button>
                                                        </div>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="py-3 px-2 text-center">
                                                        <select
                                                            value={item.status || 'InStock'}
                                                            onChange={(e) => updateStatus(item, e.target.value as 'Ordering' | 'InStock')}
                                                            className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap outline-none cursor-pointer appearance-none text-center ${item.status === 'Ordering' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-none' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-none'}`}
                                                            style={{ textAlignLast: 'center' }}
                                                        >
                                                            <option value="InStock" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">ເຄື່ອງເຂົ້າແລ້ວ</option>
                                                            <option value="Ordering" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">ກຳລັງສັ່ງເຄື່ອງ</option>
                                                        </select>
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

                                                    {/* Profit */}
                                                    <td className="py-3 px-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                                {item.costPrice && item.sellingPrice ? ((item.sellingPrice - item.costPrice) * item.quantity).toLocaleString() : '—'}
                                                            </span>
                                                            {item.costPrice && item.sellingPrice ? (
                                                                <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 tabular-nums mt-0.5">
                                                                    ({(item.sellingPrice - item.costPrice).toLocaleString()}/ຊິ້ນ)
                                                                </span>
                                                            ) : null}
                                                        </div>
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
                        {stockStats.lowStock.length > 0 && (
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
                                    ມີ <strong className="font-bold">{stockStats.lowStock.length} ລາຍການ</strong> ທີ່ຈຳນວນສາງໃກ້ຈະໝົດ (≤5 ຊິ້ນ) ກະລຸນາຕື່ມສາງ
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

            </div>
        </motion.div>
    );
}