
import React, { useState, useMemo } from 'react';
import { MessSystemDB, User, Role } from '../types';
import { getCalculations, getPreviousMonthStr } from '../db';
import { T } from '../translations';
import { 
  Utensils, 
  Wallet, 
  Home, 
  Zap, 
  History, 
  CircleDollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight,
  Calendar,
  BarChart3,
  X,
  Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';

interface PersonalAccountProps {
  db: MessSystemDB;
  user: User;
  month: string;
}

const PersonalAccount: React.FC<PersonalAccountProps> = ({ db, user, month }) => {
  const [showMealDetails, setShowMealDetails] = useState(false);
  const [showBazarDetails, setShowBazarDetails] = useState(false);
  const [showYearlyDetails, setShowYearlyDetails] = useState(false);

  const stats = useMemo(() => getCalculations(db, month), [db, month]);
  const userStat = useMemo(() => stats.userStats.find((s: any) => s.userId === user.id), [stats, user.id]);

  const userMeals = useMemo(() => {
    return db.meals
      .filter(m => m.userId === user.id && m.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [db.meals, user.id, month]);

  const userBazars = useMemo(() => {
    return db.bazars
      .filter(b => b.userId === user.id && b.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [db.bazars, user.id, month]);

  const prevMonth = getPreviousMonthStr(month);
  const prevMonthName = useMemo(() => {
    const [year, m] = prevMonth.split('-');
    const monthNames = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    return `${monthNames[parseInt(m) - 1]} ${year}`;
  }, [prevMonth]);

  const selectedYear = parseInt(month.split('-')[0]);
  const yearlyData = useMemo(() => {
    const data = [];
    const monthNames = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];

    for (let i = 0; i < 12; i++) {
      const mStr = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
      const mStats = getCalculations(db, mStr);
      const uStat = mStats.userStats.find((s: any) => s.userId === user.id);
      
      if (uStat) {
        data.push({
          month: mStr,
          monthName: monthNames[i],
          meals: uStat.totalMeals,
          bazar: db.bazars.filter(b => b.userId === user.id && b.date.startsWith(mStr)).reduce((s, b) => s + b.amount, 0),
          mealCost: uStat.mealCost
        });
      }
    }
    return data;
  }, [db, selectedYear, user.id]);

  if (!userStat) return null;

  const remainingBalance = userStat.payments - userStat.netRequired;

  return (
    <div className="space-y-6 sm:space-y-8 pb-10 animate-in fade-in duration-500 overflow-x-hidden px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
            <CircleDollarSign className="text-blue-500" />
            ব্যক্তিগত হিসাব
          </h2>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-1">আপনার মাসিক খরচের বিস্তারিত বিবরণ</p>
        </div>
        <div className="bg-gray-800/50 px-4 py-2 rounded-xl border border-gray-700 flex items-center gap-2">
          <Calendar size={14} className="text-blue-500" />
          <span className="text-xs font-black text-white">{month}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Meals */}
        <button 
          onClick={() => setShowMealDetails(true)}
          className="bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-800 shadow-xl relative overflow-hidden group text-left transition-all active:scale-95"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 text-green-500 group-hover:scale-110 transition-transform">
            <Utensils size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">মোট মিল</p>
            <p className="text-xl sm:text-2xl font-black text-white">{userStat.totalMeals.toFixed(1)}</p>
            <div className="mt-2 flex items-center gap-1 text-[8px] font-black text-green-500 uppercase">
              বিস্তারিত দেখুন <ChevronRight size={10} />
            </div>
          </div>
        </button>

        {/* Personal Bazar */}
        <button 
          onClick={() => setShowBazarDetails(true)}
          className="bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-800 shadow-xl relative overflow-hidden group text-left transition-all active:scale-95"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 text-blue-500 group-hover:scale-110 transition-transform">
            <Wallet size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">ব্যক্তিগত বাজার</p>
            <p className="text-xl sm:text-2xl font-black text-white">৳{userBazars.reduce((s, b) => s + b.amount, 0).toFixed(2)}</p>
            <div className="mt-2 flex items-center gap-1 text-[8px] font-black text-blue-500 uppercase">
              বিস্তারিত দেখুন <ChevronRight size={10} />
            </div>
          </div>
        </button>

        {/* Room & Utility */}
        <div className="bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-800 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 text-purple-500 group-hover:scale-110 transition-transform">
            <Home size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">স্থির খরচ (রুম ও ইউটিলিটি)</p>
            <p className="text-xl sm:text-2xl font-black text-white">৳{(userStat.roomRent + userStat.utilityShare).toFixed(2)}</p>
            <p className="text-[8px] font-black text-gray-500 mt-1 uppercase">রুম: {userStat.roomRent.toFixed(0)} | ইউটি: {userStat.utilityShare.toFixed(0)}</p>
          </div>
        </div>

        {/* Arrears Summary */}
        <div className="bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-800 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 text-amber-500 group-hover:scale-110 transition-transform">
            <History size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">গত মাসের বকেয়া/ফেরত</p>
            <p className={`text-xl sm:text-2xl font-black ${userStat.prevAdjustment >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ৳{Math.abs(userStat.prevAdjustment).toFixed(2)}
            </p>
            <p className="text-[8px] font-black text-gray-500 mt-1 uppercase">{prevMonthName} {userStat.prevAdjustment >= 0 ? 'ফেরত' : 'বকেয়া'}</p>
          </div>
        </div>
      </div>

      {/* Payment & Balance Section */}
      <div className="bg-gray-900 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-800 p-6 sm:p-8 shadow-2xl">
        <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6">
          <Zap className="text-blue-500" />
          জমা টাকা ও চূড়ান্ত হিসাব
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-gray-800/30 p-5 rounded-2xl border border-gray-800">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">জমা টাকা (Payment)</p>
            <p className="text-2xl font-black text-white">৳{userStat.payments.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800/30 p-5 rounded-2xl border border-gray-800">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">সর্বমোট প্রদেয় (৳)</p>
            <p className="text-2xl font-black text-blue-500">৳{userStat.netRequired.toFixed(2)}</p>
          </div>
          <div className={`p-5 rounded-2xl border ${remainingBalance >= 0 ? 'bg-green-900/10 border-green-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${remainingBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {remainingBalance >= 0 ? 'অবশিষ্ট ফেরত পাবেন' : 'অবশিষ্ট বকেয়া'}
            </p>
            <p className={`text-2xl font-black ${remainingBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ৳{Math.abs(remainingBalance).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Yearly Analytics Button */}
      <div className="flex justify-center pt-4">
        <button 
          onClick={() => setShowYearlyDetails(true)}
          className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
        >
          <BarChart3 size={18} />
          বার্ষিক এনালিটিক্স দেখুন
        </button>
      </div>

      {/* Meal Details Modal */}
      {showMealDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowMealDetails(false)} />
          <div className="relative bg-gray-900 border border-gray-800 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-3">
                <Utensils className="text-green-500" /> মিলের বিস্তারিত
              </h3>
              <button onClick={() => setShowMealDetails(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar">
              {userMeals.length > 0 ? (
                <div className="space-y-3">
                  {userMeals.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-800">
                      <div>
                        <p className="text-xs font-black text-white">{m.date}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">
                          সকাল: {m.breakfast} | দুপুর: {m.lunch} | রাত: {m.dinner} | গেস্ট: {m.guest}
                        </p>
                      </div>
                      <div className="bg-green-900/20 text-green-400 px-3 py-1 rounded-lg font-black text-xs">
                        {(m.breakfast + m.lunch + m.dinner + m.guest).toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 font-bold">কোন মিল এন্ট্রি পাওয়া যায়নি</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bazar Details Modal */}
      {showBazarDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowBazarDetails(false)} />
          <div className="relative bg-gray-900 border border-gray-800 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-3">
                <Wallet className="text-blue-500" /> বাজারের বিস্তারিত
              </h3>
              <button onClick={() => setShowBazarDetails(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar">
              {userBazars.length > 0 ? (
                <div className="space-y-3">
                  {userBazars.map((b, idx) => (
                    <div key={idx} className="p-4 bg-gray-800/30 rounded-xl border border-gray-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-white">{b.date}</p>
                        <p className="text-sm font-black text-blue-500">৳{b.amount.toFixed(2)}</p>
                      </div>
                      {b.note && (
                        <p className="text-[10px] font-medium text-gray-400 bg-black/20 p-2 rounded-lg italic">
                          "{b.note}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 font-bold">কোন বাজার এন্ট্রি পাওয়া যায়নি</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Yearly Analytics Modal */}
      {showYearlyDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowYearlyDetails(false)} />
          <div className="relative bg-gray-900 border border-gray-800 w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-black text-white flex items-center gap-3">
                <BarChart3 className="text-purple-500" /> বার্ষিক এনালিটিক্স ({selectedYear})
              </h3>
              <button onClick={() => setShowYearlyDetails(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 sm:p-8 overflow-y-auto no-scrollbar space-y-10">
              {/* Yearly Table */}
              <div className="bg-gray-800/20 rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-800/40 text-[9px] uppercase font-black text-gray-500">
                      <th className="px-4 py-4">মাস</th>
                      <th className="px-4 py-4 text-center">মোট মিল</th>
                      <th className="px-4 py-4 text-right">বাজার খরচ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {yearlyData.map((d, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/20 transition-colors">
                        <td className="px-4 py-4 font-black text-white">{d.monthName}</td>
                        <td className="px-4 py-4 text-center font-bold text-gray-300">{d.meals.toFixed(1)}</td>
                        <td className="px-4 py-4 text-right font-black text-blue-500">৳{d.bazar.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Meal Expense Chart */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" /> খাবার খরচ ট্রেন্ড (৳)
                </h4>
                <div className="h-64 sm:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="monthName" stroke="#9ca3af" fontSize={10} fontWeight="bold" />
                      <YAxis stroke="#9ca3af" fontSize={10} fontWeight="bold" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                        itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="mealCost" name="খাবার খরচ" radius={[4, 4, 0, 0]}>
                        {yearlyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Meal Count Chart */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Utensils size={16} className="text-green-500" /> মাসিক মিল সংখ্যা
                </h4>
                <div className="h-64 sm:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="monthName" stroke="#9ca3af" fontSize={10} fontWeight="bold" />
                      <YAxis stroke="#9ca3af" fontSize={10} fontWeight="bold" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="meals" name="মিল সংখ্যা" radius={[4, 4, 0, 0]}>
                        {yearlyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#34d399'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalAccount;
