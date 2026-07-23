'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

interface Order {
  id: string;
  customerName: string;
  productName: string;
  size: string;
  price: number;
  paymentMethod: string;
  status: string;
}

export default function OrdersListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const mappedOrders = data.map((d: any) => ({
          id: d.id,
          customerName: d.customer_name,
          productName: d.product_name,
          size: d.size,
          price: d.price,
          paymentMethod: d.payment_method,
          status: d.status
        }));
        setOrders(mappedOrders as Order[]);
      }
      setLoading(false);
    };

    fetchOrders();

    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 selection:bg-emerald-500/30">
      <div className="max-w-5xl mx-auto">
        
        {/* Header ส่วนหัว */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              รายการพรีออเดอร์ทั้งหมด
            </h1>
            <p className="text-xs text-slate-400 mt-1">ฐานข้อมูลคลาวด์เสถียรสูง — Tawan East Shop</p>
          </div>
          <a 
            href="/" 
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md text-sm font-semibold transition-all duration-200 active:scale-95 shadow-lg"
          >
            ➕ บันทึกออเดอร์ใหม่
          </a>
        </div>

        {/* ส่วนแสดงข้อมูล */}
        {loading ? (
          <div className="text-center py-20 text-slate-400 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="animate-pulse text-lg font-medium">กำลังโหลดข้อมูลจาก Firebase...</div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-white/[0.02] border border-white/5 rounded-2xl">
            ไม่มีรายการออเดอร์ในขณะนี้
          </div>
        ) : (
          // แตกเป็น Grid แสดงผลสไตล์การ์ดพรีเมียม สวยทั้งในคอมและในมือถือ
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl hover:border-white/20 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-white">{order.customerName}</h3>
                    <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-medium">
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5 text-sm text-slate-300">
                    <p><span className="text-slate-500 font-medium">สินค้า:</span> {order.productName}</p>
                    <p><span className="text-slate-500 font-medium">ขนาดไซส์:</span> {order.size}</p>
                    <p><span className="text-slate-500 font-medium">การชำระเงิน:</span> {order.paymentMethod}</p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/5 flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-mono">ID: {order.id.substring(0, 8)}...</span>
                  <div className="text-lg font-extrabold text-emerald-400">
                    {order.price.toLocaleString()} <span className="text-xs font-normal text-slate-400">ยอดเงิน</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}