
import React, { useState, useMemo } from 'react';
import { T } from '../translations';
import { getCurrentMonthStr, getLocalDateStr, getUserRoleInMonth, getActiveResidentsInMonth } from '../db';
import { Role, Bazar, MessSystemDB } from '../types';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Sigma,
  Send,
  UserCheck,
  X,
  PlusCircle,
  Calendar,
  Banknote,
  FileText,
  CheckCircle2
} from 'lucide-react';

interface BazarEntryProps {
  month: string;
  userId: string;
  isAdmin: boolean;
  db: MessSystemDB;
  updateDB: (updates: Partial<MessSystemDB>) => void;
}

const BazarEntry: React.FC<BazarEntryProps> = ({ month, userId, isAdmin, db, updateDB }) => {
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSavedEntry, setLastSavedEntry] = useState<any>(null);
  
  const isMonthLocked = (db.lockedMonths || []).includes(month);

  const [newEntry, setNewEntry] = useState<Partial<Bazar>>({
    date: getLocalDateStr().startsWith(month) ? getLocalDateStr() : `${month}-01`,
    amount: 0,
    note: '',
    userId: ''
  });

  const isEditableView = useMemo(() => {
    if (isMonthLocked) return false;
    if (isAdmin) return true;
    const effectiveRole = getUserRoleInMonth(db, userId, month);
    return effectiveRole === Role.MANAGER;
  }, [db, userId, isAdmin, month, isMonthLocked]);

  const activeResidents = useMemo(() => {
    return getActiveResidentsInMonth(db, month);
  }, [db.users, month]);

  const monthBazars = useMemo(() => {
    return db.bazars.filter(b => b.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date));
  }, [db.bazars, month]);

  const totalMonthBazar = useMemo(() => {
    return monthBazars.reduce((sum, b) => sum + b.amount, 0);
  }, [monthBazars]);

  const addBazar = () => {
    if (!newEntry.userId) {
      alert("দয়া করে মেম্বার সিলেক্ট করুন।");
      return;
    }
    if (!newEntry.amount || newEntry.amount <= 0) {
      alert("সঠিক টাকার পরিমাণ প্রদান করুন।");
      return;
    }

    const entry: Bazar = {
      id: crypto.randomUUID(),
      userId: newEntry.userId!,
      date: newEntry.date!,
      amount: newEntry.amount!,
      note: newEntry.note || ''
    };

    const selectedUser = db.users.find(u => u.id === newEntry.userId);
    
    updateDB({ bazars: [...db.bazars, entry] });
    
    // সেভ হওয়া ডাটা স্টোর করা সাকসেস পপ-আপের জন্য
    setLastSavedEntry({
      ...entry,
      userName: selectedUser?.name || 'অজানা'
    });

    // ফর্ম রিসেট
    setNewEntry({ 
      date: getLocalDateStr().startsWith(month) ? getLocalDateStr() : `${month}-01`,
      amount: 0, 
      note: '', 
      userId: '' 
    });
    
    setShowModal(false);
    setShowSuccessModal(true); // সাকসেস পপ-আপ দেখানো
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3 text-white">
            <ShoppingBag className="text-green-500" /> বাজার খরচ ({month})
          </h2>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">সব মেম্বারের বাজারের হিসাব</p>
        </div>

        {isEditableView && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-xs shadow-xl shadow-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <PlusCircle size={20} /> বাজার যোগ করুন
          </button>
        )}
      </div>

      <div className="bg-green-600/10 border border-green-500/20 p-6 rounded-[2rem] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-600 text-white rounded-2xl shadow-xl">
            <Sigma size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">এই মাসের মোট বাজার খরচ</p>
            <h3 className="text-2xl font-black text-white">৳ {totalMonthBazar.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-800/40 text-[10px] uppercase font-black text-gray-500">
                <th className="px-8 py-6">তারিখ</th>
                <th className="px-6 py-6">সদস্য</th>
                <th className="px-6 py-6">নোট/বিবরণ</th>
                <th className="px-6 py-6 text-right">পরিমাণ (৳)</th>
                <th className="px-8 py-6 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {monthBazars.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-10 text-center text-gray-600 italic">এই মাসে কোনো বাজার খরচ নেই</td></tr>
              ) : (
                monthBazars.map(b => (
                  <tr key={b.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-8 py-6 text-sm font-bold text-gray-400 group-hover:text-white">{b.date}</td>
                    <td className="px-6 py-6">
                       <div className="flex items-center gap-2">
                          <UserCheck size={14} className="text-green-500/50" />
                          <span className="font-black text-white">{db.users.find(u => u.id === b.userId)?.name || 'অজানা'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-6">
                       <span className="text-xs text-gray-400 font-medium">{b.note || '-'}</span>
                    </td>
                    <td className="px-6 py-6 text-right font-black text-green-500 text-lg">৳ {b.amount.toLocaleString()}</td>
                    <td className="px-8 py-6 text-right">
                      {isEditableView && (
                        <button 
                          onClick={() => { if(window.confirm("আপনি কি এই বাজার এন্ট্রিটি মুছে ফেলতে চান?")) updateDB({ bazars: db.bazars.filter(x => x.id !== b.id) }); }}
                          className="p-2.5 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* বাজার যোগ করার পপ-আপ মোডাল */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-md rounded-[3rem] border border-gray-800 p-8 md:p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600 rounded-xl text-white">
                  <PlusCircle size={24} />
                </div>
                <h3 className="text-2xl font-black text-white">নতুন বাজার এন্ট্রি</h3>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-gray-500 hover:text-white transition-colors p-2 bg-gray-800 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <UserCheck size={12} className="text-blue-500" /> মেম্বার সিলেক্ট করুন
                </label>
                <select 
                  className="w-full bg-gray-800 border border-gray-700 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-green-600 appearance-none"
                  value={newEntry.userId}
                  onChange={e => setNewEntry({...newEntry, userId: e.target.value})}
                >
                  <option value="">মেম্বার বাছাই করুন...</option>
                  {activeResidents.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Banknote size={12} className="text-green-500" /> টাকার পরিমাণ (৳)
                  </label>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full bg-gray-800 border border-gray-700 rounded-2xl p-4 text-white font-black outline-none focus:ring-2 focus:ring-green-600"
                    value={newEntry.amount || ''}
                    onFocus={e => e.target.select()}
                    onChange={e => setNewEntry({...newEntry, amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Calendar size={12} className="text-purple-500" /> তারিখ
                  </label>
                  <input 
                    type="date" 
                    className="w-full bg-gray-800 border border-gray-700 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-green-600"
                    value={newEntry.date}
                    onChange={e => setNewEntry({...newEntry, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <FileText size={12} className="text-amber-500" /> নোট/বিবরণ (অপশনাল)
                </label>
                <textarea 
                  placeholder="বাজারের তালিকা বা বিশেষ নোট..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-green-600 min-h-[100px] resize-none"
                  value={newEntry.note}
                  onChange={e => setNewEntry({...newEntry, note: e.target.value})}
                />
              </div>

              <button 
                onClick={addBazar}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs shadow-xl shadow-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"
              >
                <Send size={18} /> সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* সাকসেস ওভারভিউ পপ-আপ */}
      {showSuccessModal && lastSavedEntry && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[110] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-[3.5rem] border border-green-500/30 p-10 shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-500/30">
                <CheckCircle2 size={48} />
              </div>
            </div>
            
            <h3 className="text-2xl font-black text-white mb-2">সফলভাবে যুক্ত হয়েছে!</h3>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-8">বাজার খরচের সারসংক্ষেপ</p>
            
            <div className="bg-gray-800/50 rounded-3xl border border-gray-800 p-6 space-y-4 mb-8">
               <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-[10px] font-black uppercase">সদস্য</span>
                  <span className="text-white font-black">{lastSavedEntry.userName}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-[10px] font-black uppercase">পরিমাণ</span>
                  <span className="text-green-500 font-black text-xl">৳{lastSavedEntry.amount}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-[10px] font-black uppercase">তারিখ</span>
                  <span className="text-gray-300 font-bold">{lastSavedEntry.date}</span>
               </div>
               {lastSavedEntry.note && (
                 <div className="pt-2 border-t border-gray-700 text-left">
                    <p className="text-gray-500 text-[10px] font-black uppercase mb-1">নোট:</p>
                    <p className="text-gray-400 text-xs italic">"{lastSavedEntry.note}"</p>
                 </div>
               )}
            </div>

            <button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-5 rounded-2xl font-black uppercase text-xs transition-all active:scale-95"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BazarEntry;
