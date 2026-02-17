
import React, { useState, useMemo } from 'react';
import { T } from '../translations';
import { getLocalDateStr, getUserRoleInMonth, getActiveResidentsInMonth } from '../db';
import { Role, Meal, MessSystemDB, User } from '../types';
import { Utensils, Calendar as CalendarIcon, Info, Lock, Eye, ShieldCheck, Sigma, UserX, AlertTriangle, Clock } from 'lucide-react';

interface MealEntryProps {
  month: string;
  role: Role;
  userId: string;
  isAdmin: boolean;
  db: MessSystemDB;
  updateDB: (updates: Partial<MessSystemDB>) => void;
}

const MealEntry: React.FC<MealEntryProps> = ({ month, userId, isAdmin, db, updateDB }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = getLocalDateStr();
    return today.startsWith(month) ? today : `${month}-01`;
  });

  const isMonthLocked = (db.lockedMonths || []).includes(month);

  // Time-Lock Logic
  const checkTimeLock = (field: string, date: string): boolean => {
    if (!db.mealLockTimes?.enabled) return false;
    
    const now = new Date();
    const targetDate = new Date(date);
    const todayStr = getLocalDateStr();
    
    // সময়ের তুলনা করার জন্য হেল্পার
    const isPastTime = (lockTime: string, isSameDay: boolean) => {
      const [lockH, lockM] = lockTime.split(':').map(Number);
      const lockDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), lockH, lockM);
      return isSameDay && now > lockDateTime;
    };

    if (field === 'breakfast') {
      // সকালের খাবার আগের দিন নির্দিষ্ট সময়ে লক হয়
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() + 1);
      const tomorrowStr = getLocalDateStr(yesterday);
      
      if (date === tomorrowStr) {
        return isPastTime(db.mealLockTimes.breakfast, true);
      }
      if (date === todayStr) return true; // আজ সকালের খাবার অলরেডি লকড
    }

    if (field === 'lunch') {
      if (date === todayStr) return isPastTime(db.mealLockTimes.lunch, true);
    }

    if (field === 'dinner') {
      if (date === todayStr) return isPastTime(db.mealLockTimes.dinner, true);
    }

    // যদি ডেটটি আজকের আগের হয়, তবে সেটি অটোমেটিক লকড (যদি এডমিন না হয়)
    if (date < todayStr) return true;

    return false;
  };

  const isEditable = useMemo(() => {
    if (isMonthLocked) return false;
    if (isAdmin) return true;
    const dateMonth = selectedDate.substring(0, 7);
    const effectiveRole = getUserRoleInMonth(db, userId, dateMonth);
    return effectiveRole === Role.MANAGER;
  }, [db, userId, isAdmin, selectedDate, isMonthLocked]);

  const mealData = useMemo(() => {
    const dateMonth = selectedDate.substring(0, 7);
    const activeResidents = getActiveResidentsInMonth(db, dateMonth);
    
    return activeResidents.map(user => {
      const existing = db.meals.find(m => m.userId === user.id && m.date === selectedDate);
      return {
        userId: user.id,
        userName: user.name,
        breakfast: existing?.breakfast ?? 0,
        lunch: existing?.lunch ?? 0,
        dinner: existing?.dinner ?? 0,
        guest: existing?.guest ?? 0,
      };
    });
  }, [db.meals, db.users, selectedDate]);

  const globalTotalMeals = useMemo(() => {
    return mealData.reduce((acc, m) => acc + m.breakfast + m.lunch + m.dinner + m.guest, 0);
  }, [mealData]);

  const updateMealValue = (uId: string, field: keyof Omit<Meal, 'id' | 'userId' | 'date'>, val: string) => {
    if (!isEditable) return;
    
    // Time lock check
    if (!isAdmin && checkTimeLock(field, selectedDate)) {
      alert("দুঃখিত, এই মিলটি পরিবর্তন করার সময় পার হয়ে গেছে!");
      return;
    }

    const rawValue = parseFloat(val) || 0;
    const value = Math.max(0, rawValue);
    
    const mealIdx = db.meals.findIndex(m => m.userId === uId && m.date === selectedDate);
    const newMeals = [...db.meals];

    if (mealIdx > -1) {
      newMeals[mealIdx] = { ...newMeals[mealIdx], [field]: value };
    } else {
      newMeals.push({
        id: crypto.randomUUID(),
        userId: uId,
        date: selectedDate,
        breakfast: field === 'breakfast' ? value : 0,
        lunch: field === 'lunch' ? value : 0,
        dinner: field === 'dinner' ? value : 0,
        guest: field === 'guest' ? value : 0,
      });
    }

    updateDB({ meals: newMeals });
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3 text-white">
            <Utensils className="text-blue-500" />
            মিল এন্ট্রি
          </h2>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">সদস্যদের প্রতিদিনের খাবারের এন্ট্রি</p>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-900 p-2 rounded-2xl border border-gray-800 shadow-xl">
           <CalendarIcon size={16} className="text-gray-500 ml-2 hidden xs:block" />
           <input 
              type="date" 
              className="bg-transparent border-none text-sm font-black text-white outline-none cursor-pointer p-1"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
        </div>
      </div>

      {db.mealLockTimes?.enabled && (
        <div className="bg-amber-900/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-3">
           <Clock size={18} className="text-amber-500" />
           <p className="text-[10px] font-black text-amber-200/70 uppercase tracking-widest">
             টাইম-লক সক্রিয়: সকাল ({db.mealLockTimes.breakfast}), দুপুর ({db.mealLockTimes.lunch}), রাত ({db.mealLockTimes.dinner})
           </p>
        </div>
      )}

      <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-2xl">
            <Sigma size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">আজকের মোট মিল (অ্যাক্টিভ সদস্য)</p>
            <h3 className="text-2xl font-black text-white">{globalTotalMeals.toFixed(1)}</h3>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-[2rem] border border-gray-800 overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/40 text-[10px] uppercase font-black text-gray-500">
                <th className="px-8 py-6 text-left">সদস্য</th>
                <th className="px-4 py-6 text-center">সকাল</th>
                <th className="px-4 py-6 text-center">দুপুর</th>
                <th className="px-4 py-6 text-center">রাত</th>
                <th className="px-4 py-6 text-center">অতিথি</th>
                <th className="px-8 py-6 text-right bg-blue-900/10 text-blue-400">মোট মিল</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {mealData.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-10 text-center text-gray-600 italic">এই মাসের জন্য কোনো একটিভ মেম্বার পাওয়া যায়নি</td></tr>
              ) : (
                mealData.map(m => {
                  const rowTotal = m.breakfast + m.lunch + m.dinner + m.guest;
                  return (
                    <tr key={m.userId} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-black text-white text-sm">{m.userName}</div>
                      </td>
                      {['breakfast', 'lunch', 'dinner', 'guest'].map(field => {
                        const isLocked = !isAdmin && checkTimeLock(field, selectedDate);
                        return (
                          <td key={field} className="px-2 py-6 text-center">
                            <div className="relative inline-block">
                              <input 
                                type="number" step="0.5" min="0"
                                className={`w-16 mx-auto bg-gray-800 border ${isLocked ? 'border-red-900/50 opacity-40' : 'border-gray-700'} rounded-xl text-center py-2.5 text-sm font-black text-white focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-30 transition-all`}
                                value={m[field as keyof typeof m] || ''}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateMealValue(m.userId, field as any, e.target.value)}
                                disabled={!isEditable || isLocked}
                              />
                              {isLocked && <Lock size={10} className="absolute -top-1 -right-1 text-red-500" />}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-8 py-6 text-right bg-blue-900/5">
                        <span className="text-lg font-black text-blue-500">{rowTotal.toFixed(1)}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MealEntry;
