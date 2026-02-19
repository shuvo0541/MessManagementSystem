
import React, { useMemo } from 'react';
import { T } from '../translations';
import { getCalculations, getPreviousMonthStr } from '../db';
import { MessSystemDB, Role } from '../types';
import { 
  FileText, 
  Printer,
  ShieldCheck,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Home,
  Zap,
  History,
  CheckCircle2,
  User as UserIcon
} from 'lucide-react';

interface ReportsProps {
  month: string;
  db: MessSystemDB;
}

const Reports: React.FC<ReportsProps> = ({ month, db }) => {
  const currentStats = useMemo(() => getCalculations(db, month), [db, month]);
  const prevMonth = useMemo(() => getPreviousMonthStr(month), [month]);
  const prevStats = useMemo(() => getCalculations(db, prevMonth), [db, prevMonth]);

  const managerForMonth = useMemo(() => {
    const roleEntry = db.monthlyRoles.find(r => r.month === month && r.role === Role.MANAGER);
    if (!roleEntry) return "নির্ধারিত নয়";
    const user = db.users.find(u => u.id === roleEntry.userId);
    return user ? user.name : "নির্ধারিত নয়";
  }, [db.monthlyRoles, db.users, month]);

  const reportData = useMemo(() => {
    return currentStats.userStats.map(u => {
      const pStat = prevStats.userStats.find(ps => ps.userId === u.userId);
      const currentFixedCost = u.roomRent + u.utilityShare;
      const prevMealContribution = pStat ? pStat.contribution : 0;
      const prevMealCost = pStat ? pStat.mealCost : 0;
      const prevMealBalance = prevMealContribution - prevMealCost;
      const totalPayable = currentFixedCost - prevMealBalance;

      return {
        userId: u.userId,
        name: u.name,
        roomRent: u.roomRent,
        utilityShare: u.utilityShare,
        currentFixedCost,
        prevMealBalance,
        totalPayable
      };
    });
  }, [currentStats, prevStats]);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-10 animate-in fade-in duration-500 overflow-x-hidden px-1 sm:px-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl sm:text-3xl font-black flex items-center gap-3 text-white">
            <FileText className="text-blue-500" />
            চূড়ান্ত রিপোর্ট ও সমন্বয়
          </h2>
          <p className="text-gray-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">স্থির খরচ ও গত মাসের খাবারের সমন্বয়</p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 sm:gap-3 bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all font-black shadow-lg shadow-blue-500/20 text-[10px] sm:text-xs uppercase tracking-widest active:scale-95 w-full sm:w-auto"
        >
          <Printer size={16} />
          প্রিন্ট রিপোর্ট (PDF)
        </button>
      </div>

      {/* Logic Info Notice */}
      <div className="bg-blue-900/10 border border-blue-500/20 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-start gap-4 no-print">
         <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
         <div className="text-[10px] sm:text-xs font-medium text-blue-300/80 leading-relaxed">
           <p className="font-black text-blue-400 uppercase tracking-widest mb-1">সমন্বয় লজিক</p>
           এই রিপোর্টে বর্তমান মাসের স্থির খরচ (রুম ও ইউটিলিটি) এর সাথে গত মাসের মিলের বকেয়া/রিফান্ড সমন্বয় করা হয়েছে।
         </div>
      </div>

      {/* মোবাইল ভিউ (Card Layout) */}
      <div className="sm:hidden space-y-4 no-print">
        {reportData.map(u => (
          <div key={u.userId} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-start border-b border-gray-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600/20 text-blue-500 rounded-xl flex items-center justify-center font-black text-sm">
                  {u.name[0]}
                </div>
                <div>
                  <h4 className="font-black text-white text-sm">{u.name}</h4>
                  <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">ভেরিফাইড রিপোর্ট</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">চূড়ান্ত প্রদেয়</p>
                <p className="text-lg font-black text-blue-500">৳{u.totalPayable.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">স্থির খরচ</p>
                <p className="text-xs font-black text-gray-300">৳{u.currentFixedCost.toFixed(2)}</p>
                <p className="text-[7px] text-gray-600 font-bold italic">রুম:{u.roomRent.toFixed(0)} | ইউটি:{u.utilityShare.toFixed(0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">গত মাসের সমন্বয়</p>
                <div className={`flex items-center gap-1 text-xs font-black ${u.prevMealBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                   {u.prevMealBalance >= 0 ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                   ৳{Math.abs(u.prevMealBalance).toFixed(2)}
                </div>
                <p className="text-[7px] text-gray-600 font-bold uppercase">{u.prevMealBalance >= 0 ? 'রিফান্ড' : 'বকেয়া'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* মেইন রিপোর্ট কন্টেইনার (Desktop Table & Print) */}
      <div id="report-container" className="bg-gray-900 text-gray-100 p-6 sm:p-12 rounded-2xl sm:rounded-[3rem] shadow-2xl border border-gray-800 print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:block print:overflow-visible hidden sm:block">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-8 border-b-2 border-gray-800 pb-8 sm:pb-10 print:border-gray-200">
          <div>
             <h3 className="text-2xl sm:text-3xl font-black text-blue-500 print:text-blue-800">{T.appName}</h3>
             <p className="text-[10px] sm:text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-1 print:text-gray-400">চূড়ান্ত মাসিক রিপোর্ট ও সমন্বয়</p>
          </div>
          <div className="text-right">
             <div className="bg-gray-800 px-5 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-gray-700 print:bg-gray-50 print:border-gray-100">
                <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 print:text-gray-400">রিপোর্ট মাস</p>
                <p className="text-lg sm:text-xl font-black text-white print:text-gray-800">{month}</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-8 sm:py-10 print:gap-2">
          <div className="bg-blue-900/20 p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-blue-800/50 print:bg-blue-50 print:border-blue-100">
             <p className="text-[8px] sm:text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 print:text-blue-500">মোট স্থির খরচ (রুম+ইউটি)</p>
             <p className="text-xl sm:text-2xl font-black text-white print:text-blue-900">৳{reportData.reduce((s,d) => s + d.currentFixedCost, 0).toFixed(2)}</p>
          </div>
          <div className="bg-purple-900/20 p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-purple-800/50 print:bg-purple-50 print:border-purple-100">
             <p className="text-[8px] sm:text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1 print:text-purple-500">গত মাসের মিল সমন্বয়</p>
             <p className="text-xl sm:text-2xl font-black text-white print:text-purple-900">৳{Math.abs(reportData.reduce((s,d) => s + d.prevMealBalance, 0)).toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-700 print:bg-gray-50 print:border-gray-100">
             <p className="text-[8px] sm:text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 print:text-gray-400">চূড়ান্ত সংগ্রহ লক্ষ্যমাত্রা</p>
             <p className="text-xl sm:text-2xl font-black text-white print:text-gray-900">৳{reportData.reduce((s,d) => s + d.totalPayable, 0).toFixed(2)}</p>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar print:overflow-visible">
          <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
            <thead>
              <tr className="bg-gray-800/40 text-[9px] sm:text-[10px] uppercase font-black text-gray-500 border-y border-gray-800 print:bg-gray-50 print:border-gray-200">
                <th className="px-5 sm:px-6 py-5 sm:py-6">মেম্বারের নাম</th>
                <th className="px-4 sm:px-6 py-5 sm:py-6 text-right">স্থির খরচ</th>
                <th className="px-4 sm:px-6 py-5 sm:py-6 text-right">মিল সমন্বয়</th>
                <th className="px-6 sm:px-8 py-5 sm:py-6 text-right text-blue-400 bg-blue-900/10 print:text-blue-800 print:bg-blue-50/50">সর্বমোট (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 print:divide-gray-100">
              {reportData.map(u => (
                <tr key={u.userId} className="text-gray-300 hover:bg-gray-800/20 print:text-gray-700 print:hover:bg-gray-50/50">
                  <td className="px-5 sm:px-6 py-5 sm:py-6 font-black text-white print:text-gray-900">{u.name}</td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6 text-right">
                     <div className="flex flex-col">
                        <span className="font-bold text-gray-200 text-xs sm:text-sm print:text-gray-700">৳{u.currentFixedCost.toFixed(2)}</span>
                        <span className="text-[8px] sm:text-[9px] text-gray-500 font-bold print:text-gray-400">রুম: {u.roomRent.toFixed(2)} | ইউটি: {u.utilityShare.toFixed(2)}</span>
                     </div>
                  </td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6 text-right">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] sm:text-[10px] font-black ${u.prevMealBalance >= 0 ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'} print:bg-opacity-100 print:bg-gray-100 print:text-gray-800`}>
                        {u.prevMealBalance >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                        ৳{Math.abs(u.prevMealBalance).toFixed(2)}
                        <span className="opacity-60">{u.prevMealBalance >= 0 ? 'রিফান্ড' : 'বকেয়া'}</span>
                    </div>
                  </td>
                  <td className="px-6 sm:px-8 py-5 sm:py-6 text-right bg-blue-900/5 print:bg-blue-50/30">
                    <div className="flex flex-col">
                       <span className="text-lg sm:text-xl font-black text-blue-500 print:text-blue-700">৳{u.totalPayable.toFixed(2)}</span>
                       <span className="text-[8px] sm:text-[9px] font-black text-gray-500 uppercase print:text-gray-400">ভেরিফাইড</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-800/20 font-black text-white border-y border-gray-800 print:bg-gray-50 print:text-gray-900 print:border-gray-200">
               <tr>
                  <td className="px-5 sm:px-6 py-5 sm:py-6 uppercase text-[9px] sm:text-[10px] text-gray-500 print:text-gray-400">সর্বমোট সংগ্রহ:</td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6 text-right text-xs sm:text-sm">৳{reportData.reduce((s, u) => s + u.currentFixedCost, 0).toFixed(2)}</td>
                  <td className="px-4 sm:px-6 py-5 sm:py-6"></td>
                  <td className="px-6 sm:px-8 py-5 sm:py-6 text-right text-blue-500 text-base sm:text-lg print:text-blue-700">৳{reportData.reduce((s, u) => s + u.totalPayable, 0).toFixed(2)}</td>
               </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-16 sm:mt-24 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-10 print:mt-10">
           <div className="text-center w-64 border-t border-gray-700 pt-4 print:border-gray-300">
              <p className="font-black text-[9px] sm:text-[10px] uppercase text-gray-500 mb-1">ম্যানেজার</p>
              <p className="font-bold text-gray-300 text-sm print:text-gray-800">{managerForMonth}</p>
           </div>
           <div className="text-center sm:text-right space-y-4">
              <div className="flex items-center justify-center sm:justify-end gap-2 text-blue-400 font-black text-[9px] sm:text-[10px] uppercase bg-blue-900/20 px-4 py-2 rounded-full border border-blue-800/50 print:text-blue-600 print:bg-blue-50 print:border-blue-100">
                <CheckCircle2 size={16}/> ভেরিফাইড রিপোর্ট
              </div>
              <div className="space-y-1">
                <p className="text-[8px] sm:text-[9px] font-black text-gray-500 uppercase print:text-gray-400">তৈরি করা হয়েছে:</p>
                <p className="text-[10px] sm:text-xs font-bold text-gray-400 print:text-gray-700">{new Date().toLocaleString('bn-BD')}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
