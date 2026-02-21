
import React, { useState, useMemo } from 'react';
import { T } from '../translations';
import { getLocalDateStr, getUserRoleInMonth, getActiveResidentsInMonth } from '../db';
import { Role, Meal, MessSystemDB } from '../types';
import { Utensils, Calendar as CalendarIcon, Sigma, User as UserIcon } from 'lucide-react';

interface MealEntryProps {
  month: string;
  role: Role;
  userId: string;
  isAdmin: boolean;
  db: MessSystemDB;
  updateDB: (updates: Partial<MessSystemDB> | ((prev: MessSystemDB) => MessSystemDB)) => void;
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

    if (value > 0 && value < 0.5) {
      value = 0.5;
    }
    
    value = Math.round(value * 2) / 2;
    updateMealInDB(uId, field, value);
  };

  const updateMealInDB = (uId: string, field: keyof Omit<Meal, 'id' | 'userId' | 'date'>, value: number) => {
    updateDB((prev: MessSystemDB) => {
      const mealIdx = prev.meals.findIndex((m: Meal) => m.userId === uId && m.date === selectedDate);
      const newMeals = [...prev.meals];

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
      return { ...prev, meals: newMeals };
    });
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 overflow-x-hidden px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-3xl font-black flex items-center gap-3 text-white">
            <Utensils className="text-blue-500" />
            মিল এন্ট্রি
          </h2>
          <p className="text-gray-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">তারিখ অনুযায়ী মিল ইনপুট দিন</p>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-900 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-gray-800 shadow-xl self-start sm:self-auto w-full sm:w-auto">
           <CalendarIcon size={16} className="text-blue-500 ml-2" />
           <input 
              type="date" 
              className="bg-transparent border-none text-[13px] sm:text-sm font-black text-white outline-none cursor-pointer p-1 flex-1"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
        </div>
      </div>

      <div className="bg-blue-600/10 border border-blue-500/20 p-5 sm:p-7 rounded-2xl sm:rounded-[2.5rem] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="p-3 sm:p-4 bg-blue-600 text-white rounded-xl sm:rounded-[1.5rem] shadow-xl shadow-blue-500/20">
            <Sigma size={24} className="sm:w-8 sm:h-8" />
          </div>
          <div>
            <p className="text-[9px] sm:text-[11px] font-black text-blue-400 uppercase tracking-widest mb-1">আজকের মোট মিল</p>
            <h3 className="text-2xl sm:text-3xl font-black text-white">{globalTotalMeals.toFixed(1)}</h3>
          </div>
        </div>
      </div>

      {/* মোবাইল ভিউ (Card Layout) */}
      <div className="sm:hidden space-y-4">
        {mealData.length === 0 ? (
          <div className="bg-gray-900/50 p-10 rounded-2xl border border-gray-800 text-center text-gray-500 font-bold italic">সদস্য পাওয়া যায়নি</div>
        ) : (
          mealData.map(m => {
            const rowTotal = m.breakfast + m.lunch + m.dinner + m.guest;
            return (
              <div key={m.userId} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl space-y-5">
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600/20 text-blue-500 rounded-lg flex items-center justify-center font-black text-sm">{m.userName[0]}</div>
                    <span className="font-black text-white text-sm truncate max-w-[150px]">{m.userName}</span>
                  </div>
                  <div className="bg-blue-900/20 px-3 py-1 rounded-full border border-blue-500/20">
                    <span className="text-blue-400 font-black text-xs">{rowTotal.toFixed(1)}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'breakfast', label: 'সকাল' },
                    { id: 'lunch', label: 'দুপুর' },
                    { id: 'dinner', label: 'রাত' },
                    { id: 'guest', label: 'অতিথি' }
                  ].map(field => (
                    <div key={field.id} className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{field.label}</label>
                      <input 
                        type="number" step="0.5" min="0"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 text-center text-sm font-black text-white focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-30"
                        value={m[field.id as keyof typeof m] || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateMealValue(m.userId, field.id as any, e.target.value)}
                        disabled={!isEditable}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ডেস্কটপ ভিউ (Table Layout) */}
      <div className="hidden sm:block bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-800/40 text-[10px] uppercase font-black text-gray-500">
                <th className="px-8 py-6">সদস্য</th>
                <th className="px-4 py-6 text-center">সকাল</th>
                <th className="px-4 py-6 text-center">দুপুর</th>
                <th className="px-4 py-6 text-center">রাত</th>
                <th className="px-4 py-6 text-center">অতিথি</th>
                <th className="px-8 py-6 text-right bg-blue-900/10 text-blue-400">মোট মিল</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {mealData.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-gray-600 italic font-bold">সদস্য পাওয়া যায়নি</td></tr>
              ) : (
                mealData.map(m => {
                  const rowTotal = m.breakfast + m.lunch + m.dinner + m.guest;
                  return (
                    <tr key={m.userId} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <UserIcon size={14} className="text-gray-600" />
                          <span className="font-black text-white text-sm">{m.userName}</span>
                        </div>
                      </td>
                      {['breakfast', 'lunch', 'dinner', 'guest'].map(field => (
                        <td key={field} className="px-4 py-6 text-center">
                          <input 
                            type="number" step="0.5" min="0"
                            className="w-16 mx-auto bg-gray-800 border border-gray-700 rounded-xl text-center py-2.5 text-sm font-black text-white focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-30 transition-all"
                            value={m[field as keyof typeof m] || ''}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateMealValue(m.userId, field as any, e.target.value)}
                            disabled={!isEditable}
                          />
                        </td>
                      ))}
                      <td className="px-8 py-6 text-right bg-blue-900/5">
                        <span className="text-xl font-black text-blue-500">{rowTotal.toFixed(1)}</span>
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
