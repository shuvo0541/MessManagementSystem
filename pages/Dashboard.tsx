
import React, { useMemo, useState, useEffect } from 'react';
import { T } from '../translations';
import { getCalculations, getLocalDateStr } from '../db';
import { MessSystemDB, User, Role } from '../types';
import { GoogleGenAI } from "@google/genai";
import { 
  TrendingUp, 
  Utensils, 
  Wallet, 
  Zap,
  Award,
  Loader2,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ReceiptText,
  Home,
  ArrowRight,
  PieChart as PieChartIcon,
  CircleDollarSign,
  BarChart3,
  Calendar,
  UserX
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface DashboardProps {
  month: string;
  db: MessSystemDB;
}

const Dashboard: React.FC<DashboardProps> = ({ month, db }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  useEffect(() => {
    const session = sessionStorage.getItem('user');
    if (session) setCurrentUser(JSON.parse(session));
  }, []);

  const isUserOffThisMonth = useMemo(() => {
    if (!currentUser) return false;
    const freshUser = db.users.find(u => u.id === currentUser.id);
    return freshUser?.isPermanentlyOff || (freshUser?.monthlyOff || []).includes(month);
  }, [currentUser, db.users, month]);

  const stats = useMemo(() => getCalculations(db, month), [db, month]);
  
  const todayExpense = useMemo(() => {
    const today = getLocalDateStr();
    return db.bazars.filter(b => b.date === today).reduce((sum, b) => sum + b.amount, 0);
  }, [db.bazars]);

  const chartData = useMemo(() => {
    return stats.userStats.map(u => ({
      name: u.name,
      meals: u.totalMeals
    }));
  }, [stats.userStats]);

  const topContributor = useMemo(() => {
    if (stats.userStats.length === 0) return null;
    return [...stats.userStats].sort((a, b) => b.contribution - a.contribution)[0];
  }, [stats.userStats]);

  const topEater = useMemo(() => {
    if (stats.userStats.length === 0) return null;
    return [...stats.userStats].sort((a, b) => b.totalMeals - a.totalMeals)[0];
  }, [stats.userStats]);

  const myStats = useMemo(() => {
    if (!currentUser) return null;
    return stats.userStats.find(u => u.userId === currentUser.id);
  }, [stats.userStats, currentUser]);

  const personalInsightData = useMemo(() => {
    if (!myStats || stats.userStats.length === 0) return [];
    const avgSpending = stats.userStats.reduce((s, u) => s + u.currentMonthCost, 0) / stats.userStats.length;
    return [
      { type: 'আমার খরচ', amount: myStats.currentMonthCost },
      { type: 'মেস এভারেজ', amount: avgSpending }
    ];
  }, [myStats, stats.userStats]);

  const activeManager = useMemo(() => {
    const managerRole = db.monthlyRoles.find(r => r.month === month && r.role === Role.MANAGER);
    if (!managerRole) return null;
    return db.users.find(u => u.id === managerRole.userId);
  }, [db.monthlyRoles, db.users, month]);

  // UI-only summation for meal-specific balance
  const mealSpecificBalance = useMemo(() => {
    if (!myStats) return 0;
    return myStats.contribution - myStats.mealCost;
  }, [myStats]);

  const SummaryCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-gray-900 p-5 rounded-3xl border border-gray-800 group relative overflow-hidden transition-all hover:shadow-xl hover:shadow-blue-900/10">
      <div className={`absolute -right-2 -bottom-2 opacity-[0.05] group-hover:opacity-10 transition-opacity transform scale-150 text-${color}-500`}>
        <Icon size={80} />
      </div>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl bg-${color}-900/20 text-${color}-400 shrink-0 border border-${color}-500/10`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="text-gray-500 text-[10px] uppercase font-black tracking-widest truncate mb-0.5">{title}</h3>
          <p className="text-lg font-black truncate text-white">{value}</p>
        </div>
      </div>
    </div>
  );

  const todayDateFormatted = new Date().toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long'
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome & Role Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
                <Calendar size={20}/>
             </div>
             <p className="text-sm font-black text-blue-400 uppercase tracking-widest">{todayDateFormatted}</p>
          </div>
          <h2 className="text-3xl font-black text-white">
            {currentUser?.isAdmin ? 'এডমিন ড্যাশবোর্ড' : `স্বাগতম, ${currentUser?.name}!`}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-blue-900/30 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">{month}</span>
            <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">ব্যক্তিগত প্রোফাইল ও মিল সারাংশ</span>
          </div>
        </div>
        
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border ${activeManager ? 'bg-green-900/10 border-green-500/20 text-green-400' : 'bg-amber-900/10 border-amber-500/20 text-amber-500'}`}>
           <ShieldCheck size={20}/>
           <div className="text-xs font-black">
              <p className="uppercase tracking-widest opacity-60">চলতি মাসের ম্যানেজার</p>
              <p className="text-sm">{activeManager ? activeManager.name : 'নির্ধারিত নয়'}</p>
           </div>
        </div>
      </div>

      {/* OFF Status Restriction Notice */}
      {isUserOffThisMonth && !currentUser?.isAdmin && (
        <div className="bg-red-900/10 border border-red-500/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 shadow-2xl shadow-red-500/5 animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-red-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-red-500/30 shrink-0">
              <UserX size={40} />
           </div>
           <div className="text-center md:text-left space-y-2">
              <h3 className="text-xl font-black text-red-500 uppercase tracking-widest">অ্যাক্সেস সীমিত করা হয়েছে</h3>
              <p className="text-red-200/70 font-bold">আপনি এই মাসের ({month}) জন্য "OFF" স্ট্যাটাসে আছেন। অফ থাকা অবস্থায় আপনার কোনো খাবারের খরচ বা ইউটিলিটি বিল জেনারেট হবে না। আপনি শুধুমাত্র তথ্য দেখতে পারবেন কিন্তু কোনো ডাটা এন্ট্রি করতে পারবেন না।</p>
           </div>
        </div>
      )}

      {/* INDIVIDUAL BILL VIEW (Member UI Overhaul) */}
      {!currentUser?.isAdmin && myStats && !isUserOffThisMonth && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Section A: Current Balance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                  <PieChartIcon size={64} className="text-blue-500" />
               </div>
               <div className="relative z-10">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <CircleDollarSign size={14} className="text-blue-500"/> আমার মিল ব্যালেন্স (Refund/Due)
                  </h4>
                  <div className="space-y-6">
                     <div>
                        <p className="text-4xl font-black text-white">৳{mealSpecificBalance.toFixed(0)}</p>
                        <p className={`text-[11px] font-black uppercase tracking-widest mt-2 ${mealSpecificBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                           {mealSpecificBalance >= 0 ? 'খাবার বাবদ টাকা ফেরত পাবেন' : 'খাবার বাবদ বকেয়া আছে'}
                        </p>
                     </div>
                     <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                        <div>
                           <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">জমা/বাজার</p>
                           <p className="text-lg font-black text-green-500">৳{myStats.contribution.toLocaleString()}</p>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">খাবার খরচ</p>
                           <p className="text-lg font-black text-blue-500">৳{myStats.mealCost.toFixed(0)}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Section B: Bill Breakdown & Insight */}
            <div className="lg:col-span-2 bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 shadow-xl grid grid-cols-1 md:grid-cols-5 gap-8">
               <div className="md:col-span-3 space-y-6">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <ReceiptText size={14} className="text-purple-500"/> বিলের পূর্ণাঙ্গ ব্রেক-ডাউন
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 bg-gray-800/40 rounded-3xl border border-gray-800/50 group hover:border-purple-500/30 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-900/20 text-purple-400 rounded-xl">
                              <Home size={14}/>
                            </div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">রুম ভাড়া</span>
                        </div>
                        <p className="text-xl font-black text-white">৳{myStats.roomRent.toFixed(0)}</p>
                      </div>

                      <div className="p-5 bg-gray-800/40 rounded-3xl border border-gray-800/50 group hover:border-yellow-500/30 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-yellow-900/20 text-yellow-400 rounded-xl">
                              <Zap size={14}/>
                            </div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ইউটিলিটি</span>
                        </div>
                        <p className="text-xl font-black text-white">৳{myStats.utilityShare.toFixed(0)}</p>
                      </div>
                  </div>
                  <div className="p-5 bg-blue-900/10 rounded-3xl border border-blue-500/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 text-white rounded-xl">
                          <Utensils size={14}/>
                        </div>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">মোট মিল</span>
                      </div>
                      <p className="text-xl font-black text-white">{myStats.totalMeals.toFixed(1)}</p>
                  </div>
               </div>
               
               {/* User Insight Graph */}
               <div className="md:col-span-2 border-l border-gray-800 pl-0 md:pl-8 pt-6 md:pt-0">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <BarChart3 size={14} className="text-amber-500"/> খরচ বনাম মেস এভারেজ
                  </h4>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={personalInsightData}>
                        <XAxis dataKey="type" fontSize={8} stroke="#4b5563" />
                        <Tooltip contentStyle={{backgroundColor: '#111827', borderRadius: '10px', fontSize: '10px', border: '1px solid #374151'}} />
                        <Bar dataKey="amount" radius={[5, 5, 0, 0]} barSize={30}>
                          {personalInsightData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#6b7280'} />
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

      {/* Dashboard Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title={T.totalBazar} value={`৳${stats.totalBazar.toLocaleString()}`} icon={Wallet} color="blue" />
        <SummaryCard title={T.totalMeals} value={stats.totalMeals.toFixed(1)} icon={Utensils} color="green" />
        <SummaryCard title={T.mealRate} value={`৳${stats.mealRate.toFixed(2)}`} icon={TrendingUp} color="purple" />
        <SummaryCard title={T.todayExpense} value={`৳${todayExpense.toLocaleString()}`} icon={Zap} color="yellow" />
      </div>

      {/* Recognition & Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800">
          <h3 className="text-xl font-black flex items-center gap-3 text-white mb-8">
            <TrendingUp size={24} className="text-blue-500" />
            মেম্বার মিল চার্ট
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke="#6b7280" />
                <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#6b7280" />
                <Tooltip cursor={{fill: '#1f2937'}} contentStyle={{backgroundColor: '#111827', borderRadius: '15px', border: '1px solid #374151', color: '#fff'}} />
                <Bar dataKey="meals" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 flex flex-col justify-center">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-white">
              <Award size={24} className="text-yellow-500" />
              সেরা পার্ফমার
            </h3>
            <div className="space-y-4">
              {topContributor && (
                <div className="p-5 bg-blue-900/10 rounded-3xl border border-blue-500/10 flex items-center gap-4">
                  <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-500/20"><Wallet size={20}/></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">টপ কন্ট্রিবিউটর</p>
                    <p className="font-black text-white truncate">{topContributor.name}</p>
                  </div>
                </div>
              )}
              {topEater && (
                <div className="p-5 bg-green-900/10 rounded-3xl border border-green-500/20 flex items-center gap-4">
                  <div className="bg-green-600 text-white p-3 rounded-2xl shadow-lg shadow-green-500/20"><Utensils size={20}/></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">টপ মিল হোল্ডার</p>
                    <p className="font-black text-white truncate">{topEater.name}</p>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
