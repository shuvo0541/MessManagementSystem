
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
  onViewChange: (view: string) => void;
  hasActiveMess: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  user, role, messName, messId, selectedMonth, onMonthChange, onMenuToggle, onViewChange, hasActiveMess
}) => {
  const banglaMonths = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
  ];

  const currentYear = new Date().getFullYear();
  
  // সাল সিলেক্টরের জন্য অপশন তৈরি (২০২০ থেকে বর্তমান সাল পর্যন্ত)
  const years = [];
  for (let y = currentYear + 2; y >= 2020; y--) {
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
    if (user.isAdmin && hasActiveMess) return <span className="px-1.5 sm:px-2 py-0.5 bg-purple-900/40 text-purple-400 text-[8px] sm:text-[10px] rounded-full font-black uppercase tracking-tight shrink-0 border border-purple-500/30">এডমিন</span>;
    
    if (hasActiveMess) {
      switch (role) {
        case Role.MANAGER: return <span className="px-1.5 sm:px-2 py-0.5 bg-green-900/40 text-green-400 text-[8px] sm:text-[10px] rounded-full font-black uppercase tracking-tight shrink-0 border border-green-500/30">ম্যানেজার</span>;
        default: return <span className="px-1.5 sm:px-2 py-0.5 bg-blue-900/40 text-blue-400 text-[8px] sm:text-[10px] rounded-full font-black uppercase tracking-tight shrink-0 border border-blue-500/30">মেম্বার</span>;
      }
    }
    return <span className="px-1.5 sm:px-2 py-0.5 bg-gray-900/40 text-gray-400 text-[8px] sm:text-[10px] rounded-full font-black uppercase tracking-tight shrink-0 border border-gray-500/30">ইউজার</span>;
  };

  return (
    <header className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-30 w-full overflow-hidden">
      {/* Left Section: User Info & Menu */}
      <div 
        onClick={() => onViewChange('profile')}
        className="flex items-center gap-1.5 sm:gap-3 shrink-0 max-w-[30%] sm:max-w-xs cursor-pointer group transition-all"
      >
        <button 
          onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
          className="lg:hidden p-1 sm:p-2 hover:bg-gray-800 rounded-lg text-gray-300 transition-colors shrink-0"
        >
          <Menu size={16} className="sm:w-5 sm:h-5" />
        </button>
        <div className="flex flex-col min-w-0 group-hover:translate-x-0.5 transition-transform">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <span className="font-black text-[10px] sm:text-base truncate text-gray-100 leading-tight group-hover:text-blue-400 transition-colors">{user.name}</span>
            {getRoleBadge()}
          </div>
          <span className="text-[8px] sm:text-[10px] text-gray-500 truncate font-bold leading-none mt-0.5">
            {user.userId || `@${user.username}`}
          </span>
        </div>
      </div>

      {/* Middle Section: Mess Name */}
      {hasActiveMess ? (
        <>
          <div className="flex-1 flex justify-center px-1 sm:px-2 min-w-0">
            <h1 
              onClick={() => onViewChange('dashboard')}
              className="text-[12px] sm:text-xl md:text-2xl lg:text-3xl font-black text-blue-500 tracking-tight truncate drop-shadow-sm text-center leading-tight cursor-pointer hover:scale-105 transition-transform active:scale-95"
            >
              {messName}
            </h1>
          </div>

          {/* Right Section: Month/Year Selector */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="flex items-center bg-gray-800/80 rounded-lg sm:rounded-xl border border-gray-700 p-0.5 sm:p-1">
              {/* মাস সিলেক্টর */}
              <div className="relative flex items-center">
                <select 
                  value={selectedMonthIdx}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="appearance-none bg-transparent border-none outline-none text-[9px] sm:text-xs font-black focus:ring-0 cursor-pointer text-gray-100 pl-2 pr-5 sm:pr-6 py-1 sm:py-1.5"
                >
                  {banglaMonths.map((m, i) => (
                    <option key={i} value={i + 1} className="bg-gray-900 text-white">{m}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 text-gray-500 pointer-events-none" />
              </div>

              <div className="h-3 sm:h-4 w-px bg-gray-700 mx-0.5 sm:mx-1"></div>

              {/* সাল সিলেক্টর */}
              <div className="relative flex items-center">
                <select 
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="appearance-none bg-transparent border-none outline-none text-[9px] sm:text-xs font-black focus:ring-0 cursor-pointer text-blue-400 pl-1.5 sm:pl-2 pr-5 sm:pr-6 py-1 sm:py-1.5"
                >
                  {years.map(y => (
                    <option key={y} value={y} className="bg-gray-900 text-white">{y}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 text-blue-500 pointer-events-none" />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex justify-end">
           <div className="flex items-center gap-2 text-blue-400 font-black text-[9px] sm:text-[10px] uppercase tracking-widest bg-blue-900/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-blue-500/20">
              <UserIcon size={12} className="sm:w-3.5 sm:h-3.5" /> 
              <span className="whitespace-nowrap">মেস সিলেকশন</span>
           </div>
        </div>
      )}
    </header>
  );
};

export default Header;
