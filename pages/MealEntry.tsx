import React, { useState, useMemo } from 'react';
import { T } from '../translations';
import { getLocalDateStr, getUserRoleInMonth, getActiveResidentsInMonth } from '../db';
import { Role, Meal, MessSystemDB } from '../types';
import { Utensils, Calendar as CalendarIcon, Sigma } from 'lucide-react';

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
    
    let value = parseFloat(val);
    if (isNaN(value) || value <= 0) {
       updateMealInDB(uId, field, 0);
       return;
    }

    // Constraints: Minimum 0.5 for non-zero values
    if (value > 0 && value < 0.5) {
      value = 0.5;
    }
    
    // Ensure value is a multiple of 0.5 for consistency
    value = Math.round(value * 2) / 2;

    updateMealInDB(uId, field, value);
  };

  const updateMealInDB = (uId: string, field: keyof Omit<Meal, 'id' | 'userId' | 'date'>, value: number) => {
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
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3 text-white">
            <Utensils className="text-blue-500" />
            মিল এন্ট্রি
          </h2>
          <p className="text-gray-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">সর্বনিম্ন মিলের পরিমাণ ০.৫</p>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-900 p-2 rounded-xl sm:rounded-2xl border border-gray-800 shadow-xl self-start sm:self-auto">
           <CalendarIcon size={14} className="text-gray-500 ml-2" />
           <input 
              type="date" 
              className="bg-transparent border-none text-[12px] sm:text-sm font-black text-white outline-none cursor-pointer p-1"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
        </div>
      </div>

      <div className="bg-blue-600/10 border border-blue-500/20 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-blue-600 text-white rounded-xl sm:rounded-2xl shadow-xl shadow-blue-500/10">
            <Sigma size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[8px] sm:text-[10px] font-black text-blue-400 uppercase tracking-widest">আজকের মোট মিল</p>
            <h3 className="text-xl sm:text-2xl font-black text-white">{globalTotalMeals.toFixed(1)}</h3>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl sm:rounded-[2rem] border border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[500px] sm:min-w-0">
            <thead>
              <tr className="bg-gray-800/40 text-[9px] sm:text-[10px] uppercase font-black text-gray-500">
                <th className="px-6 sm:px-8 py-5 sm:py-6 text-left">সদস্য</th>
                <th className="px-2 py-5 sm:py-6 text-center">সকাল</th>
                <th className="px-2 py-5 sm:py-6 text-center">দুপুর</th>
                <th className="px-2 py-5 sm:py-6 text-center">রাত</th>
                <th className="px-2 py-5 sm:py-6 text-center">অতিথি</th>
                <th className="px-6 sm:px-8 py-5 sm:py-6 text-right bg-blue-900/10 text-blue-400">মোট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {mealData.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-10 text-center text-gray-600 italic">সদস্য পাওয়া যায়নি</td></tr>
              ) : (
                mealData.map(m => {
                  const rowTotal = m.breakfast + m.lunch + m.dinner + m.guest;
                  return (
                    <tr key={m.userId} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 sm:px-8 py-4 sm:py-6">
                        <div className="font-black text-white text-[12px] sm:text-sm">{m.userName}</div>
                      </td>
                      {['breakfast', 'lunch', 'dinner', 'guest'].map(field => {
                        return (
                          <td key={field} className="px-1 py-4 sm:py-6 text-center">
                            <input 
                              type="number" step="0.5" min="0"
                              className={`w-12 sm:w-16 mx-auto bg-gray-800 border border-gray-700 rounded-lg sm:rounded-xl text-center py-2 sm:py-2.5 text-[12px] sm:text-sm font-black text-white focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-30 transition-all`}
                              value={m[field as keyof typeof m] || ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateMealValue(m.userId, field as any, e.target.value)}
                              disabled={!isEditable}
                            />
                          </td>
                        );
                      })}
                      <td className="px-6 sm:px-8 py-4 sm:py-6 text-right bg-blue-900/5">
                        <span className="text-base sm:text-lg font-black text-blue-500">{rowTotal.toFixed(1)}</span>
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