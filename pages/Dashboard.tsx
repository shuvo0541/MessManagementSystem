
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
  RefreshCcw,
  Key,
  Hash,
  Copy,
  QrCode,
  X,
  UserCheck,
  Inbox,
  AtSign,
  User as UserIcon,
  Trash2
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
  messAdminId: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ month, db, updateDB, user, messId, messAdminId }) => {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

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
      const actualName = req.user_name || "সদস্য";
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
      alert(`${actualName} এখন মেম্বার!`);
    } catch (err: any) {
      alert("অনুমোদন করা যায়নি: " + err.message);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleDeleteMess = async () => {
    const confirmDelete = window.confirm(
      "আপনি কি নিশ্চিতভাবে এই মেসটি ডিলিট করতে চান?\n\nসতর্কতা: মেস ডিলিট করলে এর সকল হিসাব, মেম্বার ডাটা এবং রেকর্ড চিরতরে মুছে যাবে। এই কাজটি আর ফিরিয়ে আনা সম্ভব নয়।"
    );
    
    if (confirmDelete) {
      setLoadingRequests(true);
      try {
        // মেস ডিলিট করার আগে সংশ্লিষ্ট সকল জয়েন রিকোয়েস্ট মুছে ফেলা প্রয়োজন 
        // যাতে Foreign Key Constraint এর কারণে ডিলিট ফেইল না করে
        await supabase.from('join_requests').delete().eq('mess_id', messId);
        
        // মেস টেবিল থেকে মেসটি মুছে ফেলা
        const { error } = await supabase.from('messes').delete().eq('id', messId);
        if (error) throw error;
        
        localStorage.removeItem('ACTIVE_MESS_ID');
        alert("মেসটি সফলভাবে মুছে ফেলা হয়েছে।");
        
        // অ্যাপ রিস্টার্ট করে প্রোফাইল ভিউতে নিয়ে যাওয়া
        window.location.href = window.location.origin;
      } catch (err: any) {
        alert("মেস ডিলিট করতে সমস্যা হয়েছে: " + err.message);
      } finally {
        setLoadingRequests(false);
      }
    }
  };

  const stats = useMemo(() => getCalculations(db, month), [db, month]);
  const todayExpense = useMemo(() => {
    const today = getLocalDateStr();
    return db.bazars.filter(b => b.date === today).reduce((sum, b) => sum + b.amount, 0);
  }, [db.bazars]);

  const chartData = useMemo(() => stats.userStats.map((u: any) => ({ name: u.name, meals: u.totalMeals })), [stats.userStats]);
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} কপি হয়েছে!`);
  };

  const qrData = `${messId}|${db.messPassword || ''}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

  const SummaryCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-gray-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-800 group relative overflow-hidden transition-all hover:shadow-xl">
      <div className={`absolute -right-2 -bottom-2 opacity-[0.05] group-hover:opacity-10 transition-opacity transform scale-150 text-${color}-500`}>
        <Icon size={80} />
      </div>
      <div className="flex items-center gap-3 sm:gap-5">
        <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-${color}-900/20 text-${color}-400 shrink-0 border border-${color}-500/10`}>
          <Icon size={20} className="sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0">
          <h3 className="text-gray-500 text-[8px] sm:text-[10px] uppercase font-black tracking-widest truncate mb-0.5">{title}</h3>
          <p className="text-base sm:text-xl font-black truncate text-white">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-10 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-2xl sm:text-3xl font-black text-white">{user.isAdmin ? 'অ্যাডমিন প্যানেল' : `স্বাগতম, ${user.name}!`}</h2>
           <p className="text-gray-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">মেস ড্যাশবোর্ড ওভারভিউ</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
           {user.id === messAdminId && (
              <button 
                onClick={handleDeleteMess}
                disabled={loadingRequests}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3.5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
              >
                <Trash2 size={14} className="sm:w-4 sm:h-4"/> মেস ডিলিট
              </button>
           )}
           {user.isAdmin && (
              <>
                 <button onClick={() => setShowQRModal(true)} className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest hover:bg-blue-600 transition-all"><QrCode size={14} className="sm:w-4 sm:h-4"/> QR</button>
                 <button onClick={() => { if(window.confirm(isMonthLocked ? "আনলক করতে চান?" : " ক্লোজ করতে চান?")) updateDB({ lockedMonths: isMonthLocked ? db.lockedMonths?.filter(m => m !== month) : [...(db.lockedMonths || []), month] }); }} className={`flex items-center gap-2 sm:gap-3 px-5 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] font-black uppercase text-[10px] sm:text-xs tracking-widest transition-all ${isMonthLocked ? 'bg-amber-600' : 'bg-red-600'} text-white shadow-xl`}>
                   {isMonthLocked ? <><Unlock size={16}/> আনলক</> : <><Lock size={16}/> ক্লোজ</>}
                 </button>
              </>
           )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-900/20 to-gray-900 border border-blue-500/20 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl flex flex-col md:flex-row gap-6 items-center">
         <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-gray-950/50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-800 flex items-center justify-between">
               <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-blue-600/20 text-blue-400 rounded-lg sm:rounded-xl"><Hash size={18}/></div>
                  <div className="min-w-0">
                     <p className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">মেস আইডি</p>
                     <p className="text-xs sm:text-sm font-black text-blue-400 truncate max-w-[140px]">{messId}</p>
                  </div>
               </div>
               <button onClick={() => copyToClipboard(messId, 'মেস আইডি')} className="p-2 text-gray-500 hover:text-white shrink-0"><Copy size={14}/></button>
            </div>
            <div className="bg-gray-950/50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-800 flex items-center justify-between">
               <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-green-600/20 text-green-400 rounded-lg sm:rounded-xl"><Key size={18}/></div>
                  <div className="min-w-0">
                     <p className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">পাসওয়ার্ড</p>
                     <p className="text-base sm:text-lg font-black text-green-400 tracking-widest">{db.messPassword || 'N/A'}</p>
                  </div>
               </div>
               <button onClick={() => copyToClipboard(db.messPassword || '', 'পাসওয়ার্ড')} className="p-2 text-gray-500 hover:text-white shrink-0"><Copy size={14}/></button>
            </div>
         </div>
      </div>

      {user.isAdmin && pendingRequests.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in duration-500">
           <div className="p-6 sm:p-8 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <UserCheck className="text-blue-500 shrink-0" size={20} />
                 <h3 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight">সদস্য আবেদন</h3>
              </div>
              <button onClick={fetchPendingRequests} className="p-2 hover:bg-gray-800 rounded-xl text-blue-500 transition-all"><RefreshCcw size={18}/></button>
           </div>
           <div className="p-4 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="bg-gray-800/40 border border-gray-700/50 p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] space-y-4 sm:space-y-6 relative group">
                      <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-5 group-hover:opacity-10 transition-opacity"><UserIcon size={100} /></div>
                      <div className="space-y-3 sm:space-y-4 relative z-10">
                         <div className="space-y-0.5">
                            <p className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">সদস্যের নাম</p>
                            <div className="flex items-center gap-2">
                               <UserIcon size={14} className="text-blue-500" />
                               <p className="font-black text-white text-lg truncate">{req.user_name || "সদস্য"}</p>
                            </div>
                         </div>
                         <div className="space-y-0.5">
                            <p className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">আইডি</p>
                            <div className="flex items-center gap-2">
                               <AtSign size={14} className="text-purple-500" />
                               <p className="text-xs font-black text-blue-400 tracking-wider truncate">{req.user_username || "@user"}</p>
                            </div>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 relative z-10">
                          <button onClick={async () => { if(window.confirm("বাতিল করতে চান?")) { await supabase.from('join_requests').delete().eq('id', req.id); fetchPendingRequests(); } }} className="py-3 sm:py-4 bg-red-900/20 text-red-500 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] hover:bg-red-600 hover:text-white transition-all border border-red-500/20">বাতিল</button>
                          <button onClick={() => handleApprove(req)} className="py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black uppercase text-[10px] hover:bg-blue-700 shadow-xl transition-all">অনুমোদন</button>
                      </div>
                    </div>
                  ))}
                </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <SummaryCard title={T.totalBazar} value={`৳${stats.totalBazar.toFixed(2)}`} icon={Wallet} color="blue" />
        <SummaryCard title={T.totalMeals} value={stats.totalMeals.toFixed(1)} icon={Utensils} color="green" />
        <SummaryCard title={T.mealRate} value={`৳${stats.mealRate.toFixed(2)}`} icon={TrendingUp} color="purple" />
        <SummaryCard title={T.todayExpense} value={`৳${todayExpense.toFixed(2)}`} icon={Zap} color="yellow" />
      </div>

      <div className="bg-gray-900 p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] border border-gray-800 shadow-2xl">
        <h3 className="text-lg sm:text-2xl font-black flex items-center gap-3 sm:gap-4 text-white mb-6 sm:mb-10"><PieChartIcon size={24} className="text-blue-500" /> মিল গ্রাফ</h3>
        <div className="h-60 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" /><XAxis dataKey="name" fontSize={10} stroke="#6b7280" /><YAxis fontSize={10} stroke="#6b7280" /><Tooltip cursor={{fill: '#1f2937'}} contentStyle={{backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', fontSize: '10px'}} /><Bar dataKey="meals" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={20} /></BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showQRModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
           <div className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] sm:rounded-[4rem] border border-gray-800 p-8 sm:p-10 text-center space-y-6 sm:space-y-8 animate-in zoom-in-95">
              <div className="flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase tracking-widest">মেস QR কোড</h3><button onClick={() => setShowQRModal(false)} className="p-2 bg-gray-800 rounded-xl text-gray-500"><X size={18}/></button></div>
              <div className="bg-white p-4 sm:p-6 rounded-[2rem] sm:rounded-[3rem] shadow-2xl mx-auto w-fit"><img src={qrUrl} alt="Mess QR" className="w-48 h-48 sm:w-56 sm:h-56" /></div>
              <button onClick={() => window.print()} className="w-full py-4 sm:py-5 bg-blue-600 text-white rounded-2xl sm:rounded-3xl font-black uppercase text-[10px] sm:text-xs">প্রিন্ট কোড</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
