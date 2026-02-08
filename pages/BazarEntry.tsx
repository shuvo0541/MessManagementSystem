
import React, { useState, useMemo } from 'react';
import { T } from '../translations';
import { getCurrentMonthStr, getLocalDateStr, getUserRoleInMonth } from '../db';
import { Role, Bazar, MessSystemDB } from '../types';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Calendar, 
  Lock, 
  ShieldCheck, 
  AlertTriangle, 
  X,
  Info,
  TrendingDown,
  Sigma,
  UserX
} from 'lucide-react';

interface BazarEntryProps {
  month: string;
  userId: string;
  isAdmin: boolean;
  db: MessSystemDB;
  updateDB: (updates: Partial<MessSystemDB>) => void;
}

const BazarEntry: React.FC<BazarEntryProps> = ({ month, userId, isAdmin, db, updateDB }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState<Partial<Bazar>>({
    date: getLocalDateStr().startsWith(month) ? getLocalDateStr() : `${month}-01`,
    amount: 0,
    note: '',
    userId: ''
  });

  // Check if current user is OFF for this month
  const isCurrentUserOff = useMemo(() => {
    const user = db.users.find(u => u.id === userId);
    if (!user || user.isAdmin) return false;
    return user.isPermanentlyOff || (user.monthlyOff || []).includes(month);
  }, [db.users, userId, month]);

  const isEditableView = useMemo(() => {
    if (isAdmin) return true;
    if (isCurrentUserOff) return false; // Off members are restricted
    const effectiveRole = getUserRoleInMonth(db, userId, month);
    return effectiveRole === Role.MANAGER;
  }, [db, userId, isAdmin, month, isCurrentUserOff]);

  const monthBazars = useMemo(() => {
    return db.bazars.filter(b => b.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date));
  }, [db.bazars, month]);

  const totalMonthBazar = useMemo(() => {
    return monthBazars.reduce((sum, b) => sum + b.amount, 0);
  }, [monthBazars]);

  // CRITICAL: Filter active residents for selection dropdown
  const activeResidents = useMemo(() => {
    return db.users.filter(u => 
      !u.isAdmin && 
      !u.isPermanentlyOff && 
      !(u.monthlyOff || []).includes(month)
    );
  }, [db.users, month]);

  const bazarToDelete = useMemo(() => {
    return db.bazars.find(b => b.id === deleteConfirmId);
  }, [deleteConfirmId, db.bazars]);

  const addBazar = () => {
    const entryMonth = newEntry.date?.substring(0, 7);
    const canAdd = isAdmin || (entryMonth && getUserRoleInMonth(db, userId, entryMonth) === Role.MANAGER);
    
    if (!canAdd) {
      alert(`আপনার তথ্য যোগ করার অনুমতি নেই।`);
      return;
    }
    
    if (!newEntry.userId || !newEntry.amount || newEntry.amount <= 0) {
      alert("সঠিক তথ্য প্রদান করুন");
      return;
    }
    const entry: Bazar = {
      id: crypto.randomUUID(),
      userId: newEntry.userId!,
      date: newEntry.date!,
      amount: newEntry.amount!,
      note: newEntry.note || ''
    };
    updateDB({ bazars: [...db.bazars, entry] });
    setShowAdd(false);
    setNewEntry({ 
      date: getLocalDateStr().startsWith(month) ? getLocalDateStr() : `${month}-01`, 
      amount: 0, 
      note: '', 
      userId: '' 
    });
  };

  const executeDelete = () => {
    if (!deleteConfirmId || !bazarToDelete) return;
    updateDB({ bazars: db.bazars.filter(b => b.id !== deleteConfirmId) });
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3 text-white">
            <ShoppingBag className="text-green-500" />
            বাজার এন্ট্রি
          </h2>
          <div className="flex items-center gap-2 mt-2">
             <span className="text-[10px] font-black bg-green-900/30 text-green-400 border border-green-500/20 px-3 py-1 rounded-full uppercase tracking-widest">{month}</span>
             {isEditableView ? (
               <span className="text-[10px] font-black bg-blue-900/20 text-blue-400 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-500/20 flex items-center gap-1">
                 <ShieldCheck size={10}/> {isAdmin ? 'এডমিন' : 'ম্যানেজার'} মোড
               </span>
             ) : (
               <span className="text-[10px] font-black bg-red-900/20 text-red-400 px-3 py-1 rounded-full uppercase tracking-widest border border-red-500/20 flex items-center gap-1">
                 <Lock size={10}/> রিড-অনলি মোড
               </span>
             )}
          </div>
        </div>
        {isEditableView && (
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-3xl transition-all font-black shadow-lg shadow-green-500/20 w-full sm:w-auto text-xs uppercase tracking-widest active:scale-95"
          >
            <Plus size={18} />
            নতুন খরচ যোগ করুন
          </button>
        )}
      </div>

      {isCurrentUserOff && !isAdmin && (
        <div className="bg-amber-900/10 border border-amber-500/20 p-5 rounded-3xl flex items-center gap-4">
           <div className="p-2 bg-amber-600 rounded-xl text-white">
              <UserX size={20}/>
           </div>
           <div>
              <p className="text-xs font-black text-amber-500 uppercase tracking-widest">অ্যাক্সেস সীমিত</p>
              <p className="text-[11px] text-amber-200/70 font-bold">আপনি বর্তমানে "OFF" মুডে আছেন। শুধুমাত্র তথ্য দেখতে পারবেন।</p>
           </div>
        </div>
      )}

      {/* Summary Box (Monthly Total) */}
      <div className="bg-green-600/10 border border-green-500/20 p-6 rounded-[2rem] flex items-center justify-between shadow-lg shadow-green-500/5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-600 text-white rounded-2xl shadow-lg shadow-green-500/20">
            <Sigma size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">এই মাসের মোট বাজার খরচ</p>
            <h3 className="text-2xl font-black text-white">৳ {totalMonthBazar.toLocaleString()}</h3>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-green-400/50 text-[10px] font-black uppercase tracking-widest">
          <Info size={14} />
          অ্যাক্টিভ সদস্যদের খরচের হিসাব
        </div>
      </div>

      <div className="bg-gray-900 rounded-[2rem] border border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/40 text-left text-[10px] uppercase tracking-[0.2em] font-black text-gray-500">
                <th className="px-8 py-6">তারিখ</th>
                <th className="px-6 py-6">সদস্য</th>
                <th className="px-6 py-6 text-right">পরিমাণ (৳)</th>
                <th className="px-6 py-6">নোট</th>
                <th className="px-8 py-6 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {monthBazars.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-600 italic font-bold">কোনো বাজার এন্ট্রি করা হয়নি</td>
                </tr>
              ) : (
                monthBazars.map(b => (
                  <tr key={b.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
                        <Calendar size={14} className="text-blue-500" />
                        {b.date}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="font-black text-white text-sm">
                        {db.users.find(u => u.id === b.userId)?.name}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right font-black text-green-500 text-lg">৳ {b.amount.toLocaleString()}</td>
                    <td className="px-6 py-6 text-gray-500 text-sm italic font-medium max-w-xs truncate">{b.note || '-'}</td>
                    <td className="px-8 py-6 text-right">
                      {isEditableView ? (
                        <button 
                          onClick={() => setDeleteConfirmId(b.id)}
                          className="p-2.5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : (
                        <Lock size={16} className="text-gray-700 ml-auto" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-gray-900 w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-10 border border-gray-800 shadow-2xl">
            <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
              <ShoppingBag className="text-green-500" />
              নতুন বাজার এন্ট্রি
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 ml-2 tracking-widest">টাকার পরিমাণ</label>
                <input 
                  type="number" 
                  className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-4 text-xl font-black text-green-500 focus:ring-2 focus:ring-green-500 outline-none placeholder:text-gray-700"
                  value={newEntry.amount || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 ml-2 tracking-widest">তারিখ</label>
                  <input 
                    type="date" 
                    className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 ml-2 tracking-widest">খরচকারী (অ্যাক্টিভ মেম্বার)</label>
                  <select 
                    className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-green-500 outline-none cursor-pointer"
                    value={newEntry.userId}
                    onChange={(e) => setNewEntry({ ...newEntry, userId: e.target.value })}
                  >
                    <option value="">মেম্বার সিলেক্ট করুন...</option>
                    {activeResidents.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 ml-2 tracking-widest">নোট (অপশনাল)</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-green-500 outline-none placeholder:text-gray-700"
                  value={newEntry.note}
                  onChange={(e) => setNewEntry({ ...newEntry, note: e.target.value })}
                  placeholder="যেমন: সবজি, মাছ, ডিম"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-4 text-gray-500 font-black uppercase text-xs">বাতিল</button>
                <button onClick={addBazar} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-green-500/20 active:scale-95 transition-all">সেভ করুন</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && bazarToDelete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gray-950 w-full max-w-md rounded-[3rem] border border-red-500/30 overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in zoom-in-95 duration-300">
            <div className="bg-red-500/10 p-10 flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                <AlertTriangle size={40} className="text-white animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">বাজার খরচ ডিলিট</h3>
                <p className="text-red-400 font-bold text-lg">
                  আপনি কি নিশ্চিতভাবে <span className="underline">৳{bazarToDelete.amount.toLocaleString()}</span> টাকার এই বাজার খরচটি মুছে ফেলতে চান?
                </p>
              </div>

              <div className="flex w-full gap-4 pt-4">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-2xl font-black uppercase text-xs transition-all"
                >
                  বাতিল করুন
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  হ্যাঁ, ডিলিট করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BazarEntry;
