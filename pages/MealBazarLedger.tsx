
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
    <div className="bg-gray-900 p-6 rounded-[2rem] border border-gray-800 shadow-xl relative overflow-hidden group">
      <div className={`absolute -right-4 -bottom-4 opacity-10 text-${color}-500 group-hover:scale-110 transition-transform`}>
        <Icon size={100} />
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{title}</p>
        <p className={`text-2xl font-black text-white`}>{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <TableProperties className="text-blue-500" />
            মাসিক মিল ও বাজার লেজার
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-[10px] font-black bg-blue-900/30 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full uppercase tracking-widest">{month}</span>
             <span className="text-[10px] font-black bg-gray-800/50 text-gray-500 px-3 py-1 rounded-full uppercase tracking-widest border border-gray-700 flex items-center gap-1">
               <Eye size={10}/> রিড-অনলি ভিউ
             </span>
          </div>
        </div>
      </div>

      {/* Live Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard title="মোট বাজার খরচ" value={`৳${stats.totalBazar.toLocaleString()}`} icon={Wallet} color="blue" />
        <SummaryCard title="মোট মিল" value={stats.totalMeals.toFixed(1)} icon={Utensils} color="green" />
        <SummaryCard title="বর্তমান মিল রেট" value={`৳${stats.mealRate.toFixed(2)}`} icon={TrendingUp} color="purple" />
      </div>

      {/* Transparency Note */}
      <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-3xl flex items-start gap-4">
         <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
         <div className="text-xs font-medium text-blue-300/80 leading-relaxed">
           <p className="font-black text-blue-400 uppercase tracking-widest mb-1">স্বচ্ছতা বিজ্ঞপ্তি</p>
           এই লেজারটি মেসের সবার জন্য উন্মুক্ত এবং এটি শুধুমাত্র তথ্য প্রদর্শনের জন্য। মিল এন্ট্রি এবং বাজার খরচের ডাটা থেকে এটি অটোমেটিক জেনারেট হয়। এখানে কোনো এডিট বা ডিলিট করার সুযোগ নেই।
         </div>
      </div>

      {/* Detailed Ledger Table */}
      <div className="bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-800/40 text-[10px] uppercase font-black text-gray-500">
                <th className="px-8 py-6">ক্র: নং:</th>
                <th className="px-6 py-6">মেম্বার</th>
                <th className="px-6 py-6 text-center">মোট মিল</th>
                <th className="px-6 py-6 text-right">খাবার খরচ (৳)</th>
                <th className="px-6 py-6 text-right">মোট জমা (৳)</th>
                <th className="px-8 py-6 text-right">ব্যালেন্স (পাবে/বকেয়া)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {stats.userStats.map((u, index) => {
                const foodExpense = u.mealCost;
                const deposited = u.contribution;
                const ledgerBalance = deposited - foodExpense;

                return (
                  <tr key={u.userId} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="px-8 py-6">
                      <span className="text-gray-500 font-black text-xs">{String(index + 1).padStart(2, '0')}</span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center">
                        <span className="font-black text-white text-sm">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="font-black text-gray-300">{u.totalMeals.toFixed(1)}</span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <span className="font-bold text-gray-400">৳{foodExpense.toFixed(0)}</span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <span className="font-black text-green-500">৳{deposited.toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-sm ${ledgerBalance >= 0 ? 'bg-green-900/20 text-green-400 border border-green-500/20' : 'bg-red-900/20 text-red-400 border border-red-500/20'}`}>
                        {ledgerBalance >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                        ৳{Math.abs(ledgerBalance).toFixed(0)}
                        <span className="text-[10px] uppercase opacity-60 ml-1">
                          {ledgerBalance >= 0 ? 'পাবে' : 'বকেয়া'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-800/20 font-black border-t border-gray-800">
               <tr>
                  <td className="px-8 py-6"></td>
                  <td className="px-6 py-6 text-gray-500 text-[10px] uppercase tracking-widest">মোট (সর্বমোট)</td>
                  <td className="px-6 py-6 text-center text-white">{stats.totalMeals.toFixed(1)}</td>
                  <td className="px-6 py-6 text-right text-gray-400">৳{stats.userStats.reduce((s,u) => s + u.mealCost, 0).toFixed(0)}</td>
                  <td className="px-6 py-6 text-right text-green-500">৳{stats.userStats.reduce((s,u) => s + u.contribution, 0).toLocaleString()}</td>
                  <td className="px-8 py-6"></td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MealBazarLedger;
