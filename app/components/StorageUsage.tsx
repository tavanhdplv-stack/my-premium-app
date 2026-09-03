'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Database, Image as ImageIcon } from 'lucide-react';

export default function StorageUsage() {
  const [dbUsage, setDbUsage] = useState<number>(0.1);
  const [imgUsage, setImgUsage] = useState<number>(0.1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchUsage = async () => {
      try {
        // ประเมินจากจำนวนออเดอร์ทั้งหมด
        const { count, error } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });

        if (!error && count !== null && !cancelled) {
          // โควต้า DB ฟรี = 500MB (ประมาณ 500,000 KB)
          // 1 ออเดอร์ใช้พื้นที่ตีกลมๆ ประมาณ 2 KB
          // % = (count * 2) / 500,000 * 100 = count / 2500
          let calculatedDb = Number(Math.max(0.01, count / 2500).toFixed(2));
          
          // โควต้า Storage ฟรี = 1GB (1,000,000 KB)
          // 1 ออเดอร์มีรูป 1 รูป (บีบอัดแล้ว) ตีเป็น 150 KB
          // % = (count * 150) / 1,000,000 * 100 = count / 66.6
          let calculatedImg = Number(Math.max(0.01, count / 66.6).toFixed(2));

          setDbUsage(calculatedDb);
          setImgUsage(calculatedImg);
        }
      } catch (err) {
        console.error('Error fetching usage estimation:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUsage();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-[14px] shadow-sm animate-pulse">
        <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
        <div className="w-6 h-3 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
        <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-700"></div>
        <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
        <div className="w-6 h-3 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-2.5 px-3 py-1.5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 rounded-[14px] shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 cursor-help group"
      title="พื้นที่คงเหลือ: ฐานข้อมูล 500MB, รูปภาพ 1GB"
    >
      <div className="flex items-center gap-1.5" title={`ฐานข้อมูลถูกใช้ไป ${dbUsage}%`}>
        <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
          <Database className="w-3 h-3 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-wide">
          {dbUsage}%
        </span>
      </div>
      
      <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
      
      <div className="flex items-center gap-1.5" title={`รูปภาพถูกใช้ไป ${imgUsage}%`}>
        <div className="w-5 h-5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
          <ImageIcon className="w-3 h-3 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-wide">
          {imgUsage}%
        </span>
      </div>
    </div>
  );
}
