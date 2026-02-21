
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
    <div className="space-y-6 sm:space-y-8 pb-10 animate-in fade-in duration-500 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 sm:px-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
            <ClipboardCheck className="text-purple-500" />
            চূড়ান্ত রিপোর্ট ও সমন্বয়
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-[9px] sm:text-[10px] font-black bg-purple-900/30 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full uppercase tracking-widest">{month}</span>
             <span className="text-[9px] sm:text-[10px] font-black bg-gray-800/50 text-gray-500 px-3 py-1 rounded-full uppercase tracking-widest border border-gray-700 flex items-center gap-1">
               <Eye size={10}/> রিড-অনলি ভিউ
             </span>
          </div>
        </div>
      </div>

      {/* Logic Notice */}
      <div className="bg-purple-900/10 border border-purple-500/20 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] flex items-start gap-4 mx-2 sm:mx-0">
         <Info className="text-purple-400 shrink-0 mt-1" size={18} />
         <div className="text-[11px] sm:text-xs font-medium text-purple-300/80 leading-relaxed">
           <p className="font-black text-purple-400 uppercase tracking-widest mb-1">সমন্বয় লজিক</p>
           <p className="mb-2">বর্তমান মাসের স্থির খরচ (রুম + ইউটিলিটি) এবং গত মাসের খাবারের বকেয়া/রিফান্ড সমন্বয় করা হয়েছে। টাকার হিসাব দশমিকের ২ ঘর পর্যন্ত নির্ভুল।</p>
           <code className="bg-black/30 px-2 py-1 rounded text-[9px] sm:text-[10px] font-black">
             প্রদেয় = (রুম + ইউটিলিটি) + (গত মাসের সমন্বয়)
           </code>
         </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-gray-900 rounded-2xl sm:rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl mx-2 sm:mx-0">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[600px] sm:min-w-0">
            <thead>
              <tr className="bg-gray-800/40 text-[9px] sm:text-[10px] uppercase font-black text-gray-500">
                <th className="px-6 sm:px-8 py-5 sm:py-6">মেম্বার</th>
                <th className="px-4 sm:px-6 py-5 sm:py-6 text-right">স্থির খরচ (৳)</th>
                <th className="px-4 sm:px-6 py-5 sm:py-6 text-right">সমন্বয় (৳)</th>
                <th className="px-6 sm:px-8 py-5 sm:py-6 text-right text-white bg-purple-900/10">চূড়ান্ত প্রদেয় (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {stats.userStats.map((u: any) => {
                const currentFixedCost = u.roomRent + u.utilityShare;
                const prevAdjustment = u.prevAdjustment; 
                const finalPayable = currentFixedCost - prevAdjustment;

                return (
                  <tr key={u.userId} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="px-6 sm:px-8 py-4 sm:py-6">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-black text-xs sm:text-sm text-gray-400 group-hover:text-purple-400 transition-all">
                          {u.name[0]}
                        </div>
                        <span className="font-black text-white text-xs sm:text-sm">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-6 text-right">
                       <div className="flex flex-col items-end">
                          <span className="font-bold text-gray-300 text-xs sm:text-sm">৳{currentFixedCost.toFixed(2)}</span>
                          <span className="text-[8px] sm:text-[9px] text-gray-500 font-bold uppercase">রুম: {u.roomRent.toFixed(2)} | ইউটি: {u.utilityShare.toFixed(2)}</span>
                       </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-6 text-right">
                       <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-black ${prevAdjustment >= 0 ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                          {prevAdjustment >= 0 ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                          ৳{Math.abs(prevAdjustment).toFixed(2)}
                       </div>
                    </td>
                    <td className="px-6 sm:px-8 py-4 sm:py-6 text-right bg-purple-900/5">
                       <div className="flex flex-col items-end">
                          <span className="text-base sm:text-xl font-black text-purple-400">৳{finalPayable.toFixed(2)}</span>
                          <div className="flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-gray-500 uppercase">
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
                  <td className="px-6 sm:px-8 py-5 sm:py-6 text-gray-500 text-[9px] sm:text-[10px] uppercase tracking-widest">সর্বমোট</td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6 text-right text-gray-300 text-xs sm:text-sm">৳{stats.userStats.reduce((s: number, u: any) => s + u.roomRent + u.utilityShare, 0).toFixed(2)}</td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6"></td>
                  <td className="px-6 sm:px-8 py-5 sm:py-6 text-right text-purple-400 text-sm sm:text-lg">৳{stats.userStats.reduce((s: number, u: any) => s + (u.roomRent + u.utilityShare - u.prevAdjustment), 0).toFixed(2)}</td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-2 text-gray-600 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] pt-4">
         <CircleDollarSign size={14}/> চূড়ান্ত হিসাব নিকাশ সিস্টেম দ্বারা নিয়ন্ত্রিত
      </div>
    </div>
  );
};

export default FinalReport;
