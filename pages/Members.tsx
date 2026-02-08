
import React, { useState, useMemo } from 'react';
import { T } from '../translations';
import { Role, MessSystemDB, User } from '../types';
import { getCalculations } from '../db';
import { 
  UserPlus, 
  Trash2, 
  Shield, 
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronRight,
  X,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  Calendar,
  ToggleLeft,
  ToggleRight,
  UserX,
  UserRoundCheck
} from 'lucide-react';

interface MembersProps {
  month: string;
  isAdmin: boolean;
  db: MessSystemDB;
  updateDB: (updates: Partial<MessSystemDB>) => void;
}

const Members: React.FC<MembersProps> = ({ month, isAdmin, db, updateDB }) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Status Editing State
  const [showStatusModal, setShowStatusModal] = useState<string | null>(null);

  const stats = useMemo(() => getCalculations(db, month), [db, month]);

  const filteredUsers = useMemo(() => {
    return db.users.filter(u => 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.username.toLowerCase().includes(search.toLowerCase())
    );
  }, [db.users, search]);

  const selectedMemberStats = useMemo(() => {
    if (!selectedMemberId) return null;
    const user = db.users.find(u => u.id === selectedMemberId);
    if (user?.isAdmin) return { isOverseer: true, name: user.name };
    return stats.userStats.find((u: any) => u.userId === selectedMemberId);
  }, [selectedMemberId, stats, db.users]);

  const mealOnlyBalance = useMemo(() => {
    if (!selectedMemberStats || selectedMemberStats.isOverseer) return 0;
    return selectedMemberStats.contribution - selectedMemberStats.mealCost;
  }, [selectedMemberStats]);

  const userToDelete = useMemo(() => {
    return db.users.find(u => u.id === deleteConfirmId);
  }, [deleteConfirmId, db.users]);

  const addUser = () => {
    if (!isAdmin) return;
    if (!newName.trim()) return;
    const shortName = newName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 8999);
    const username = `${shortName}${randomSuffix}`;
    const password = Math.floor(1000 + Math.random() * 8999).toString();
    
    const newUser: User = {
      id: crypto.randomUUID(),
      name: newName,
      username,
      password,
      isAdmin: false,
      monthlyOff: []
    };
    
    updateDB({ users: [...db.users, newUser] });
    setNewName('');
    setShowAddModal(false);
    alert(`মেম্বার তৈরি হয়েছে!\nইউজার: ${username}\nপাসওয়ার্ড: ${password}`);
  };

  const executeDelete = () => {
    if (!isAdmin || !deleteConfirmId) return;
    
    const uId = deleteConfirmId;
    updateDB({ 
      users: db.users.filter(u => u.id !== uId),
      monthlyRoles: db.monthlyRoles.filter(r => r.userId !== uId),
      meals: db.meals.filter(m => m.userId !== uId),
      bazars: db.bazars.filter(b => b.userId !== uId),
      payments: db.payments.filter(p => p.userId !== uId)
    });
    
    setDeleteConfirmId(null);
    alert("সদস্যকে সফলভাবে মেস থেকে রিমুভ করা হয়েছে।");
  };

  const setRole = (e: React.MouseEvent, userId: string, role: Role) => {
    e.stopPropagation();
    if (!isAdmin) return;
    
    const user = db.users.find(u => u.id === userId);
    const isOff = user?.isPermanentlyOff || (user?.monthlyOff || []).includes(month);
    
    if (isOff && role === Role.MANAGER) {
      alert("অফ থাকা মেম্বারকে ম্যানেজার বানানো সম্ভব নয়।");
      return;
    }

    const existingIndex = db.monthlyRoles.findIndex(r => r.userId === userId && r.month === month);
    const updatedRoles = [...db.monthlyRoles];
    if (existingIndex > -1) updatedRoles[existingIndex] = { userId, month, role };
    else updatedRoles.push({ userId, month, role });
    updateDB({ monthlyRoles: updatedRoles });
  };

  const toggleMonthlyOff = (userId: string, targetMonth: string) => {
    const updatedUsers = db.users.map(u => {
      if (u.id === userId) {
        const currentOff = u.monthlyOff || [];
        const isAlreadyOff = currentOff.includes(targetMonth);
        const nextOff = isAlreadyOff 
          ? currentOff.filter(m => m !== targetMonth)
          : [...currentOff, targetMonth];
        return { ...u, monthlyOff: nextOff };
      }
      return u;
    });

    // Revoke Manager Role if turned OFF for current month
    const user = updatedUsers.find(u => u.id === userId);
    const isNowOff = (user?.monthlyOff || []).includes(targetMonth);
    let nextRoles = db.monthlyRoles;
    if (isNowOff) {
      nextRoles = db.monthlyRoles.filter(r => !(r.userId === userId && r.month === targetMonth));
    }

    updateDB({ users: updatedUsers, monthlyRoles: nextRoles });
  };

  const togglePermanentOff = (userId: string) => {
    const updatedUsers = db.users.map(u => {
      if (u.id === userId) {
        return { ...u, isPermanentlyOff: !u.isPermanentlyOff };
      }
      return u;
    });

    // Revoke Manager roles across all months if permanently off
    const user = updatedUsers.find(u => u.id === userId);
    let nextRoles = db.monthlyRoles;
    if (user?.isPermanentlyOff) {
      nextRoles = db.monthlyRoles.filter(r => r.userId !== userId);
    }

    updateDB({ users: updatedUsers, monthlyRoles: nextRoles });
  };

  const getRoleForUser = (userId: string) => {
    const roleEntry = db.monthlyRoles.find(r => r.userId === userId && r.month === month);
    return roleEntry ? roleEntry.role : Role.MEMBER;
  };

  const getUserStatusLabel = (u: User) => {
    if (u.isAdmin) return <span className="text-purple-400">সিস্টেম এডমিন</span>;
    if (u.isPermanentlyOff) return <span className="text-red-500">স্থায়ীভাবে অফ</span>;
    if ((u.monthlyOff || []).includes(month)) return <span className="text-amber-500">চলতি মাসে অফ</span>;
    return <span className="text-green-500">অ্যাক্টিভ</span>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <Shield className="text-blue-500" />
            সদস্য তালিকা
          </h2>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">ম্যানেজার নিয়োগ এবং স্ট্যাটাস কন্ট্রোল</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-3xl font-black shadow-lg shadow-blue-500/20 text-xs uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <UserPlus size={18} />
          নতুন মেম্বার অ্যাড করুন
        </button>
      </div>

      <div className="bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-800 bg-gray-900 flex items-center gap-4">
          <Search className="text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="নাম দিয়ে মেম্বার খুঁজুন..." 
            className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-bold text-white placeholder:text-gray-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/50 text-left text-[10px] uppercase tracking-[0.2em] font-black text-gray-500">
                <th className="px-8 py-6">সদস্য ও স্ট্যাটাস</th>
                <th className="px-6 py-6">আইডি ও পাসওয়ার্ড</th>
                <th className="px-6 py-6">রোল ({month})</th>
                <th className="px-8 py-6 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-800/40 transition-all cursor-pointer group" onClick={() => setSelectedMemberId(u.id)}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border ${u.isAdmin ? 'bg-purple-900/30 text-purple-400 border-purple-500/20' : 'bg-blue-900/30 text-blue-400 border-blue-500/20'}`}>
                        {u.name[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-white group-hover:text-blue-400 transition-colors">{u.name}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest mt-0.5">{getUserStatusLabel(u)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] font-black bg-gray-800 px-2 py-1 rounded-lg text-blue-400">@{u.username}</code>
                        <button onClick={() => {navigator.clipboard.writeText(u.username); setCopiedId(u.id+'u'); setTimeout(()=>setCopiedId(null),2000)}} className="text-gray-600 hover:text-blue-500">
                           {copiedId === u.id+'u' ? <Check size={12}/> : <Copy size={12}/>}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] font-black bg-gray-800 px-2 py-1 rounded-lg text-amber-500">
                           {visiblePasswords[u.id] ? u.password : '••••'}
                        </code>
                        <button onClick={() => setVisiblePasswords(p => ({...p, [u.id]: !p[u.id]}))} className="text-gray-600 hover:text-blue-500">
                           {visiblePasswords[u.id] ? <EyeOff size={12}/> : <Eye size={12}/>}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                    {u.isAdmin ? (
                      <div className="flex items-center gap-2 text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-900/20 px-3 py-2 rounded-xl border border-purple-500/20">
                        <Shield size={12}/> এডমিন
                      </div>
                    ) : (
                      <select 
                        className="bg-gray-800 border-gray-700 rounded-xl text-[10px] px-3 py-2 font-black uppercase text-white focus:ring-2 focus:ring-blue-600 outline-none cursor-pointer disabled:opacity-20"
                        value={getRoleForUser(u.id)}
                        disabled={u.isPermanentlyOff || (u.monthlyOff || []).includes(month)}
                        onChange={(e) => setRole(e as any, u.id, e.target.value as Role)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value={Role.MEMBER}>মেম্বার</option>
                        <option value={Role.MANAGER}>ম্যানেজার</option>
                      </select>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                      {!u.isAdmin && (
                        <button 
                          onClick={() => setShowStatusModal(u.id)} 
                          className={`p-2.5 rounded-xl transition-all ${u.isPermanentlyOff || (u.monthlyOff || []).includes(month) ? 'text-amber-500 bg-amber-500/10' : 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/10'}`}
                          title="অ্যাক্সেস স্ট্যাটাস পরিবর্তন"
                        >
                          <Calendar size={18} />
                        </button>
                      )}
                      <button onClick={() => setSelectedMemberId(u.id)} className="p-2.5 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all">
                        <ChevronRight size={20} />
                      </button>
                      {!u.isAdmin && (
                        <button 
                          onClick={() => setDeleteConfirmId(u.id)} 
                          className="p-2.5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Management Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[160] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-md rounded-[3rem] border border-gray-800 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black text-white">অ্যাক্সেস ও স্ট্যাটাস সেটিংস</h3>
                 <button onClick={() => setShowStatusModal(null)} className="text-gray-500 hover:text-white"><X size={24}/></button>
              </div>
              
              {db.users.find(u => u.id === showStatusModal) && (
                <div className="space-y-6">
                  {/* Status Indicator */}
                  <div className="p-6 bg-blue-900/10 rounded-3xl border border-blue-500/20 flex items-center gap-4">
                     <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                        <UserRoundCheck size={24}/>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">বর্তমান অবস্থা</p>
                        <p className="font-black text-white">{getUserStatusLabel(db.users.find(u => u.id === showStatusModal)!)}</p>
                     </div>
                  </div>

                  {/* Permanent Toggle */}
                  <div className="flex items-center justify-between p-6 bg-gray-800 rounded-3xl border border-gray-700">
                    <div>
                      <p className="font-black text-white text-sm">স্থায়ীভাবে অফ (Permanent Off)</p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">সব মাস থেকেই বাদ পড়বেন</p>
                    </div>
                    <button 
                      onClick={() => togglePermanentOff(showStatusModal)}
                      className={`transition-all ${db.users.find(u => u.id === showStatusModal)?.isPermanentlyOff ? 'text-red-500' : 'text-gray-600'}`}
                    >
                      {db.users.find(u => u.id === showStatusModal)?.isPermanentlyOff ? <ToggleRight size={40}/> : <ToggleLeft size={40}/>}
                    </button>
                  </div>

                  {/* Monthly Toggle */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">নির্দিষ্ট মাসের জন্য অফ (Monthly Off)</p>
                    <div className="grid grid-cols-1 gap-2">
                       <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-2xl border border-gray-800">
                          <span className="text-sm font-bold text-gray-300">চলতি মাস ({month})</span>
                          <button 
                            onClick={() => toggleMonthlyOff(showStatusModal, month)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${db.users.find(u => u.id === showStatusModal)?.monthlyOff?.includes(month) ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                          >
                            {db.users.find(u => u.id === showStatusModal)?.monthlyOff?.includes(month) ? 'অফ করা আছে' : 'অ্যাকটিভ আছে'}
                          </button>
                       </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-amber-900/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                     <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16}/>
                     <p className="text-[10px] text-amber-200/70 font-bold leading-relaxed">অফ থাকলে মেম্বার কোনো শেয়ারড খরচে অংশ নেবেন না এবং ডাটা এন্ট্রি করতে পারবেন না। ম্যানেজার থাকলে তার দায়িত্ব স্বয়ংক্রিয়ভাবে বাতিল হবে।</p>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setShowStatusModal(null)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/20"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && userToDelete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gray-950 w-full max-w-lg rounded-[3rem] border border-red-500/30 overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in zoom-in-95 duration-300">
            <div className="bg-red-500/10 p-10 flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                <AlertTriangle size={40} className="text-white animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">সদস্য রিমুভ নিশ্চিত করুন</h3>
                <p className="text-red-400 font-bold text-lg">আপনি কি নিশ্চিতভাবে <span className="underline">"{userToDelete.name}"</span> কে মেস থেকে চিরতরে বাদ দিতে চান?</p>
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

      {/* Detail Modal */}
      {selectedMemberId && selectedMemberStats && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gray-900 w-full max-w-2xl rounded-[3rem] border border-gray-800 overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setSelectedMemberId(null)} className="absolute right-8 top-8 p-3 bg-gray-800 text-gray-400 rounded-2xl hover:text-white transition-all z-10">
              <X size={24} />
            </button>
            <div className="p-10 space-y-8">
              <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-xl ${selectedMemberStats.isOverseer ? 'bg-purple-600 shadow-purple-500/30' : 'bg-blue-600 shadow-blue-500/30'}`}>
                  {selectedMemberStats.name[0]}
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white">{selectedMemberStats.name}</h3>
                  <p className={`${selectedMemberStats.isOverseer ? 'text-purple-400' : 'text-blue-400'} font-bold uppercase text-xs tracking-[0.3em] mt-1`}>
                    {selectedMemberStats.isOverseer ? 'সিস্টেম এডমিন' : month + ' পারফরম্যান্স'}
                  </p>
                </div>
              </div>
              {!selectedMemberStats.isOverseer && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-5 bg-gray-800/50 rounded-3xl border border-gray-800 text-center">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">মোট মিল</p>
                    <p className="text-xl font-black text-white">{selectedMemberStats.totalMeals.toFixed(1)}</p>
                  </div>
                  <div className="p-5 bg-gray-800/50 rounded-3xl border border-gray-800 text-center">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">খাবার খরচ</p>
                    <p className="text-xl font-black text-white">৳{selectedMemberStats.mealCost.toFixed(0)}</p>
                  </div>
                  <div className="p-5 bg-blue-900/20 rounded-3xl border border-blue-500/20 text-center">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">জমা টাকা</p>
                    <p className="text-xl font-black text-blue-500">৳{selectedMemberStats.contribution.toLocaleString()}</p>
                  </div>
                  <div className={`p-5 rounded-3xl border text-center ${mealOnlyBalance >= 0 ? 'bg-green-900/20 border-green-500/20' : 'bg-red-900/20 border-red-500/20'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${mealOnlyBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>মিলের ব্যালেন্স</p>
                    <p className={`text-xl font-black ${mealOnlyBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>৳{mealOnlyBalance.toFixed(0)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-gray-900 w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-10 border border-gray-800 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
              <UserCheck className="text-blue-500" />
              নতুন মেম্বার অ্যাড
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">মেম্বারের পুরো নাম</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-700 rounded-[1.5rem] px-6 py-4 text-white font-bold focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-gray-700"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="যেমন: মোঃ রহিম উদ্দিন"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-gray-500 font-black uppercase text-xs">বাতিল</button>
                <button onClick={addUser} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/30">মেম্বার অ্যাড করুন</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;
