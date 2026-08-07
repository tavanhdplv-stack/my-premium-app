'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/app/lib/supabase';
import ThemeToggle from './components/ThemeToggle';
import OrderDashboard from './components/OrderDashboard';
import OrderForm from './components/OrderForm';
import OrderList from './components/OrderList';
import OrderStock from './components/OrderStock';
import OrderAgent from './components/OrderAgent';
import OrderWallet from './components/OrderWallet';
import OrderSettings from './components/OrderSettings';
import OrderNotes from './components/OrderNotes';
import OtherExpenses from './components/OtherExpenses';
import { InstallPWA } from './components/InstallPWA';
import OrderHome from './components/OrderHome';
import StorageUsage from './components/StorageUsage';

type TabType = 'home' | 'dashboard' | 'add' | 'list' | 'stock' | 'agent' | 'wallet' | 'settings' | 'notes' | 'expenses';

const navConfig: { id: TabType; label: string; icon: string }[] = [
  { id: 'home', label: 'ໜ້າຫຼັກ', icon: 'home' },
  { id: 'add', label: 'ເພີ່ມອໍເດີໃໝ່', icon: 'add' },
  { id: 'dashboard', label: 'ລາຍງານ', icon: 'dashboard' },
  { id: 'list', label: 'ລາຍການອໍເດີ', icon: 'list' },
  { id: 'stock', label: 'ສາງສິນຄ້າ', icon: 'stock' },
  { id: 'agent', label: 'ຕົວແທນຈຳໜ່າຍ', icon: 'agent' },
  { id: 'wallet', label: 'ກະເປົາເງິນ', icon: 'wallet' },
  { id: 'notes', label: 'ໂນ້ດ & ຂໍ້ຄວາມ', icon: 'notes' },
];

const Icon = ({ name, className }: { name: string; className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    home: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    dashboard: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    add: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    list: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
    stock: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
    agent: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    wallet: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    settings: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    notes: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
      </svg>
    ),
  };
  return <>{icons[name] || icons['dashboard']}</>;
};

// Skeleton shown while Firebase initialises on first load
function AppSkeleton() {
  return (
    <div className="relative min-h-screen flex overflow-hidden bg-[var(--background)]">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex flex-col w-[88px] m-4 rounded-[30px] glass border-r-0 gap-4 p-4">
        <div className="w-11 h-11 rounded-[20px] skeleton-shimmer mx-auto mt-4" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-10 h-10 rounded-[20px] skeleton-shimmer mx-auto" />
        ))}
      </div>
      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="glass mx-4 mt-4 rounded-t-[30px] px-10 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
            <div className="space-y-2">
              <div className="w-32 h-5 rounded-lg skeleton-shimmer" />
              <div className="w-56 h-3 rounded-lg skeleton-shimmer" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
            <div className="w-28 h-10 rounded-xl skeleton-shimmer" />
          </div>
        </div>
        {/* Content area */}
        <div className="flex-1 p-10 mx-4 mb-4 rounded-b-[30px] glass !border-t-0 !shadow-none space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
            ))}
          </div>
          <div className="h-64 rounded-2xl skeleton-shimmer" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-48 rounded-2xl skeleton-shimmer" />
            <div className="h-48 rounded-2xl skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [orderCount, setOrderCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [preSelectedAgentId, setPreSelectedAgentId] = useState<string | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [globalPendingNotifyCount, setGlobalPendingNotifyCount] = useState(0);
  const [globalPendingOrderCount, setGlobalPendingOrderCount] = useState(0);
  const [globalPendingFilter, setGlobalPendingFilter] = useState<{ filter: string; ts: number } | undefined>(undefined);
  const [globalSearch, setGlobalSearch] = useState<{ query: string; ts: number } | undefined>(undefined);
  const [globalAnnouncement, setGlobalAnnouncement] = useState<string | null>(null);
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState<string | null>(null);

  // Lightweight count-only query — does NOT download all documents
  // Refreshes every 60 seconds so badge stays reasonably up to date
  useEffect(() => {
    // DO NOT block the UI waiting for Firebase. 
    // In areas with poor connection, getCountFromServer can hang for 10+ seconds.
    setAppReady(true);
    
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const { count, error } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());
          
        if (!error && !cancelled) setOrderCount(count || 0);

        let delayMins = 0;
        try {
          const { data: noteData } = await supabase.from('notes').select('content').eq('title', '___SYSTEM_SETTINGS___').maybeSingle();
          if (noteData && noteData.content) {
            const settings = JSON.parse(noteData.content);
            if (settings.notifyDelay !== undefined) {
              delayMins = parseInt(settings.notifyDelay, 10);
              if (typeof window !== 'undefined') localStorage.setItem('notifyDelay', String(delayMins));
            }
          } else {
            const delayStr = typeof window !== 'undefined' ? localStorage.getItem('notifyDelay') : '0';
            delayMins = parseInt(delayStr || '0', 10);
          }
        } catch (e) {
          const delayStr = typeof window !== 'undefined' ? localStorage.getItem('notifyDelay') : '0';
          delayMins = parseInt(delayStr || '0', 10);
        }

        let notifyQuery = supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ສົ່ງບິນແລ້ວ');

        if (delayMins > 0) {
          const targetTime = new Date(Date.now() - delayMins * 60 * 1000).toISOString();
          notifyQuery = notifyQuery.lte('status_updated_at', targetTime);
        }

        const { count: notifyCount, error: notifyError } = await notifyQuery;

        if (!notifyError && !cancelled) setGlobalPendingNotifyCount(notifyCount || 0);

        const { data: receiveOrders, error: receiveError } = await supabase
          .from('orders')
          .select('id, items')
          .eq('status', 'ຮັບອໍເດີແລ້ວ');

        if (!receiveError && !cancelled) {
          const count = (receiveOrders || []).filter(o => o.items?.some((i: any) => !i.cost || Number(i.cost) === 0)).length;
          setGlobalPendingOrderCount(count);
        }

        const { data: annData } = await supabase.from('notes').select('content').eq('title', '___SHOP_ANNOUNCEMENT___').maybeSingle();
        if (!cancelled) {
          setGlobalAnnouncement(annData?.content || null);
        }

      } catch (err) {
        console.error("Error fetching order counts:", err);
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);

    const subOrders = supabase.channel('page_orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (!cancelled) fetchCount();
      })
      .subscribe();

    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        // Pleasant double-ding sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } catch (e) {
        console.error('Audio play failed', e);
      }
    };

    const subNotes = supabase.channel('global_announcements')
      .on('broadcast', { event: 'new_announcement' }, (payload) => {
        if (!cancelled) {
          const newContent = payload.payload?.content;
          setGlobalAnnouncement(newContent || null);
          setDismissedAnnouncement(null); // Reset dismiss state so they see the new announcement
          if (newContent) {
            playNotificationSound();
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload) => {
        // Fallback to postgres_changes just in case it's enabled
        if (!cancelled && payload.new && (payload.new as any).title === '___SHOP_ANNOUNCEMENT___') {
          const newContent = (payload.new as any).content;
          setGlobalAnnouncement(newContent || null);
          setDismissedAnnouncement(null);
        }
      })
      .subscribe();

    const handleLocalUpdate = (e: any) => {
      // Optimistic updates for real-time feel before network request finishes
      const delayStr = typeof window !== 'undefined' ? localStorage.getItem('notifyDelay') : '0';
      const delayMins = parseInt(delayStr || '0', 10);
      
      if (e.detail) {
        if (e.detail.type === 'status_update') {
          if (delayMins === 0) {
            if (e.detail.newStatus === 'ສົ່ງບິນແລ້ວ' && e.detail.oldStatus !== 'ສົ່ງບິນແລ້ວ') {
              setGlobalPendingNotifyCount(p => p + 1);
            } else if (e.detail.oldStatus === 'ສົ່ງບິນແລ້ວ' && e.detail.newStatus !== 'ສົ່ງບິນແລ້ວ') {
              setGlobalPendingNotifyCount(p => Math.max(0, p - 1));
            }
          }
          
          if (e.detail.oldStatus === 'ຮັບອໍເດີແລ້ວ' && e.detail.newStatus !== 'ຮັບອໍເດີແລ້ວ') {
            setGlobalPendingOrderCount(p => Math.max(0, p - 1));
          }
        }
        if (e.detail.type === 'new_order') {
          if (delayMins === 0 && e.detail.status === 'ສົ່ງບິນແລ້ວ') {
            setGlobalPendingNotifyCount(p => p + 1);
          } else if (e.detail.status === 'ຮັບອໍເດີແລ້ວ' && !e.detail.hasCost) {
            setGlobalPendingOrderCount(p => p + 1);
          }
        }
        if (e.detail.type === 'delete_order') {
          if (delayMins === 0 && e.detail.status === 'ສົ່ງບິນແລ້ວ') {
            setGlobalPendingNotifyCount(p => Math.max(0, p - 1));
          } else if (e.detail.status === 'ຮັບອໍເດີແລ້ວ') {
            setGlobalPendingOrderCount(p => Math.max(0, p - 1));
          }
        }
      }

      // Delay the fetchCount so Supabase has time to process the update
      if (!cancelled) {
        setTimeout(() => {
          if (!cancelled) fetchCount();
        }, 1500);
      }
    };
    
    const handleLocalAnnouncementUpdated = (e: any) => {
      if (e.detail !== undefined) {
        setGlobalAnnouncement(e.detail || null);
        if (!e.detail) setDismissedAnnouncement(null);
      }
      if (!cancelled) {
        setTimeout(() => {
          if (!cancelled) fetchCount();
        }, 1000);
      }
    };

    window.addEventListener('local_order_updated', handleLocalUpdate as EventListener);
    window.addEventListener('local_announcement_updated', handleLocalAnnouncementUpdated);

    return () => { 
      cancelled = true; 
      clearInterval(interval); 
      supabase.removeChannel(subOrders);
      supabase.removeChannel(subNotes);
      window.removeEventListener('local_order_updated', handleLocalUpdate);
      window.removeEventListener('local_announcement_updated', handleLocalAnnouncementUpdated);
    };
  }, []);

  // Show skeleton until Firebase responds (avoids blank white screen)
  if (!appReady) return <AppSkeleton />;

  const handleTabChange = (tab: TabType, search?: string) => {
    setActiveTab(tab);
    if (search) {
      setGlobalSearch({ query: search, ts: Date.now() });
    }
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    if (tab === 'add') setEditOrderId(null); // Clear edit ID when explicitly clicking 'Add'
  };

  const handleEditOrder = (id: string) => {
    setEditOrderId(id);
    setActiveTab('add');
  };

  // Bottom nav — only 5 essential items (+ FAB for Add)
  const bottomNavItems: { id: TabType; label: string; icon: string }[] = [
    { id: 'home', label: 'ໜ້າຫຼັກ', icon: 'home' },
    { id: 'list', label: 'ລາຍການ', icon: 'list' },
    { id: 'stock', label: 'ສາງ', icon: 'stock' },
    { id: 'wallet', label: 'ເງິນ', icon: 'wallet' },
  ];

  return (
    <div className="relative h-[100dvh] lg:overflow-hidden font-lao text-slate-800 dark:text-slate-100 flex overflow-x-hidden selection:bg-teal-100 dark:selection:bg-teal-900/50 selection:text-teal-900 dark:selection:text-teal-100 transition-colors duration-300">
      {/* Decorative Orbs handled in layout.tsx */}

      {/* Global Notification Pills */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col sm:flex-row items-center gap-3">
        <AnimatePresence>
          {globalAnnouncement && globalAnnouncement !== dismissedAnnouncement && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0, scale: 0.9 }}
              className="flex items-center gap-3 px-3 py-1.5 sm:px-5 sm:py-2.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-indigo-100 dark:border-indigo-500/20 shadow-2xl shadow-indigo-500/20 rounded-full"
            >
              <div className="relative flex items-center justify-center shrink-0">
                <div className="absolute w-4 h-4 bg-indigo-500/40 rounded-full animate-ping" />
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {globalAnnouncement}
              </span>
              <button 
                onClick={() => setDismissedAnnouncement(globalAnnouncement)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors ml-1 shrink-0"
                title="ປິດ"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {globalPendingNotifyCount > 0 && (
            <motion.button
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0, scale: 0.9 }}
              onClick={() => {
                setGlobalPendingFilter({ filter: 'ສົ່ງບິນແລ້ວ', ts: Date.now() });
                handleTabChange('list');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-3 px-5 py-2.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-rose-100 dark:border-rose-500/20 shadow-2xl shadow-rose-500/20 rounded-full hover:scale-105 active:scale-95 transition-all group cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute w-4 h-4 bg-rose-500/40 rounded-full animate-ping" />
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors whitespace-nowrap">
                ລໍຖ້າແຈ້ງລູກຄ້າ
              </span>
              <span className="flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold shadow-sm">
                {globalPendingNotifyCount}
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {globalPendingOrderCount > 0 && (
            <motion.button
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0, scale: 0.9 }}
              onClick={() => {
                setGlobalPendingFilter({ filter: 'ຮັບອໍເດີແລ້ວ', ts: Date.now() });
                handleTabChange('list');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-3 px-5 py-2.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-orange-100 dark:border-orange-500/20 shadow-2xl shadow-orange-500/20 rounded-full hover:scale-105 active:scale-95 transition-all group cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute w-4 h-4 bg-orange-500/40 rounded-full animate-ping" />
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors whitespace-nowrap">
                ລໍຖ້າສັ່ງເຄື່ອງ
              </span>
              <span className="flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-orange-500 text-white text-xs font-bold shadow-sm">
                {globalPendingOrderCount}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ─── MOBILE OVERLAY BACKDROP ───────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── SIDEBAR ────────────────────────────────────────────────────── */}
      <aside
        onMouseEnter={() => { if (window.innerWidth >= 1024) setSidebarExpanded(true); }}
        onMouseLeave={() => { if (window.innerWidth >= 1024) setSidebarExpanded(false); }}
        className={`
          fixed lg:sticky inset-y-0 left-0 top-0 lg:h-[100dvh]
          ${sidebarExpanded ? 'w-[280px]' : 'w-[280px] lg:w-[88px]'}
          bg-white dark:bg-slate-900 lg:bg-white/95 lg:dark:bg-slate-900/95 lg:backdrop-blur-2xl border-r border-slate-200/50 dark:border-white/10 lg:my-4 lg:ml-4 lg:rounded-[30px]
          shadow-[0_10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.2)]
          flex flex-col z-40 transition-[width,transform,margin,border-radius] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className={`py-8 transition-all duration-300 ${!sidebarExpanded ? 'px-8 lg:px-2 flex lg:justify-center' : 'px-8'}`}>
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 shrink-0 rounded-[20px] bg-gradient-to-tr from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] flex items-center justify-center shadow-lg shadow-teal-500/30 overflow-hidden">
              <img src="/logo.png" alt="PreOrder Logo" className="w-full h-full object-cover" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full" />
            </div>
            <div className={`whitespace-nowrap overflow-hidden transition-[width,opacity] duration-300 ${!sidebarExpanded ? 'lg:w-0 lg:opacity-0' : 'w-[150px] opacity-100'}`}>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                PreOrder
              </h1>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Premium Order System
              </p>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1 px-4 py-2 overflow-y-auto no-scrollbar overflow-x-hidden">
          <p className={`px-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 whitespace-nowrap transition-opacity duration-300 ${!sidebarExpanded ? 'lg:opacity-0' : 'opacity-100'}`}>
            ເມນູຫຼັກ
          </p>
          {navConfig.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                title={!sidebarExpanded ? item.label : undefined}
                className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-[20px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] shadow-md shadow-teal-600/25 text-white scale-[1.02]'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white hover:shadow-sm'
                  }
                  ${!sidebarExpanded ? 'lg:justify-center lg:px-0' : ''}`}
              >
                <Icon
                  name={item.icon}
                  className={`w-5 h-5 transition-transform duration-300 shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                />
                <span className={`text-[15px] font-medium tracking-wide whitespace-nowrap overflow-hidden transition-[width,opacity] duration-300 ${isActive ? 'font-semibold' : ''} ${!sidebarExpanded ? 'lg:w-0 lg:opacity-0' : 'lg:w-[130px] lg:opacity-100 text-left'}`}>
                  {item.label}
                </span>
                {item.id === 'list' && orderCount > 0 && (
                  <span
                    className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full transition-all duration-300 ${!sidebarExpanded ? 'lg:hidden' : ''} ${
                      isActive
                        ? 'bg-white/20 text-white border border-white/30'
                        : 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-500/30'
                    }`}
                  >
                    {orderCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={`p-6 mt-auto transition-all duration-300 ${!sidebarExpanded ? 'lg:px-2 lg:py-6' : 'p-6'}`}>
          <div className={`flex items-center gap-3 p-3 rounded-[24px] bg-white/70 dark:bg-white/5 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-sm hover:shadow-[var(--premium-hover-shadow)] transition-all duration-400 cursor-pointer group hover:-translate-y-1 ${!sidebarExpanded ? 'lg:justify-center lg:p-2' : ''}`} title="Admin PreOrder">
            <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-bold">
                A
              </div>
            </div>
            <div className={`flex-1 min-w-0 overflow-hidden whitespace-nowrap transition-[width,opacity] duration-300 ${!sidebarExpanded ? 'lg:w-0 lg:opacity-0' : 'w-[120px] opacity-100'}`}>
              <p className="text-[14px] font-bold text-slate-900 dark:text-white truncate group-hover:text-[var(--primary)] transition-colors">
                Admin PreOrder
              </p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">Premium Member</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-[100dvh] relative z-10 min-w-0 lg:overflow-hidden">
        {/* Header — hidden on home tab for full-screen feel */}
        {activeTab !== 'home' && (
        <header className="glass !border-x-0 !border-t-0 border-b border-white/40 dark:border-white/5 px-4 sm:px-6 lg:px-10 py-4 lg:py-5 flex items-center justify-between z-20 sticky top-0 transition-colors duration-300 mx-4 mt-4 lg:rounded-t-[30px]">
          {/* Hamburger button (visible on all screens now) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarOpen(true);
                } else {
                  setSidebarExpanded(!sidebarExpanded);
                }
              }}
              aria-label="ເປີດປິດເມນູ"
              className="w-10 h-10 rounded-xl bg-white/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm hover:shadow-md"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 transition-transform duration-300 ${!sidebarExpanded ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold font-heading text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {navConfig.find((n) => n.id === activeTab)?.label}
              </h2>
              <p className="text-[13px] lg:text-[14px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium hidden sm:block">
                ພາບລວມ ແລະ ການຈັດການຂໍ້ມູນລ່າສຸດ — PreOrder
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-5">
            <StorageUsage />
            <button
              onClick={() => handleTabChange('settings')}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/80 dark:border-white/10 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md ${activeTab === 'settings' ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/30' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'}`}
              title="ຕັ້ງຄ່າ"
            >
              <Icon name="settings" className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <InstallPWA />
            <ThemeToggle />
            <button
              onClick={() => handleTabChange('add')}
              className="btn-premium px-4 lg:px-6 py-2.5 lg:py-3 text-[14px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="hidden sm:inline">ສ້າງອໍເດີໃໝ່</span>
            </button>
          </div>
        </header>
        )}

        {/* Content — full-screen on home tab, glass container on other tabs */}
        {activeTab === 'home' ? (
          <div
            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-teal-500/20 hover:scrollbar-thumb-teal-500/40 scrollbar-track-transparent"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 120px)' }}
          >
            <OrderHome
              onNavigate={(tab, search) => handleTabChange(tab as TabType, search)}
              orderCount={orderCount}
              pendingNotify={globalPendingNotifyCount}
              pendingOrder={globalPendingOrderCount}
            />
          </div>
        ) : (
        <div 
          className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-10 mx-4 mb-4 lg:rounded-b-[30px] glass !border-t-0 !shadow-none scrollbar-thin scrollbar-thumb-teal-500/20 hover:scrollbar-thumb-teal-500/40 scrollbar-track-transparent"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 120px)' }}
        >
          <div className="max-w-7xl mx-auto min-h-full">
            <div
              key={activeTab}
              className="min-h-full animate-subtle-fade"
            >
              <div className="min-h-full">
                {activeTab === 'dashboard' && (
                  <OrderDashboard onViewAll={() => handleTabChange('list')} />
                )}
                {activeTab === 'add' && <OrderForm editId={editOrderId || undefined} preSelectedAgentId={preSelectedAgentId || undefined} onSuccess={() => { setEditOrderId(null); setPreSelectedAgentId(null); handleTabChange('list'); }} />}
                {activeTab === 'list' && <OrderList onEdit={handleEditOrder} onAdd={() => handleTabChange('add')} initialFilter={globalPendingFilter} initialSearch={globalSearch} />}
                {activeTab === 'stock' && <OrderStock />}
                {activeTab === 'agent' && <OrderAgent onCreateOrder={(agId) => { setPreSelectedAgentId(agId); handleTabChange('add'); }} onEdit={handleEditOrder} />}
                {activeTab === 'wallet' && <OrderWallet onEditOrder={handleEditOrder} />}
                {activeTab === 'notes' && <OrderNotes />}
                {activeTab === 'settings' && <OrderSettings />}
                {activeTab === 'expenses' && <OtherExpenses />}
              </div>
            </div>
          </div>
        </div>
        )}
      </main>

      {/* ─── PREMIUM MOBILE BOTTOM NAVIGATION ─── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)]"
      >
        {/* Nav Background */}
        <div className="absolute inset-x-0 bottom-0 h-[115px] bg-white/95 dark:bg-[#1a222c]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] rounded-t-[36px]" />

        <div className="relative h-[115px] flex items-center justify-between px-2 sm:px-4">
          {/* Left 2 */}
          <div className="flex-1 flex justify-around">
            {bottomNavItems.slice(0, 2).map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className="relative flex flex-col items-center justify-center h-full w-[90px]"
                >
                  <div className={`relative transition-all duration-300 ${isActive ? 'scale-110 text-teal-600 dark:text-teal-400 -translate-y-1' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>
                    <Icon name={item.icon} className="w-11 h-11" />
                    {isActive && (
                      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.8)]" />
                    )}
                  </div>
                  <span className={`text-[16px] mt-2 font-bold transition-all duration-300 ${isActive ? 'text-teal-600 dark:text-teal-400 opacity-100' : 'text-slate-400 opacity-70'}`}>
                    {item.label}
                  </span>
                  {item.id === 'list' && orderCount > 0 && (
                    <span className="absolute top-3 right-2 w-7 h-7 bg-rose-500 text-white text-[12px] font-bold rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-[#1a222c]">
                      {orderCount > 99 ? '99+' : orderCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Center FAB — Premium Notched Design */}
          <div className="relative z-10 flex flex-col items-center shrink-0 w-[120px] -mt-[58px]">
            {/* The Cutout Ring Effect (matches app background) */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[116px] h-[116px] bg-slate-50 dark:bg-[#0B1120] rounded-[40px] rotate-45 scale-105" />
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[116px] h-[116px] bg-slate-50 dark:bg-[#0B1120] rounded-full" />
            
            {/* The Actual Button */}
            <button
              onClick={() => handleTabChange('add')}
              className="relative mt-2.5 flex flex-col items-center group"
            >
              <div className={`relative w-[94px] h-[94px] rounded-[32px] flex items-center justify-center shadow-2xl transition-all duration-300 ${
                activeTab === 'add'
                  ? 'bg-gradient-to-tr from-teal-400 via-blue-500 to-indigo-500 shadow-blue-500/60 scale-105 -rotate-3'
                  : 'bg-gradient-to-tr from-teal-500 via-indigo-500 to-purple-600 shadow-indigo-500/40 hover:scale-105'
              }`}>
                {/* Inner subtle glow */}
                <div className="absolute inset-0 rounded-[32px] border border-white/30" />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-[52px] h-[52px] text-white drop-shadow-md">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className={`text-[16px] font-extrabold mt-3 ${
                activeTab === 'add' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
              }`}>ເພີ່ມອໍເດີ</span>
            </button>
          </div>

          {/* Right 2 */}
          <div className="flex-1 flex justify-around">
            {bottomNavItems.slice(2).map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className="relative flex flex-col items-center justify-center h-full w-[90px]"
                >
                  <div className={`relative transition-all duration-300 ${isActive ? 'scale-110 text-indigo-500 dark:text-indigo-400 -translate-y-1' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>
                    <Icon name={item.icon} className="w-11 h-11" />
                    {isActive && (
                      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                    )}
                  </div>
                  <span className={`text-[16px] mt-2 font-bold transition-all duration-300 ${isActive ? 'text-indigo-600 dark:text-indigo-400 opacity-100' : 'text-slate-400 opacity-70'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
