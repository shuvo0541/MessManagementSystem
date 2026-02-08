
import React from 'react';
import { T } from '../translations';
import { User, Role } from '../types';
import { Calendar, Menu } from 'lucide-react';

interface HeaderProps {
  user: User;
  role: Role;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  user, role, selectedMonth, onMonthChange, onMenuToggle 
}) => {
  const getRoleBadge = () => {
    if (user.isAdmin) return <span className="px-2 py-0.5 bg-purple-900/40 text-purple-400 text-[9px] md:text-xs rounded-full font-black uppercase tracking-tight shrink-0 border border-purple-500/30">{T.admin}</span>;
    
    switch (role) {
      case Role.MANAGER: return <span className="px-2 py-0.5 bg-green-900/40 text-green-400 text-[9px] md:text-xs rounded-full font-black uppercase tracking-tight shrink-0 border border-green-500/30">{T.manager}</span>;
      default: return <span className="px-2 py-0.5 bg-blue-900/40 text-blue-400 text-[9px] md:text-xs rounded-full font-black uppercase tracking-tight shrink-0 border border-blue-500/30">{T.member}</span>;
    }
  };

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

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 rounded-xl border border-gray-700">
          <Calendar size={14} className="text-gray-500 hidden sm:block" />
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="bg-transparent border-none outline-none text-[11px] md:text-sm font-black focus:ring-0 w-32 cursor-pointer text-gray-100"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
