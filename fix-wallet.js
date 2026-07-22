const fs = require('fs');

const file = 'c:/Users/Acer/OneDrive/Desktop/my-first-webapp/my-premium-app/app/components/OrderWallet.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add handlers for edit/delete wallet
const handlersCode = `  const handleAddWallet = async () => {`;
const newHandlersCode = `  const handleEditWallet = async (id: string, oldName: string) => {
    const newName = prompt('ແກ້ໄຂຊື່ກະເປົາ:', oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;
    try {
      await setDoc(doc(db, 'wallets', id), { name: newName.trim() }, { merge: true });
    } catch (err) {
      console.error('Error editing wallet:', err);
    }
  };

  const handleDeleteWallet = async (id: string) => {
    if (!confirm('ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບກະເປົານີ້?\\n(ຂໍ້ມູນທຸລະກຳທີ່ຜູກກັບກະເປົານີ້ຈະຍັງຢູ່ແຕ່ກະເປົາຈະຫາຍໄປ)')) return;
    try {
      await deleteDoc(doc(db, 'wallets', id));
    } catch (err) {
      console.error('Error deleting wallet:', err);
    }
  };

  const handleAddWallet = async () => {`;
content = content.replace(handlersCode, newHandlersCode);

// 2. Fix the wallet card styles to support light mode properly
content = content.replace(
  /'bg-white\/\[0\.04\] border-white\/10 hover:border-white\/20 hover:bg-white\/\[0\.08\]'/g,
  "'bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.08] shadow-sm'"
);

content = content.replace(
  /<h3 className="text-xl font-bold text-white flex items-center gap-2 tracking-wide">/g,
  '<h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 tracking-wide">'
);

content = content.replace(
  /<p className="text-\[10px\] text-slate-400\/80 font-mono mt-1 opacity-70">ID: \{wallet\.id\}<\/p>/g,
  '<p className="text-[10px] text-slate-500 dark:text-slate-400/80 font-mono mt-1 opacity-70">ID: {wallet.id}</p>'
);

// 3. Add edit/delete buttons in the header
const headerReplacement = `{isMain ? (
                        <svg className="w-5 h-5 text-amber-400 drop-shadow-md" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2l1.22 3.76h3.96l-3.2 2.33 1.22 3.76L10 9.53l-3.2 2.32 1.22-3.76-3.2-2.33h3.96L10 2z"/></svg>
                      ) : (
                        <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                      )}
                      {wallet.name}
                      {!isMain && (
                        <div className="flex items-center gap-1 ml-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handleEditWallet(wallet.id, wallet.name); }} className="p-1.5 rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/20" title="ແກ້ໄຂຊື່">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteWallet(wallet.id); }} className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20" title="ລຶບກະເປົາ">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      )}`;
content = content.replace(
  /\{isMain \? \([\s\S]*?\{wallet\.name\}/m,
  headerReplacement
);

// Fix inner grids for light mode
content = content.replace(
  /stats\.bal >= 0 \? 'text-white' : 'text-rose-400'/g,
  "stats.bal >= 0 ? 'text-slate-800 dark:text-white' : 'text-rose-500 dark:text-rose-400'"
);
content = content.replace(
  /stats\.bal >= 0 \? 'text-slate-300' : 'text-rose-400\/70'/g,
  "stats.bal >= 0 ? 'text-slate-500 dark:text-slate-300' : 'text-rose-500/70 dark:text-rose-400/70'"
);

content = content.replace(
  /className="bg-slate-950\/40 /g,
  'className="bg-slate-100 dark:bg-slate-950/40 '
);
content = content.replace(
  /className="text-sm sm:text-base font-bold text-blue-100 /g,
  'className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-100 '
);

content = content.replace(
  /className="bg-emerald-950\/20 /g,
  'className="bg-emerald-50 dark:bg-emerald-950/20 '
);
content = content.replace(
  /className="text-sm sm:text-base font-bold text-emerald-400 /g,
  'className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 '
);

content = content.replace(
  /className="bg-rose-950\/20 /g,
  'className="bg-rose-50 dark:bg-rose-950/20 '
);
content = content.replace(
  /className="text-sm sm:text-base font-bold text-rose-400 /g,
  'className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 '
);

// Light mode buttons
content = content.replace(
  /bg-white text-slate-900/g,
  'bg-slate-200 dark:bg-white text-slate-900'
);


fs.writeFileSync(file, content);
console.log('Applied wallet edits');
