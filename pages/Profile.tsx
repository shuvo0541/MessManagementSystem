
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User, MessSystemDB } from '../types';
import { INITIAL_DB } from '../db';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  PlusCircle, 
  UserPlus, 
  UtensilsCrossed, 
  ChevronRight, 
  Bell, 
  Check, 
  X, 
  LogOut, 
  Loader2, 
  CheckCircle2, 
  LayoutGrid,
  AtSign,
  Building,
  RefreshCcw,
  UserCheck,
  Send,
  CalendarDays,
  CalendarX,
  Hash,
  ArrowRight
} from 'lucide-react';

interface ProfileProps {
  user: User;
  authEmail: string;
  userMesses: any[];
  onSelectMess: (mess: any) => void;
  onLogout: () => void;
  onPending: () => void;
}

const Profile: React.FC<ProfileProps> = ({ 
  user, 
  authEmail, 
  userMesses, 
  onSelectMess, 
  onLogout, 
  onPending 
}) => {
  const [view, setView] = useState<'info' | 'create' | 'join' | 'success'>('info');
  const [messName, setMessName] = useState('');
  const [messCode, setMessCode] = useState('');
  const [messPasswordInput, setMessPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdInfo, setCreatedInfo] = useState<{id: string, pass: string} | null>(null);
  const [invitations, setInvitations] = useState<any[]>([]);

  useEffect(() => {
    fetchInvitations();
    const interval = setInterval(fetchInvitations, 30000);
    return () => clearInterval(interval);
  }, [authEmail]);

  const fetchInvitations = async () => {
    try {
      const { data, error: invError } = await supabase
        .from('invitations')
        .select('*')
        .eq('invitee_email', authEmail.toLowerCase())
        .eq('status', 'pending');
      
      if (!invError && data) {
        setInvitations(data);
      }
    } catch (err) {
      console.error("Invitations fetch error:", err);
    }
  };

  const handleAcceptInvite = async (invite: any) => {
    setLoading(true);
    try {
      const { data: mess, error: fetchErr } = await supabase
        .from('messes')
        .select('id, db_json')
        .eq('id', invite.mess_id)
        .single();

      if (fetchErr || !mess) throw new Error("মেসটি খুঁজে পাওয়া যায়নি।");

      const db = mess.db_json as MessSystemDB;
      
      const newUser: User = {
        id: user.id,
        name: user.name,
        username: user.username,
        isAdmin: false,
        monthlyOff: []
      };

      if (!db.users.some(u => u.id === user.id)) {
        db.users.push(newUser);
        const { error: updateErr } = await supabase
          .from('messes')
          .update({ db_json: db })
          .eq('id', mess.id);
        
        if (updateErr) throw updateErr;
      }

      await supabase.from('invitations').delete().eq('id', invite.id);

      alert(`${invite.mess_name} মেসে আপনাকে স্বাগতম!`);
      window.location.reload(); 
    } catch (err: any) {
      alert("আমন্ত্রণ গ্রহণ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই আমন্ত্রণটি বাতিল করতে চান?")) return;
    try {
      await supabase.from('invitations').delete().eq('id', inviteId);
      setInvitations(prev => prev.filter(i => i.id !== inviteId));
    } catch (err) {
      alert("বাতিল করা যায়নি।");
    }
  };

  const handleCreateMess = async () => {
    if (!messName.trim()) return;
    setLoading(true);
    setError('');
    const messPass = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const newDB: MessSystemDB = {
        ...INITIAL_DB,
        users: [user],
        messPassword: messPass
      };

      const { data, error: insertError } = await supabase
        .from('messes')
        .insert([{ 
          admin_id: user.id, 
          mess_name: messName, 
          db_json: newDB
        }])
        .select();

      if (insertError) throw insertError;
      
      setCreatedInfo({ id: data[0].id, pass: messPass });
      setView('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMess = async () => {
    if (!messCode.trim() || !messPasswordInput.trim()) {
      setError('মেস আইডি এবং পাসওয়ার্ড উভয়ই প্রদান করুন।');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { data: mess, error: fetchError } = await supabase
        .from('messes')
        .select('id, db_json')
        .eq('id', messCode.trim())
        .single();

      if (fetchError || !mess) throw new Error('সঠিক মেস আইডি প্রদান করুন।');
      const currentDB = mess.db_json as MessSystemDB;
      
      if (currentDB.messPassword && currentDB.messPassword !== messPasswordInput.trim()) {
        throw new Error('ভুল মেস পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিয়ে চেষ্টা করুন।');
      }

      if (currentDB.users.some(u => u.id === user.id)) {
        onSelectMess(mess);
        return;
      }

      const { error: reqError } = await supabase
        .from('join_requests')
        .insert([{
          mess_id: mess.id,
          user_id: user.id,
          user_email: authEmail,
          status: 'pending'
        }]);

      if (reqError) {
        if (reqError.code === '23505') throw new Error('আপনার একটি রিকোয়েস্ট ইতিমধ্যে পেন্ডিং আছে।');
        throw reqError;
      }

      onPending();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row gap-10 items-start">
        <div className="shrink-0">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-blue-600 rounded-[3rem] flex items-center justify-center text-white shadow-2xl text-5xl font-black border-4 border-gray-900">
            {user.name[0]}
          </div>
        </div>
        <div className="space-y-4 pt-4 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-4xl font-black text-white truncate">{user.name}</h1>
            <span className="px-3 py-1 bg-blue-900/40 text-blue-400 text-xs font-black uppercase tracking-widest rounded-full border border-blue-500/20">ইউজার প্রোফাইল</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="flex items-center gap-3 text-gray-400 font-bold bg-gray-900/50 px-5 py-3 rounded-2xl border border-gray-800 truncate">
              <Mail size={18} className="text-blue-500 shrink-0" />
              <span className="truncate">{authEmail}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 font-bold bg-gray-900/50 px-5 py-3 rounded-2xl border border-gray-800">
              <AtSign size={18} className="text-purple-500 shrink-0" />
              @{user.username}
            </div>
          </div>
        </div>
      </div>

      {/* Invitations Section */}
      {invitations.length > 0 && (
        <div className="bg-amber-600/5 border border-amber-500/20 p-8 rounded-[3rem] space-y-6 animate-in slide-in-from-top-6 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-white flex items-center gap-3">
              <Bell className="text-amber-500 animate-bounce" />
              আপনার জন্য নতুন আমন্ত্রণ
            </h3>
            <button onClick={fetchInvitations} className="p-2 hover:bg-amber-500/10 rounded-xl text-amber-500"><RefreshCcw size={20}/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {invitations.map(inv => (
              <div key={inv.id} className="bg-gray-900 border border-gray-800 p-6 rounded-3xl flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center text-white font-black text-xl">
                    {inv.mess_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-white">{inv.mess_name}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">প্রেরক: {inv.inviter_name}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleDeclineInvite(inv.id)} className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:text-red-500">Decline</button>
                  <button onClick={() => handleAcceptInvite(inv)} className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Accept</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Mess Management Area */}
      {view === 'info' && (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <h3 className="text-2xl font-black text-white flex items-center gap-3">
              <Building className="text-blue-500" />
              আপনার মেসসমূহ
            </h3>
            <div className="flex gap-4 w-full md:w-auto">
              <button onClick={() => setView('join')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-900 border border-gray-800 text-gray-300 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-800">
                <UserPlus size={16}/> মেসে যোগ দিন
              </button>
              <button onClick={() => setView('create')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95">
                <PlusCircle size={16}/> নতুন মেস তৈরি
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {userMesses.map(mess => (
              <button 
                key={mess.id}
                onClick={() => onSelectMess(mess)}
                className="group bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 hover:border-blue-500/50 hover:shadow-2xl transition-all text-left space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Shield size={80} />
                </div>
                <div className="w-16 h-16 bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center font-black text-2xl group-hover:scale-110 transition-transform">
                  {mess.mess_name[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors truncate">{mess.mess_name}</h4>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                    <Hash size={12}/> ID: {mess.id.slice(0, 12)}...
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2">
                   <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${mess.admin_id === user.id ? 'bg-purple-900/30 text-purple-400 border border-purple-500/20' : 'bg-blue-900/30 text-blue-400 border border-blue-500/20'}`}>
                      {mess.admin_id === user.id ? 'Admin' : 'Member'}
                   </span>
                   <div className="text-blue-500 group-hover:translate-x-2 transition-transform">
                      <ArrowRight size={20} />
                   </div>
                </div>
              </button>
            ))}
          </div>

          {userMesses.length === 0 && (
            <div className="py-20 text-center bg-gray-900/50 rounded-[3rem] border border-dashed border-gray-800">
               <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-600">
                  <LayoutGrid size={40} />
               </div>
               <h4 className="text-xl font-black text-gray-400">কোনো মেস পাওয়া যায়নি</h4>
               <p className="text-gray-600 text-sm mt-2">নতুন মেস তৈরি করুন অথবা অন্য কোনো মেসে যোগ দিন।</p>
            </div>
          )}
        </div>
      )}

      {/* Create Mess View */}
      {view === 'create' && (
        <div className="max-w-md mx-auto bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
             <button onClick={() => setView('info')} className="p-3 bg-gray-800 rounded-2xl text-gray-400 hover:text-white transition-colors"><ChevronRight className="rotate-180"/></button>
             <div>
                <h3 className="text-2xl font-black text-white">নতুন মেস তৈরি</h3>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">মাস্টার অ্যাকাউন্ট সেটআপ</p>
             </div>
          </div>
          {error && <p className="text-red-500 text-xs font-bold bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error}</p>}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">মেসের নাম</label>
              <input 
                type="text" autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                placeholder="যেমন: আরিয়ান মেস"
                value={messName}
                onChange={e => setMessName(e.target.value)}
              />
            </div>
            <button 
              onClick={handleCreateMess} disabled={loading || !messName}
              className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              {loading && <Loader2 size={18} className="animate-spin"/>}
              মেস তৈরি করুন
            </button>
          </div>
        </div>
      )}

      {/* Join Mess View */}
      {view === 'join' && (
        <div className="max-w-md mx-auto bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
             <button onClick={() => setView('info')} className="p-3 bg-gray-800 rounded-2xl text-gray-400 hover:text-white transition-colors"><ChevronRight className="rotate-180"/></button>
             <div>
                <h3 className="text-2xl font-black text-white">মেসে যোগ দিন</h3>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">মেস আইডি ও পাসওয়ার্ড দিন</p>
             </div>
          </div>
          {error && <p className="text-red-500 text-xs font-bold bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error}</p>}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">মেস আইডি</label>
              <input 
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-green-600 transition-all"
                placeholder="মেস আইডি পেস্ট করুন"
                value={messCode}
                onChange={e => setMessCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">মেস পাসওয়ার্ড</label>
              <input 
                type="password"
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-green-600 transition-all"
                placeholder="******"
                value={messPasswordInput}
                onChange={e => setMessPasswordInput(e.target.value)}
              />
            </div>
            <button 
              onClick={handleJoinMess} disabled={loading || !messCode || !messPasswordInput}
              className="w-full py-5 bg-green-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-lg shadow-green-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              {loading && <Loader2 size={18} className="animate-spin"/>}
              অনুরোধ পাঠান
            </button>
          </div>
        </div>
      )}

      {/* Success View */}
      {view === 'success' && createdInfo && (
        <div className="max-w-lg mx-auto bg-gray-900 p-12 rounded-[4rem] border border-blue-500/30 shadow-2xl space-y-10 text-center animate-in zoom-in-95 duration-500">
           <div className="flex justify-center">
              <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-500/30">
                 <CheckCircle2 size={48}/>
              </div>
           </div>
           <div className="space-y-3">
              <h3 className="text-3xl font-black text-white">সফল হয়েছে!</h3>
              <p className="text-gray-400 font-bold max-w-xs mx-auto">নিচের আইডি ও পাসওয়ার্ডটি কপি করে সদস্যদের পাঠিয়ে দিন।</p>
           </div>
           
           <div className="space-y-4">
              <div className="p-8 bg-gray-800/50 rounded-[2.5rem] border border-gray-700/50 space-y-6">
                 <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">মেস আইডি</p>
                    <div className="flex items-center justify-between bg-black/20 p-4 rounded-2xl border border-gray-700">
                       <code className="text-blue-400 font-black text-xs truncate mr-2">{createdInfo.id}</code>
                       <button onClick={() => {navigator.clipboard.writeText(createdInfo.id); alert('কপি হয়েছে!')}} className="text-gray-500 hover:text-white"><Check size={16}/></button>
                    </div>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">মেস পাসওয়ার্ড</p>
                    <div className="flex items-center justify-between bg-black/20 p-4 rounded-2xl border border-gray-700">
                       <code className="text-green-500 font-black text-2xl tracking-[0.2em]">{createdInfo.pass}</code>
                       <button onClick={() => {navigator.clipboard.writeText(createdInfo.pass); alert('কপি হয়েছে!')}} className="text-gray-500 hover:text-white"><Check size={16}/></button>
                    </div>
                 </div>
              </div>
           </div>

           <button 
              onClick={() => window.location.reload()} 
              className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
           >
              ড্যাশবোর্ডে প্রবেশ করুন
           </button>
        </div>
      )}

      {/* Profile Logout */}
      <div className="pt-10 border-t border-gray-900 flex justify-center gap-10">
        <button onClick={onLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-all">
          <LogOut size={14}/> লগআউট করুন
        </button>
      </div>
    </div>
  );
};

export default Profile;
