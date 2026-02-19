
import React, { useState, useMemo, useEffect } from 'react';
import { MessSystemDB, Room, UtilityExpense, User, Role, MonthlyUtilityOverride, CalcMode, MonthlyRoomOverride, LocalUtilityExpense } from '../types';
import { T } from '../translations';
import { 
  Home, 
  Zap, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  X,
  Table as TableIcon,
  Eye,
  Lock,
  PlusCircle,
  Settings2,
  UserCheck,
  ChevronRight,
  ShieldAlert,
  Wallet,
  Coins
} from 'lucide-react';
import { getUserRoleInMonth, getCalculations } from '../db';

interface UtilityRoomProps {
  db: MessSystemDB;
  updateDB: (updates: Partial<MessSystemDB>) => void;
  month: string;
  user: User;
  messId: string;
}

const UtilityRoom: React.FC<UtilityRoomProps> = ({ db, updateDB, month, user, messId }) => {
  const [showRoomAdd, setShowRoomAdd] = useState(false);
  const [showUtilityAdd, setShowUtilityAdd] = useState(false);
  const [showLocalUtilityAdd, setShowLocalUtilityAdd] = useState(false);
  const [editingModeUtilId, setEditingModeUtilId] = useState<string | null>(null);
  
  const [roomName, setRoomName] = useState('');
  const [roomRent, setRoomRent] = useState(0);
  const [utilityName, setUtilityName] = useState('');
  const [utilityAmount, setUtilityAmount] = useState(0);

  const isMonthLocked = (db.lockedMonths || []).includes(month);
  const userRole = useMemo(() => getUserRoleInMonth(db, user.id, month), [db, user.id, month]);
  const isAdminUser = user.isAdmin === true;
  const isCurrentManager = userRole === Role.MANAGER;
  const canManage = (isAdminUser || isCurrentManager);
  const isEditable = canManage && !isMonthLocked;

  const stats = useMemo(() => getCalculations(db, month), [db, month]);
  
  const activeResidents = useMemo(() => {
    return db.users.filter(u => 
      !u.isPermanentlyOff && 
      !(u.monthlyOff || []).includes(month)
    );
  }, [db.users, month]);

  const utilityBreakdown = useMemo(() => {
    const globalUtils = db.utilities.map(master => {
      const override = (db.monthlyUtilityOverrides || []).find(ov => ov.utilityId === master.id && ov.month === month);
      const amount = override ? override.amount : master.amount;
      const mode = override ? override.calcMode : master.defaultCalcMode;
      const values = (override ? override.calcValues : {}) as Record<string, number>;

      const shares: Record<string, number> = {};
      calculateLocalShares(amount, mode, values, activeResidents, shares);

      return { id: master.id, name: master.name, amount, mode, shares, isLocal: false };
    });

    const localUtils = (db.localUtilities || []).filter(lu => lu.month === month).map(local => {
      const shares: Record<string, number> = {};
      calculateLocalShares(local.amount, local.calcMode, local.calcValues, activeResidents, shares);
      return { id: local.id, name: local.name, amount: local.amount, mode: local.calcMode, shares, isLocal: true };
    });

    return [...globalUtils, ...localUtils];
  }, [db.utilities, db.monthlyUtilityOverrides, db.localUtilities, month, activeResidents]);

  function calculateLocalShares(amount: number, mode: CalcMode, values: any, residents: User[], shares: Record<string, number>) {
    if (mode === CalcMode.FIXED) {
      let fixedTotal = 0;
      const fixedUserIds = new Set<string>();
      Object.entries(values).forEach(([uid, val]: [string, any]) => {
        shares[uid] = val;
        fixedTotal += val;
        fixedUserIds.add(uid);
      });
      const remaining = amount - fixedTotal;
      const remainingUsers = residents.filter(r => !fixedUserIds.has(r.id));
      if (remainingUsers.length > 0) {
        const s = remaining / remainingUsers.length;
        remainingUsers.forEach(r => shares[r.id] = s);
      }
    } else if (mode === CalcMode.MULTIPLIER) {
      let totalM = residents.reduce((sum: number, r) => sum + (Number(values[r.id]) || 1.0), 0);
      residents.forEach(r => shares[r.id] = totalM > 0 ? (amount / totalM) * (Number(values[r.id]) || 1.0) : 0);
    } else {
      const s = amount / Math.max(1, residents.length);
      residents.forEach(r => shares[r.id] = s);
    }
  }

  const performAddRoom = () => {
    if (isMonthLocked || !roomName.trim() || roomRent <= 0) return;
    const newRoom: Room = { id: crypto.randomUUID(), name: roomName, rent: roomRent, splitType: 'EQUAL' };
    updateDB({ rooms: [...db.rooms, newRoom] });
    setRoomName('');
    setRoomRent(0);
    setShowRoomAdd(false);
  };

  const performAddGlobalUtility = () => {
    if (isMonthLocked || !utilityName.trim() || utilityAmount <= 0) return;
    const newUtil: UtilityExpense = { id: crypto.randomUUID(), name: utilityName, amount: utilityAmount, defaultCalcMode: CalcMode.EQUAL };
    updateDB({ utilities: [...db.utilities, newUtil] });
    setUtilityName('');
    setUtilityAmount(0);
    setShowUtilityAdd(false);
  };

  const performAddLocalUtility = () => {
    if (isMonthLocked || !utilityName.trim() || utilityAmount <= 0) return;
    const newLocal: LocalUtilityExpense = { 
        id: crypto.randomUUID(), 
        month, 
        name: utilityName, 
        amount: utilityAmount, 
        calcMode: CalcMode.EQUAL, 
        calcValues: {} 
    };
    updateDB({ localUtilities: [...(db.localUtilities || []), newLocal] });
    setUtilityName('');
    setUtilityAmount(0);
    setShowLocalUtilityAdd(false);
  };

  const performDeleteRoom = (roomId: string) => {
    if (!isAdminUser || isMonthLocked) return;
    if (window.confirm("রুম ডিলিট করতে চান? এটি মেম্বারদের রুম অ্যাসাইনমেন্ট রিমুভ করবে।")) {
      updateDB({ 
        rooms: db.rooms.filter(room => room.id !== roomId),
        users: db.users.map(u => u.roomId === roomId ? { ...u, roomId: undefined } : u)
      });
    }
  };

  const performDeleteUtility = (id: string, isLocal: boolean) => {
    if (!canManage || isMonthLocked) return;
    if (window.confirm("মুছে ফেলতে চান?")) {
      if (isLocal) {
        updateDB({ localUtilities: (db.localUtilities || []).filter(u => u.id !== id) });
      } else {
        if (!isAdminUser) return;
        updateDB({ 
          utilities: db.utilities.filter(u => u.id !== id),
          monthlyUtilityOverrides: (db.monthlyUtilityOverrides || []).filter(ov => ov.utilityId !== id)
        });
      }
    }
  };

  const handleUpdateOverride = (override: MonthlyUtilityOverride) => {
    if (isMonthLocked) return;
    const others = (db.monthlyUtilityOverrides || []).filter(ov => !(ov.utilityId === override.utilityId && ov.month === month));
    updateDB({ monthlyUtilityOverrides: [...others, override] });
  };

  const handleUpdateLocal = (local: LocalUtilityExpense) => {
    if (isMonthLocked) return;
    const others = (db.localUtilities || []).filter(lu => lu.id !== local.id);
    updateDB({ localUtilities: [...others, local] });
  };

  const setUtilMode = (utilId: string, mode: CalcMode, isLocal: boolean) => {
    if (isMonthLocked) return;
    if (isLocal) {
      const item = db.localUtilities.find(u => u.id === utilId)!;
      handleUpdateLocal({ ...item, calcMode: mode });
    } else {
      const existing = (db.monthlyUtilityOverrides || []).find(ov => ov.utilityId === utilId && ov.month === month);
      const master = db.utilities.find(u => u.id === utilId)!;
      const ov = existing 
        ? { ...existing, calcMode: mode } 
        : { utilityId: utilId, month, amount: master.amount, calcMode: mode, calcValues: {} };
      handleUpdateOverride(ov);
    }
  };

  const setUtilValue = (utilId: string, userId: string, value: number, isLocal: boolean) => {
    if (isMonthLocked) return;
    if (isLocal) {
      const item = db.localUtilities.find(u => u.id === utilId)!;
      handleUpdateLocal({ ...item, calcValues: { ...item.calcValues, [userId]: value } });
    } else {
      const existing = (db.monthlyUtilityOverrides || []).find(ov => ov.utilityId === utilId && ov.month === month);
      const master = db.utilities.find(u => u.id === utilId)!;
      const ov = existing 
        ? { ...existing } 
        : { utilityId: utilId, month, amount: master.amount, calcMode: master.defaultCalcMode, calcValues: {} };
      ov.calcValues = { ...ov.calcValues, [userId]: value };
      handleUpdateOverride(ov);
    }
  };

  const updateRoomRent = (roomId: string, rent: number) => {
    if (isMonthLocked) return;
    if (isAdminUser) {
      updateDB({ rooms: db.rooms.map(r => r.id === roomId ? { ...r, rent } : r) });
    } else if (isCurrentManager) {
      const others = (db.monthlyRoomOverrides || []).filter(o => !(o.roomId === roomId && o.month === month));
      updateDB({ monthlyRoomOverrides: [...others, { roomId, month, rent }] });
    }
  };

  const assignRoom = (userId: string, roomId: string) => {
    if (!canManage || isMonthLocked) return;
    updateDB({ users: db.users.map(u => u.id === userId ? { ...u, roomId } : u) });
  };

  const currentEditingUtil = utilityBreakdown.find(u => u.id === editingModeUtilId);

  return (
    <div className="space-y-6 sm:space-y-8 pb-10 overflow-x-hidden px-1 sm:px-0">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-3xl font-black text-white flex items-center gap-3 sm:gap-4">
              <TableIcon size={24} className="text-purple-500 sm:w-8 sm:h-8" />
              বিল রেকর্ড ({month})
            </h2>
            <p className="text-gray-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">সব মেম্বারের বিল ডিটেইলস (দশমিকসহ)</p>
          </div>
        </div>

        {isMonthLocked && (
          <div className="bg-red-900/10 border border-red-500/20 p-4 sm:p-5 rounded-xl sm:rounded-3xl flex items-center gap-3 sm:gap-4 shadow-lg">
            <div className="p-2 bg-red-600 rounded-lg text-white shadow-lg shadow-red-500/10 shrink-0">
              <Lock size={18}/>
            </div>
            <div>
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">বিল রেকর্ড লকড (Locked)</p>
              <p className="text-[11px] text-red-200/70 font-bold">এই মাসে কোনো তথ্য পরিবর্তন সম্ভব নয়।</p>
            </div>
          </div>
        )}

        {/* মোবাইল ভিউ (Card Layout) */}
        <div className="sm:hidden space-y-4">
          {stats.userStats.filter((u:any) => u.isActive).map((u: any) => {
            const userUtilitiesTotal = utilityBreakdown.reduce((s: number, util: any) => s + (Number(util.shares[u.userId]) || 0), 0);
            const isCurrent = u.userId === user.id;
            const totalWithRent = Number(u.roomRent || 0) + Number(userUtilitiesTotal);
            const userRoom = db.rooms.find(r => r.id === db.users.find(usr => usr.id === u.userId)?.roomId);
            
            return (
              <div key={u.userId} className={`bg-gray-900 border ${isCurrent ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-gray-800'} p-5 rounded-2xl space-y-4 shadow-xl`}>
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 ${isCurrent ? 'bg-blue-600' : 'bg-gray-800'} text-white rounded-xl flex items-center justify-center font-black text-sm`}>
                      {u.name[0]}
                    </div>
                    <div>
                      <h4 className={`font-black text-sm ${isCurrent ? 'text-blue-400' : 'text-white'}`}>{u.name}</h4>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{userRoom?.name || 'রুমহীন'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">মোট বিল</p>
                    <p className="text-lg font-black text-blue-500">৳{totalWithRent.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-bold">রুম ভাড়া</span>
                    <span className="text-gray-200 font-black">৳{u.roomRent.toFixed(2)}</span>
                  </div>
                  {utilityBreakdown.map(util => (
                    <div key={util.id} className="flex justify-between items-center">
                      <span className="text-gray-500 font-bold truncate max-w-[60px]">{util.name}</span>
                      <span className="text-gray-200 font-black">৳{(util.shares[u.userId] || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ডেক্সটপ ভিউ (Table Layout) */}
        <div className="hidden sm:block bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl relative">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[700px] sm:min-w-0">
              <thead>
                <tr className="bg-gray-800/40 text-[9px] sm:text-[10px] uppercase font-black text-gray-500 border-b border-gray-800">
                  <th className="px-6 sm:px-8 py-5 sm:py-7">সদস্য</th>
                  <th className="px-4 sm:px-6 py-5 sm:py-7 text-right">ভাড়া</th>
                  {utilityBreakdown.map(u => (
                    <th key={u.id} className="px-3 sm:px-4 py-5 sm:py-7 text-right whitespace-nowrap">{u.name}</th>
                  ))}
                  <th className="px-6 sm:px-8 py-5 sm:py-7 text-right text-white bg-blue-900/20">মোট (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {stats.userStats.filter((u:any) => u.isActive).map((u: any) => {
                  const userUtilitiesTotal = utilityBreakdown.reduce((s: number, util: any) => s + (Number(util.shares[u.userId]) || 0), 0);
                  const isCurrent = u.userId === user.id;
                  const totalWithRent = Number(u.roomRent || 0) + Number(userUtilitiesTotal);
                  return (
                    <tr key={u.userId} className={`hover:bg-gray-800/30 transition-all ${isCurrent ? 'bg-blue-900/10' : ''}`}>
                      <td className="px-6 sm:px-8 py-4 sm:py-6">
                        <div className="flex flex-col">
                          <span className={`font-black text-xs sm:text-sm ${isCurrent ? 'text-blue-400' : 'text-white'}`}>{u.name}</span>
                          <span className="text-[8px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            {db.rooms.find(r => r.id === db.users.find(usr => usr.id === u.userId)?.roomId)?.name || 'রুমহীন'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-6 text-right font-bold text-gray-300 text-xs sm:text-sm">৳{Number(u.roomRent || 0).toFixed(2)}</td>
                      {utilityBreakdown.map(util => (
                        <td key={util.id} className="px-3 sm:px-4 py-4 sm:py-6 text-right text-gray-400 text-[11px] sm:text-sm font-bold">
                          ৳{Number(util.shares[u.userId] || 0).toFixed(2)}
                        </td>
                      ))}
                      <td className="px-6 sm:px-8 py-4 sm:py-6 text-right font-black text-blue-500 text-base sm:text-xl bg-blue-900/5">
                        ৳{totalWithRent.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {canManage ? (
        <div className="pt-6 sm:pt-10 border-t border-gray-800 space-y-6 sm:space-y-10">
          <div className="bg-blue-600/10 border border-blue-500/20 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] flex items-center gap-4 sm:gap-6 shadow-xl shadow-blue-500/5">
            <div className="p-3 sm:p-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl shadow-lg shadow-blue-500/10">
               <ShieldCheck size={24} className="sm:w-7 sm:h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">অ্যাডমিন ম্যানেজমেন্ট</p>
              <p className="text-[11px] sm:text-sm text-blue-300/80 font-bold mt-1 leading-tight">রুম এবং ইউটিলিটি কনফিগারেশন করুন।</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
            {/* রুম সেটিংস */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between px-2 sm:px-4">
                <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 sm:gap-3"><Home className="text-blue-500" size={18}/> রুম সেটিংস</h3>
                {isAdminUser && !isMonthLocked && (
                  <button onClick={() => setShowRoomAdd(true)} className="p-2 sm:p-3 bg-blue-600 rounded-lg sm:rounded-2xl text-white hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                    <Plus size={18}/>
                  </button>
                )}
              </div>
              <div className="space-y-3 sm:hidden">
                {db.rooms.map(r => {
                  const rent = (db.monthlyRoomOverrides || []).find(o => o.roomId === r.id && o.month === month)?.rent ?? r.rent;
                  return (
                    <div key={r.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                       <div>
                          <p className="font-black text-white text-xs">{r.name}</p>
                          <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest mt-1">রুম আইডি: {r.id.slice(0,5)}</p>
                       </div>
                       <div className="flex items-center gap-3">
                          <input 
                            type="number" step="0.01" disabled={isMonthLocked}
                            className="w-20 bg-gray-800 text-right px-2 py-2 rounded-lg border border-gray-700 font-black text-xs text-blue-400 outline-none" 
                            value={rent || ''} onFocus={(e) => e.target.select()} onChange={(e) => updateRoomRent(r.id, parseFloat(e.target.value) || 0)} 
                          />
                          {isAdminUser && !isMonthLocked && <button onClick={() => performDeleteRoom(r.id)} className="p-2 text-red-500/40"><Trash2 size={16}/></button>}
                       </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden sm:block bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
                <table className="w-full">
                  <thead className="bg-gray-800/40 text-[9px] sm:text-[10px] uppercase font-black text-gray-500 border-b border-gray-800">
                    <tr>
                      <th className="px-5 sm:px-6 py-4 sm:py-5 text-left">নাম</th>
                      <th className="px-5 sm:px-6 py-4 sm:py-5 text-right">ভাড়া</th>
                      <th className="px-5 sm:px-6 py-4 sm:py-5 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {db.rooms.map(r => {
                      const rent = (db.monthlyRoomOverrides || []).find(o => o.roomId === r.id && o.month === month)?.rent ?? r.rent;
                      return (
                        <tr key={r.id} className="text-white hover:bg-gray-800/10 transition-colors">
                          <td className="px-5 sm:px-6 py-4 sm:py-5 font-bold text-xs sm:text-sm">{r.name}</td>
                          <td className="px-5 sm:px-6 py-4 sm:py-5 text-right">
                            <input 
                              type="number" step="0.01"
                              disabled={isMonthLocked}
                              className="w-20 sm:w-28 bg-gray-800 text-right px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-700 font-black text-[12px] sm:text-sm text-blue-400 outline-none disabled:opacity-50" 
                              value={rent || ''} 
                              onFocus={(e) => e.target.select()} 
                              onChange={(e) => updateRoomRent(r.id, parseFloat(e.target.value) || 0)} 
                            />
                          </td>
                          <td className="px-5 sm:px-6 py-4 sm:py-5 text-right">
                            {isAdminUser && !isMonthLocked ? <button onClick={() => performDeleteRoom(r.id)} className="p-2 text-red-500/40 hover:text-red-500 transition-all"><Trash2 size={16}/></button> : <Lock size={12} className="text-gray-700 ml-auto" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ইউটিলিটি বিল */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between px-2 sm:px-4">
                <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 sm:gap-3"><Zap className="text-yellow-500" size={18}/> ইউটিলিটি বিল</h3>
                <div className="flex gap-2">
                   {isAdminUser && !isMonthLocked && (
                     <button onClick={() => setShowUtilityAdd(true)} className="p-2 bg-yellow-600 rounded-lg sm:rounded-2xl text-white shadow-lg"><Plus size={18}/></button>
                   )}
                   {!isMonthLocked && (
                     <button onClick={() => setShowLocalUtilityAdd(true)} className="p-2 bg-blue-600 rounded-lg sm:rounded-2xl text-white shadow-lg"><PlusCircle size={18}/></button>
                   )}
                </div>
              </div>
              <div className="space-y-3 sm:hidden">
                {utilityBreakdown.map(u => (
                  <div key={u.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                    <div>
                      <p className="font-black text-white text-xs">{u.name}</p>
                      <p className={`text-[7px] font-black uppercase tracking-widest mt-0.5 ${u.isLocal ? 'text-blue-400' : 'text-yellow-500'}`}>{u.isLocal ? 'মাসিক' : 'মাস্টার'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-black text-white text-xs">৳{u.amount.toFixed(2)}</p>
                      <div className="flex gap-1">
                        {!isMonthLocked && (
                          <>
                            <button onClick={() => setEditingModeUtilId(u.id)} className="p-2 text-blue-400"><Settings2 size={16}/></button>
                            <button onClick={() => performDeleteUtility(u.id, u.isLocal)} className="p-2 text-red-500/40"><Trash2 size={16}/></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden sm:block bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-800">
                    {utilityBreakdown.map(u => (
                      <tr key={u.id} className="text-white hover:bg-gray-800/10 transition-colors">
                        <td className="px-5 sm:px-6 py-4 sm:py-5">
                           <div className="flex flex-col">
                              <span className="font-bold text-gray-200 text-xs sm:text-sm">{u.name}</span>
                              <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest ${u.isLocal ? 'text-blue-400' : 'text-yellow-500'}`}>{u.isLocal ? 'মাসিক' : 'মাস্টার'}</span>
                           </div>
                        </td>
                        <td className="px-5 sm:px-6 py-4 sm:py-5 text-right font-black text-white text-xs sm:text-sm">৳{u.amount.toFixed(2)}</td>
                        <td className="px-5 sm:px-6 py-4 sm:py-5 text-right">
                          <div className="flex justify-end gap-2">
                             {!isMonthLocked ? (
                               <>
                                 <button onClick={() => setEditingModeUtilId(u.id)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg"><Settings2 size={16}/></button>
                                 <button onClick={() => performDeleteUtility(u.id, u.isLocal)} className="p-2 text-red-500/40 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                               </>
                             ) : (
                               <Lock size={12} className="text-gray-700" />
                             )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* মেম্বার রুম বরাদ্দ */}
          <div className="space-y-4 sm:space-y-6">
            <div className="px-2 sm:px-4">
               <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 sm:gap-3"><UserCheck className="text-green-500" size={18}/> মেম্বার রুম বরাদ্দ</h3>
            </div>
            <div className="grid grid-cols-1 sm:hidden gap-3">
              {activeResidents.map(resUser => (
                <div key={resUser.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                  <span className="font-bold text-xs text-white truncate max-w-[120px]">{resUser.name}</span>
                  <select 
                    disabled={isMonthLocked}
                    className="bg-gray-800 border-gray-700 rounded-lg text-[10px] font-black text-white px-3 py-2 outline-none" 
                    value={resUser.roomId || ''} 
                    onChange={(e) => assignRoom(resUser.id, e.target.value)}
                  >
                    <option value="">বরাদ্দ নেই</option>
                    {db.rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="hidden sm:block bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
              <table className="w-full">
                <tbody className="divide-y divide-gray-800">
                  {activeResidents.map(resUser => (
                    <tr key={resUser.id} className="text-white hover:bg-gray-800/10 transition-colors">
                      <td className="px-6 sm:px-8 py-4 sm:py-5">
                         <div className="flex flex-col">
                            <span className="font-bold text-xs sm:text-sm">{resUser.name}</span>
                         </div>
                      </td>
                      <td className="px-6 sm:px-8 py-4 sm:py-5 text-right">
                        <select 
                          disabled={isMonthLocked}
                          className="bg-gray-800 border-gray-700 rounded-lg text-[10px] sm:text-xs font-black text-white px-3 sm:px-5 py-2 sm:py-2.5 outline-none disabled:opacity-50" 
                          value={resUser.roomId || ''} 
                          onChange={(e) => assignRoom(resUser.id, e.target.value)}
                        >
                          <option value="">বরাদ্দ নেই</option>
                          {db.rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-900/10 border border-amber-500/20 p-6 rounded-2xl sm:rounded-[2.5rem] flex items-center gap-4 shadow-xl">
          <div className="p-3 bg-amber-600 rounded-xl text-white shadow-lg shadow-amber-500/10 shrink-0">
             <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">অ্যাক্সেস সীমিত</p>
            <p className="text-[11px] text-amber-200/60 font-bold mt-1">রুম সেটিিংস শুধুমাত্র অ্যাডমিন বা ম্যানেজারের জন্য।</p>
          </div>
        </div>
      )}

      {/* Modal designs */}
      {showRoomAdd && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-[2rem] sm:rounded-[3rem] border border-gray-800 p-8 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-6 sm:mb-8">
                <h3 className="text-xl sm:text-2xl font-black text-white">নতুন রুম</h3>
                <button onClick={() => setShowRoomAdd(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
             </div>
             <div className="space-y-4 sm:space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">নাম</label>
                  <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl px-4 py-3.5 text-white font-bold outline-none focus:ring-2 focus:ring-blue-600" value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="যেমন: রুম ১০১"/>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">ডিফল্ট ভাড়া</label>
                   <input type="number" step="0.01" className="w-full bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl px-4 py-3.5 text-white font-black outline-none focus:ring-2 focus:ring-blue-600" value={roomRent || ''} onChange={e=>setRoomRent(parseFloat(e.target.value)||0)} placeholder="৳ ০০০.০০"/>
                </div>
                <button onClick={performAddRoom} className="w-full py-4 sm:py-5 bg-blue-600 text-white rounded-xl sm:rounded-[1.5rem] font-black uppercase text-[10px] sm:text-xs shadow-lg active:scale-95 transition-all">সংরক্ষণ করুন</button>
             </div>
          </div>
        </div>
      )}

      {showUtilityAdd && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-[2rem] sm:rounded-[3rem] border border-gray-800 p-8 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-6 sm:mb-8">
                <h3 className="text-xl sm:text-2xl font-black text-white">মাস্টার ইউটিলিটি</h3>
                <button onClick={() => setShowUtilityAdd(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
             </div>
             <div className="space-y-4 sm:space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">নাম</label>
                  <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl px-4 py-3.5 text-white font-bold outline-none focus:ring-2 focus:ring-blue-600" value={utilityName} onChange={e=>setUtilityName(e.target.value)} placeholder="যেমন: ওয়াইফাই"/>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">ডিফল্ট বিল</label>
                   <input type="number" step="0.01" className="w-full bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl px-4 py-3.5 text-white font-black outline-none focus:ring-2 focus:ring-blue-600" value={utilityAmount || ''} onChange={e=>setUtilityAmount(parseFloat(e.target.value)||0)} placeholder="৳ ০০০.০০"/>
                </div>
                <button onClick={performAddGlobalUtility} className="w-full py-4 sm:py-5 bg-blue-600 text-white rounded-xl sm:rounded-[1.5rem] font-black uppercase text-[10px] sm:text-xs shadow-lg active:scale-95 transition-all">সংরক্ষণ করুন</button>
             </div>
          </div>
        </div>
      )}

      {showLocalUtilityAdd && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-[2rem] sm:rounded-[3rem] border border-gray-800 p-8 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-6 sm:mb-8">
                <h3 className="text-xl sm:text-2xl font-black text-white">মাসিক ইউটিলিটি ({month})</h3>
                <button onClick={() => setShowLocalUtilityAdd(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
             </div>
             <div className="space-y-4 sm:space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">নাম</label>
                  <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl px-4 py-3.5 text-white font-bold outline-none focus:ring-2 focus:ring-blue-600" value={utilityName} onChange={e=>setUtilityName(e.target.value)} placeholder="যেমন: কারেন্ট বিল"/>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">বিল পরিমাণ</label>
                   <input type="number" step="0.01" className="w-full bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl px-4 py-3.5 text-white font-black outline-none focus:ring-2 focus:ring-blue-600" value={utilityAmount || ''} onChange={e=>setUtilityAmount(parseFloat(e.target.value)||0)} placeholder="৳ ০০০.০০"/>
                </div>
                <button onClick={performAddLocalUtility} className="w-full py-4 sm:py-5 bg-blue-600 text-white rounded-xl sm:rounded-[1.5rem] font-black uppercase text-[10px] sm:text-xs shadow-lg active:scale-95 transition-all">সংরক্ষণ করুন</button>
             </div>
          </div>
        </div>
      )}

      {editingModeUtilId && currentEditingUtil && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[210] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-xl rounded-[2.5rem] sm:rounded-[3.5rem] border border-gray-800 p-6 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-6 sm:mb-10">
                <div>
                   <h3 className="text-xl sm:text-2xl font-black text-white">{currentEditingUtil.name}</h3>
                   <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">বিল ভাগ করার পদ্ধতি</p>
                </div>
                <button onClick={() => setEditingModeUtilId(null)} className="text-gray-500 hover:text-white p-2 bg-gray-800 rounded-lg"><X size={18}/></button>
             </div>
             <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-10">
                {[CalcMode.EQUAL, CalcMode.MULTIPLIER, CalcMode.FIXED].map(mode => (
                  <button key={mode} onClick={() => setUtilMode(currentEditingUtil.id, mode, currentEditingUtil.isLocal)} className={`p-3 sm:p-5 rounded-xl sm:rounded-3xl border text-[9px] sm:text-[11px] font-black uppercase tracking-wider transition-all shadow-lg ${currentEditingUtil.mode === mode ? 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                    {mode === CalcMode.EQUAL ? 'সমান' : mode === CalcMode.MULTIPLIER ? 'গুণিতক' : 'ফিক্সড'}
                  </button>
                ))}
             </div>
             <div className="max-h-[250px] sm:max-h-[320px] overflow-y-auto space-y-3 sm:space-y-4 mb-6 sm:mb-10 pr-1 custom-scrollbar no-scrollbar">
                {activeResidents.map(r => {
                  const currentValues = (currentEditingUtil.isLocal ? db.localUtilities.find(lu => lu.id === currentEditingUtil.id)?.calcValues : db.monthlyUtilityOverrides.find(ov => ov.utilityId === currentEditingUtil.id && ov.month === month)?.calcValues) || {};
                  return (
                    <div key={r.id} className="flex items-center justify-between py-3.5 sm:py-4 bg-gray-800/30 px-4 sm:px-6 rounded-xl sm:rounded-2xl border border-gray-800/50">
                       <span className="font-black text-gray-300 text-xs sm:text-sm">{r.name}</span>
                       {currentEditingUtil.mode !== CalcMode.EQUAL && (
                          <input 
                            type="number" step="0.01"
                            disabled={isMonthLocked}
                            className="w-20 sm:w-28 bg-gray-900 border-gray-800 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-right text-white font-black text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-600" 
                            value={currentValues[r.id] || (currentEditingUtil.mode === CalcMode.MULTIPLIER ? 1 : 0)} 
                            onFocus={e=>e.target.select()} 
                            onChange={e => setUtilValue(currentEditingUtil.id, r.id, parseFloat(e.target.value)||0, currentEditingUtil.isLocal)} 
                          />
                       )}
                    </div>
                  );
                })}
             </div>
             <button onClick={() => setEditingModeUtilId(null)} className="w-full py-4 sm:py-5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl sm:rounded-[2rem] font-black uppercase text-[10px] sm:text-xs transition-all active:scale-95">বন্ধ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilityRoom;
