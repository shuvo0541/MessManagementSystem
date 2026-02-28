
import React, { useMemo, useState, useEffect } from 'react';
import { T } from '../translations';
import { getCalculations, getLocalDateStr, getCurrentMonthStr } from '../db';
import { MessSystemDB, User, Role } from '../types';
import { supabase } from '../supabase';
import { 
  Lock, 
  Unlock,
  UserCheck,
  Inbox,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
  PieChart as PieChartIcon,
  CircleDollarSign
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

interface DashboardProps {
  month: string;
  db: MessSystemDB;
  updateDB: (updates: Partial<MessSystemDB> | ((prev: MessSystemDB) => MessSystemDB)) => void;
  user: User;
  messId: string | null;
  messAdminId: string | null;
  onViewChange: (view: string) => void;
  t: any;
  theme: string;
}

const Dashboard: React.FC<DashboardProps> = ({ month, db, updateDB, user, messId, messAdminId, onViewChange, t, theme }) => {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    if (!user.isAdmin || !messId) return;
    fetchPendingRequests();
    const channel = supabase.channel('join-requests-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'join_requests', filter: `mess_id=eq.${messId}` }, () => { fetchPendingRequests(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user.isAdmin, messId]);

  const isMonthLocked = (db.lockedMonths || []).includes(month);

  const fetchPendingRequests = async () => {
    if (!messId) return;
    setLoadingRequests(true);
    const { data } = await supabase.from('join_requests').select('*').eq('mess_id', messId).eq('status', 'pending');
    if (data) setPendingRequests(data);
    setLoadingRequests(false);
  };

  const handleApprove = async (req: any) => {
    setLoadingRequests(true);
    try {
      const actualName = req.user_name || t.memberLabel;
      const uniqueUserId = req.user_username || ("@user" + req.user_id.slice(0, 5));
      const newUser: User = {
        id: req.user_id,
        name: actualName,
        username: req.user_username?.replace('@', '') || "user_" + req.user_id.slice(0, 5),
        userId: uniqueUserId,
        isAdmin: false,
        monthlyOff: [],
        joiningMonth: getCurrentMonthStr(), 
        leavingMonth: null
      };
      const updatedUsers = [...db.users];
      const existingIdx = updatedUsers.findIndex(u => u.id === req.user_id);
      if (existingIdx > -1) updatedUsers[existingIdx] = newUser;
      else updatedUsers.push(newUser);
      
      const { error: dbError } = await supabase.from('messes').update({ db_json: { ...db, users: updatedUsers } }).eq('id', messId);
      if (dbError) throw dbError;
      await supabase.from('join_requests').delete().eq('id', req.id);
      updateDB({ users: updatedUsers });
      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
      alert(`${actualName} ${t.approveSuccess}`);
    } catch (err: any) {
      alert(`${t.approveFail}: ${err.message}`);
    } finally {
      setLoadingRequests(false);
    }
  };

  const stats = useMemo(() => getCalculations(db, month), [db, month]);
  const todayExpense = useMemo(() => {
    const today = getLocalDateStr();
    return db.bazars.filter(b => b.date === today).reduce((sum, b) => sum + b.amount, 0);
  }, [db.bazars]);

  const chartData = useMemo(() => stats.userStats.map((u: any) => ({ name: u.name, meals: u.totalMeals })), [stats.userStats]);
  
  // Custom tick function to break long names into 2-3 lines
  const renderCustomAxisTick = ({ x, y, payload }: any) => {
    const name = payload.value;
    const words = name.split(' ');
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={12} 
          textAnchor="middle" 
          fill="#6b7280" 
          style={{ fontSize: '8px', fontWeight: '700' }}
        >
          {words.slice(0, 3).map((word: string, index: number) => (
            <tspan x={0} dy={index === 0 ? 0 : 10} key={index}>
              {word}
            </tspan>
          ))}
        </text>
      </g>
    );
  };

  const SummaryCard = ({ title, value, icon: Icon, color, onClick }: any) => (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 group relative overflow-hidden transition-all hover:shadow-xl ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <div className={`absolute -right-2 -bottom-2 opacity-[0.05] group-hover:opacity-10 transition-opacity transform scale-150 text-${color}-500`}>
        <Icon size={80} />
      </div>
      <div className="flex items-center gap-3 sm:gap-5">
        <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-${color}-500/10 text-${color}-600 dark:text-${color}-400 shrink-0 border border-${color}-500/10`}>
          <Icon size={20} className="sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0">
          <h3 className="text-gray-500 text-[8px] sm:text-[10px] uppercase font-black tracking-widest truncate mb-0.5">{title}</h3>
          <p className="text-base sm:text-xl font-black truncate text-gray-900 dark:text-white">{value}</p>
          {onClick && (
            <p className={`text-[7px] sm:text-[8px] font-black uppercase mt-1 flex items-center gap-0.5 text-${color}-500/80`}>
            {t.viewDetails} <TrendingUp size={8} className="rotate-45" />
          </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-10 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{user.isAdmin ? t.adminPanel : `${t.welcome}, ${user.name}!`}</h2>
           <p className="text-gray-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">{t.messDashboardOverview}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
           <button 
             onClick={() => onViewChange('personal-account')}
             className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3.5 bg-green-600/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest hover:bg-green-600 hover:text-white transition-all"
           >
             <CircleDollarSign size={14}/> {t.personalAccount}
           </button>
           {user.isAdmin && (
              <>
                 <button onClick={() => { if(window.confirm(isMonthLocked ? t.unlockMonth + "?" : t.closeMonth + "?")) updateDB({ lockedMonths: isMonthLocked ? db.lockedMonths?.filter(m => m !== month) : [...(db.lockedMonths || []), month] }); }} className={`flex items-center gap-2 sm:gap-3 px-5 sm:px-6 py-2.5 sm:py-3.5 ${isMonthLocked ? 'bg-amber-600/10 text-amber-500 border-amber-500/20' : 'bg-red-600/10 text-red-500 border-red-500/20'} rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest transition-all`}>
                    {isMonthLocked ? <Unlock size={14}/> : <Lock size={14}/>} {isMonthLocked ? t.unlockMonth : t.closeMonth}
                 </button>
              </>
           )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <SummaryCard title={t.totalBazar} value={`৳${stats.totalBazar.toFixed(2)}`} icon={Wallet} color="blue" onClick={() => onViewChange('bazar')} />
        <SummaryCard title={t.totalMeals} value={stats.totalMeals.toFixed(1)} icon={Utensils} color="green" onClick={() => onViewChange('meals')} />
        <SummaryCard title={t.mealRate} value={`৳${stats.mealRate.toFixed(2)}`} icon={TrendingUp} color="purple" />
        <SummaryCard title={t.todayExpense} value={`৳${todayExpense.toFixed(2)}`} icon={Zap} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl">
           <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3 mb-8">
             <PieChartIcon size={20} className="text-blue-500" />
             {t.mealStatistics}
           </h3>
           <div className="h-64 sm:h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} barCategoryGap="15%">
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
                 <XAxis 
                   dataKey="name" 
                   tick={renderCustomAxisTick}
                   height={60}
                   tickLine={false} 
                   axisLine={false}
                   interval={0}
                 />
                 <YAxis fontSize={9} stroke="#6b7280" tickLine={false} axisLine={false} />
                 <Tooltip 
                   cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                   contentStyle={{ backgroundColor: theme === 'dark' ? '#111827' : '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '10px', color: theme === 'dark' ? '#ffffff' : '#111827' }} 
                 />
                 <Bar dataKey="meals" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} barSize={24} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {user.isAdmin && pendingRequests.length > 0 && (
            <div className="bg-blue-600/5 border border-blue-500/20 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-6">
               <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-3">
                    <Inbox size={18} className="text-blue-500" />
                    {t.applications} ({pendingRequests.length})
                  </h3>
               </div>
               <div className="space-y-4">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                       <div className="min-w-0">
                          <p className="font-black text-gray-900 dark:text-white text-xs truncate">{req.user_name}</p>
                          <p className="text-[10px] text-gray-500 font-bold truncate">{req.user_username || `@${req.user_id.slice(0,5)}`}</p>
                       </div>
                       <button onClick={() => handleApprove(req)} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                          <UserCheck size={16} />
                       </button>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
