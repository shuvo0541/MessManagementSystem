
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
  User as UserIcon
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
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    if (!user.isAdmin || !messId) return;

    fetchPendingRequests();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'join_requests',
          filter: `mess_id=eq.${messId}`
        },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.isAdmin, messId]);

  const isMonthLocked = (db.lockedMonths || []).includes(month);

  const fetchPendingRequests = async () => {
    if (!messId) return;
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('join_requests')
        .select('*')
        .eq('mess_id', messId)
        .eq('status', 'pending');
      
      if (!error) {
        setPendingRequests(data || []);
      }
    } catch (err) {
      console.error("Fetch pending requests error:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApprove = async (req: any) => {
    setLoadingRequests(true);
    try {
      const currentMonth = getCurrentMonthStr(); 
      // রিকোয়েস্ট থেকে মেম্বারের প্রোফাইল নাম এবং ইউনিক আইডি সংগ্রহ (শুধুমাত্র বিদ্যমান কলাম)
      const actualName = req.user_name || "সদস্য";
      const uniqueUserId = req.user_username || ("@user" + req.user_id.slice(0, 5));
      
      const newUser: User = {
        id: req.user_id,
        name: actualName,
        username: req.user_username?.replace('@', '') || "user_" + req.user_id.slice(0, 5),
        userId: uniqueUserId,
        isAdmin: false,
        monthlyOff: [],
        joiningMonth: currentMonth, 
        leavingMonth: null
      };

      const updatedUsers = [...db.users];
      const existingIdx = updatedUsers.findIndex(u => u.id === req.user_id);
      
      if (existingIdx > -1) {
        updatedUsers[existingIdx] = newUser;
      } else {
        updatedUsers.push(newUser);
      }
      
      const { error: dbError } = await supabase
        .from('messes')
        .update({ db_json: { ...db, users: updatedUsers } })
        .eq('id', messId);

      if (dbError) throw dbError;

      await supabase.from('join_requests').delete().eq('id', req.id);

      updateDB({ users: updatedUsers });
      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
      alert(`${actualName} এখন আপনার মেসের সদস্য!`);
    } catch (err: any) {
      alert("অনুমোদন করা যায়নি: " + err.message);
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
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} কপি হয়েছে!`);
  };

  const qrData = `${messId}|${db.messPassword || ''}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

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
        <div>
           <h2 className="text-3xl font-black text-white">
             {user.isAdmin ? 'অ্যাডমিন প্যানেল' : `স্বাগতম, ${user.name}!`}
           </h2>
           <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">মেস ড্যাশবোর্ড ওভারভিউ</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
           {user.isAdmin && (
              <>
                 <button onClick={() => setShowQRModal(true)} className="flex items-center gap-2 px-5 py-3.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                    <QrCode size={16}/> QR কোড
                 </button>
                 <button onClick={() => {
                   const nextLocked = isMonthLocked ? db.lockedMonths?.filter(m => m !== month) : [...(db.lockedMonths || []), month];
                   if(window.confirm(isMonthLocked ? "আনলক করতে চান?" : "এই মাসের তথ্য ক্লোজ করতে চান?")) updateDB({ lockedMonths: nextLocked });
                 }} className={`flex items-center gap-3 px-6 py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all ${isMonthLocked ? 'bg-amber-600' : 'bg-red-600'} text-white shadow-xl`}>
                   {isMonthLocked ? <><Unlock size={18}/> আনলক</> : <><Lock size={18}/> মাস ক্লোজ</>}
                 </button>
              </>
           )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-900/20 to-gray-900 border border-blue-500/20 rounded-[2.5rem] p-6 md:p-8 shadow-2xl flex flex-col md:flex-row gap-6 items-center justify-between">
         <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-gray-950/50 p-5 rounded-2xl border border-gray-800 flex items-center justify-between group">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl">
                     <Hash size={20}/>
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">মেস আইডি</p>
                     <p className="text-sm font-black text-blue-400 select-all truncate max-w-[120px] sm:max-w-none">{messId}</p>
                  </div>
               </div>
               <button onClick={() => copyToClipboard(messId, 'মেস আইডি')} className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-all active:scale-90">
                  <Copy size={16}/>
               </button>
            </div>

            <div className="bg-gray-950/50 p-5 rounded-2xl border border-gray-800 flex items-center justify-between group">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-600/20 text-green-400 rounded-xl">
                     <Key size={20}/>
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">মেস পাসওয়ার্ড</p>
                     <p className="text-lg font-black text-green-400 tracking-widest">{db.messPassword || 'N/A'}</p>
                  </div>
               </div>
               {db.messPassword && (
                 <button onClick={() => copyToClipboard(db.messPassword!, 'পাসওয়ার্ড')} className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-all active:scale-90">
                    <Copy size={16}/>
                 </button>
               )}
            </div>
         </div>
      </div>

      {user.isAdmin && (
        <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in duration-500">
           <div className="p-8 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <UserCheck className="text-blue-500" size={24} />
                 <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">সদস্য আবেদন (Member Approval)</h3>
              </div>
              <button onClick={fetchPendingRequests} className="p-3 hover:bg-gray-800 rounded-2xl text-blue-500 transition-all active:rotate-180 duration-500 shadow-lg"><RefreshCcw size={20}/></button>
           </div>
           <div className="p-8">
                {pendingRequests.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pendingRequests.map(req => (
                      <div key={req.id} className="bg-gray-800/40 border border-gray-700/50 p-8 rounded-[2.5rem] space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                          <UserIcon size={120} />
                        </div>
                        <div className="space-y-4">
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">সদস্যের নাম</p>
                              <div className="flex items-center gap-2">
                                 <UserIcon size={16} className="text-blue-500" />
                                 <p className="font-black text-white text-xl truncate">{req.user_name || "অজানা সদস্য"}</p>
                              </div>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ইউনিক আইডি</p>
                              <div className="flex items-center gap-2">
                                 <AtSign size={16} className="text-purple-500" />
                                 <p className="text-sm font-black text-blue-400 tracking-wider">
                                    {req.user_username || "আইডি নেই"}
                                 </p>
                              </div>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <button onClick={async () => { if(window.confirm("আপনি কি আবেদনটি বাতিল করতে চান?")) { await supabase.from('join_requests').delete().eq('id', req.id); fetchPendingRequests(); } }} className="py-4 bg-red-900/20 text-red-500 rounded-2xl font-black uppercase text-xs hover:bg-red-600 hover:text-white transition-all border border-red-500/20">বাতিল</button>
                            <button onClick={() => handleApprove(req)} className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95">অনুমোদন</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-gray-500">
                       <Inbox size={32} />
                    </div>
                    <div>
                       <p className="text-gray-400 font-bold">বর্তমানে কোনো আবেদন নেই</p>
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">No pending requests</p>
                    </div>
                  </div>
                )}
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

      {showQRModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
           <div className="bg-gray-900 w-full max-w-sm rounded-[4rem] border border-gray-800 p-10 text-center space-y-8 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black text-white uppercase tracking-widest">মেস QR কোড</h3>
                 <button onClick={() => setShowQRModal(false)} className="p-2 bg-gray-800 rounded-xl text-gray-500 hover:text-white"><X size={20}/></button>
              </div>
              <div className="bg-white p-6 rounded-[3rem] shadow-2xl mx-auto w-fit">
                 <img src={qrUrl} alt="Mess QR" className="w-56 h-56" />
              </div>
              <div className="space-y-2">
                 <p className="text-xs font-bold text-gray-400 leading-relaxed">নতুন মেম্বারদের এই কিউআর কোডটি স্ক্যান করতে বলুন। এটি সরাসরি তাদের মেস আইডি ও পাসওয়ার্ড বসিয়ে দেবে।</p>
              </div>
              <button onClick={() => window.print()} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">প্রিন্ট কোড</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
