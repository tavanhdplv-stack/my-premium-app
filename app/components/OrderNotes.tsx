'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: any;
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
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data: Note[] = [];
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() } as Note);
      });
      setNotes(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsubscribe();
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
        await updateDoc(doc(db, 'notes', editId), {
          title,
          content
        });
      } else {
        await addDoc(collection(db, 'notes'), {
          title,
          content,
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
    } catch (e) {
      console.error('Error saving note:', e);
      alert('Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຂໍ້ຄວາມນີ້?')) return;
    try {
      await deleteDoc(doc(db, 'notes', id));
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

  const field = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors duration-150 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10";
  const label = "block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">โน้ต & ข้อความตอบกลับ</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">บันทึกข้อความที่ใช้บ่อย เพื่อคัดลอกตอบลูกค้าได้รวดเร็ว</p>
          </div>
        </div>
        
        <button 
          onClick={openAddModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-violet-600 text-white text-sm font-bold shadow-md shadow-violet-500/25 hover:bg-violet-700 active:scale-[0.98] transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          เพิ่มข้อความใหม่
        </button>
      </div>

      {/* Grid of Notes */}
      {notes.length === 0 ? (
        <div className="text-center py-20 bg-white/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">ยังไม่มีข้อความตอบกลับ</h3>
          <p className="text-sm text-slate-500 mt-1">กดปุ่ม "เพิ่มข้อความใหม่" ด้านบนเพื่อเริ่มต้นใช้งาน</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {notes.map(note => (
            <div key={note.id} className="group flex flex-col bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-white/8 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3 gap-2">
                <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{note.title}</h3>
                
                <div className="flex items-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => openEditModal(note)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                  </button>
                  <button onClick={() => handleDelete(note.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
              </div>
              
              <div className="flex-1 mb-5">
                <div className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-4 leading-relaxed font-normal bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                  {note.content}
                </div>
              </div>

              <button 
                onClick={() => handleCopy(note)}
                className={`w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold transition-all ${
                  copiedId === note.id 
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {copiedId === note.id ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    คัดลอกแล้ว
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
                    คัดลอกข้อความ
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !saving && setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                </div>
                {editId ? 'แก้ไขข้อความ' : 'เพิ่มข้อความใหม่'}
              </h3>
              <button onClick={() => !saving && setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-5 sm:p-6 space-y-5">
              <div>
                <label className={label}>หัวข้อ (ใช้อ้างอิง)</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="เช่น: ข้อความทักทายลูกค้าใหม่"
                  className={field}
                  autoFocus
                />
              </div>
              
              <div>
                <label className={label}>เนื้อหาข้อความ (ที่จะใช้คัดลอก)</label>
                <textarea 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  placeholder="พิมพ์ข้อความที่ต้องการบันทึก..."
                  className={`${field} h-40 resize-none py-3`}
                />
              </div>
            </div>
            
            <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/20 rounded-b-2xl">
              <button 
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="h-11 px-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSave}
                disabled={!title.trim() || !content.trim() || saving}
                className="h-11 px-7 rounded-xl bg-violet-600 text-white font-bold shadow-md shadow-violet-500/25 hover:bg-violet-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-w-[120px]"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    บันทึก
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
