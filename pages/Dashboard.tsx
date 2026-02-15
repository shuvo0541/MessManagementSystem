
import React, { useMemo, useState, useEffect } from 'react';
import { T } from '../translations';
import { getCalculations, getLocalDateStr, getCurrentMonthStr } from '../db';
import { MessSystemDB, User, Role } from '../types';
import { supabase } from '../supabase';
import { 
  TrendingUp, 
  Utensils, 
  Wallet, 
  Zap,
  PieChart as PieChartIcon,
  Lock,
  Unlock,
  RefreshCcw
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
  updateDB: (updates: Partial<MessSystemDB>) => void;
  user: User;
  messId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ month, db, updateDB, user, messId }) => {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    if (user.isAdmin) {
      fetchPendingRequests();
    }
  }, [user.isAdmin, messId]);

  const isMonthLocked = (db.lockedMonths || []).includes(month);

  const fetchPendingRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('join_requests')
        .select('*')
        .eq('mess_id', messId)
        .eq('status', 'pending');
      
      if (!error) setPendingRequests(data || []);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApprove = async (req: any) => {
    setLoadingRequests(true);
    try {
      // মেম্বার অনুমোদনের সময় বর্তমান মাসকেই তাদের যোগদানের মাস হিসেবে ধরা হচ্ছে
      const currentMonth = getCurrentMonthStr(); 
      const newUser: User = {
        id: req.user_id,
        name: req.user_email.split('@')[0],
        username: req.user_email.split('@')[0].toLowerCase().replace(/[^a-z]/g, '') + Math.floor(100 + Math.random()*899),
        isAdmin: false,
        monthlyOff: [],
        joiningMonth: currentMonth, 
        leavingMonth: null
      };

      const updatedUsers = [...db.users, newUser];
      
      const { error: dbError } = await supabase
        .from('messes')
        .update({ db_json: { ...db, users: updatedUsers } })
        .eq('id', messId);

      if (dbError) throw dbError;

      await supabase.from('join_requests').delete().eq('id', req.id);

      updateDB({ users: updatedUsers });
      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
      alert("মেম্বার অনুমোদিত হয়েছে! তাকে এখন মেম্বার লিস্টে অ্যাক্টিভ হিসেবে দেখা যাবে।");
    } catch (err: any) {
      alert("অনুমোদন করা যায়নি।");
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
  
  const SummaryCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 group relative overflow-hidden transition-all hover:shadow-xl">
      <div className={`absolute -right-2 -bottom-2 opacity-[0.05] group-hover:opacity-10 transition-opacity transform scale-150 text-${color}-500`}>
        <Icon size={80} />
      </div>
      <div className="flex items-center gap-5">
        <div className={`p-4 rounded-2xl bg-${color}-900/20 text-${color}-400 shrink-0 border border-${color}-500/10`}>
          <Icon size={24} />
        </div>
        <div className="min-w-0">
          <h3 className="text-gray-500 text-[10px] uppercase font-black tracking-widest truncate mb-0.5">{title}</h3>
          <p className="text-xl font-black truncate text-white">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <h2 className="text-3xl font-black text-white">
          {user.isAdmin ? 'অ্যাডমিন প্যানেল' : `স্বাগতম, ${user.name}!`}
        </h2>
        {user.isAdmin && (
           <div className="flex gap-3">
              <button onClick={() => {
                const nextLocked = isMonthLocked ? db.lockedMonths?.filter(m => m !== month) : [...(db.lockedMonths || []), month];
                if(window.confirm(isMonthLocked ? "আনলক করতে চান?" : "এই মাসের তথ্য ক্লোজ করতে চান?")) updateDB({ lockedMonths: nextLocked });
              }} className={`flex items-center gap-3 px-6 py-4 rounded-3xl font-black uppercase text-xs tracking-widest transition-all ${isMonthLocked ? 'bg-amber-600' : 'bg-red-600'} text-white`}>
                {isMonthLocked ? <><Unlock size={18}/> আনলক করুন</> : <><Lock size={18}/> মাস ক্লোজ করুন</>}
              </button>
           </div>
        )}
      </div>

      {user.isAdmin && pendingRequests.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
           <div className="p-8 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-2xl font-black text-white uppercase">সদস্য আবেদন</h3>
              <button onClick={fetchPendingRequests} className="p-3 hover:bg-gray-800 rounded-2xl text-blue-500"><RefreshCcw size={20}/></button>
           </div>
           <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-gray-800/40 border border-gray-800 p-6 rounded-[2rem] flex flex-col gap-5">
                     <p className="font-black text-white truncate text-lg">{req.user_email}</p>
                     <div className="grid grid-cols-2 gap-4">
                        <button onClick={async () => { await supabase.from('join_requests').delete().eq('id', req.id); fetchPendingRequests(); }} className="py-4 bg-red-900/20 text-red-500 rounded-2xl font-black uppercase text-xs">বাতিল</button>
                        <button onClick={() => handleApprove(req)} className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs">অনুমোদন</button>
                     </div>
                  </div>
                ))}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title={T.totalBazar} value={`৳${stats.totalBazar.toLocaleString()}`} icon={Wallet} color="blue" />
        <SummaryCard title={T.totalMeals} value={stats.totalMeals.toFixed(1)} icon={Utensils} color="green" />
        <SummaryCard title={T.mealRate} value={`৳${stats.mealRate.toFixed(2)}`} icon={TrendingUp} color="purple" />
        <SummaryCard title={T.todayExpense} value={`৳${todayExpense.toLocaleString()}`} icon={Zap} color="yellow" />
      </div>

      <div className="bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl">
        <h3 className="text-2xl font-black flex items-center gap-4 text-white mb-10"><PieChartIcon size={28} className="text-blue-500" /> মিল গ্রাফ</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
              <XAxis dataKey="name" fontSize={11} stroke="#6b7280" />
              <YAxis fontSize={11} stroke="#6b7280" />
              <Tooltip cursor={{fill: '#1f2937'}} contentStyle={{backgroundColor: '#111827', borderRadius: '20px', border: '1px solid #374151', color: '#fff'}} />
              <Bar dataKey="meals" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
