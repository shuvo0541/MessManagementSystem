
import React, { useMemo } from 'react';
import { T } from '../translations';
import { getCalculations } from '../db';
import { MessSystemDB } from '../types';
import { 
  TableProperties, 
  Wallet, 
  Utensils, 
  TrendingUp, 
  Eye, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
  User as UserIcon
} from 'lucide-react';

interface MealBazarLedgerProps {
  db: MessSystemDB;
  month: string;
  t: any;
  theme: string;
}

const MealBazarLedger: React.FC<MealBazarLedgerProps> = ({ db, month, t, theme }) => {
  const stats = useMemo(() => getCalculations(db, month), [db, month]);

  const SummaryCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl relative overflow-hidden group">
      <div className={`absolute -right-4 -bottom-4 opacity-5 dark:opacity-10 text-${color}-500 group-hover:scale-110 transition-transform`}>
        <Icon size={100} />
      </div>
      <div className="relative z-10">
        <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{title}</p>
        <p className={`text-xl sm:text-2xl font-black text-gray-900 dark:text-white`}>{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-10 animate-in fade-in duration-500 overflow-x-hidden px-1 sm:px-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <TableProperties className="text-blue-500" />
            {t.mealBazarLedger}
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-[9px] sm:text-[10px] font-black bg-blue-600/10 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full uppercase tracking-widest">{month}</span>
             <span className="text-[9px] sm:text-[10px] font-black bg-gray-100 dark:bg-gray-800/50 text-gray-500 px-3 py-1 rounded-full uppercase tracking-widest border border-gray-200 dark:border-gray-700 flex items-center gap-1">
               <Eye size={10}/> {t.readOnlyView}
             </span>
          </div>
        </div>
      </div>

      {/* Live Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <SummaryCard title={t.totalBazar} value={`৳${stats.totalBazar.toFixed(2)}`} icon={Wallet} color="blue" />
        <SummaryCard title={t.totalMeals} value={stats.totalMeals.toFixed(1)} icon={Utensils} color="green" />
        <SummaryCard title={t.mealRate} value={`৳${stats.mealRate.toFixed(2)}`} icon={TrendingUp} color="purple" />
      </div>

      {/* Transparency Note */}
      <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-2xl sm:rounded-3xl flex items-start gap-4">
         <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
         <div className="text-[11px] sm:text-xs font-medium text-blue-300/80 leading-relaxed">
           <p className="font-black text-blue-400 uppercase tracking-widest mb-1">{t.transparencyNotice}</p>
           {t.transparencyNoticeDesc}
         </div>
      </div>

      {/* মোবাইল ভিউ (Card Layout) */}
      <div className="sm:hidden space-y-4">
        {stats.userStats.map((u: any, index: number) => {
          const foodExpense = u.mealCost;
          // বাজার এন্ট্রি থেকে ওই ইউজারের ওই মাসের বাজার খরচ বের করা
          const userBazar = db.bazars
            .filter(b => b.userId === u.userId && b.date.startsWith(month))
            .reduce((sum, b) => sum + b.amount, 0);
          const ledgerBalance = userBazar - foodExpense;
          
          return (
            <div key={u.userId} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-50 dark:bg-gray-800 text-blue-600 dark:text-blue-500 rounded-lg flex items-center justify-center font-black text-xs border border-gray-100 dark:border-gray-700">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <h4 className="font-black text-gray-900 dark:text-white text-sm truncate max-w-[150px]">{u.name}</h4>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black ${ledgerBalance >= 0 ? 'bg-green-600/10 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-500/10' : 'bg-red-600/10 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-500/10'}`}>
                  {ledgerBalance >= 0 ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                  ৳{Math.abs(ledgerBalance).toFixed(2)}
                </div>
              </div>
              
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center bg-gray-800/50 p-2 rounded-xl border border-gray-800">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">{t.meal}</p>
                    <p className="text-xs font-black text-gray-900 dark:text-white">{u.totalMeals.toFixed(1)}</p>
                  </div>
                  <div className="text-center bg-gray-800/50 p-2 rounded-xl border border-gray-800">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">{t.cost}</p>
                    <p className="text-xs font-black text-gray-400">৳{foodExpense.toFixed(0)}</p>
                  </div>
                  <div className="text-center bg-gray-800/50 p-2 rounded-xl border border-gray-800">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">{t.bazar}</p>
                    <p className="text-xs font-black text-green-500">৳{userBazar.toFixed(0)}</p>
                  </div>
                </div>
            </div>
          );
        })}
      </div>

      {/* Desktop View (Detailed Ledger Table) */}
      <div className="hidden sm:block bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[650px] sm:min-w-0">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/40 text-[9px] sm:text-[10px] uppercase font-black text-gray-500 border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 sm:px-8 py-5 sm:py-6">{t.slNo}</th>
                <th className="px-4 sm:px-6 py-5 sm:py-6">{t.members}</th>
                <th className="px-4 sm:px-6 py-5 sm:py-6 text-center">{t.meals}</th>
                <th className="px-4 sm:px-6 py-5 sm:py-6 text-right">{t.cost} (৳)</th>
                <th className="px-4 sm:px-6 py-5 sm:py-6 text-right">{t.bazar} (৳)</th>
                <th className="px-6 sm:px-8 py-5 sm:py-6 text-right">{t.balance}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.userStats.map((u: any, index: number) => {
                const foodExpense = u.mealCost;
                const userBazar = db.bazars
                  .filter(b => b.userId === u.userId && b.date.startsWith(month))
                  .reduce((sum, b) => sum + b.amount, 0);
                const ledgerBalance = userBazar - foodExpense;

                return (
                  <tr key={u.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors group">
                    <td className="px-6 sm:px-8 py-4 sm:py-6">
                      <span className="text-gray-500 font-black text-xs">{String(index + 1).padStart(2, '0')}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-6">
                      <span className="font-black text-gray-900 dark:text-white text-xs sm:text-sm">{u.name}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-6 text-center">
                      <span className="font-black text-gray-600 dark:text-gray-300 text-xs sm:text-sm">{u.totalMeals.toFixed(1)}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-6 text-right">
                      <span className="font-bold text-gray-500 dark:text-gray-400 text-xs sm:text-sm">৳{foodExpense.toFixed(2)}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-6 text-right">
                      <span className="font-black text-green-600 dark:text-green-500 text-xs sm:text-sm">৳{userBazar.toFixed(2)}</span>
                    </td>
                    <td className="px-6 sm:px-8 py-4 sm:py-6 text-right">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs ${ledgerBalance >= 0 ? 'bg-green-600/10 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-500/20' : 'bg-red-600/10 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-500/20'}`}>
                        {ledgerBalance >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                        ৳{Math.abs(ledgerBalance).toFixed(2)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800/20 font-black border-t border-gray-100 dark:border-gray-800">
               <tr>
                  <td className="px-6 sm:px-8 py-5 sm:py-6"></td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6 text-gray-500 text-[9px] sm:text-[10px] uppercase tracking-widest">{t.totalAll}</td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6 text-center text-gray-900 dark:text-white text-xs sm:text-sm">{stats.totalMeals.toFixed(1)}</td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6 text-right text-gray-500 dark:text-gray-400 text-xs sm:text-sm">৳{stats.userStats.reduce((s: number, u: any) => s + u.mealCost, 0).toFixed(2)}</td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6 text-right text-green-600 dark:text-green-500 text-xs sm:text-sm">৳{stats.totalBazar.toFixed(2)}</td>
                  <td className="px-6 sm:px-8 py-5 sm:py-6 text-right text-blue-600 dark:text-blue-400 text-xs sm:text-sm">
                    {t.mealRate}: ৳{stats.mealRate.toFixed(2)}
                  </td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MealBazarLedger;
