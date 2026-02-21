
import React, { useMemo } from 'react';
import { T } from '../translations';
import { getCalculations, getPreviousMonthStr } from '../db';
import { MessSystemDB, Role, Payment } from '../types';
import { 
  ClipboardCheck, 
  Printer,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Wallet,
  HandCoins,
  User as UserIcon
} from 'lucide-react';

interface ReportsProps {
  month: string;
  db: MessSystemDB;
  updateDB: (updates: Partial<MessSystemDB>) => void;
  isAdmin: boolean;
  role: Role;
}

const Reports: React.FC<ReportsProps> = ({ month, db, updateDB, isAdmin, role }) => {
  const currentStats = useMemo(() => getCalculations(db, month), [db, month]);
  
  const isMonthLocked = (db.lockedMonths || []).includes(month);
  const canEdit = (isAdmin || role === Role.MANAGER) && !isMonthLocked;

  const monthManager = useMemo(() => {
    const managerRole = db.monthlyRoles.find(r => r.month === month && r.role === Role.MANAGER);
    if (managerRole) return db.users.find(u => u.id === managerRole.userId)?.name || 'নির্ধারিত নয়';
    return db.users.find(u => u.isAdmin)?.name || 'মেস এডমিন';
  }, [db, month]);

  const handleDepositChange = (userId: string, amount: number) => {
    if (!canEdit) return;
    
    // নেগেটিভ ভ্যালু ইনপুট দিলে তা ০ হিসেবে গণ্য হবে
    const validAmount = Math.max(0, amount);
    
    const otherPayments = db.payments.filter(p => !(p.userId === userId && p.month === month));
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      userId,
      month,
      amount: validAmount,
      date: new Date().toISOString().split('T')[0]
    };
    updateDB({ payments: [...otherPayments, newPayment] });
  };

  const reportData = useMemo(() => {
    return currentStats.userStats.map((u: any) => {
      // স্থির খরচ (রুম ভাড়া + ইউটিলিটি)
      const fixedCost = u.roomRent + u.utilityShare;
      
      // মিল সমন্বয় (গত মাসের বাজার - গত মাসের খাবার খরচ) - এটি সরাসরি db.ts থেকে আসছে
      const mealAdjustment = u.prevAdjustment;

      // নিট প্রদেয় (স্থির খরচ - মিল সমন্বয়)
      const netRequired = fixedCost - mealAdjustment;
      
      // জমা টাকা
      const deposited = u.payments;

      // চূড়ান্ত অবস্থা (জমা - নিট প্রদেয়)
      const finalStatus = deposited - netRequired;

      return {
        userId: u.userId,
        name: u.name,
        fixedCost,
        mealAdjustment,
        netRequired,
        deposited,
        finalStatus
      };
    });
  }, [currentStats]);

  const summary = useMemo(() => {
    const totalNet = reportData.reduce((s: number, r: any) => s + r.netRequired, 0);
    const totalDeposited = reportData.reduce((s: number, r: any) => s + r.deposited, 0);
    return { totalNet, totalDeposited };
  }, [reportData]);

  const handlePrint = () => {
    setTimeout(() => { window.print(); }, 500);
  };

  const generationTime = useMemo(() => {
    const now = new Date();
    return now.toLocaleString('bn-BD', { 
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
    });
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 pb-10 animate-in fade-in duration-500 overflow-x-hidden px-2 sm:px-0">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
            <ClipboardCheck className="text-blue-500" /> চূড়ান্ত রিপোর্ট ও সমন্বয়
          </h2>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-1">স্থির খরচ ও পূর্ববর্তী মাসের সমন্বিত রিপোর্ট</p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3.5 rounded-xl font-black shadow-lg shadow-blue-500/20 text-[10px] uppercase tracking-widest active:scale-95 transition-all w-full sm:w-auto"
        >
          <Printer size={16} /> প্রিন্ট রিপোর্ট (PDF)
        </button>
      </div>

      {/* Info Notice */}
      <div className="bg-blue-900/10 border border-blue-500/20 p-4 sm:p-5 rounded-2xl flex items-start gap-4 no-print">
         <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
         <div className="text-[10px] sm:text-xs font-medium text-blue-300/80 leading-relaxed">
           <p className="font-black text-blue-400 uppercase tracking-widest mb-1">সমন্বয় ও জমা লজিক</p>
           নিট প্রদেয় = (স্থির খরচ) - (গত মাসের মিল সমন্বয়)।<br/>
           অবস্থা = (জমা টাকা) - (নিট প্রদেয়)। পজিটিভ হলে <b>'ফেরত'</b> এবং নেগেটিভ হলে <b>'বকেয়া'</b>।
         </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl text-center shadow-xl">
           <p className="text-[9px] font-black text-blue-500 uppercase mb-1 tracking-widest">মোট নিট প্রদেয়</p>
           <h4 className="text-xl font-black text-white">৳{summary.totalNet.toFixed(2)}</h4>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl text-center shadow-xl">
           <p className="text-[9px] font-black text-green-500 uppercase mb-1 tracking-widest">মোট জমা (পেমেন্ট)</p>
           <h4 className="text-xl font-black text-white">৳{summary.totalDeposited.toFixed(2)}</h4>
        </div>
        <div className={`bg-gray-900 border p-5 rounded-2xl text-center shadow-xl ${summary.totalNet > summary.totalDeposited ? 'border-red-500/20' : 'border-gray-800'}`}>
           <p className="text-[9px] font-black text-gray-500 uppercase mb-1 tracking-widest">অবশিষ্ট বকেয়া</p>
           <h4 className="text-xl font-black text-white">৳{Math.max(0, summary.totalNet - summary.totalDeposited).toFixed(2)}</h4>
        </div>
      </div>

      {/* Report Container (Table/Card View) */}
      <div id="report-container" className="bg-[#0f172a] rounded-[2rem] sm:rounded-[2.5rem] border border-gray-800 p-4 sm:p-10 shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        
        {/* Document Header (Always Visible) */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 sm:mb-12 gap-4">
           <div className="text-center sm:text-left space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-blue-500">মেস ম্যানেজমেন্ট</h3>
              <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest">চূড়ান্ত মাসিক রিপোর্ট ও সমন্বয়</p>
           </div>
           <div className="bg-gray-800/50 px-6 py-3 rounded-2xl border border-gray-700 text-center print:border-gray-200">
              <p className="text-[8px] font-black text-gray-500 uppercase">রিপোর্টিং মাস</p>
              <p className="text-base sm:text-lg font-black text-white print:text-black">{month}</p>
           </div>
        </div>

        {/* Mobile-Friendly Card View (Hidden on Print & Desktop) */}
        <div className="sm:hidden space-y-4 no-print">
          {reportData.map((u: any) => (
            <div key={u.userId} className="bg-gray-800/30 border border-gray-800 p-5 rounded-2xl space-y-5">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-blue-600/20 text-blue-500 rounded-xl flex items-center justify-center font-black">{u.name[0]}</div>
                   <div>
                      <h4 className="font-black text-white text-sm">{u.name}</h4>
                      <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${u.finalStatus >= 0 ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                         {u.finalStatus >= 0 ? 'ফেরত পাবে' : 'বকেয়া আছে'}
                      </div>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">অবস্থা</p>
                   <p className={`text-base font-black ${u.finalStatus >= 0 ? 'text-green-500' : 'text-red-500'}`}>৳{Math.abs(u.finalStatus).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px] font-bold">
                 <div className="bg-gray-900 p-3 rounded-xl border border-gray-800">
                    <p className="text-gray-500 text-[8px] uppercase mb-1">স্থির খরচ</p>
                    <p className="text-white">৳{u.fixedCost.toFixed(2)}</p>
                 </div>
                 <div className="bg-gray-900 p-3 rounded-xl border border-gray-800">
                    <p className="text-gray-500 text-[8px] uppercase mb-1">সমন্বয়</p>
                    <p className={u.mealAdjustment >= 0 ? 'text-green-400' : 'text-red-400'}>৳{Math.abs(u.mealAdjustment).toFixed(2)} {u.mealAdjustment >= 0 ? 'পাবে' : 'বকেয়া'}</p>
                 </div>
              </div>

              <div className="space-y-1.5 pt-1">
                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">জমা টাকা (Payment)</p>
                 {canEdit ? (
                    <input 
                      type="number" min="0"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm font-black text-white focus:ring-1 focus:ring-blue-500 outline-none"
                      value={u.deposited || ''}
                      placeholder="0.00"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleDepositChange(u.userId, parseFloat(e.target.value) || 0)}
                    />
                 ) : (
                    <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 text-white font-black text-sm">৳{u.deposited.toFixed(2)}</div>
                 )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View (Hidden on Mobile Screen, Visible on Print) */}
        <div className="hidden sm:block overflow-x-auto no-scrollbar print:block">
          <table className="w-full text-left min-w-[850px] print:min-w-0">
            <thead>
              <tr className="text-[10px] uppercase font-black text-gray-500 border-b border-gray-800 print:border-gray-200">
                <th className="px-4 py-6">মেম্বারের নাম</th>
                <th className="px-4 py-6 text-right">স্থির খরচ</th>
                <th className="px-4 py-6 text-center">মিল সমন্বয়</th>
                <th className="px-4 py-6 text-center bg-gray-800/20 print:bg-transparent">জমা (৳)</th>
                <th className="px-4 py-6 text-right text-blue-400">সর্বমোট (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 print:divide-gray-100">
              {reportData.map((u: any) => (
                <tr key={u.userId} className="hover:bg-gray-800/20 transition-all group print:text-black">
                  <td className="px-4 py-8">
                     <span className="font-black text-white text-base print:text-black">{u.name}</span>
                  </td>
                  <td className="px-4 py-8 text-right">
                    <div className="flex flex-col">
                       <span className="font-black text-white text-base print:text-black">৳{u.fixedCost.toFixed(2)}</span>
                       <span className="text-[9px] text-gray-500 font-bold uppercase">রুম+ইউটি</span>
                    </div>
                  </td>
                  <td className="px-4 py-8 text-center">
                    <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black ${u.mealAdjustment >= 0 ? 'bg-green-900/10 text-green-400' : 'bg-red-900/10 text-red-400'} print:bg-transparent`}>
                       ৳{Math.abs(u.mealAdjustment).toFixed(2)} {u.mealAdjustment >= 0 ? 'পাবে' : 'বকেয়া'}
                    </div>
                  </td>
                  <td className="px-4 py-8 text-center bg-gray-800/10 print:bg-transparent">
                     {canEdit ? (
                       <input 
                         type="number" min="0"
                         className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-center font-black text-white focus:ring-2 focus:ring-blue-600 outline-none no-print"
                         value={u.deposited || ''}
                         placeholder="0.00"
                         onFocus={(e) => e.target.select()}
                         onChange={(e) => handleDepositChange(u.userId, parseFloat(e.target.value) || 0)}
                       />
                     ) : (
                       <span className="font-black text-white">৳{u.deposited.toFixed(2)}</span>
                     )}
                     <span className="hidden print:inline font-black">৳{u.deposited.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-8 text-right">
                     <div className="flex flex-col items-end">
                        <span className={`text-xl font-black ${u.finalStatus >= 0 ? 'text-green-500' : 'text-red-500'} print:text-black`}>
                          ৳{Math.abs(u.finalStatus).toFixed(2)}
                        </span>
                        <span className={`text-[9px] font-black uppercase ${u.finalStatus >= 0 ? 'text-green-500/60' : 'text-red-500/60'} print:text-black`}>
                          {u.finalStatus >= 0 ? 'ফেরত পাবে' : 'বকেয়া আছে'}
                        </span>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-800 print:border-gray-200">
               <tr className="font-black">
                  <td className="px-4 py-8 text-gray-500 text-[10px] uppercase">সর্বমোট:</td>
                  <td className="px-4 py-8 text-right text-white print:text-black">৳{reportData.reduce((s: number, r: any)=>s+r.fixedCost, 0).toFixed(2)}</td>
                  <td className="px-4 py-8"></td>
                  <td className="px-4 py-8 text-center text-green-500">৳{summary.totalDeposited.toFixed(2)}</td>
                  <td className="px-4 py-8 text-right text-blue-500 text-xl">
                    ৳{Math.abs(summary.totalDeposited - summary.totalNet).toFixed(2)}
                  </td>
               </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Signatures & Generation Time */}
        <div className="mt-12 sm:mt-20 flex flex-col sm:flex-row justify-between items-end gap-10">
           <div className="text-center sm:text-left space-y-2 w-full sm:w-auto">
              <div className="w-full sm:w-48 border-t border-gray-700 pt-2 print:border-black">
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">ম্যানেজার</p>
                 <p className="text-sm font-black text-white print:text-black">{monthManager}</p>
              </div>
           </div>
           
           <div className="text-right space-y-4 w-full sm:w-auto">
              <div className="bg-blue-600/10 px-4 py-2 rounded-xl border border-blue-500/20 inline-flex items-center gap-2 print:border-none no-print">
                 <CheckCircle2 size={14} className="text-blue-500"/>
                 <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">ভেরিফাইড রিপোর্ট</span>
              </div>
              <div className="text-right">
                 <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] flex items-center justify-end gap-1">
                    <Clock size={10}/> রিপোর্ট তৈরির সময়:
                 </p>
                 <p className="text-[10px] font-black text-gray-400 mt-1">{generationTime}</p>
              </div>
           </div>
        </div>

      </div>

      <div className="flex items-center justify-center gap-2 text-gray-700 text-[8px] font-black uppercase tracking-[0.3em] pt-4 no-print">
         <ShieldCheck size={14}/> চূড়ান্ত রিপোর্ট অটোমেটেড সিস্টেম দ্বারা জেনারেটেড
      </div>
    </div>
  );
};

export default Reports;
