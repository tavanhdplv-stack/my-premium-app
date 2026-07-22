const fs = require('fs');
const file = 'c:/Users/Acer/OneDrive/Desktop/my-first-webapp/my-premium-app/app/components/OrderWallet.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `) : (
                              <button
                                title="ດູລາຍລະອຽດ"
                                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-200 transition-all mx-auto"
                              >
                                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
                                </svg>
                              </button>
                            )}`;

const replacement = `) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  title="ແກ້ໄຂຍອດບິນ"
                                  onClick={() => {
                                    const newAmt = prompt('ໃສ່ຍອດເງິນໃໝ່ (ກະລຸນາໃສ່ສະເພາະຕົວເລກ):', String(h.inAmt || h.outAmt || 0));
                                    if (newAmt !== null) {
                                      const numAmt = Number(newAmt.replace(/,/g, ''));
                                      if (!isNaN(numAmt)) {
                                        const updateField = h.paymentMethod === 'ຈ່າຍແລ້ວ' ? 'price' : 'deposit';
                                        updateDoc(doc(db, 'orders', h.rawId), { [updateField]: numAmt });
                                      }
                                    }
                                  }}
                                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-200 transition-all"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                  </svg>
                                </button>
                                <button
                                  title="ດູລາຍລະອຽດ"
                                  onClick={() => {
                                    // Normally you'd trigger your order details modal here.
                                    alert('ຟັງຊັນນີ້ຍັງບໍ່ເປີດໃຊ້ງານໃນໜ້ານີ້');
                                  }}
                                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-200 transition-all"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
                                  </svg>
                                </button>
                              </div>
                            )}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Success');
} else {
  console.log('Target not found in file. Let us do a more flexible replace.');
  const lines = content.split('\\n');
  const index = lines.findIndex(l => l.includes('title="ດູລາຍລະອຽດ"'));
  if (index !== -1) {
     console.log('Found line at', index);
     // replace manually
     const btnStart = index - 1;
     let btnEnd = index;
     while (!lines[btnEnd].includes('</button>')) btnEnd++;
     
     lines.splice(btnStart, btnEnd - btnStart + 1, ...replacement.split('\\n').slice(1, -1));
     fs.writeFileSync(file, lines.join('\\n'), 'utf8');
     console.log('Success via lines');
  } else {
     console.log('Failed');
  }
}
