
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
  Trash2,
  Shield
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
  messId: string | null;
  messAdminId: string | null;
  onViewChange: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ month, db, updateDB, user, messId, messAdminId, onViewChange }) => {
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
      "আপনি কি নিশ্চিতভাবে এই মেসটি ডিলিট করতে চান?\n\nসতর্কতা: মেস ডিলিট করলে এর সকল হিসাব, মেম্বার ডাটা এবং রেকর্ড চিরতরে মুছে যাবে। এটি আর ফিরে পাওয়া সম্ভব নয়।"
    );
    
    if (confirmDelete) {
      setLoadingRequests(true);
      try {
        const { error: reqError } = await supabase.from('join_requests').delete().eq('mess_id', messId);
        if (reqError) console.warn("Requests deletion error:", reqError);
        
        try {
          await supabase.from('invitations').delete().eq('mess_id', messId);
        } catch (e) {}

        const { error: messError } = await supabase.from('messes').delete().eq('id', messId);
        if (messError) {
          if (messError.message.includes("policy")) {
            throw new Error("আপনার ডাটাবেসে 'DELETE' পারমিশন সেট করা নেই। দয়া করে Supabase SQL Editor-এ পারমিশন কোডটি রান করুন।");
          }
          throw messError;
        }
        
        localStorage.removeItem('ACTIVE_MESS_ID');
        alert("মেসটি সফলভাবে ডিলিট করা হয়েছে।");
        window.location.reload();
      } catch (err: any) {
        console.error("Delete Fail:", err);
        alert("ডিলিট করা যায়নি: " + (err.message || "Unknown Database Error"));
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

  // বড় নামগুলোকে ২-৩ লাইনে ভাঙার জন্য কাস্টম টিক ফাংশন
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
      className={`bg-gray-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-800 group relative overflow-hidden transition-all hover:shadow-xl ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
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
                {loadingRequests ? <RefreshCcw className="animate-spin" size={14}/> : <Trash2 size={14}/>} মেস ডিলিট
              </button>
           )}
           {user.isAdmin && (
              <>
                 <button onClick={() => setShowQRModal(true)} className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest hover:bg-blue-600 transition-all"><QrCode size={14} className="sm:w-4 sm:h-4"/> QR</button>
                 <button onClick={() => { if(window.confirm(isMonthLocked ? "আনলক করতে চান?" : " ক্লোজ করতে চান?")) updateDB({ lockedMonths: isMonthLocked ? db.lockedMonths?.filter(m => m !== month) : [...(db.lockedMonths || []), month] }); }} className={`flex items-center gap-2 sm:gap-3 px-5 sm:px-6 py-2.5 sm:py-3.5 ${isMonthLocked ? 'bg-amber-600/10 text-amber-500 border-amber-500/20' : 'bg-red-600/10 text-red-500 border-red-500/20'} rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest transition-all`}>
                    {isMonthLocked ? <Unlock size={14}/> : <Lock size={14}/>} {isMonthLocked ? 'আনলক মাস' : 'মাস ক্লোজ'}
                 </button>
              </>
           )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <SummaryCard title="মোট বাজার" value={`৳${stats.totalBazar.toFixed(2)}`} icon={Wallet} color="blue" onClick={() => onViewChange('bazar')} />
        <SummaryCard title="মোট মিল" value={stats.totalMeals.toFixed(1)} icon={Utensils} color="green" onClick={() => onViewChange('meals')} />
        <SummaryCard title="মিল রেট" value={`৳${stats.mealRate.toFixed(2)}`} icon={TrendingUp} color="purple" />
        <SummaryCard title="আজকের খরচ" value={`৳${todayExpense.toFixed(2)}`} icon={Zap} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 bg-gray-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-800 shadow-2xl">
           <h3 className="text-lg font-black text-white flex items-center gap-3 mb-8">
             <PieChartIcon size={20} className="text-blue-500" />
             মিল পরিসংখ্যান
           </h3>
           <div className="h-64 sm:h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} barCategoryGap="15%">
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
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
                   contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', fontSize: '10px' }} 
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
                  <h3 className="text-base font-black text-white flex items-center gap-3">
                    <Inbox size={18} className="text-blue-500" />
                    আবেদন ({pendingRequests.length})
                  </h3>
               </div>
               <div className="space-y-4">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="bg-gray-900 p-4 rounded-2xl border border-gray-800 flex items-center justify-between">
                       <div className="min-w-0">
                          <p className="font-black text-white text-xs truncate">{req.user_name}</p>
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

          <div className="bg-gray-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-800 space-y-6">
             <h3 className="text-base font-black text-white flex items-center gap-3">
               <Shield size={18} className="text-purple-500" />
               মেস এক্সেস
             </h3>
             <div className="space-y-4">
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">মেস আইডি</p>
                   <div className="flex items-center justify-between bg-gray-800 p-3.5 rounded-xl border border-gray-700">
                      <code className="text-[10px] font-black text-blue-400 truncate pr-2">{messId}</code>
                      <button onClick={() => copyToClipboard(messId || '', 'মেস আইডি')} className="text-gray-500 hover:text-white transition-colors">
                         <Copy size={14} />
                      </button>
                   </div>
                </div>
                {user.isAdmin && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">মেস পাসওয়ার্ড</p>
                    <div className="flex items-center justify-between bg-gray-800 p-3.5 rounded-xl border border-gray-700">
                       <code className="text-lg font-black text-green-500 tracking-widest">{db.messPassword}</code>
                       <button onClick={() => copyToClipboard(db.messPassword || '', 'পাসওয়ার্ড')} className="text-gray-500 hover:text-white transition-colors">
                          <Copy size={14} />
                       </button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>

      {showQRModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] border border-gray-800 p-10 text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-black text-white">মেস QR কোড</h3>
               <button onClick={() => setShowQRModal(false)} className="text-gray-500 hover:text-white bg-gray-800 p-2 rounded-xl"><X size={20}/></button>
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl inline-block mx-auto">
               <img src={qrUrl} alt="Mess QR Code" className="w-48 h-48 sm:w-56 sm:h-56" />
            </div>
            <div className="space-y-2">
               <p className="text-[10px] text-gray-500 font-bold leading-relaxed">নতুন মেম্বার এই কিউআর কোড স্ক্যান করে সরাসরি মেসে যোগ দেওয়ার আবেদন পাঠাতে পারবে।</p>
            </div>
            <button onClick={() => setShowQRModal(false)} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black uppercase text-xs">বন্ধ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
