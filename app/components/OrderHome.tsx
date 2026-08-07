'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/app/lib/supabase';
import { useTheme } from '@/app/components/ThemeProvider';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Swal from 'sweetalert2';

interface HomeProps {
  onNavigate: (tab: string, search?: string) => void;
  orderCount: number;
  pendingNotify: number;
  pendingOrder: number;
}

const BANNERS = [
  {
    id: 1,
    bg: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
    badge: '🔥 HOT',
    title: 'ລະບົບຈັດການ\nອໍເດີ Premium',
    sub: 'ຕິດຕາມ · ຈັດການ · ຂາຍດີ',
    emoji: '🚀',
  },
  {
    id: 2,
    bg: 'from-[#0d2137] via-[#1a3a52] to-[#0d5e6e]',
    badge: '📦 ສາງ',
    title: 'ກວດສາງສິນຄ້າ\nລ່າສຸດທຸກວັນ',
    sub: 'ສາງສິນຄ້າ · ຕ້ນທຶນ · ກຳໄລ',
    emoji: '📊',
  },
  {
    id: 3,
    bg: 'from-[#1a0533] via-[#2d1258] to-[#4a1f8a]',
    badge: '💰 ກະເປົາ',
    title: 'ເບິ່ງລາຍຮັບ-ລາຍຈ່າຍ\nໄດ້ທຸກເວລາ',
    sub: 'ກະເປົາເງິນ · ຍອດຄົງເຫຼືອ',
    emoji: '💳',
  },
];

const SERVICE_ITEMS = [
  {
    id: 'add',
    label: 'ສ້າງອໍເດີ',
    color: 'from-sky-400 to-blue-600',
    shadow: 'shadow-blue-500/30',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-100 dark:border-blue-500/20',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-blue-600 dark:text-blue-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    id: 'list',
    label: 'ລາຍການ',
    color: 'from-emerald-400 to-green-600',
    shadow: 'shadow-green-500/30',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-100 dark:border-emerald-500/20',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-emerald-600 dark:text-emerald-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    id: 'stock',
    label: 'ສາງສິນຄ້າ',
    color: 'from-amber-400 to-orange-600',
    shadow: 'shadow-orange-500/30',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-100 dark:border-amber-500/20',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-amber-600 dark:text-amber-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
  },
  {
    id: 'wallet',
    label: 'ກະເປົາເງິນ',
    color: 'from-violet-400 to-purple-600',
    shadow: 'shadow-purple-500/30',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    border: 'border-violet-100 dark:border-violet-500/20',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-violet-600 dark:text-violet-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
  {
    id: 'agent',
    label: 'ຕົວແທນ',
    color: 'from-pink-400 to-rose-600',
    shadow: 'shadow-rose-500/30',
    bg: 'bg-pink-50 dark:bg-pink-500/10',
    border: 'border-pink-100 dark:border-pink-500/20',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-pink-600 dark:text-pink-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    id: 'dashboard',
    label: 'ລາຍງານ',
    color: 'from-teal-400 to-cyan-600',
    shadow: 'shadow-cyan-500/30',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
    border: 'border-teal-100 dark:border-teal-500/20',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-teal-600 dark:text-teal-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
];

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString();
}

export default function OrderHome({ onNavigate, orderCount, pendingNotify, pendingOrder }: HomeProps) {
  const [bannerIdx, setBannerIdx] = useState(0);
  const [shopName, setShopName] = useState('Tawan East Shop');
  const [todayOrders, setTodayOrders] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [todayDeposit, setTodayDeposit] = useState(0);
  const [todayCost, setTodayCost] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [pendingDeposit, setPendingDeposit] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalBanners, setGlobalBanners] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAIScanningOrder, setIsAIScanningOrder] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { theme, toggleTheme } = useTheme();

  const handleAIScanOrder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAIScanningOrder(true);
    try {
      // Compress image before sending
      const maxWidth = 800;
      const maxHeight = 800;
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });
      
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.drawImage(img, 0, 0, width, height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.8).replace(/^data:image\/\w+;base64,/, '');
      URL.revokeObjectURL(objectUrl);

      // Call Gemini API Directly
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
      You are an expert AI assistant that extracts key information from images to help search for an order in an Order Management System.
      Analyze the provided image and extract the most relevant text that can be used to search for an order.
      
      Focus on extracting ONE of the following (in order of priority):
      1. Phone Number (if it's a transfer slip or shipping label)
      2. Tracking Number or Order ID
      3. Customer Name
      4. Product Name/Description (if the image is a picture of a product, e.g., "เสื้อสีดำ", "กระเป๋าหนัง", "iPhone", etc. Keep it brief and relevant to the product)
      
      INSTRUCTIONS:
      1. Identify the most identifying piece of information.
      2. Format the output as a JSON object.
      3. You MUST respond with ONLY a valid JSON object (no markdown, no backticks, no explanation).
      
      EXPECTED JSON FORMAT:
      {
        "searchQuery": "string (the extracted text/product name to search for)",
        "confidence": number (1-100 indicating how sure you are)
      }
      `;

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg',
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();
      
      let data: any = {};
      try {
        const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        data = JSON.parse(cleanedText);
      } catch (e) {
        console.warn('Failed to parse JSON, using raw text', responseText);
        data = { searchQuery: responseText.trim() };
      }
      
      if (data.searchQuery) {
        setSearchQuery(data.searchQuery);
        // Navigate after a short delay so user can see the text
        setTimeout(() => {
          onNavigate('list', data.searchQuery);
        }, 800);
        Swal.fire({
          title: 'ສຳເລັດ!',
          text: `ຄົ້ນຫາ: ${data.searchQuery}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          title: 'ບໍ່ພົບຂໍ້ມູນ',
          text: 'AI ບໍ່ສາມາດອ່ານຂໍ້ມູນບິນ ຫຼື ຊື່ລູກຄ້າຈາກຮູບນີ້ໄດ້',
          icon: 'warning',
          confirmButtonColor: '#14b8a6'
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        text: `ບໍ່ສາມາດສະແກນຮູບໄດ້: ${err.message || 'Unknown error'}`,
        icon: 'error',
        confirmButtonColor: '#14b8a6'
      });
    } finally {
      setIsAIScanningOrder(false);
      // Reset input
      e.target.value = '';
    }
  };

  // Load shop settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShopName(localStorage.getItem('shopName') || 'Tawan East Shop');
    }
  }, []);

  // Load today stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Load Global Banners
        const { data: bannerData } = await supabase.from('notes').select('*').eq('title', '___BANNERS___').maybeSingle();
        if (bannerData && bannerData.content) {
          try {
            const loadedBanners = JSON.parse(bannerData.content);
            if (Array.isArray(loadedBanners)) setGlobalBanners(loadedBanners);
          } catch (err) {}
        }

        const { data: orders } = await supabase
          .from('orders')
          .select('total_sales, total_cost, total_profit, deposit, shipping_fee, shipping_cost, total_expenses, status')
          .gte('created_at', today.toISOString());

        if (orders) {
          setTodayOrders(orders.length);
          const completed = orders.filter(o => o.status !== 'ຍົກເລີກອໍເດີ');
          setTodayRevenue(completed.reduce((s, o) => s + (o.total_sales || 0), 0));
          setTodayProfit(completed.reduce((s, o) => s + (o.total_profit || 0), 0));
          setTodayDeposit(completed.reduce((s, o) => s + (Number(o.deposit) || 0), 0));
          setTodayCost(completed.reduce((s, o) => s + (Number(o.total_cost) || 0) + (Number(o.shipping_fee) || Number(o.shipping_cost) || 0) + (Number(o.total_expenses) || 0), 0));
        }

        // Calculate total balance for ALL wallets
        let inc = 0, exp = 0;

        // calculate balance from all manual transactions
        const { data: txns } = await supabase
          .from('transactions')
          .select('type, amount');

        if (txns) {
          txns.forEach(t => {
            if (t.type === 'income') inc += Number(t.amount);
            else exp += Number(t.amount); // covers expense, profit_split, etc.
          });
        }

        // Always compute order balances for all orders
        const { data: allOrders } = await supabase
          .from('orders')
          .select('status, payment_method, total_sales, price, deposit, transfer_amount, total_cost, shipping_fee, shipping_cost, total_expenses');

        if (allOrders) {
          allOrders.forEach(o => {
            if (o.status === 'ຍົກເລີກອໍເດີ') return;

            // income from order
            let income = 0;
            if (o.payment_method === 'ຈ່າຍແລ້ວ' || o.status === 'ໄດ້ຮັບເງິນແລ້ວ' || o.status === 'ປິດບິນແລ້ວ') {
              income = Number(o.total_sales) || Number(o.price) || 0;
            } else {
              income = Number(o.deposit) || Number(o.transfer_amount) || 0;
            }
            const cost = (Number(o.total_cost) || 0) + (Number(o.shipping_fee) || Number(o.shipping_cost) || 0) + (Number(o.total_expenses) || 0);

            inc += income;
            exp += cost;
          });
        }

        setWalletBalance(inc - exp);

        // Pending deposits (orders with status not cancelled and deposit > 0)
        const { data: pendingOrders } = await supabase
          .from('orders')
          .select('deposit, status')
          .not('status', 'eq', 'ຍົກເລີກອໍເດີ')
          .not('status', 'eq', 'ສຳເລັດ');
        if (pendingOrders) {
          setPendingDeposit(pendingOrders.reduce((s, o) => s + (o.deposit || 0), 0));
        }
      } catch (e) {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const activeBanners = globalBanners.length > 0 
    ? globalBanners.map((url, i) => ({ id: `custom_${i}`, isCustom: true, url, bg: '' }))
    : BANNERS;

  // Auto-play banner based on activeBanners length
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setBannerIdx(i => (i + 1) % activeBanners.length);
    }, 4000);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [activeBanners.length]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'ສະບາຍດີຕອນເຊົ້າ 🌅' : hour < 17 ? 'ສະບາຍດີຕອນທ່ຽງ ☀️' : 'ສະບາຍດີຕອນແລງ 🌆';

  return (
    <div className="pb-10 space-y-5 px-4 pt-4">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/30 shrink-0 border-2 border-white dark:border-slate-800">
              <span className="text-white text-xl font-bold">T</span>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 border-2 border-white dark:border-slate-800" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
              {shopName}
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500">
                <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 11.22a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4.5-6.25z" clipRule="evenodd" />
              </svg>
            </h1>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">ຢືນຢັນຕົວຕົນແລ້ວ</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 text-amber-500 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={() => onNavigate('list')}
            className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-rose-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {pendingNotify > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-slate-900">
                {pendingNotify > 9 ? '9+' : pendingNotify}
              </span>
            )}
          </button>
        </div>
      </motion.div>

      {/* ── Search Bar ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative mx-auto max-w-[98%]">
        <div className="flex items-center bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700/60 rounded-[20px] p-2 shadow-sm">
          <div className="flex-1 flex items-center pl-3 pr-2">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) onNavigate('list', searchQuery.trim()); }}
              placeholder="ປ້ອນເລກບິນ ຫຼື ເບີໂທຜູ້ຮັບ..." 
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[18px] placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-white"
            />
          </div>
          <button 
            onClick={() => { if (searchQuery.trim()) onNavigate('list', searchQuery.trim()); }}
            className="w-12 h-12 rounded-[14px] bg-rose-600 flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20 text-white hover:bg-rose-700 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
          <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-700 mx-2" />
          <label className={`w-12 h-12 rounded-[14px] ${isAIScanningOrder ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-500' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100'} flex items-center justify-center shrink-0 transition-colors cursor-pointer relative overflow-hidden`} title="AI Scanner (ສະແກນຮູບ/ບິນ)">
            {isAIScanningOrder ? (
              <svg className="animate-spin w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleAIScanOrder} disabled={isAIScanningOrder} />
          </label>
        </div>
      </motion.div>

      {/* ── Banner Slider ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="relative aspect-[16/9] sm:aspect-[2/1] md:aspect-[21/9] lg:aspect-[3/1] max-h-[250px] md:max-h-[320px] w-full rounded-[24px] overflow-hidden shadow-lg border border-slate-800">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeBanners[bannerIdx].id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className={`absolute inset-0 flex items-center px-6 gap-4 ${(activeBanners[bannerIdx] as any).isCustom ? 'bg-slate-900' : `bg-gradient-to-r ${(activeBanners[bannerIdx] as any).bg}`}`}
          >
            {(activeBanners[bannerIdx] as any).isCustom ? (
              <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center bg-black">
                {/* Blurred background to fill empty space */}
                <img src={(activeBanners[bannerIdx] as any).url} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-110" />
                {/* Main image (contained so text is never cropped) */}
                <img src={(activeBanners[bannerIdx] as any).url} alt="Banner" className="relative z-10 w-full h-full object-contain" />
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0 z-10">
                  <span className="inline-block text-[13px] font-extrabold px-3 py-1 rounded-full bg-white/15 text-white mb-2 backdrop-blur-sm">
                    {(activeBanners[bannerIdx] as any).badge}
                  </span>
                  <h2 className="text-white font-extrabold text-3xl leading-tight whitespace-pre-line">
                    {(activeBanners[bannerIdx] as any).title}
                  </h2>
                  <p className="text-white/80 text-sm font-semibold mt-1.5">{(activeBanners[bannerIdx] as any).sub}</p>
                </div>
                <div className="text-7xl shrink-0 opacity-90 select-none drop-shadow-xl z-10">{(activeBanners[bannerIdx] as any).emoji}</div>
                
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-xl" />
                <div className="absolute -bottom-10 -right-4 w-32 h-32 rounded-full bg-white/5 blur-xl" />
              </>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {activeBanners.map((_, i) => (
            <button
              key={i}
              onClick={() => setBannerIdx(i)}
              className={`rounded-full transition-all duration-300 ${i === bannerIdx ? 'w-6 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      </motion.div>

      {/* ── Premium Service Grid (Anousith Style) ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <h3 className="text-[18px] font-bold text-slate-800 dark:text-slate-100 mb-3 px-1">ບໍລິການຂອງພວກເຮົາ</h3>
        
        {/* Top 3 Tall Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Card 1: ສ້າງອໍເດີ */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate('add')}
            className="relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-[24px] shadow-sm flex flex-col items-center text-center p-4 pt-5 pb-4 overflow-hidden"
          >
            <span className="absolute top-2.5 left-0 bg-rose-500 text-white text-[11px] font-bold px-3 py-1 rounded-r-full shadow-sm z-10">
              NEW
            </span>
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/30 mb-3 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <span className="text-[18px] sm:text-[20px] font-extrabold text-slate-800 dark:text-white leading-tight">ສ້າງອໍເດີ</span>
            <span className="text-[13px] sm:text-[14px] text-slate-400 dark:text-slate-500 mt-1.5 leading-snug">ເພີ່ມອໍເດີໃໝ່<br/>ເລີ່ມຂາຍໄດ້ທັນທີ</span>
            <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mt-4">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} stroke="currentColor" className="w-4 h-4 text-rose-500"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </div>
          </motion.button>

          {/* Card 2: ລາຍການອໍເດີ */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate('list')}
            className="relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-[24px] shadow-sm flex flex-col items-center text-center p-4 pt-5 pb-4 overflow-hidden"
          >
            {orderCount > 0 && (
              <span className="absolute top-2 right-2 min-w-[20px] h-[20px] bg-rose-500 text-white text-[12px] font-bold rounded-full flex items-center justify-center px-1.5 shadow-sm z-10">
                {orderCount > 99 ? '99+' : orderCount}
              </span>
            )}
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 mb-3 mt-2">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <span className="text-[18px] sm:text-[20px] font-extrabold text-slate-800 dark:text-white leading-tight">ລາຍການອໍເດີ</span>
            <span className="text-[13px] sm:text-[14px] text-slate-400 dark:text-slate-500 mt-1.5 leading-snug">ຈັດການອໍເດີ<br/>ທັງໝົດຂອງທ່ານ</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mt-4">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} stroke="currentColor" className="w-4 h-4 text-emerald-500"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </div>
          </motion.button>

          {/* Card 3: ສາງສິນຄ້າ */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate('stock')}
            className="relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-[24px] shadow-sm flex flex-col items-center text-center p-4 pt-5 pb-4 overflow-hidden"
          >
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-3 mt-2">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
            <span className="text-[18px] sm:text-[20px] font-extrabold text-slate-800 dark:text-white leading-tight">ສາງສິນຄ້າ</span>
            <span className="text-[13px] sm:text-[14px] text-slate-400 dark:text-slate-500 mt-1.5 leading-snug">ກວດສອບສະຕ໋ອກ<br/>ແລະ ຄັງສິນຄ້າ</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mt-4">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} stroke="currentColor" className="w-4 h-4 text-amber-500"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </div>
          </motion.button>
        </div>

        {/* Bottom 3 Cards */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          {/* Card: ລາຍງານ */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate('dashboard')}
            className="relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-[24px] shadow-sm flex flex-col items-center text-center p-4 pt-5 pb-4 overflow-hidden"
          >
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-3 mt-2">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
            </div>
            <span className="text-[18px] sm:text-[20px] font-extrabold text-slate-800 dark:text-white leading-tight">ລາຍງານ</span>
            <span className="text-[13px] sm:text-[14px] text-slate-400 dark:text-slate-500 mt-1.5 leading-snug">ເບິ່ງຍອດລາຍຮັບ<br/>ແລະ ຍອດຂາຍ</span>
            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mt-4">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} stroke="currentColor" className="w-4 h-4 text-indigo-500"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </div>
          </motion.button>

          {/* Card: ລາຍຈ່າຍອື່ນໆ */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate('expenses')}
            className="relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-[24px] shadow-sm flex flex-col items-center text-center p-4 pt-5 pb-4 overflow-hidden"
          >
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#FF7A50] to-[#FF4B5C] flex items-center justify-center shadow-lg shadow-orange-500/30 mb-3 mt-2">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            </div>
            <span className="text-[18px] sm:text-[20px] font-extrabold text-slate-800 dark:text-white leading-tight">ບັນທຶກລາຍຈ່າຍ</span>
            <span className="text-[13px] sm:text-[14px] text-slate-400 dark:text-slate-500 mt-1.5 leading-snug">ຄ່າກ່ອງ, ຍິງແອດ<br/>ແລະ ອື່ນໆ</span>
            <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center mt-4">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} stroke="currentColor" className="w-4 h-4 text-orange-500"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </div>
          </motion.button>

          {/* Card: ຕົວແທນ */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate('agent')}
            className="relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-[24px] shadow-sm flex flex-col items-center text-center p-4 pt-5 pb-4 overflow-hidden"
          >
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/30 mb-3 mt-2">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
            </div>
            <span className="text-[18px] sm:text-[20px] font-extrabold text-slate-800 dark:text-white leading-tight">ຕົວແທນ</span>
            <span className="text-[13px] sm:text-[14px] text-slate-400 dark:text-slate-500 mt-1.5 leading-snug">ຈັດການບັນຊີ<br/>ແລະ ສິດເຂົ້າເຖິງ</span>
            <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mt-4">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} stroke="currentColor" className="w-4 h-4 text-rose-500"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* ── Financial Dashboard (Premium FinTech Style) ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[18px] font-bold text-slate-800 dark:text-slate-100">ສະຫຼຸບການເງິນ</h3>
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            ອັບເດດລ່າສຸດ: {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
          </span>
        </div>
        
        {/* Main Balance Card - Glassmorphism Premium */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('wallet')}
          className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-black rounded-[28px] p-6 relative overflow-hidden shadow-2xl text-left border border-slate-700/60"
        >
          {/* Decorative Blurs */}
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-teal-500/20 rounded-full blur-3xl" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl" />
          <div className="absolute right-4 bottom-4 opacity-[0.03]">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1} stroke="currentColor" className="w-32 h-32 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
          </div>
          
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/5">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-teal-400"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H4.5A2.25 2.25 0 002.25 12v6.75A2.25 2.25 0 004.5 21h15a2.25 2.25 0 002.25-2.25V12z" /></svg>
              </div>
              <div>
                <h2 className="text-white/90 font-bold text-[15px]">
                  ຍອດລວມທຸກກະເປົາ
                </h2>
                <p className="text-slate-400/80 text-[12px] mt-0.5">ລວມທຸກສາຂາ ແລະ ຕົວແທນ</p>
              </div>
            </div>
            
            {/* Trend Badge */}
            <div className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/20 px-2 py-1 rounded-full">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} stroke="currentColor" className="w-3 h-3 text-emerald-400"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
              <span className="text-[12px] font-bold text-emerald-400">+12.5%</span>
            </div>
          </div>
          
          <div className="relative z-10 flex flex-col mt-2">
            <span className="text-[40px] sm:text-[46px] font-black text-white tabular-nums tracking-tight leading-none drop-shadow-md">
              ₭ {loading ? '...' : walletBalance.toLocaleString()}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 mt-5 relative z-10 opacity-70 hover:opacity-100 transition-opacity">
            <span className="text-[13px] font-medium text-white">ກົດເບິ່ງລາຍລະອຽດກະເປົາ</span>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" /></svg>
          </div>
        </motion.button>
        
        {/* Detail Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Card 1: ยอดขายวันนี้ */}
          <div className="bg-white dark:bg-slate-800 rounded-[24px] p-4 border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            {/* Sparkline background */}
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 dark:opacity-20 pointer-events-none">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full text-emerald-500">
                <path d="M0 40 Q 20 20, 40 30 T 70 10 T 100 5 L 100 40 Z" fill="currentColor" stroke="none" />
                <path d="M0 40 Q 20 20, 40 30 T 70 10 T 100 5" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[10px] bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-600 dark:text-emerald-400"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
                </div>
                <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">ຍອດຂາຍມື້ນີ້</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md">+8.5%</span>
            </div>
            
            <div className="relative z-10 mt-3">
              <span className="text-[26px] font-black text-slate-800 dark:text-white tabular-nums tracking-tight block leading-none">
                ₭ {loading ? '...' : fmtNum(todayRevenue)}
              </span>
              <span className="text-[13px] font-medium text-slate-400 dark:text-slate-500 mt-1.5 block">{loading ? '...' : todayOrders} ອໍເດີສຳເລັດ</span>
            </div>
          </div>
          
          {/* Card 2: กำไรวันนี้ */}
          <div className="bg-white dark:bg-slate-800 rounded-[24px] p-4 border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 dark:opacity-20 pointer-events-none">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full text-violet-500">
                <path d="M0 40 Q 15 35, 30 20 T 60 25 T 100 0 L 100 40 Z" fill="currentColor" stroke="none" />
                <path d="M0 40 Q 15 35, 30 20 T 60 25 T 100 0" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[10px] bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-violet-600 dark:text-violet-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">ກຳໄລມື້ນີ້</span>
              </div>
              <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded-md">+12.3%</span>
            </div>
            
            <div className="relative z-10 mt-3">
              <span className="text-[26px] font-black text-slate-800 dark:text-white tabular-nums tracking-tight block leading-none">
                ₭ {loading ? '...' : fmtNum(todayProfit)}
              </span>
              <span className="text-[13px] font-medium text-slate-400 dark:text-slate-500 mt-1.5 block">ລາຍໄດ້ສຸດທິ</span>
            </div>
          </div>
          {/* Card 3: ยอดมัดจำวันนี้ */}
          <div className="bg-white dark:bg-slate-800 rounded-[24px] p-4 border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 dark:opacity-20 pointer-events-none">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full text-sky-500">
                <path d="M0 40 Q 25 25, 50 30 T 80 15 T 100 10 L 100 40 Z" fill="currentColor" stroke="none" />
                <path d="M0 40 Q 25 25, 50 30 T 80 15 T 100 10" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[10px] bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-sky-600 dark:text-sky-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">ຍອດມັດຈຳມື້ນີ້</span>
              </div>
            </div>
            
            <div className="relative z-10 mt-3">
              <span className="text-[26px] font-black text-slate-800 dark:text-white tabular-nums tracking-tight block leading-none">
                ₭ {loading ? '...' : fmtNum(todayDeposit)}
              </span>
              <span className="text-[13px] font-medium text-slate-400 dark:text-slate-500 mt-1.5 block">ລູກຄ້າມັດຈຳມື້ນີ້</span>
            </div>
          </div>
          
          {/* Card 4: ยอดสั่งของวันนี้ */}
          <div className="bg-white dark:bg-slate-800 rounded-[24px] p-4 border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 dark:opacity-20 pointer-events-none">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full text-rose-500">
                <path d="M0 40 Q 20 10, 40 20 T 70 30 T 100 15 L 100 40 Z" fill="currentColor" stroke="none" />
                <path d="M0 40 Q 20 10, 40 20 T 70 30 T 100 15" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[10px] bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-rose-600 dark:text-rose-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">ຍອດສັ່ງເຄື່ອງມື້ນີ້</span>
              </div>
            </div>
            
            <div className="relative z-10 mt-3">
              <span className="text-[26px] font-black text-slate-800 dark:text-white tabular-nums tracking-tight block leading-none">
                ₭ {loading ? '...' : fmtNum(todayCost)}
              </span>
              <span className="text-[13px] font-medium text-slate-400 dark:text-slate-500 mt-1.5 block">ຕົ້ນທຶນ ແລະ ຄ່າໃຊ້ຈ່າຍມື້ນີ້</span>
            </div>
          </div>
        </div>
        
        {/* Pending Deposit Bar - Premium Alert Style */}
        <AnimatePresence>
          {pendingDeposit > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className="bg-gradient-to-r from-amber-100 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 rounded-[20px] p-4 border border-amber-200/80 dark:border-amber-500/20 flex items-center gap-4 shadow-sm"
            >
              <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[15px] font-extrabold text-amber-900 dark:text-amber-200 block">ຍອດມັດຈຳລໍຖ້າ</span>
                <span className="text-[13px] font-medium text-amber-700/80 dark:text-amber-400/80 mt-0.5 block truncate">ລູກຄ້າຈ່າຍມັດຈຳແລ້ວ ແຕ່ອໍເດີຍັງບໍ່ສຳເລັດ</span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[22px] font-black text-amber-600 dark:text-amber-400 tabular-nums block leading-none">
                  ₭ {fmtNum(pendingDeposit)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <div className="h-4" />
    </div>
  );
}
