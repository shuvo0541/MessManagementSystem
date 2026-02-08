
import React, { useMemo } from 'react';
import { T } from '../translations';
import { getCalculations } from '../db';
import { MessSystemDB } from '../types';
import { 
  ClipboardCheck, 
  Home, 
  Zap, 
  History, 
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Eye,
  CheckCircle2
} from 'lucide-react';

interface FinalReportProps {
  db: MessSystemDB;
  month: string;
}

const FinalReport: React.FC<FinalReportProps> = ({ db, month }) => {
  const stats = useMemo(() => getCalculations(db, month), [db, month]);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <ClipboardCheck className="text-purple-500" />
            মাসিক চূড়ান্ত রিপোর্ট ও সমন্বয়
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-[10px] font-black bg-purple-900/30 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full uppercase tracking-widest">{month}</span>
             <span className="text-[10px] font-black bg-gray-800/50 text-gray-500 px-3 py-1 rounded-full uppercase tracking-widest border border-gray-700 flex items-center gap-1">
               <Eye size={10}/> রিড-অনলি ভিউ
             </span>
          </div>
        </div>
      </div>

      {/* Logic Notice */}
      <div className="bg-purple-900/10 border border-purple-500/20 p-6 rounded-[2rem] flex items-start gap-4">
         <Info className="text-purple-400 shrink-0 mt-1" size={20} />
         <div className="text-xs font-medium text-purple-300/80 leading-relaxed">
           <p className="font-black text-purple-400 uppercase tracking-widest mb-1">সমন্বয় লজিক</p>
           <p className="mb-2">এই রিপোর্টটি বর্তমান মাসের স্থির খরচ (রুম ভাড়া + ইউটিলিটি) এবং গত মাসের মিলের বকেয়া বা রিফান্ড সমন্বয় করে তৈরি করা হয়েছে।</p>
           <code className="bg-black/30 px-2 py-1 rounded text-[10px] font-black">
             চূড়ান্ত প্রদেয় = (বর্তমান রুম ভাড়া + ইউটিলিটি) + (গত মাসের মিলের বকেয়া/রিফান্ড)
           </code>
         </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-800/40 text-[10px] uppercase font-black text-gray-500">
                <th className="px-8 py-6">মেম্বার</th>
                <th className="px-6 py-6 text-right">রুম ও ইউটিলিটি (৳)</th>
                <th className="px-6 py-6 text-right">গত মাসের সমন্বয় (৳)</th>
                <th className="px-8 py-6 text-right text-white bg-purple-900/10">মোট চূড়ান্ত প্রদেয় (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {stats.userStats.map(u => {
                const currentFixedCost = u.roomRent + u.utilityShare;
                const prevAdjustment = u.prevAdjustment; // positive means refund, negative means due
                // finalPayable = currentFixedCost - prevAdjustment
                // If prevAdjustment is +100 (refund), payable = fixed - 100
                // If prevAdjustment is -100 (due), payable = fixed - (-100) = fixed + 100
                const finalPayable = currentFixedCost - prevAdjustment;

                return (
                  <tr key={u.userId} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-black text-sm text-gray-400 group-hover:text-purple-400 transition-all">
                          {u.name[0]}
                        </div>
                        <span className="font-black text-white">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                       <div className="flex flex-col items-end">
                          <span className="font-bold text-gray-300">৳{currentFixedCost.toFixed(0)}</span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase">রুম: {u.roomRent.toFixed(0)} | ইউটি: {u.utilityShare.toFixed(0)}</span>
                       </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                       <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black ${prevAdjustment >= 0 ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                          {prevAdjustment >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                          ৳{Math.abs(prevAdjustment).toFixed(0)}
                          <span className="opacity-60">{prevAdjustment >= 0 ? 'রিফান্ড' : 'বকেয়া'}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right bg-purple-900/5">
                       <div className="flex flex-col items-end">
                          <span className="text-xl font-black text-purple-400">৳{finalPayable.toFixed(0)}</span>
                          <div className="flex items-center gap-1 text-[9px] font-black text-gray-500 uppercase">
                             <CheckCircle2 size={10} className="text-purple-500"/> ভেরিফাইড
                          </div>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-800/20 font-black border-t border-gray-800">
               <tr>
                  <td className="px-8 py-6 text-gray-500 text-[10px] uppercase tracking-widest">সর্বমোট</td>
                  <td className="px-6 py-6 text-right text-gray-300">৳{stats.userStats.reduce((s,u) => s + u.roomRent + u.utilityShare, 0).toFixed(0)}</td>
                  <td className="px-6 py-6"></td>
                  <td className="px-8 py-6 text-right text-purple-400 text-lg">৳{stats.userStats.reduce((s,u) => s + (u.roomRent + u.utilityShare - u.prevAdjustment), 0).toFixed(0)}</td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-2 text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] pt-4">
         <CircleDollarSign size={14}/> চূড়ান্ত হিসাব নিকাশ সিস্টেম দ্বারা নিয়ন্ত্রিত
      </div>
    </div>
  );
};

export default FinalReport;
