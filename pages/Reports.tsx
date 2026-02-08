
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
  CheckCircle2
} from 'lucide-react';

interface ReportsProps {
  month: string;
  db: MessSystemDB;
}

const Reports: React.FC<ReportsProps> = ({ month, db }) => {
  // বর্তমান মাসের হিসাব
  const currentStats = useMemo(() => getCalculations(db, month), [db, month]);
  
  // গত মাসের হিসাব (শুধুমাত্র মিল ব্যালেন্স নেওয়ার জন্য)
  const prevMonth = useMemo(() => getPreviousMonthStr(month), [month]);
  const prevStats = useMemo(() => getCalculations(db, prevMonth), [db, prevMonth]);

  const managerForMonth = useMemo(() => {
    const roleEntry = db.monthlyRoles.find(r => r.month === month && r.role === Role.MANAGER);
    if (!roleEntry) return "নির্ধারিত নয়";
    const user = db.users.find(u => u.id === roleEntry.userId);
    return user ? user.name : "নির্ধারিত নয়";
  }, [db.monthlyRoles, db.users, month]);

  // চূড়ান্ত ডাটা প্রসেসিং (লজিক: স্থির খরচ + গত মাসের মিল সমন্বয়)
  const reportData = useMemo(() => {
    return currentStats.userStats.map(u => {
      const pStat = prevStats.userStats.find(ps => ps.userId === u.userId);
      
      // ১. বর্তমান মাসের স্থির খরচ (রুম ভাড়া + ইউটিলিটি)
      const currentFixedCost = u.roomRent + u.utilityShare;
      
      // ২. গত মাসের মিল ব্যালেন্স (Food Balance Only) 
      const prevMealContribution = pStat ? pStat.contribution : 0;
      const prevMealCost = pStat ? pStat.mealCost : 0;
      const prevMealBalance = prevMealContribution - prevMealCost;

      // ৩. সর্বমোট প্রদেয় (Fixed Cost - Prev Refund OR Fixed Cost + Prev Due)
      const totalPayable = currentFixedCost - prevMealBalance;

      return {
        userId: u.userId,
        name: u.name,
        roomRent: u.roomRent,
        utilityShare: u.utilityShare,
        currentFixedCost,
        prevMealBalance, // positive = refund, negative = due
        totalPayable
      };
    });
  }, [currentStats, prevStats]);

  const handlePrint = () => {
    // প্রিন্ট করার আগে নিশ্চিত হওয়া যে পেজটি টপ-এ আছে
    window.scrollTo(0, 0);
    setTimeout(() => {
        window.print();
    }, 100);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Action Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3 text-white">
            <FileText className="text-blue-500" />
            চূড়ান্ত রিপোর্ট ও সমন্বয়
          </h2>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">স্থির খরচ ও গত মাসের খাবারের সমন্বয়</p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl transition-all font-black shadow-lg shadow-blue-500/20 text-xs uppercase tracking-widest active:scale-95"
        >
          <Printer size={18} />
          প্রিন্ট রিপোর্ট (PDF)
        </button>
      </div>

      {/* Logic Notice (No Print) */}
      <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-3xl flex items-start gap-4 no-print">
         <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
         <div className="text-xs font-medium text-blue-300/80 leading-relaxed">
           <p className="font-black text-blue-400 uppercase tracking-widest mb-1">সমন্বয় লজিক (স্বয়ংক্রিয়)</p>
           এই রিপোর্টে বর্তমান মাসের স্থির খরচ (রুম ও ইউটিলিটি) এর সাথে গত মাসের মিলের বকেয়া/রিফান্ড সমন্বয় করা হয়েছে। গত মাসের অন্য কোনো বকেয়া (ভাড়া/বিল) এখানে অন্তর্ভুক্ত করা হয়নি।
         </div>
      </div>

      {/* Main Report Container - Updated for Dark Mode Consistency */}
      <div id="report-container" className="bg-gray-900 text-gray-100 p-8 md:p-12 rounded-[3rem] shadow-2xl border border-gray-800 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        
        {/* Report Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b-2 border-gray-800 pb-10 print:border-gray-200">
          <div>
             <h3 className="text-3xl font-black text-blue-500 print:text-blue-800">{T.appName}</h3>
             <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] mt-1 print:text-gray-400">চূড়ান্ত মাসিক রিপোর্ট ও সমন্বয়</p>
          </div>
          <div className="text-right">
             <div className="bg-gray-800 px-6 py-4 rounded-2xl border border-gray-700 print:bg-gray-50 print:border-gray-100">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 print:text-gray-400">রিপোর্ট মাস</p>
                <p className="text-xl font-black text-white print:text-gray-800">{month}</p>
             </div>
          </div>
        </div>

        {/* Global Stats Grid (Print Friendly) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-10">
          <div className="bg-blue-900/20 p-6 rounded-2xl border border-blue-800/50 print:bg-blue-50 print:border-blue-100">
             <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 print:text-blue-500">মোট স্থির খরচ (রুম+ইউটি)</p>
             <p className="text-2xl font-black text-white print:text-blue-900">৳{reportData.reduce((s,d) => s + d.currentFixedCost, 0).toLocaleString()}</p>
          </div>
          <div className="bg-purple-900/20 p-6 rounded-2xl border border-purple-800/50 print:bg-purple-50 print:border-purple-100">
             <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1 print:text-purple-500">গত মাসের মিল সমন্বয়</p>
             <p className="text-2xl font-black text-white print:text-purple-900">৳{Math.abs(reportData.reduce((s,d) => s + d.prevMealBalance, 0)).toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 print:bg-gray-50 print:border-gray-100">
             <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 print:text-gray-400">চূড়ান্ত সংগ্রহ লক্ষ্যমাত্রা</p>
             <p className="text-2xl font-black text-white print:text-gray-900">৳{reportData.reduce((s,d) => s + d.totalPayable, 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Final Adjusted Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/40 text-[10px] uppercase font-black text-gray-500 border-y border-gray-800 print:bg-gray-50 print:border-gray-200">
                <th className="px-6 py-6">মেম্বারের নাম</th>
                <th className="px-6 py-6 text-right">স্থির খরচ (ভাড়া+ইউটি)</th>
                <th className="px-6 py-6 text-right">গত মাসের মিল সমন্বয়</th>
                <th className="px-8 py-6 text-right text-blue-400 bg-blue-900/10 print:text-blue-800 print:bg-blue-50/50">সর্বমোট প্রদেয় (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 print:divide-gray-100">
              {reportData.map(u => (
                <tr key={u.userId} className="text-gray-300 hover:bg-gray-800/20 print:text-gray-700 print:hover:bg-gray-50/50">
                  <td className="px-6 py-6 font-black text-white print:text-gray-900">{u.name}</td>
                  <td className="px-6 py-6 text-right">
                     <div className="flex flex-col">
                        <span className="font-bold text-gray-200 print:text-gray-700">৳{u.currentFixedCost.toFixed(0)}</span>
                        <span className="text-[9px] text-gray-500 font-bold print:text-gray-400">ভাড়া: {u.roomRent.toFixed(0)} | ইউটি: {u.utilityShare.toFixed(0)}</span>
                     </div>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black ${u.prevMealBalance >= 0 ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'} print:bg-opacity-100 print:bg-gray-100`}>
                        {u.prevMealBalance >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                        ৳{Math.abs(u.prevMealBalance).toFixed(0)}
                        <span className="opacity-60">{u.prevMealBalance >= 0 ? 'রিফান্ড' : 'বকেয়া'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right bg-blue-900/5 print:bg-blue-50/30">
                    <div className="flex flex-col">
                       <span className="text-xl font-black text-blue-500 print:text-blue-700">৳{u.totalPayable.toFixed(0)}</span>
                       <span className="text-[9px] font-black text-gray-500 uppercase print:text-gray-400">ভেরিফাইড</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-800/20 font-black text-white border-y border-gray-800 print:bg-gray-50 print:text-gray-900 print:border-gray-200">
               <tr>
                  <td className="px-6 py-6 uppercase text-[10px] text-gray-500 print:text-gray-400">সর্বমোট সংগ্রহ:</td>
                  <td className="px-6 py-6 text-right">৳{reportData.reduce((s, u) => s + u.currentFixedCost, 0).toFixed(0)}</td>
                  <td className="px-6 py-6"></td>
                  <td className="px-8 py-6 text-right text-blue-500 text-lg print:text-blue-700">৳{reportData.reduce((s, u) => s + u.totalPayable, 0).toFixed(0)}</td>
               </tr>
            </tfoot>
          </table>
        </div>

        {/* Signatures */}
        <div className="mt-24 flex justify-between items-end">
           <div className="text-center w-64">
              <div className="border-b border-gray-700 h-10 mb-4 print:border-gray-300"></div>
              <p className="font-black text-[10px] uppercase text-gray-500 mb-1">ম্যানেজার</p>
              <p className="font-bold text-gray-300 print:text-gray-800">{managerForMonth}</p>
           </div>
           <div className="text-right space-y-4">
              <div className="flex items-center justify-end gap-2 text-blue-400 font-black text-[10px] uppercase bg-blue-900/20 px-4 py-2 rounded-full border border-blue-800/50 print:text-blue-600 print:bg-blue-50 print:border-blue-100">
                <CheckCircle2 size={16}/> ভেরিফাইড রিপোর্ট
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-gray-500 uppercase print:text-gray-400">তৈরি করা হয়েছে:</p>
                <p className="text-xs font-bold text-gray-400 print:text-gray-700">{new Date().toLocaleString('bn-BD')}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
