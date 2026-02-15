
import React from 'react';
import { T } from '../translations';
import { User, Role } from '../types';
import { Calendar, Menu, Hash, Copy, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  user: User;
  role: Role;
  messName: string;
  messId: string | null;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onMenuToggle: () => void;
  hasActiveMess: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  user, role, messName, messId, selectedMonth, onMonthChange, onMenuToggle, hasActiveMess
}) => {
  const getRoleBadge = () => {
    if (user.isAdmin && hasActiveMess) return <span className="px-2 py-0.5 bg-purple-900/40 text-purple-400 text-[9px] md:text-xs rounded-full font-black uppercase tracking-tight shrink-0 border border-purple-500/30">{T.admin}</span>;
    
    if (hasActiveMess) {
      switch (role) {
        case Role.MANAGER: return <span className="px-2 py-0.5 bg-green-900/40 text-green-400 text-[9px] md:text-xs rounded-full font-black uppercase tracking-tight shrink-0 border border-green-500/30">{T.manager}</span>;
        default: return <span className="px-2 py-0.5 bg-blue-900/40 text-blue-400 text-[9px] md:text-xs rounded-full font-black uppercase tracking-tight shrink-0 border border-blue-500/30">{T.member}</span>;
      }
    }
    return <span className="px-2 py-0.5 bg-gray-900/40 text-gray-400 text-[9px] md:text-xs rounded-full font-black uppercase tracking-tight shrink-0 border border-gray-500/30">ইউজার</span>;
  };

  const copyId = () => {
    if (messId) {
      navigator.clipboard.writeText(messId);
      alert('Mess ID copied to clipboard!');
    }
  };

  // মেম্বারদের জন্য মাসের সীমাবদ্ধতা নির্ধারণ
  const minMonthLimit = !user.isAdmin ? user.joiningMonth : undefined;
  const maxMonthLimit = (!user.isAdmin && user.leavingMonth) ? user.leavingMonth : undefined;

  return (
    <header className="bg-gray-900/50 backdrop-blur-md border-b border-gray-800 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button 
          onClick={onMenuToggle}
          className="lg:hidden p-2 hover:bg-gray-800 rounded-xl text-gray-300 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-black text-sm md:text-base truncate text-gray-100">{user.name}</span>
            {getRoleBadge()}
          </div>
          <span className="text-[10px] text-gray-500 truncate hidden xs:block font-bold">@{user.username}</span>
        </div>
      </div>

      {hasActiveMess ? (
        <>
          <div className="flex-1 flex justify-center px-4 overflow-hidden">
            <div className="flex items-center gap-3 bg-gray-950 px-4 py-2 rounded-2xl border border-gray-800 max-w-xs md:max-w-md w-full">
               <div className="w-8 h-8 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                  <Hash size={14}/>
               </div>
               <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-gray-500 uppercase leading-none mb-1">{messName}</p>
                  <p className="text-[9px] text-gray-600 font-bold truncate opacity-50">{messId}</p>
               </div>
               <button onClick={copyId} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 shrink-0">
                  <Copy size={12}/>
               </button>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 rounded-xl border border-gray-700">
              <Calendar size={14} className="text-gray-500 hidden sm:block" />
              <input 
                type="month" 
                value={selectedMonth}
                min={minMonthLimit}
                max={maxMonthLimit}
                onChange={(e) => onMonthChange(e.target.value)}
                className="bg-transparent border-none outline-none text-[11px] md:text-sm font-black focus:ring-0 w-32 cursor-pointer text-gray-100"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex justify-end">
           <div className="flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase tracking-widest bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-500/20">
              <UserIcon size={14} /> মেস সিলেকশন মোড
           </div>
        </div>
      )}
    </header>
  );
};

export default Header;
