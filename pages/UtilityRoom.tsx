
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
  ShieldAlert
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
    <div className="space-y-8 pb-10">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-white flex items-center gap-4">
              <TableIcon size={32} className="text-purple-500" />
              বিল রেকর্ড ({month})
            </h2>
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">সব ইউজার (এডমিনসহ) তালিকাভুক্ত</p>
          </div>
        </div>

        {isMonthLocked && (
          <div className="bg-red-900/10 border border-red-500/20 p-5 rounded-3xl flex items-center gap-4">
            <div className="p-2 bg-red-600 rounded-xl text-white">
              <Lock size={20}/>
            </div>
            <div>
              <p className="text-xs font-black text-red-500 uppercase tracking-widest">বিল রেকর্ড লকড (Locked)</p>
              <p className="text-[11px] text-red-200/70 font-bold">এই মাসের বিল এবং ভাড়া ক্লোজ করা হয়েছে। বর্তমানে কোনো পরিবর্তন সম্ভব নয়।</p>
            </div>
          </div>
        )}

        <div className="bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-800/40 text-[10px] uppercase font-black text-gray-500 border-b border-gray-800">
                  <th className="px-8 py-7">সদস্য</th>
                  <th className="px-6 py-7 text-right">রুম ভাড়া</th>
                  {utilityBreakdown.map(u => (
                    <th key={u.id} className="px-4 py-7 text-right whitespace-nowrap">{u.name}</th>
                  ))}
                  <th className="px-8 py-7 text-right text-white bg-blue-900/20">মোট বিল (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {stats.userStats.filter((u:any) => u.isActive).map((u: any) => {
                  const userUtilitiesTotal = utilityBreakdown.reduce((s: number, util: any) => s + (Number(util.shares[u.userId]) || 0), 0);
                  const isCurrent = u.userId === user.id;
                  return (
                    <tr key={u.userId} className={`hover:bg-gray-800/30 transition-all ${isCurrent ? 'bg-blue-900/10' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className={`font-black ${isCurrent ? 'text-blue-400' : 'text-white'}`}>{u.name} {isCurrent && '(আপনি)'}</span>
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            {db.rooms.find(r => r.id === db.users.find(usr => usr.id === u.userId)?.roomId)?.name || 'রুমহীন'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right font-bold text-gray-300">৳{Number(u.roomRent || 0).toFixed(0)}</td>
                      {utilityBreakdown.map(util => (
                        <td key={util.id} className="px-4 py-6 text-right text-gray-400 text-sm font-bold">
                          ৳{Number(util.shares[u.userId] || 0).toFixed(0)}
                        </td>
                      ))}
                      <td className="px-8 py-6 text-right font-black text-blue-500 text-xl bg-blue-900/5">
                        ৳{(Number(u.roomRent || 0) + Number(userUtilitiesTotal)).toFixed(0)}
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
        <div className="pt-10 border-t border-gray-800 space-y-10">
          <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem] flex items-center gap-6 shadow-xl shadow-blue-500/5">
            <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
               <ShieldCheck size={28} />
            </div>
            <div>
              <p className="text-xs font-black text-blue-400 uppercase tracking-widest">অ্যাডমিন ম্যানেজমেন্ট প্যানেল</p>
              <p className="text-sm text-blue-300/80 font-bold mt-1">মাস্টার সেটিংস এবং রুম অ্যালোকেশন এখান থেকে নিয়ন্ত্রণ করুন।</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-xl font-black text-white flex items-center gap-3"><Home className="text-blue-500"/> রুম কনফিগারেশন</h3>
                {isAdminUser && !isMonthLocked && (
                  <button onClick={() => setShowRoomAdd(true)} className="p-3 bg-blue-600 rounded-2xl text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                    <Plus size={20}/>
                  </button>
                )}
              </div>
              <div className="bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl relative">
                <table className="w-full">
                  <thead className="bg-gray-800/40 text-[10px] uppercase font-black text-gray-500 border-b border-gray-800">
                    <tr>
                      <th className="px-6 py-5 text-left">রুমের নাম</th>
                      <th className="px-6 py-5 text-right">ভাড়া ({month})</th>
                      <th className="px-6 py-5 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {db.rooms.map(r => {
                      const rent = (db.monthlyRoomOverrides || []).find(o => o.roomId === r.id && o.month === month)?.rent ?? r.rent;
                      return (
                        <tr key={r.id} className="text-white hover:bg-gray-800/10 group transition-colors">
                          <td className="px-6 py-5 font-bold">{r.name}</td>
                          <td className="px-6 py-5 text-right">
                            <input 
                              type="number" 
                              disabled={isMonthLocked}
                              className="w-24 bg-gray-800 text-right px-3 py-2 rounded-xl border border-gray-700 font-black text-sm text-blue-400 outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50" 
                              value={rent || ''} 
                              onFocus={(e) => e.target.select()} 
                              onChange={(e) => updateRoomRent(r.id, parseFloat(e.target.value) || 0)} 
                            />
                          </td>
                          <td className="px-6 py-5 text-right">
                            {isAdminUser && !isMonthLocked && <button onClick={() => performDeleteRoom(r.id)} className="p-2.5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={18}/></button>}
                            {isMonthLocked && <Lock size={16} className="text-gray-700 ml-auto" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-xl font-black text-white flex items-center gap-3"><Zap className="text-yellow-500"/> ইউটিলিটি বিল সেটিংস</h3>
                <div className="flex gap-3">
                   {isAdminUser && !isMonthLocked && (
                     <button onClick={() => setShowUtilityAdd(true)} className="p-3 bg-yellow-600 rounded-2xl text-white hover:bg-yellow-700 shadow-lg shadow-yellow-500/20 active:scale-95" title="মাস্টার খরচ (সব মাসের জন্য)">
                       <Plus size={20}/>
                     </button>
                   )}
                   {!isMonthLocked && (
                     <button onClick={() => setShowLocalUtilityAdd(true)} className="p-3 bg-blue-600 rounded-2xl text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95" title="লোকাল খরচ (শুধু এই মাসের)">
                       <PlusCircle size={20}/>
                     </button>
                   )}
                </div>
              </div>
              <div className="bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl relative">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-800">
                    {utilityBreakdown.map(u => (
                      <tr key={u.id} className="text-white hover:bg-gray-800/10 group transition-colors">
                        <td className="px-6 py-5">
                           <div className="flex flex-col">
                              <span className="font-bold text-gray-200">{u.name}</span>
                              <span className={`text-[8px] font-black uppercase tracking-widest ${u.isLocal ? 'text-blue-400' : 'text-yellow-500'}`}>{u.isLocal ? 'মাসিক খরচ' : 'মাস্টার সেটিংস'}</span>
                           </div>
                        </td>
                        <td className="px-6 py-5 text-right font-black text-white">৳{u.amount.toFixed(0)}</td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-3">
                             {!isMonthLocked ? (
                               <>
                                 <button onClick={() => setEditingModeUtilId(u.id)} className="p-2.5 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"><Settings2 size={18}/></button>
                                 <button onClick={() => performDeleteUtility(u.id, u.isLocal)} className="p-2.5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={18}/></button>
                               </>
                             ) : (
                               <Lock size={16} className="text-gray-700" />
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

          <div className="space-y-6">
            <div className="px-4">
               <h3 className="text-xl font-black text-white flex items-center gap-3"><UserCheck className="text-green-500"/> মেম্বার রুম বরাদ্দ</h3>
               <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">কার রুমে কে থাকবে এখান থেকে ঠিক করুন</p>
            </div>
            <div className="bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl relative">
              <table className="w-full">
                <tbody className="divide-y divide-gray-800">
                  {activeResidents.map(resUser => (
                    <tr key={resUser.id} className="text-white hover:bg-gray-800/10 transition-colors">
                      <td className="px-8 py-5">
                         <div className="flex flex-col">
                            <span className="font-bold">{resUser.name}</span>
                            {resUser.isAdmin && <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">সিস্টেম অ্যাডমিন</span>}
                         </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <select 
                          disabled={isMonthLocked}
                          className="bg-gray-800 border-gray-700 rounded-xl text-xs font-black text-white px-5 py-2.5 outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer disabled:opacity-50" 
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
        <div className="bg-amber-900/10 border border-amber-500/20 p-8 rounded-[2.5rem] flex items-center gap-5 shadow-xl">
          <div className="p-4 bg-amber-600 rounded-2xl text-white shadow-lg shadow-amber-500/20">
             <ShieldAlert size={32} />
          </div>
          <div>
            <p className="text-sm font-black text-amber-500 uppercase tracking-widest">অ্যাক্সেস সীমিত</p>
            <p className="text-xs text-amber-200/60 font-bold mt-1">রুম এবং বিল ম্যানেজমেন্ট শুধুমাত্র অ্যাডমিন বা ম্যানেজারের জন্য।</p>
          </div>
        </div>
      )}

      {showRoomAdd && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] border border-gray-800 p-10 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white">নতুন রুম</h3>
                <button onClick={() => setShowRoomAdd(false)} className="text-gray-500 hover:text-white transition-colors"><X/></button>
             </div>
             <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block">নাম</label>
                  <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-600" value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="যেমন: রুম ১০১"/>
                </div>
                <div>
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block">ডিফল্ট ভাড়া</label>
                   <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white font-black outline-none focus:ring-2 focus:ring-blue-600" value={roomRent || ''} onChange={e=>setRoomRent(parseFloat(e.target.value)||0)} placeholder="৳ ০০০"/>
                </div>
                <button onClick={performAddRoom} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all">সংরক্ষণ করুন</button>
             </div>
          </div>
        </div>
      )}

      {showUtilityAdd && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] border border-gray-800 p-10 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white">মাস্টার ইউটিলিটি</h3>
                <button onClick={() => setShowUtilityAdd(false)} className="text-gray-500 hover:text-white"><X/></button>
             </div>
             <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block">খরচের নাম</label>
                   <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-yellow-600" value={utilityName} onChange={e=>setUtilityName(e.target.value)} placeholder="যেমন: বুয়া বিল"/>
                </div>
                <div>
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block">টাকার পরিমাণ</label>
                   <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white font-black outline-none focus:ring-2 focus:ring-yellow-600" value={utilityAmount || ''} onChange={e=>setUtilityAmount(parseFloat(e.target.value)||0)} placeholder="৳ ০০০"/>
                </div>
                <button onClick={performAddGlobalUtility} className="w-full py-5 bg-yellow-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-lg shadow-yellow-500/20 active:scale-95 transition-all">মাস্টার সেটিংসে সেভ করুন</button>
             </div>
          </div>
        </div>
      )}

      {showLocalUtilityAdd && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] border border-gray-800 p-10 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white">মাসিক বিল ({month})</h3>
                <button onClick={() => setShowLocalUtilityAdd(false)} className="text-gray-500 hover:text-white"><X/></button>
             </div>
             <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block">খরচের নাম</label>
                   <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-600" value={utilityName} onChange={e=>setUtilityName(e.target.value)} placeholder="যেমন: কারেন্ট বিল"/>
                </div>
                <div>
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block">টাকার পরিমাণ</label>
                   <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white font-black outline-none focus:ring-2 focus:ring-blue-600" value={utilityAmount || ''} onChange={e=>setUtilityAmount(parseFloat(e.target.value)||0)} placeholder="৳ ০০০"/>
                </div>
                <button onClick={performAddLocalUtility} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all">অ্যাড করুন</button>
             </div>
          </div>
        </div>
      )}

      {editingModeUtilId && currentEditingUtil && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[210] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-xl rounded-[3.5rem] border border-gray-800 p-10 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-10">
                <div>
                   <h3 className="text-2xl font-black text-white">{currentEditingUtil.name}</h3>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">বিল ভাগ করার পদ্ধতি নির্বাচন করুন</p>
                </div>
                <button onClick={() => setEditingModeUtilId(null)} className="text-gray-500 hover:text-white"><X/></button>
             </div>
             <div className="grid grid-cols-3 gap-4 mb-10">
                {[CalcMode.EQUAL, CalcMode.MULTIPLIER, CalcMode.FIXED].map(mode => (
                  <button key={mode} onClick={() => setUtilMode(currentEditingUtil.id, mode, currentEditingUtil.isLocal)} className={`p-5 rounded-3xl border text-[11px] font-black uppercase tracking-wider transition-all shadow-lg ${currentEditingUtil.mode === mode ? 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                    {mode === CalcMode.EQUAL ? 'সমান' : mode === CalcMode.MULTIPLIER ? 'গুণিতক' : 'ফিক্সড'}
                  </button>
                ))}
             </div>
             <div className="max-h-[320px] overflow-y-auto space-y-4 mb-10 pr-2 custom-scrollbar">
                {activeResidents.map(r => {
                  const currentValues = (currentEditingUtil.isLocal ? db.localUtilities.find(lu => lu.id === currentEditingUtil.id)?.calcValues : db.monthlyUtilityOverrides.find(ov => ov.utilityId === currentEditingUtil.id && ov.month === month)?.calcValues) || {};
                  return (
                    <div key={r.id} className="flex items-center justify-between py-4 bg-gray-800/30 px-6 rounded-2xl border border-gray-800/50">
                       <span className="font-black text-gray-300 text-sm">{r.name}</span>
                       {currentEditingUtil.mode !== CalcMode.EQUAL && (
                          <input 
                            type="number" 
                            disabled={isMonthLocked}
                            className="w-24 bg-gray-900 border-gray-800 rounded-xl px-4 py-3 text-right text-white font-black outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50" 
                            value={currentValues[r.id] || (currentEditingUtil.mode === CalcMode.MULTIPLIER ? 1 : 0)} 
                            onFocus={e=>e.target.select()} 
                            onChange={e => setUtilValue(currentEditingUtil.id, r.id, parseFloat(e.target.value)||0, currentEditingUtil.isLocal)} 
                          />
                       )}
                    </div>
                  );
                })}
             </div>
             <button onClick={() => setEditingModeUtilId(null)} className="w-full py-5 bg-gray-800 hover:bg-gray-700 text-white rounded-[2rem] font-black uppercase text-xs transition-all active:scale-95">বন্ধ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilityRoom;
