
import React from 'react';
import { T } from '../translations';
import { User, Role } from '../types';
import { Calendar, Menu, User as UserIcon, ChevronDown } from 'lucide-react';

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
  const banglaMonths = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
  ];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // সাল সিলেক্টরের জন্য অপশন তৈরি (২০২০ থেকে বর্তমান সাল পর্যন্ত)
  const years = [];
  for (let y = currentYear; y >= 2020; y--) {
    years.push(y);
  }

  const [yearStr, monthStr] = selectedMonth.split('-');
  const selectedYear = parseInt(yearStr);
  const selectedMonthIdx = parseInt(monthStr);

  const handleYearChange = (newYear: string) => {
    onMonthChange(`${newYear}-${monthStr}`);
  };

  const handleMonthChange = (newMonth: string) => {
    onMonthChange(`${yearStr}-${newMonth.padStart(2, '0')}`);
  };

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

  return (
    <header className="bg-gray-900/50 backdrop-blur-md border-b border-gray-800 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 shrink-0 min-w-0 max-w-[25%] sm:max-w-none">
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
          <span className="text-[10px] text-gray-500 truncate hidden xs:block font-bold">{user.userId || `@${user.username}`}</span>
        </div>
      </div>

      {hasActiveMess ? (
        <>
          <div className="flex-1 flex justify-center px-2 overflow-hidden min-w-0">
            <h1 className="text-base xs:text-lg sm:text-2xl lg:text-3xl font-black text-blue-500 tracking-tight truncate drop-shadow-sm text-center">
              {messName}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1.5 bg-gray-800/80 rounded-xl border border-gray-700">
              <Calendar size={14} className="text-gray-500 ml-1 hidden sm:block" />
              
              {/* মাস সিলেক্টর */}
              <select 
                value={selectedMonthIdx}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] md:text-xs font-black focus:ring-0 cursor-pointer text-gray-100 pr-5 sm:pr-6"
              >
                {banglaMonths.map((m, i) => (
                  <option key={i} value={i + 1} className="bg-gray-900 text-white">{m}</option>
                ))}
              </select>

              {/* সাল সিলেক্টর */}
              <select 
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] md:text-xs font-black focus:ring-0 cursor-pointer text-blue-400 pr-5 sm:pr-6 border-l border-gray-700 pl-2"
              >
                {years.map(y => (
                  <option key={y} value={y} className="bg-gray-900 text-white">{y}</option>
                ))}
              </select>
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
