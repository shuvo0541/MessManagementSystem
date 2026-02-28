
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
  t: any;
  theme: string;
}

const PersonalAccount: React.FC<PersonalAccountProps> = ({ db, user, month, t, theme }) => {
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
    return `${t.months[parseInt(m) - 1]} ${year}`;
  }, [prevMonth, t.months]);

  const selectedYear = parseInt(month.split('-')[0]);
  const yearlyData = useMemo(() => {
    const data = [];

    for (let i = 0; i < 12; i++) {
      const mStr = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
      const mStats = getCalculations(db, mStr);
      const uStat = mStats.userStats.find((s: any) => s.userId === user.id);
      
      if (uStat) {
        data.push({
          month: mStr,
          monthName: t.months[i],
          meals: uStat.totalMeals,
          bazar: db.bazars.filter(b => b.userId === user.id && b.date.startsWith(mStr)).reduce((s, b) => s + b.amount, 0),
          mealCost: uStat.mealCost
        });
      }
    }
    return data;
  }, [db, selectedYear, user.id, t.months]);

  if (!userStat) return null;

  const userBazarTotal = userBazars.reduce((s, b) => s + b.amount, 0);
  const foodExpense = userStat.mealCost;
  const foodBalance = userBazarTotal - foodExpense;

  return (
    <div className="space-y-6 sm:space-y-8 pb-10 animate-in fade-in duration-500 overflow-x-hidden px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <CircleDollarSign className="text-blue-500" />
            {t.personalAccount}
          </h2>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-1">{t.monthlyExpenseDetail}</p>
        </div>
        <div className="bg-white dark:bg-gray-800/50 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-2 shadow-sm">
          <Calendar size={14} className="text-blue-500" />
          <span className="text-xs font-black text-gray-900 dark:text-white">{month}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
        {/* Total Meals */}
        <button 
          onClick={() => setShowMealDetails(true)}
          className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl relative overflow-hidden group text-left transition-all active:scale-95"
        >
          <div className="absolute -right-4 -bottom-4 opacity-5 dark:opacity-10 text-green-500 group-hover:scale-110 transition-transform">
            <Utensils size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t.totalMeals}</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{userStat.totalMeals.toFixed(1)}</p>
            <div className="mt-2 flex items-center gap-1 text-[8px] font-black text-green-600 dark:text-green-500 uppercase">
              {t.viewDetails} <ChevronRight size={10} />
            </div>
          </div>
        </button>

        {/* Meal Cost */}
        <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 dark:opacity-10 text-orange-500 group-hover:scale-110 transition-transform">
            <TrendingUp size={100} />
          </div>
          <div className="relative z-10">
            <h4 className="text-sm font-black text-orange-500 uppercase tracking-widest mb-2">{t.foodExpense}</h4>
            <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t.totalCost}</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">৳{foodExpense.toFixed(2)}</p>
            <p className="text-[8px] font-black text-gray-500 mt-1 uppercase">{t.rateLabel}{stats.mealRate.toFixed(2)}</p>
          </div>
        </div>

        {/* Personal Bazar */}
        <button 
          onClick={() => setShowBazarDetails(true)}
          className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl relative overflow-hidden group text-left transition-all active:scale-95"
        >
          <div className="absolute -right-4 -bottom-4 opacity-5 dark:opacity-10 text-blue-500 group-hover:scale-110 transition-transform">
            <Wallet size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t.personalBazar}</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">৳{userBazarTotal.toFixed(2)}</p>
            <div className="mt-2 flex items-center gap-1 text-[8px] font-black text-blue-600 dark:text-blue-500 uppercase">
              {t.viewDetails} <ChevronRight size={10} />
            </div>
          </div>
        </button>

        {/* Food Balance */}
        <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl relative overflow-hidden group">
          <div className={`absolute -right-4 -bottom-4 opacity-5 dark:opacity-10 ${foodBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'} group-hover:scale-110 transition-transform`}>
            {foodBalance >= 0 ? <ArrowUpRight size={100} /> : <ArrowDownRight size={100} />}
          </div>
          <div className="relative z-10">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t.foodArrearsRefund}</p>
            <p className={`text-xl sm:text-2xl font-black ${foodBalance >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-400'}`}>
              ৳{Math.abs(foodBalance).toFixed(2)}
            </p>
            <p className="text-[8px] font-black text-gray-500 mt-1 uppercase">{foodBalance >= 0 ? t.willGetRefundThisMonth : t.arrearsThisMonth}</p>
          </div>
        </div>

        {/* Room & Utility */}
        <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 dark:opacity-10 text-purple-500 group-hover:scale-110 transition-transform">
            <Home size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t.fixedCostRoomUtil}</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">৳{(userStat.roomRent + userStat.utilityShare).toFixed(2)}</p>
            <p className="text-[8px] font-black text-gray-500 mt-1 uppercase">{t.room}: {userStat.roomRent.toFixed(0)} | {t.utilityOnly} {userStat.utilityShare.toFixed(0)}</p>
          </div>
        </div>

      </div>

      {/* Payment & Balance Section */}
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-2xl">
        <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3 mb-6">
          <Zap className="text-blue-500" />
          {t.paymentAndFinalCalculation}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-50 dark:bg-gray-800/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">{t.fixedCost}</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold">{t.room}:</span>
                <span className="font-black text-gray-900 dark:text-white">৳{userStat.roomRent.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold">{t.utilityOnly}</span>
                <span className="font-black text-gray-900 dark:text-white">৳{userStat.utilityShare.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-[10px] font-black text-blue-600 uppercase">{t.total}:</span>
                <span className="text-lg font-black text-blue-600">৳{(userStat.roomRent + userStat.utilityShare).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{t.mealAdjustment}</p>
            <p className={`text-2xl font-black ${userStat.prevAdjustment >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
              ৳{Math.abs(userStat.prevAdjustment).toFixed(2)}
            </p>
            <p className="text-[8px] font-black text-gray-500 mt-1 uppercase">{userStat.prevAdjustment >= 0 ? t.receive : t.arrears}</p>
          </div>
          <div className={`p-5 rounded-2xl border flex flex-col justify-center ${userStat.balance >= 0 ? 'bg-emerald-600/10 dark:bg-emerald-900/10 border-emerald-500/20' : 'bg-rose-600/10 dark:bg-rose-900/10 border-rose-500/20'}`}>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${userStat.balance >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
              {t.grandTotal}
            </p>
            <p className={`text-2xl font-black ${userStat.balance >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
              ৳{Math.abs(userStat.balance).toFixed(2)}
            </p>
            <p className="text-[8px] font-black text-gray-500 mt-1 uppercase">{userStat.balance >= 0 ? t.willReceive : t.arrearsExist}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{t.depositedPayment}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">৳{userStat.payments.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl flex items-start gap-3">
          <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
          <p className="text-[10px] font-medium text-blue-700 dark:text-blue-300 leading-relaxed">
            <span className="font-black uppercase tracking-widest block mb-1">{t.calculationGuide}</span>
            {t.foodAdjustmentNote}
          </p>
        </div>
      </div>

      {/* Yearly Analytics Button */}
      <div className="flex justify-center pt-4">
        <button 
          onClick={() => setShowYearlyDetails(true)}
          className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
        >
          <BarChart3 size={18} />
          {t.viewYearlyAnalytics}
        </button>
      </div>

      {/* Meal Details Modal */}
      {showMealDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setShowMealDetails(false)} />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3">
                <Utensils className="text-green-500" /> {t.mealDetails}
              </h3>
              <button onClick={() => setShowMealDetails(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar">
              {userMeals.length > 0 ? (
                <div className="space-y-3">
                  {userMeals.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white">{m.date}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">
                          {t.breakfast}: {m.breakfast} | {t.lunch}: {m.lunch} | {t.dinner}: {m.dinner} | {t.guest}: {m.guest}
                        </p>
                      </div>
                      <div className="bg-green-600/10 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-3 py-1 rounded-lg font-black text-xs">
                        {(m.breakfast + m.lunch + m.dinner + m.guest).toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 font-bold">{t.noMealEntryFound}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bazar Details Modal */}
      {showBazarDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setShowBazarDetails(false)} />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3">
                <Wallet className="text-blue-500" /> {t.bazarDetails}
              </h3>
              <button onClick={() => setShowBazarDetails(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar">
              {userBazars.length > 0 ? (
                <div className="space-y-3">
                  {userBazars.map((b, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-gray-900 dark:text-white">{b.date}</p>
                        <p className="text-sm font-black text-blue-600 dark:text-blue-500">৳{b.amount.toFixed(2)}</p>
                      </div>
                      {b.note && (
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-black/20 p-2 rounded-lg italic">
                          "{b.note}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 font-bold">{t.noBazarEntryFound}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Yearly Analytics Modal */}
      {showYearlyDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setShowYearlyDetails(false)} />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                <BarChart3 className="text-purple-500" /> {t.yearlyAnalytics} ({selectedYear})
              </h3>
              <button onClick={() => setShowYearlyDetails(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 sm:p-8 overflow-y-auto no-scrollbar space-y-10">
              {/* Yearly Table */}
              <div className="bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800/40 text-[9px] uppercase font-black text-gray-500">
                      <th className="px-4 py-4">{t.month}</th>
                      <th className="px-4 py-4 text-center">{t.totalMeals}</th>
                      <th className="px-4 py-4 text-right">{t.bazarCost}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {yearlyData.map((d, idx) => (
                      <tr key={idx} className="hover:bg-gray-100 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-4 py-4 font-black text-gray-900 dark:text-white">{d.monthName}</td>
                        <td className="px-4 py-4 text-center font-bold text-gray-600 dark:text-gray-300">{d.meals.toFixed(1)}</td>
                        <td className="px-4 py-4 text-right font-black text-blue-600 dark:text-blue-500">৳{d.bazar.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Meal Expense Chart */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" /> {t.foodExpenseTrend}
                </h4>
                <div className="h-64 sm:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#374151" : "#e5e7eb"} vertical={false} />
                      <XAxis 
                        dataKey="monthName" 
                        stroke={theme === 'dark' ? "#9ca3af" : "#4b5563"} 
                        fontSize={10} 
                        fontWeight="bold" 
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis stroke={theme === 'dark' ? "#9ca3af" : "#4b5563"} fontSize={10} fontWeight="bold" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: theme === 'dark' ? '#111827' : '#ffffff', border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`, borderRadius: '12px' }}
                        itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="mealCost" name={t.foodExpense} radius={[4, 4, 0, 0]}>
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
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <Utensils size={16} className="text-green-500" /> {t.monthlyMealCount}
                </h4>
                <div className="h-64 sm:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#374151" : "#e5e7eb"} vertical={false} />
                      <XAxis 
                        dataKey="monthName" 
                        stroke={theme === 'dark' ? "#9ca3af" : "#4b5563"} 
                        fontSize={10} 
                        fontWeight="bold" 
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis stroke={theme === 'dark' ? "#9ca3af" : "#4b5563"} fontSize={10} fontWeight="bold" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: theme === 'dark' ? '#111827' : '#ffffff', border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`, borderRadius: '12px' }}
                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="meals" name={t.mealCount} radius={[4, 4, 0, 0]}>
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
