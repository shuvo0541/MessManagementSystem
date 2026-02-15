
import React, { useState, useMemo } from 'react';
import { T } from '../translations';
import { Role, MessSystemDB, User } from '../types';
import { getCurrentMonthStr } from '../db';
import { 
  Trash2, 
  Shield, 
  Search,
  Lock,
  Crown
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
  const canManageCritical = isAdmin;
  const canManageGeneral = isAdmin || role === Role.MANAGER;

  const filteredUsers = useMemo(() => {
    return db.users.filter(u => 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.username.toLowerCase().includes(search.toLowerCase())
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
    
    // বর্তমান মাসের সাথে তুলনা করে স্ট্যাটাস নির্ধারণ
    const isFutureJoin = u.joiningMonth && u.joiningMonth > month;
    const isAlreadyLeft = u.leavingMonth && u.leavingMonth < month;
    const isLeavingNow = u.leavingMonth === month;

    if (isFutureJoin) return <span className="text-gray-500 italic">আগামীতে যুক্ত হবে ({u.joiningMonth})</span>;
    if (isAlreadyLeft) return <span className="text-red-700 font-black line-through">ছেড়ে গেছে</span>;
    if (isLeavingNow) return <span className="text-amber-500 font-black px-2 py-0.5 bg-amber-500/10 rounded-lg">এই মাসে ছেড়ে যাবে</span>;
    
    if (u.isPermanentlyOff || (u.monthlyOff || []).includes(month)) return <span className="text-amber-400 font-bold uppercase text-[9px]">অফ আছে</span>;
    
    return <span className="text-green-500 font-bold">অ্যাক্টিভ প্রোফাইল</span>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-white flex items-center gap-3">
          <Shield className="text-blue-500" /> সদস্য তালিকা
        </h2>
        <p className="text-gray-500 font-bold uppercase text-[10px] mt-1">সদস্যদের প্রোফাইল ও স্ট্যাটাস ম্যানেজমেন্ট</p>
      </div>

      <div className="bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex items-center gap-4">
          <Search className="text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="নাম বা ইউজারনেম দিয়ে খুঁজুন..." 
            className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-bold text-white placeholder:text-gray-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/50 text-left text-[10px] uppercase font-black text-gray-500">
                <th className="px-8 py-6">সদস্য ও স্ট্যাটাস</th>
                <th className="px-4 py-6">যোগদানের মাস</th>
                <th className="px-4 py-6">ছেড়ার মাস (আন-অ্যাক্টিভ)</th>
                <th className="px-4 py-6">রোল ({month})</th>
                <th className="px-8 py-6 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-10 text-center text-gray-600 italic">কোনো সদস্য পাওয়া যায়নি</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-800/40 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-white">{u.name}</span>
                        <span className="text-[10px] uppercase mt-1 font-bold tracking-tight">{getUserStatusLabel(u)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <input 
                        type="month" 
                        disabled={!canManageGeneral || u.id === messAdminId}
                        className="bg-gray-800 border border-gray-700 rounded-lg text-xs p-2 text-white outline-none focus:ring-1 focus:ring-blue-500"
                        value={u.joiningMonth || ''}
                        onChange={(e) => updateMemberDates(u.id, 'joiningMonth', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-6">
                      <div className="flex flex-col gap-1">
                        <input 
                          type="month" 
                          disabled={!canManageCritical || u.id === messAdminId}
                          className={`bg-gray-800 border rounded-lg text-xs p-2 text-white outline-none focus:ring-1 focus:ring-red-500 ${u.leavingMonth === month ? 'border-amber-500 shadow-lg shadow-amber-500/10' : 'border-gray-700'}`}
                          value={u.leavingMonth || ''}
                          onChange={(e) => updateMemberDates(u.id, 'leavingMonth', e.target.value || null)}
                        />
                        {u.leavingMonth && canManageCritical && u.id !== messAdminId && (
                          <button onClick={() => updateMemberDates(u.id, 'leavingMonth', null)} className="text-[9px] font-black uppercase text-green-500 text-left mt-1 hover:text-green-400">✓ আবার অ্যাক্টিভ করুন</button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      {u.id === messAdminId ? (
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-900/10 px-3 py-2 rounded-xl border border-purple-500/10">এডমিন</span>
                      ) : (
                        <select 
                          disabled={!canManageCritical}
                          className="bg-gray-800 border-gray-700 rounded-xl text-xs p-2 text-white font-bold"
                          value={db.monthlyRoles.find(r => r.userId === u.id && r.month === month)?.role || Role.MEMBER}
                          onChange={(e) => setRole(u.id, e.target.value as Role)}
                        >
                          <option value={Role.MEMBER}>মেম্বার</option>
                          <option value={Role.MANAGER}>ম্যানেজার</option>
                        </select>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      {canManageCritical && u.id !== messAdminId ? (
                        <button onClick={() => { if(window.confirm("আপনি কি নিশ্চিতভাবে এই মেম্বারকে ডিলিট করতে চান?")) updateDB({ users: db.users.filter(x => x.id !== u.id) }); }} className="p-2 text-red-500/40 hover:text-red-500 transition-colors">
                          <Trash2 size={18}/>
                        </button>
                      ) : <Lock size={14} className="text-gray-700 ml-auto"/>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Members;
