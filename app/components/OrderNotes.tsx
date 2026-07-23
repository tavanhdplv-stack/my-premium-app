'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import Swal from 'sweetalert2';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function OrderNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Toast state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setNotes(data as Note[]);
      }
      setLoading(false);
    };

    fetchNotes();

    const channel = supabase
      .channel('notes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
        fetchNotes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openAddModal = () => {
    setEditId(null);
    setTitle('');
    setContent('');
    setShowModal(true);
  };

  const openEditModal = (note: Note) => {
    setEditId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await supabase
          .from('notes')
          .update({ title, content })
          .eq('id', editId);
      } else {
        await supabase
          .from('notes')
          .insert([{ title, content }]);
      }
      setShowModal(false);
    } catch (e) {
      console.error('Error saving note:', e);
      Swal.fire({
        title: 'ບໍ່ສາມາດບັນທຶກໄດ້',
        text: 'ກະລຸນາລອງໃໝ່',
        icon: 'error',
        confirmButtonColor: '#ef4444',
        background: '#1e293b',
        color: '#f1f5f9'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'ລຶບຂໍ້ຄວາມ?',
      text: 'ແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຂໍ້ຄວາມນີ້?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ລຶບເລີຍ',
      cancelButtonText: 'ຍົກເລີກ',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      background: '#1e293b',
      color: '#f1f5f9',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    try {
      await supabase
        .from('notes')
        .delete()
        .eq('id', id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = async (note: Note) => {
    try {
      await navigator.clipboard.writeText(note.content);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const field = "w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-slate-800 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:focus:ring-violet-400/20 shadow-sm";
  const label = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2.5";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-violet-100 dark:border-violet-900/30 border-t-violet-600 dark:border-t-violet-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-32 space-y-6 animate-[fadeIn_0.4s_ease-out]">
      
      {/* Header with Glassmorphism */}
      <div className="relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50">
        {/* Decorative gradient blobs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-violet-400/20 to-indigo-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-blue-400/10 to-violet-400/20 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl blur-xl opacity-30" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 text-white">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent tracking-tight">
                ຂໍ້ຄວາມຕອບກັບ
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ບັນທຶກຂໍ້ຄວາມທີ່ໃຊ້ບ່ອຍ ເພື່ອຄັດລອກຕອບລູກຄ້າໄດ້ວ່ອງໄວ
              </p>
            </div>
          </div>
          
          <button 
            onClick={openAddModal}
            className="relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-12 px-8 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-xl shadow-violet-500/30 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>ເພີ່ມຂໍ້ຄວາມໃໝ່</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-slate-200/50 dark:border-white/5">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">ທັງໝົດ</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{notes.length}</p>
        </div>
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-slate-200/50 dark:border-white/5">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">ພ້ອມໃຊ້</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{notes.length}</p>
        </div>
        <div className="hidden sm:block bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-slate-200/50 dark:border-white/5">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">ລ່າສຸດ</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
            {notes.length > 0 ? notes[0].title : '-'}
          </p>
        </div>
      </div>

      {/* Grid of Notes */}
      {notes.length === 0 ? (
        <div className="relative overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 py-20 px-4 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-indigo-500/5" />
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/20 dark:to-indigo-900/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-violet-400 dark:text-violet-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">ຍັງບໍ່ມີຂໍ້ຄວາມຕອບກັບ</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
              ກົດປຸ່ມ "ເພີ່ມຂໍ້ຄວາມໃໝ່" ດ້ານເທິງເພື່ອເລີ່ມຕົ້ນການນຳໃຊ້
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {notes.map((note, index) => (
            <div 
              key={note.id} 
              className="group relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-white/10 shadow-lg shadow-slate-200/30 dark:shadow-slate-900/30 hover:shadow-xl hover:shadow-violet-500/10 dark:hover:shadow-violet-500/5 hover:border-violet-200 dark:hover:border-violet-800/30 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Card header with gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="p-5">
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                      {note.title}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {note.created_at ? new Date(note.created_at).toLocaleDateString() : 'ບໍ່ມີວັນທີ'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button 
                      onClick={() => openEditModal(note)} 
                      className="p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl transition-all duration-200"
                    >
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(note.id)} 
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all duration-200"
                    >
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="mb-5">
                  <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-4 leading-relaxed bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm p-3.5 rounded-xl border border-slate-100 dark:border-white/5 font-medium">
                    {note.content}
                  </div>
                </div>

                <button 
                  onClick={() => handleCopy(note)}
                  className={`relative w-full flex items-center justify-center gap-2.5 h-11 rounded-xl text-sm font-bold transition-all duration-200 overflow-hidden ${
                    copiedId === note.id 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                      : 'bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 hover:shadow-lg hover:shadow-slate-200/30 dark:hover:shadow-slate-800/30'
                  }`}
                >
                  {copiedId === note.id ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      ຄັດລອກແລ້ວ
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                      </svg>
                      ຄັດລອກຂໍ້ຄວາມ
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal with Glassmorphism */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !saving && setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/20 flex flex-col animate-[slideUp_0.3s_ease-out] border border-white/20 dark:border-white/10">
            <div className="flex items-center justify-between p-6 sm:p-7 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 text-white">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-4.5 h-4.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                </div>
                {editId ? 'ແກ້ໄຂຂໍ້ຄວາມ' : 'ເພີ່ມຂໍ້ຄວາມໃໝ່'}
              </h3>
              <button 
                onClick={() => !saving && setShowModal(false)} 
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors duration-200"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 sm:p-7 space-y-6">
              <div>
                <label className={label}>ຫົວຂໍ້ (ໃຊ້ອ້າງອີງ)</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="ຕົວຢ່າງ: ຂໍ້ຄວາມທັກທາຍລູກຄ້າໃໝ່"
                  className={field}
                  autoFocus
                />
              </div>
              
              <div>
                <label className={label}>ເນື້ອຫາຂໍ້ຄວາມ (ທີ່ຈະໃຊ້ຄັດລອກ)</label>
                <textarea 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  placeholder="ພິມຂໍ້ຄວາມທີ່ຕ້ອງການບັນທຶກ..."
                  className={`${field} h-44 resize-none py-3.5`}
                />
              </div>
            </div>
            
            <div className="p-6 sm:p-7 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/20 rounded-b-3xl">
              <button 
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="h-11 px-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
              >
                ຍົກເລີກ
              </button>
              <button 
                onClick={handleSave}
                disabled={!title.trim() || !content.trim() || saving}
                className="h-11 px-8 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-xl shadow-violet-500/30 hover:shadow-violet-500/40 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2.5 min-w-[130px]"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ບັນທຶກ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}