
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
  UserCheck
} from 'lucide-react';
import { getUserRoleInMonth, getCalculations } from '../db';

interface UtilityRoomProps {
  db: MessSystemDB;
  updateDB: (updates: Partial<MessSystemDB>) => void;
  month: string;
}

const UtilityRoom: React.FC<UtilityRoomProps> = ({ db, updateDB, month }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showRoomAdd, setShowRoomAdd] = useState(false);
  const [showUtilityAdd, setShowUtilityAdd] = useState(false);
  const [showLocalUtilityAdd, setShowLocalUtilityAdd] = useState(false);
  const [editingModeUtilId, setEditingModeUtilId] = useState<string | null>(null);
  
  const [roomName, setRoomName] = useState('');
  const [roomRent, setRoomRent] = useState(0);
  const [utilityName, setUtilityName] = useState('');
  const [utilityAmount, setUtilityAmount] = useState(0);

  useEffect(() => {
    const session = sessionStorage.getItem('user');
    if (session) {
      const parsedUser = JSON.parse(session);
      const freshUser = db.users.find(u => u.id === parsedUser.id) || parsedUser;
      setCurrentUser(freshUser);
    }
  }, [db.users]);

  const userRole = useMemo(() => {
    if (!currentUser) return Role.MEMBER;
    return getUserRoleInMonth(db, currentUser.id, month);
  }, [currentUser, db, month]);

  const isAdminUser = currentUser?.isAdmin === true;
  const isCurrentManager = userRole === Role.MANAGER;
  const canManage = isAdminUser || isCurrentManager;

  const stats = useMemo(() => getCalculations(db, month), [db, month]);
  
  const residents = useMemo(() => {
    return db.users.filter(u => 
      !u.isAdmin && 
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
      calculateLocalShares(amount, mode, values, residents, shares);

      return { id: master.id, name: master.name, amount, mode, shares, isLocal: false };
    });

    const localUtils = (db.localUtilities || []).filter(lu => lu.month === month).map(local => {
      const shares: Record<string, number> = {};
      calculateLocalShares(local.amount, local.calcMode, local.calcValues, residents, shares);
      return { id: local.id, name: local.name, amount: local.amount, mode: local.calcMode, shares, isLocal: true };
    });

    return [...globalUtils, ...localUtils];
  }, [db.utilities, db.monthlyUtilityOverrides, db.localUtilities, month, residents]);

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
    if (!roomName.trim() || roomRent <= 0) return;
    const newRoom: Room = { id: crypto.randomUUID(), name: roomName, rent: roomRent, splitType: 'EQUAL' };
    updateDB({ rooms: [...db.rooms, newRoom] });
    setRoomName('');
    setRoomRent(0);
    setShowRoomAdd(false);
  };

  const performAddGlobalUtility = () => {
    if (!utilityName.trim() || utilityAmount <= 0) return;
    const newUtil: UtilityExpense = { id: crypto.randomUUID(), name: utilityName, amount: utilityAmount, defaultCalcMode: CalcMode.EQUAL };
    updateDB({ utilities: [...db.utilities, newUtil] });
    setUtilityName('');
    setUtilityAmount(0);
    setShowUtilityAdd(false);
  };

  const performAddLocalUtility = () => {
    if (!utilityName.trim() || utilityAmount <= 0) return;
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
    if (!isAdminUser) return;
    if (window.confirm("রুম ডিলিট করতে চান?")) {
      updateDB({ 
        rooms: db.rooms.filter(room => room.id !== roomId),
        users: db.users.map(u => u.roomId === roomId ? { ...u, roomId: undefined } : u)
      });
    }
  };

  const performDeleteUtility = (id: string, isLocal: boolean) => {
    if (!canManage) return;
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
    const others = (db.monthlyUtilityOverrides || []).filter(ov => !(ov.utilityId === override.utilityId && ov.month === month));
    updateDB({ monthlyUtilityOverrides: [...others, override] });
  };

  const handleUpdateLocal = (local: LocalUtilityExpense) => {
    const others = (db.localUtilities || []).filter(lu => lu.id !== local.id);
    updateDB({ localUtilities: [...others, local] });
  };

  const setUtilMode = (utilId: string, mode: CalcMode, isLocal: boolean) => {
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
    if (isAdminUser) {
      updateDB({ rooms: db.rooms.map(r => r.id === roomId ? { ...r, rent } : r) });
    } else if (isCurrentManager) {
      const others = (db.monthlyRoomOverrides || []).filter(o => !(o.roomId === roomId && o.month === month));
      updateDB({ monthlyRoomOverrides: [...others, { roomId, month, rent }] });
    }
  };

  const assignRoom = (userId: string, roomId: string) => {
    if (!canManage) return;
    updateDB({ users: db.users.map(u => u.id === userId ? { ...u, roomId } : u) });
  };

  const currentEditingUtil = utilityBreakdown.find(u => u.id === editingModeUtilId);

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <TableIcon className="text-purple-500" />
              পাবলিক বিল রেকর্ড ({month})
            </h2>
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">শুধুমাত্র অ্যাক্টিভ মেম্বারদের হিসাব</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-[2rem] border border-gray-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-800/40 text-[10px] uppercase font-black text-gray-500">
                  <th className="px-8 py-6">মেম্বার</th>
                  <th className="px-6 py-6 text-right">রুম ভাড়া</th>
                  {utilityBreakdown.map(u => (
                    <th key={u.id} className="px-4 py-6 text-right">{u.name}</th>
                  ))}
                  <th className="px-8 py-6 text-right text-white bg-blue-900/10">মোট প্রদেয়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {stats.userStats.filter((u:any) => u.isActive).map((u: any) => {
                  const userUtilitiesTotal = utilityBreakdown.reduce((s: number, util: any) => s + (Number(util.shares[u.userId]) || 0), 0);
                  return (
                    <tr key={u.userId} className={`hover:bg-gray-800/20 transition-colors ${u.userId === currentUser?.id ? 'bg-blue-900/10' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-white">{u.name}</span>
                          <span className="text-[10px] text-gray-500 font-bold">
                            {db.rooms.find(r => r.id === db.users.find(usr => usr.id === u.userId)?.roomId)?.name || 'রুমহীন'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right font-bold text-gray-300">৳{Number(u.roomRent || 0).toFixed(0)}</td>
                      {utilityBreakdown.map(util => (
                        <td key={util.id} className="px-4 py-6 text-right text-gray-400 text-xs font-bold">
                          ৳{Number(util.shares[u.userId] || 0).toFixed(0)}
                        </td>
                      ))}
                      <td className="px-8 py-6 text-right font-black text-blue-500 text-lg bg-blue-900/5">
                        ৳{(Number(u.roomRent || 0) + Number(userUtilitiesTotal)).toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-gray-800/20 border-t border-gray-800 flex items-center gap-3 text-gray-500 text-[10px] font-bold uppercase tracking-widest italic">
            <Eye size={14} className="text-blue-500"/> অফ মেম্বাররা এখানে নেই।
          </div>
        </div>
      </div>

      {canManage ? (
        <div className="pt-10 border-t border-gray-800 space-y-10">
          <div className="flex items-center gap-3 bg-blue-900/10 border border-blue-500/20 p-4 rounded-2xl">
            <ShieldCheck className="text-blue-500" />
            <div>
              <p className="text-xs font-black text-blue-400 uppercase">ম্যানেজমেন্ট প্যানেল</p>
              <p className="text-[11px] text-blue-300/70 font-bold">রুম ভাড়া ও ইউটিলিটি কনফিগার করুন।</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white flex items-center gap-3"><Home className="text-blue-500"/> রুম সেটিংস</h3>
                {isAdminUser && (
                  <button onClick={() => setShowRoomAdd(true)} className="p-2 bg-blue-600 rounded-xl text-white hover:bg-blue-700 transition-all">
                    <Plus size={20}/>
                  </button>
                )}
              </div>
              <div className="bg-gray-900 rounded-[2rem] border border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800/40 text-[10px] uppercase font-black text-gray-500">
                    <tr>
                      <th className="px-6 py-4">রুম</th>
                      <th className="px-6 py-4 text-right">ভাড়া ({month})</th>
                      <th className="px-6 py-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {db.rooms.map(r => {
                      const rent = (db.monthlyRoomOverrides || []).find(o => o.roomId === r.id && o.month === month)?.rent ?? r.rent;
                      return (
                        <tr key={r.id} className="text-white hover:bg-gray-800/10">
                          <td className="px-6 py-4 font-bold">{r.name}</td>
                          <td className="px-6 py-4 text-right">
                            <input type="number" className="w-20 bg-gray-800 text-right px-2 py-1 rounded font-black text-xs text-white outline-none" value={rent || ''} onFocus={(e) => e.target.select()} onChange={(e) => updateRoomRent(r.id, parseFloat(e.target.value) || 0)} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isAdminUser && <button onClick={() => performDeleteRoom(r.id)} className="p-2 text-red-500/60 hover:text-red-500"><Trash2 size={16}/></button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white flex items-center gap-3"><Zap className="text-yellow-500"/> ইউটিলিটি সেটিংস</h3>
                <div className="flex gap-2">
                   {isAdminUser && <button onClick={() => setShowUtilityAdd(true)} className="p-2 bg-yellow-600 rounded-xl text-white hover:bg-yellow-700"><Plus size={20}/></button>}
                   <button onClick={() => setShowLocalUtilityAdd(true)} className="p-2 bg-blue-600 rounded-xl text-white hover:bg-blue-700"><PlusCircle size={20}/></button>
                </div>
              </div>
              <div className="bg-gray-900 rounded-[2rem] border border-gray-800 overflow-hidden">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-800">
                    {utilityBreakdown.map(u => (
                      <tr key={u.id} className="text-white hover:bg-gray-800/10">
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <span className="font-bold">{u.name}</span>
                              <span className={`text-[8px] font-black uppercase ${u.isLocal ? 'text-blue-400' : 'text-yellow-500'}`}>{u.isLocal ? 'লোকাল' : 'মাস্টার'}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right font-black">৳{u.amount.toFixed(0)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             <button onClick={() => setEditingModeUtilId(u.id)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg"><Settings2 size={16}/></button>
                             <button onClick={() => performDeleteUtility(u.id, u.isLocal)} className="p-2 text-red-500/60 hover:text-red-500"><Trash2 size={16}/></button>
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
            <h3 className="text-xl font-black text-white flex items-center gap-3"><UserCheck className="text-green-500"/> মেম্বার রুম বরাদ্দ</h3>
            <div className="bg-gray-900 rounded-[2rem] border border-gray-800 overflow-hidden">
              <table className="w-full">
                <tbody className="divide-y divide-gray-800">
                  {residents.map(user => (
                    <tr key={user.id} className="text-white">
                      <td className="px-8 py-4 font-bold">{user.name}</td>
                      <td className="px-8 py-4 text-right">
                        <select className="bg-gray-800 border-gray-700 rounded-xl text-xs font-bold text-white px-4 py-2" value={user.roomId || ''} onChange={(e) => assignRoom(user.id, e.target.value)}>
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
        <div className="flex items-center gap-3 bg-amber-900/10 border border-amber-500/20 p-5 rounded-3xl">
          <Lock className="text-amber-500" />
          <p className="text-xs font-black text-amber-400 uppercase">ম্যানেজমেন্ট শুধুমাত্র এডমিন বা ম্যানেজারের জন্য।</p>
        </div>
      )}

      {showRoomAdd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] border border-gray-800 p-8 shadow-2xl">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white">নতুন রুম যোগ</h3>
                <button onClick={() => setShowRoomAdd(false)} className="text-gray-500"><X/></button>
             </div>
             <div className="space-y-4">
                <input type="text" className="w-full bg-gray-800 border-gray-700 rounded-xl px-4 py-3 text-white font-bold" value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="রুমের নাম"/>
                <input type="number" className="w-full bg-gray-800 border-gray-700 rounded-xl px-4 py-3 text-white font-bold" value={roomRent || ''} onChange={e=>setRoomRent(parseFloat(e.target.value)||0)} placeholder="ভাড়া"/>
                <button onClick={performAddRoom} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs">সেভ করুন</button>
             </div>
          </div>
        </div>
      )}

      {showUtilityAdd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] border border-gray-800 p-8 shadow-2xl">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white">মাস্টার ইউটিলিটি যোগ</h3>
                <button onClick={() => setShowUtilityAdd(false)} className="text-gray-500"><X/></button>
             </div>
             <div className="space-y-4">
                <input type="text" className="w-full bg-gray-800 border-gray-700 rounded-xl px-4 py-3 text-white font-bold" value={utilityName} onChange={e=>setUtilityName(e.target.value)} placeholder="খরচের নাম"/>
                <input type="number" className="w-full bg-gray-800 border-gray-700 rounded-xl px-4 py-3 text-white font-bold" value={utilityAmount || ''} onChange={e=>setUtilityAmount(parseFloat(e.target.value)||0)} placeholder="পরিমাণ"/>
                <button onClick={performAddGlobalUtility} className="w-full py-4 bg-yellow-600 text-white rounded-2xl font-black uppercase text-xs">মাস্টার সেটিংস এ সেভ করুন</button>
             </div>
          </div>
        </div>
      )}

      {showLocalUtilityAdd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] border border-gray-800 p-8 shadow-2xl">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white">লোকাল খরচ ({month})</h3>
                <button onClick={() => setShowLocalUtilityAdd(false)} className="text-gray-500"><X/></button>
             </div>
             <div className="space-y-4">
                <input type="text" className="w-full bg-gray-800 border-gray-700 rounded-xl px-4 py-3 text-white font-bold" value={utilityName} onChange={e=>setUtilityName(e.target.value)} placeholder="খরচের নাম"/>
                <input type="number" className="w-full bg-gray-800 border-gray-700 rounded-xl px-4 py-3 text-white font-bold" value={utilityAmount || ''} onChange={e=>setUtilityAmount(parseFloat(e.target.value)||0)} placeholder="পরিমাণ"/>
                <button onClick={performAddLocalUtility} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs">এই মাসের জন্য অ্যাড করুন</button>
             </div>
          </div>
        </div>
      )}

      {editingModeUtilId && currentEditingUtil && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[210] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-xl rounded-[2.5rem] border border-gray-800 p-8 shadow-2xl">
             <div className="flex justify-between items-center mb-8">
                <div><h3 className="text-xl font-black text-white">{currentEditingUtil.name} কনফিগারেশন</h3></div>
                <button onClick={() => setEditingModeUtilId(null)} className="text-gray-500"><X/></button>
             </div>
             <div className="grid grid-cols-3 gap-3 mb-8">
                {[CalcMode.EQUAL, CalcMode.MULTIPLIER, CalcMode.FIXED].map(mode => (
                  <button key={mode} onClick={() => setUtilMode(currentEditingUtil.id, mode, currentEditingUtil.isLocal)} className={`p-4 rounded-2xl border text-[10px] font-black uppercase transition-all ${currentEditingUtil.mode === mode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                    {mode === CalcMode.EQUAL ? 'সমান ভাগে' : mode === CalcMode.MULTIPLIER ? 'গুণিতক' : 'নির্ধারিত'}
                  </button>
                ))}
             </div>
             <div className="max-h-[300px] overflow-y-auto space-y-3 mb-8">
                {residents.map(r => {
                  const currentValues = (currentEditingUtil.isLocal ? db.localUtilities.find(lu => lu.id === currentEditingUtil.id)?.calcValues : db.monthlyUtilityOverrides.find(ov => ov.utilityId === currentEditingUtil.id && ov.month === month)?.calcValues) || {};
                  return (
                    <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-800/50">
                       <span className="font-bold text-gray-300 text-sm">{r.name}</span>
                       {currentEditingUtil.mode !== CalcMode.EQUAL && (
                          <input type="number" className="w-24 bg-gray-800 border-gray-700 rounded-xl px-3 py-2 text-right text-white font-black" value={currentValues[r.id] || (currentEditingUtil.mode === CalcMode.MULTIPLIER ? 1 : 0)} onFocus={e=>e.target.select()} onChange={e => setUtilValue(currentEditingUtil.id, r.id, parseFloat(e.target.value)||0, currentEditingUtil.isLocal)} />
                       )}
                    </div>
                  );
                })}
             </div>
             <button onClick={() => setEditingModeUtilId(null)} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black uppercase text-xs">বন্ধ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilityRoom;
