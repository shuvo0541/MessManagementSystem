
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
  CheckCircle2,
  Clock
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
    
    setLastSavedEntry({
      ...entry,
      userName: selectedUser?.name || 'অজানা'
    });

    setNewEntry({ 
      date: getLocalDateStr().startsWith(month) ? getLocalDateStr() : `${month}-01`,
      amount: 0, 
      note: '', 
      userId: '' 
    });
    
    setShowModal(false);
    setShowSuccessModal(true);
  };

  return (
    <div className="space-y-6 pb-10 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-3xl font-black flex items-center gap-3 text-white">
            <ShoppingBag className="text-green-500" /> বাজার খরচ ({month})
          </h2>
          <p className="text-gray-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">সব মেম্বারের বাজারের হিসাব</p>
        </div>

        {isEditableView && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-[1.5rem] font-black uppercase text-[10px] sm:text-xs shadow-xl shadow-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 sm:gap-3"
          >
            <PlusCircle size={18} /> বাজার যোগ করুন
          </button>
        )}
      </div>

      <div className="bg-green-600/10 border border-green-500/20 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-green-600 text-white rounded-xl sm:rounded-2xl shadow-xl shadow-green-500/10">
            <Sigma size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[8px] sm:text-[10px] font-black text-green-400 uppercase tracking-widest">এই মাসের মোট বাজার খরচ</p>
            <h3 className="text-xl sm:text-2xl font-black text-white">৳ {totalMonthBazar.toFixed(2)}</h3>
          </div>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="grid grid-cols-1 gap-4 sm:hidden">
        {monthBazars.length === 0 ? (
          <div className="bg-gray-900/50 p-10 rounded-2xl border border-gray-800 text-center text-gray-500 font-bold italic">কোনো বাজার খরচ নেই</div>
        ) : (
          monthBazars.map(b => (
            <div key={b.id} className="bg-gray-900 p-5 rounded-2xl border border-gray-800 space-y-4 relative">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                   <div className="flex items-center gap-2 text-[10px] text-gray-500 font-black uppercase">
                      <Calendar size={12}/> {b.date}
                   </div>
                   <h4 className="font-black text-white">{db.users.find(u => u.id === b.userId)?.name || 'অজানা'}</h4>
                </div>
                <div className="text-right">
                   <p className="text-lg font-black text-green-500">৳{b.amount.toFixed(2)}</p>
                </div>
              </div>
              {b.note && <p className="text-xs text-gray-500 font-medium italic border-t border-gray-800 pt-3">"{b.note}"</p>}
              {isEditableView && (
                <button 
                  onClick={() => { if(window.confirm("মুছে ফেলতে চান?")) updateDB({ bazars: db.bazars.filter(x => x.id !== b.id) }); }}
                  className="absolute bottom-4 right-4 p-2 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto no-scrollbar">
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
              {monthBazars.map(b => (
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
                  <td className="px-6 py-6 text-right font-black text-green-500 text-lg">৳ {b.amount.toFixed(2)}</td>
                  <td className="px-8 py-6 text-right">
                    {isEditableView && (
                      <button 
                        onClick={() => { if(window.confirm("মুছে ফেলতে চান?")) updateDB({ bazars: db.bazars.filter(x => x.id !== b.id) }); }}
                        className="p-2.5 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-md rounded-[2.5rem] sm:rounded-[3rem] border border-gray-800 p-6 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600 rounded-lg sm:rounded-xl text-white">
                  <PlusCircle size={20} />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">নতুন বাজার এন্ট্রি</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white p-2 bg-gray-800 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-1.5">
                <label className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">মেম্বার সিলেক্ট করুন</label>
                <select className="w-full bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-white font-bold outline-none focus:ring-2 focus:ring-green-600" value={newEntry.userId} onChange={e => setNewEntry({...newEntry, userId: e.target.value})}>
                  <option value="">মেম্বার বাছাই করুন...</option>
                  {activeResidents.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">পরিমাণ (৳)</label>
                  <input type="number" step="0.01" placeholder="0.00" className="w-full bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-white font-black outline-none focus:ring-2 focus:ring-green-600" value={newEntry.amount || ''} onFocus={e => e.target.select()} onChange={e => setNewEntry({...newEntry, amount: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">তারিখ</label>
                  <input type="date" className="w-full bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-white font-bold outline-none focus:ring-2 focus:ring-green-600" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">নোট/বিবরণ</label>
                <textarea placeholder="বিবরণ..." className="w-full bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-white font-bold outline-none focus:ring-2 focus:ring-green-600 min-h-[80px] sm:min-h-[100px] resize-none" value={newEntry.note} onChange={e => setNewEntry({...newEntry, note: e.target.value})} />
              </div>
              <button onClick={addBazar} className="w-full bg-green-600 hover:bg-green-700 text-white py-4 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-black uppercase text-[10px] sm:text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">সেভ করুন</button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && lastSavedEntry && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[110] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] sm:rounded-[3.5rem] border border-green-500/30 p-8 sm:p-10 shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-600 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-green-500/20"><CheckCircle2 size={32} className="sm:w-12 sm:h-12" /></div>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-2">সফল হয়েছে!</h3>
            <div className="bg-gray-800/50 rounded-2xl sm:rounded-3xl border border-gray-800 p-5 sm:p-6 space-y-3 sm:space-y-4 mb-6 sm:mb-8">
               <div className="flex justify-between items-center"><span className="text-gray-500 text-[8px] sm:text-[10px] font-black uppercase">সদস্য</span><span className="text-white font-black text-sm">{lastSavedEntry.userName}</span></div>
               <div className="flex justify-between items-center"><span className="text-gray-500 text-[8px] sm:text-[10px] font-black uppercase">পরিমাণ</span><span className="text-green-500 font-black text-lg">৳{lastSavedEntry.amount.toFixed(2)}</span></div>
               <div className="flex justify-between items-center"><span className="text-gray-500 text-[8px] sm:text-[10px] font-black uppercase">তারিখ</span><span className="text-gray-300 font-bold text-xs">{lastSavedEntry.date}</span></div>
            </div>
            <button onClick={() => setShowSuccessModal(false)} className="w-full bg-gray-800 hover:bg-gray-700 text-white py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs transition-all">ঠিক আছে</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Add missing default export
export default BazarEntry;
