
import React, { useState, useMemo } from 'react';
import { T } from '../translations';
import { Role, MessSystemDB, User } from '../types';
import { getCurrentMonthStr } from '../db';
import { 
  Trash2, 
  Shield, 
  Search,
  Lock,
  Crown,
  LayoutGrid,
  List,
  Calendar,
  User as UserIcon,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

interface MembersProps {
  month: string;
  isAdmin: boolean;
  role: Role;
  messAdminId: string | null;
  messId: string;
  messName: string;
  db: MessSystemDB;
  updateDB: (updates: Partial<MessSystemDB>) => void;
  user: User;
}

const Members: React.FC<MembersProps> = ({ month, isAdmin, role, messAdminId, db, updateDB }) => {
  const [search, setSearch] = useState('');
  const [viewType, setViewType] = useState<'list' | 'timeline'>('list');
  const canManageCritical = isAdmin;
  const canManageGeneral = isAdmin || role === Role.MANAGER;

  const filteredUsers = useMemo(() => {
    return db.users.filter(u => 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      (u.username && u.username.toLowerCase().includes(search.toLowerCase()))
    );
  }, [db.users, search]);

  const updateMemberDates = (userId: string, field: 'joiningMonth' | 'leavingMonth', value: string | null) => {
    if (!canManageCritical) return;
    if (userId === messAdminId && field === 'leavingMonth') {
      alert("মেস এডমিন নিজেকে আন-অ্যাক্টিভ করতে পারবেন না।");
      return;
    }
    updateDB({
      users: db.users.map(u => u.id === userId ? { ...u, [field]: value || null } : u)
    });
  };

  const setRole = (userId: string, targetRole: Role) => {
    if (!canManageCritical || userId === messAdminId) return;
    const others = db.monthlyRoles.filter(r => !(r.userId === userId && r.month === month));
    updateDB({ monthlyRoles: [...others, { userId, month, role: targetRole }] });
  };

  const getUserStatusLabel = (u: User) => {
    if (u.id === messAdminId) return <span className="text-purple-400 font-black flex items-center gap-1"><Crown size={10}/> মেস এডমিন</span>;
    
    const isFutureJoin = u.joiningMonth && u.joiningMonth > month;
    const isAlreadyLeft = u.leavingMonth && u.leavingMonth < month;
    const isLeavingNow = u.leavingMonth === month;

    if (isFutureJoin) return <span className="text-gray-500 italic">আগামীতে যুক্ত হবে</span>;
    if (isAlreadyLeft) return <span className="text-red-700 font-black line-through">ছেড়ে গেছে</span>;
    if (isLeavingNow) return <span className="text-amber-500 font-black px-2 py-0.5 bg-amber-500/10 rounded-lg">বিদায়ী মাস</span>;
    
    if (u.isPermanentlyOff || (u.monthlyOff || []).includes(month)) return <span className="text-amber-400 font-bold uppercase text-[9px]">অফ আছে</span>;
    
    return <span className="text-green-500 font-bold">অ্যাক্টিভ</span>;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl sm:text-3xl font-black text-white flex items-center gap-3">
            <Shield className="text-blue-500" /> সদস্য তালিকা
          </h2>
          <p className="text-gray-500 font-bold uppercase text-[9px] sm:text-[10px] mt-1 tracking-widest">প্রোফাইল ও টাইমলাইন ম্যানেজমেন্ট</p>
        </div>

        <div className="flex bg-gray-900 p-1 rounded-xl sm:rounded-2xl border border-gray-800 self-start sm:self-auto">
           <button 
             onClick={() => setViewType('list')}
             className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${viewType === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}
           >
              <List size={14}/> লিস্ট
           </button>
           <button 
             onClick={() => setViewType('timeline')}
             className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${viewType === 'timeline' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}
           >
              <Calendar size={14}/> টাইমলাইন
           </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl sm:rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-gray-800 flex items-center gap-3">
          <Search className="text-gray-500 shrink-0" size={18} />
          <input 
            type="text" 
            placeholder="নাম দিয়ে খুঁজুন..." 
            className="flex-1 bg-transparent border-none focus:ring-0 text-base sm:text-lg font-bold text-white placeholder:text-gray-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {viewType === 'list' ? (
          <div className="p-4 sm:p-0">
            {/* Desktop View Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800/50 text-left text-[10px] uppercase font-black text-gray-500 border-b border-gray-800">
                    <th className="px-8 py-6">সদস্য ও স্ট্যাটাস</th>
                    <th className="px-4 py-6">যোগদান</th>
                    <th className="px-4 py-6">বিদায়</th>
                    <th className="px-4 py-6">রোল</th>
                    <th className="px-8 py-6 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-800/40 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-white">{u.name}</span>
                          <span className="text-[10px] uppercase mt-1 font-bold">{getUserStatusLabel(u)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <input type="month" disabled={!canManageGeneral || u.id === messAdminId} className="bg-gray-800 border-gray-700 rounded-lg text-[10px] p-2 text-white" value={u.joiningMonth || ''} onChange={(e) => updateMemberDates(u.id, 'joiningMonth', e.target.value)} />
                      </td>
                      <td className="px-4 py-6">
                        <input type="month" disabled={!canManageCritical || u.id === messAdminId} className="bg-gray-800 border-gray-700 rounded-lg text-[10px] p-2 text-white" value={u.leavingMonth || ''} onChange={(e) => updateMemberDates(u.id, 'leavingMonth', e.target.value || null)} />
                      </td>
                      <td className="px-4 py-6">
                        {u.id === messAdminId ? (
                          <span className="text-[9px] font-black text-purple-400 uppercase bg-purple-900/10 px-2 py-1.5 rounded-lg border border-purple-500/10">এডমিন</span>
                        ) : (
                          <select disabled={!canManageCritical} className="bg-gray-800 border-gray-700 rounded-lg text-[10px] p-2 text-white font-bold" value={db.monthlyRoles.find(r => r.userId === u.id && r.month === month)?.role || Role.MEMBER} onChange={(e) => setRole(u.id, e.target.value as Role)}>
                            <option value={Role.MEMBER}>মেম্বার</option>
                            <option value={Role.MANAGER}>ম্যানেজার</option>
                          </select>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        {canManageCritical && u.id !== messAdminId ? (
                          <button onClick={() => { if(window.confirm("মুছে ফেলতে চান?")) updateDB({ users: db.users.filter(x => x.id !== u.id) }); }} className="p-2 text-red-500/30 hover:text-red-500 transition-colors">
                            <Trash2 size={16}/>
                          </button>
                        ) : <Lock size={12} className="text-gray-700 ml-auto"/>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="grid grid-cols-1 gap-4 sm:hidden">
               {filteredUsers.map(u => (
                 <div key={u.id} className="bg-gray-800/30 p-5 rounded-2xl border border-gray-800 space-y-5">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600/20 text-blue-500 rounded-xl flex items-center justify-center font-black">{u.name[0]}</div>
                          <div>
                             <h4 className="font-black text-white text-sm">{u.name}</h4>
                             <p className="text-[9px] uppercase font-bold text-gray-500 mt-0.5">{getUserStatusLabel(u)}</p>
                          </div>
                       </div>
                       {canManageCritical && u.id !== messAdminId && (
                         <button onClick={() => { if(window.confirm("মুছে ফেলতে চান?")) updateDB({ users: db.users.filter(x => x.id !== u.id) }); }} className="p-2 text-red-500/40"><Trash2 size={16}/></button>
                       )}
                    </div>
                    
                    <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                             <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">যোগদান</p>
                             <input type="month" disabled={!canManageGeneral || u.id === messAdminId} className="w-full bg-gray-900 border border-gray-700 rounded-lg text-[10px] p-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500" value={u.joiningMonth || ''} onChange={(e) => updateMemberDates(u.id, 'joiningMonth', e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                             <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">বিদায়</p>
                             <input type="month" disabled={!canManageCritical || u.id === messAdminId} className="w-full bg-gray-900 border border-gray-700 rounded-lg text-[10px] p-2.5 text-white outline-none focus:ring-1 focus:ring-red-500" value={u.leavingMonth || ''} onChange={(e) => updateMemberDates(u.id, 'leavingMonth', e.target.value || null)} />
                          </div>
                       </div>
                       <div className="space-y-1.5">
                          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">রোল ({month})</p>
                          {u.id === messAdminId ? (
                             <div className="w-full bg-purple-900/10 border border-purple-500/10 rounded-lg text-[10px] p-2.5 text-purple-400 font-black text-center uppercase">Admin</div>
                          ) : (
                            <select disabled={!canManageCritical} className="w-full bg-gray-900 border border-gray-700 rounded-lg text-[10px] p-2.5 text-white font-bold outline-none focus:ring-1 focus:ring-blue-500" value={db.monthlyRoles.find(r => r.userId === u.id && r.month === month)?.role || Role.MEMBER} onChange={(e) => setRole(u.id, e.target.value as Role)}>
                               <option value={Role.MEMBER}>Member</option>
                               <option value={Role.MANAGER}>Manager</option>
                            </select>
                          )}
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
             {filteredUsers.map(u => {
               const start = u.joiningMonth || 'N/A';
               const end = u.leavingMonth || 'চলছে';
               const isCurrent = start <= month && (end === 'চলছে' || end >= month);

               return (
                 <div key={u.id} className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border ${isCurrent ? 'bg-blue-600/5 border-blue-500/20 shadow-lg' : 'bg-gray-800/20 border-gray-800'} space-y-3 sm:space-y-4`}>
                    <div className="flex justify-between items-center">
                       <span className="font-black text-white text-sm sm:text-base">{u.name}</span>
                       <span className={`text-[8px] sm:text-[9px] font-black uppercase px-2 py-1 rounded-lg ${isCurrent ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-800 text-gray-500'}`}>{isCurrent ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="relative h-1.5 sm:h-2 bg-gray-800 rounded-full overflow-hidden">
                       <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full" style={{ width: isCurrent ? '70%' : '100%' }} />
                    </div>
                    <div className="flex justify-between text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                       <span>জয়েন: {start}</span>
                       <span>ছেড়েছেন: {end}</span>
                    </div>
                 </div>
               );
             })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Members;
