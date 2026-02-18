
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
  Info
} from 'lucide-react';

interface MealBazarLedgerProps {
  db: MessSystemDB;
  month: string;
}

const MealBazarLedger: React.FC<MealBazarLedgerProps> = ({ db, month }) => {
  const stats = useMemo(() => getCalculations(db, month), [db, month]);

  const SummaryCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-800 shadow-xl relative overflow-hidden group">
      <div className={`absolute -right-4 -bottom-4 opacity-10 text-${color}-500 group-hover:scale-110 transition-transform`}>
        <Icon size={100} />
      </div>
      <div className="relative z-10">
        <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{title}</p>
        <p className={`text-xl sm:text-2xl font-black text-white`}>{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-10 animate-in fade-in duration-500 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 sm:px-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
            <TableProperties className="text-blue-500" />
            মিল ও বাজার লেজার
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-[9px] sm:text-[10px] font-black bg-blue-900/30 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full uppercase tracking-widest">{month}</span>
             <span className="text-[9px] sm:text-[10px] font-black bg-gray-800/50 text-gray-500 px-3 py-1 rounded-full uppercase tracking-widest border border-gray-700 flex items-center gap-1">
               <Eye size={10}/> রিড-অনলি ভিউ
             </span>
          </div>
        </div>
      </div>

      {/* Live Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mx-2 sm:mx-0">
        <SummaryCard title="মোট বাজার খরচ" value={`৳${stats.totalBazar.toFixed(2)}`} icon={Wallet} color="blue" />
        <SummaryCard title="মোট মিল" value={stats.totalMeals.toFixed(1)} icon={Utensils} color="green" />
        <SummaryCard title="মিল রেট" value={`৳${stats.mealRate.toFixed(2)}`} icon={TrendingUp} color="purple" />
      </div>

      {/* Transparency Note */}
      <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-2xl sm:rounded-3xl flex items-start gap-4 mx-2 sm:mx-0">
         <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
         <div className="text-[11px] sm:text-xs font-medium text-blue-300/80 leading-relaxed">
           <p className="font-black text-blue-400 uppercase tracking-widest mb-1">স্বচ্ছতা বিজ্ঞপ্তি</p>
           মিল এন্ট্রি এবং বাজার খরচের ডাটা থেকে এটি অটোমেটিক জেনারেট হয়। এখানে টাকার হিসাব দশমিকের ২ ঘর পর্যন্ত নির্ভুল রাখা হয়েছে।
         </div>
      </div>

      {/* Detailed Ledger Table */}
      <div className="bg-gray-900 rounded-2xl sm:rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl mx-2 sm:mx-0">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[650px] sm:min-w-0">
            <thead>
              <tr className="bg-gray-800/40 text-[9px] sm:text-[10px] uppercase font-black text-gray-500">
                <th className="px-6 sm:px-8 py-5 sm:py-6">নং</th>
                <th className="px-4 sm:px-6 py-5 sm:py-6">মেম্বার</th>
                <th className="px-4 sm:px-6 py-5 sm:py-6 text-center">মিল</th>
                <th className="px-4 sm:px-6 py-5 sm:py-6 text-right">খরচ (৳)</th>
                <th className="px-4 sm:px-6 py-5 sm:py-6 text-right">জমা (৳)</th>
                <th className="px-6 sm:px-8 py-5 sm:py-6 text-right">ব্যালেন্স</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {stats.userStats.map((u, index) => {
                const foodExpense = u.mealCost;
                const deposited = u.contribution;
                const ledgerBalance = deposited - foodExpense;

                return (
                  <tr key={u.userId} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="px-6 sm:px-8 py-4 sm:py-6">
                      <span className="text-gray-500 font-black text-xs">{String(index + 1).padStart(2, '0')}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-6">
                      <span className="font-black text-white text-xs sm:text-sm">{u.name}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-6 text-center">
                      <span className="font-black text-gray-300 text-xs sm:text-sm">{u.totalMeals.toFixed(1)}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-6 text-right">
                      <span className="font-bold text-gray-400 text-xs sm:text-sm">৳{foodExpense.toFixed(2)}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-6 text-right">
                      <span className="font-black text-green-500 text-xs sm:text-sm">৳{deposited.toFixed(2)}</span>
                    </td>
                    <td className="px-6 sm:px-8 py-4 sm:py-6 text-right">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs ${ledgerBalance >= 0 ? 'bg-green-900/20 text-green-400 border border-green-500/20' : 'bg-red-900/20 text-red-400 border border-red-500/20'}`}>
                        {ledgerBalance >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                        ৳{Math.abs(ledgerBalance).toFixed(2)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-800/20 font-black border-t border-gray-800">
               <tr>
                  <td className="px-6 sm:px-8 py-5 sm:py-6"></td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6 text-gray-500 text-[9px] sm:text-[10px] uppercase tracking-widest">মোট (সকল)</td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6 text-center text-white text-xs sm:text-sm">{stats.totalMeals.toFixed(1)}</td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6 text-right text-gray-400 text-xs sm:text-sm">৳{stats.userStats.reduce((s,u) => s + u.mealCost, 0).toFixed(2)}</td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6 text-right text-green-500 text-xs sm:text-sm">৳{stats.userStats.reduce((s,u) => s + u.contribution, 0).toFixed(2)}</td>
                  <td className="px-6 sm:px-8 py-5 sm:py-6"></td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MealBazarLedger;
