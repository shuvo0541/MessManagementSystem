
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User, MessSystemDB } from '../types';
import { INITIAL_DB, getCurrentMonthStr } from '../db';
import { 
  PlusCircle, 
  UserPlus, 
  LogOut, 
  Loader2, 
  UtensilsCrossed, 
  ChevronRight, 
  Shield, 
  Bell, 
  Check, 
  X,
  Hash,
  Mail,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Clock,
  SendHorizontal
} from 'lucide-react';

interface MessSelectorProps {
  userId: string;
  userEmail: string;
  userName: string;
  userUsername: string;
  existingMesses: any[];
  onSelectMess: (mess: any) => void;
  onSuccess: (db: MessSystemDB, messId: string, user: User) => void;
  onLogout: () => void;
  onPending: () => void;
}

const MessSelector: React.FC<MessSelectorProps> = ({ 
  userId, 
  userEmail, 
  userName, 
  userUsername, 
  existingMesses,
  onSelectMess,
  onSuccess, 
  onLogout, 
  onPending 
}) => {
  const [view, setView] = useState<'selection' | 'create' | 'join' | 'success'>('selection');
  const [messName, setMessName] = useState('');
  const [messCode, setMessCode] = useState('');
  const [messPasswordInput, setMessPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdInfo, setCreatedInfo] = useState<{id: string, pass: string} | null>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchInvitations();
    fetchSentRequests();
  }, [userEmail, userId]);

  const fetchInvitations = async () => {
    try {
      const { data, error: invError } = await supabase
        .from('invitations')
        .select('*')
        .eq('invitee_email', userEmail.toLowerCase())
        .eq('status', 'pending');
      
      if (!invError && data) {
        setInvitations(data);
      }
    } catch (err) {
      console.error("Invitations check error:", err);
    }
  };

  const fetchSentRequests = async () => {
    try {
      const { data, error: reqError } = await supabase
        .from('join_requests')
        .select(`
          *,
          messes (
            mess_name
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'pending');
      
      if (!reqError && data) {
        setSentRequests(data);
      }
    } catch (err) {
      console.error("Sent requests fetch error:", err);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if(!window.confirm("আপনি কি আবেদনটি তুলে নিতে চান?")) return;
    try {
      await supabase.from('join_requests').delete().eq('id', requestId);
      setSentRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      alert("বাতিল করা যায়নি।");
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

      if (fetchErr || !mess) throw new Error("মেস খুঁজে পাওয়া যায়নি।");

      const db = mess.db_json as MessSystemDB;
      
      // শুধুমাত্র অরিজিনাল নাম ব্যবহার করা হচ্ছে
      const newUser: User = {
        id: userId,
        name: userName || "সদস্য",
        username: userUsername || ("user_" + userId.slice(0, 5)),
        isAdmin: false,
        monthlyOff: [],
        joiningMonth: getCurrentMonthStr(),
        leavingMonth: null
      };

      if (!db.users.some(u => u.id === userId)) {
        db.users.push(newUser);
        const { error: updateErr } = await supabase
          .from('messes')
          .update({ db_json: db })
          .eq('id', mess.id);
        
        if (updateErr) throw updateErr;
      }

      await supabase.from('invitations').delete().eq('id', invite.id);

      window.location.reload(); 
    } catch (err: any) {
      alert("আমন্ত্রণ গ্রহণ করা যায়নি: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await supabase.from('invitations').delete().eq('id', inviteId);
      setInvitations(prev => prev.filter(i => i.id !== inviteId));
    } catch (err) {
      console.error(err);
    }
  };

  const getSafeDisplayName = () => {
    const rawName = (userName || '').toString();
    if (rawName && rawName !== 'undefined' && rawName.trim() !== '') {
      return rawName;
    }
    return 'সদস্য';
  };

  const displaySafeName = getSafeDisplayName();
  const generatePass = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleCreateMess = async () => {
    if (!messName.trim()) return;
    setLoading(true);
    setError('');
    const messPass = generatePass();

    try {
      const newUser: User = {
        id: userId,
        name: displaySafeName,
        username: userUsername || ("user_" + userId.slice(0, 5)),
        isAdmin: true,
        monthlyOff: [],
        joiningMonth: getCurrentMonthStr(),
        leavingMonth: null
      };

      const newDB: MessSystemDB = {
        ...INITIAL_DB,
        users: [newUser],
        messPassword: messPass
      };

      const { data, error: insertError } = await supabase
        .from('messes')
        .insert([{ 
          admin_id: userId, 
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
    const cleanId = messCode.trim();
    const cleanPass = messPasswordInput.trim();

    if (!cleanId || !cleanPass) {
      setError('মেস আইডি এবং পাসওয়ার্ড উভয়ই প্রদান করুন।');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { data: mess, error: fetchError } = await supabase
        .from('messes')
        .select('id, db_json')
        .eq('id', cleanId)
        .maybeSingle();

      if (fetchError || !mess) {
        throw new Error('সঠিক মেস আইডি প্রদান করুন। আইডিটি কপি-পেস্ট করুন।');
      }

      const currentDB = mess.db_json as MessSystemDB;
      
      if (currentDB.messPassword && currentDB.messPassword !== cleanPass) {
        throw new Error('ভুল মেস পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিয়ে চেষ্টা করুন।');
      }

      if (currentDB.users.some(u => u.id === userId)) {
        onSuccess(currentDB, mess.id, currentDB.users.find(u => u.id === userId)!);
        return;
      }

      // display_name এবং user_name কলামে আসল নাম পাঠানো হচ্ছে
      const { error: reqError } = await supabase
        .from('join_requests')
        .insert([{
          mess_id: mess.id,
          user_id: userId,
          user_email: userEmail,
          user_name: userName || "সদস্য", 
          display_name: userName || "সদস্য",
          user_username: userUsername || userId.slice(0, 5), 
          status: 'pending'
        }]);

      if (reqError) {
        if (reqError.code === '23505') throw new Error('আপনার একটি রিকোয়েস্ট ইতিমধ্যে পেন্ডিং আছে।');
        throw new Error('রিকোয়েস্ট পাঠানো যায়নি। ডাটাবেস এরর চেক করুন।');
      }

      await fetchSentRequests();
      alert('আপনার আবেদনটি মেস অ্যাডমিনের কাছে পাঠানো হয়েছে।');
      onPending();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 pb-20">
      <div className="max-w-5xl w-full space-y-12 animate-in fade-in zoom-in duration-500">
        
        {view === 'selection' && (
          <div className="space-y-10">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center p-5 bg-blue-600 text-white rounded-[2.5rem] shadow-2xl shadow-blue-500/20 mb-2">
                <UtensilsCrossed size={48} />
              </div>
              <h2 className="text-4xl font-black text-white">আমার মেসসমূহ</h2>
              <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">স্বাগতম, {displaySafeName}!</p>
            </div>

            {(invitations.length > 0 || sentRequests.length > 0) && (
              <div className="space-y-10">
                 {invitations.length > 0 && (
                   <div className="space-y-6">
                      <div className="flex items-center gap-3 px-4">
                         <Bell className="text-amber-500 animate-bounce" size={20}/>
                         <h3 className="text-lg font-black text-white uppercase tracking-wider">আমন্ত্রণ ({invitations.length})</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {invitations.map(inv => (
                           <div key={inv.id} className="bg-gray-900 border border-amber-500/30 p-8 rounded-[2.5rem] flex flex-col gap-6 shadow-2xl shadow-amber-500/5 hover:border-amber-500 transition-all group relative overflow-hidden">
                              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <UserCheck size={100} />
                              </div>
                              <div className="flex items-center gap-5">
                                 <div className="w-14 h-14 bg-amber-600 text-white rounded-[1.25rem] flex items-center justify-center font-black text-2xl shadow-lg group-hover:scale-105 transition-transform">
                                    {inv.mess_name?.[0]?.toUpperCase() || 'M'}
                                 </div>
                                 <div className="min-w-0 flex-1">
                                    <p className="font-black text-white truncate text-lg">{inv.mess_name || 'নতুন মেস'}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">প্রেরক: <span className="text-amber-400">{inv.inviter_name || "অজানা অ্যাডমিন"}</span></p>
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 relative z-10">
                                 <button onClick={() => handleDeclineInvite(inv.id)} className="py-4 bg-gray-800 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-900/20 hover:text-red-500 transition-all flex items-center justify-center gap-2">
                                    <X size={14}/> Decline
                                 </button>
                                 <button disabled={loading} onClick={() => handleAcceptInvite(inv)} className="py-4 bg-amber-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-700 shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                                    {loading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Accept Invite
                                 </button>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}

                 {sentRequests.length > 0 && (
                   <div className="space-y-6">
                      <div className="flex items-center gap-3 px-4">
                         <SendHorizontal className="text-blue-500" size={20}/>
                         <h3 className="text-lg font-black text-white uppercase tracking-wider">পাঠানো আবেদন (Sent Requests)</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {sentRequests.map(req => (
                           <div key={req.id} className="bg-gray-900 border border-blue-500/20 p-8 rounded-[2.5rem] flex flex-col gap-6 shadow-xl relative overflow-hidden group">
                              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Clock size={100} />
                              </div>
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-900/30 text-blue-400 rounded-2xl flex items-center justify-center font-black text-xl">
                                       {req.messes?.mess_name?.[0]?.toUpperCase() || 'M'}
                                    </div>
                                    <div>
                                       <p className="font-black text-white truncate">{req.messes?.mess_name || 'মেস আইডি: ' + req.mess_id.slice(0,8)}</p>
                                       <div className="flex items-center gap-2 mt-1">
                                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                          <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Waiting for Approval</span>
                                       </div>
                                    </div>
                                 </div>
                                 <button onClick={() => handleCancelRequest(req.id)} className="p-3 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all" title="বাতিল করুন">
                                    <X size={18} />
                                 </button>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-6">
              {existingMesses.map(mess => (
                <button 
                  key={mess.id}
                  onClick={() => onSelectMess(mess)}
                  className="group w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.33%-1.5rem)] max-w-[320px] bg-gray-900 p-6 rounded-[2.5rem] border border-gray-800 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all text-left space-y-4 relative overflow-hidden shrink-0"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Shield size={60} />
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-blue-500 font-black text-xl">
                      {mess.mess_name[0].toUpperCase()}
                    </div>
                    {mess.admin_id === userId ? (
                      <span className="px-2 py-0.5 bg-purple-900/40 text-purple-400 text-[9px] rounded-full border border-purple-500/20 font-black uppercase">Admin</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-blue-900/40 text-blue-400 text-[9px] rounded-full border border-blue-500/20 font-black uppercase">Member</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors line-clamp-1">{mess.mess_name}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">ID: {mess.id.slice(0, 8)}...</p>
                  </div>
                  <div className="pt-2 flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-widest">
                    প্রবেশ করুন <ChevronRight size={14} />
                  </div>
                </button>
              ))}

              <button onClick={() => setView('create')} className="group w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.33%-1.5rem)] max-w-[320px] bg-blue-600/5 p-8 rounded-[2.5rem] border border-blue-500/20 hover:bg-blue-600 hover:border-blue-600 transition-all text-left space-y-4 shadow-xl shrink-0">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:bg-white group-hover:text-blue-600 transition-colors">
                  <PlusCircle size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white group-hover:text-white transition-colors">নতুন মেস তৈরি</h3>
                  <p className="text-blue-400/60 group-hover:text-blue-100 text-xs mt-1 font-bold">অ্যাডমিন হিসেবে মেস শুরু করুন।</p>
                </div>
              </button>

              <button onClick={() => setView('join')} className="group w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.33%-1.5rem)] max-w-[320px] bg-green-600/5 p-8 rounded-[2.5rem] border border-green-500/20 hover:bg-green-600 hover:border-green-600 transition-all text-left space-y-4 shadow-xl shrink-0">
                <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:bg-white group-hover:text-green-600 transition-colors">
                  <UserPlus size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white group-hover:text-white transition-colors">মেসে যোগ দিন</h3>
                  <p className="text-green-400/60 group-hover:text-green-100 text-xs mt-1 font-bold">অন্যের মেসে রিকোয়েস্ট পাঠান।</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {view === 'create' && (
          <div className="max-w-md mx-auto bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
               <button onClick={() => setView('selection')} className="p-3 bg-gray-800 rounded-2xl text-gray-400 hover:text-white transition-colors"><ChevronRight className="rotate-180"/></button>
               <div>
                  <h3 className="text-2xl font-black text-white">নতুন মেস সেটিংস</h3>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">মাস্টার অ্যাকাউন্ট তৈরি</p>
               </div>
            </div>
            {error && <p className="text-red-500 text-xs font-bold bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error}</p>}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">মেসের নাম</label>
                <input type="text" autoFocus className="w-full bg-gray-800 border border-gray-700 rounded-[1.5rem] px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all" placeholder="যেমন: ড্যাফোডিল মেস" value={messName} onChange={e => setMessName(e.target.value)} />
              </div>
              <button onClick={handleCreateMess} disabled={loading || !messName} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all">
                {loading && <Loader2 size={18} className="animate-spin"/>} মেস তৈরি করুন
              </button>
            </div>
          </div>
        )}

        {view === 'join' && (
          <div className="max-w-md mx-auto bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
               <button onClick={() => setView('selection')} className="p-3 bg-gray-800 rounded-2xl text-gray-400 hover:text-white transition-colors"><ChevronRight className="rotate-180"/></button>
               <div>
                  <h3 className="text-2xl font-black text-white">মেসে যোগ দিন</h3>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">মেস আইডি ও পাসওয়ার্ড দিন</p>
               </div>
            </div>
            {error && <p className="text-red-500 text-xs font-bold bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error}</p>}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">মেস আইডি</label>
                <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-[1.5rem] px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-green-600 transition-all" placeholder="ID পেস্ট করুন" value={messCode} onChange={e => setMessCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">মেস পাসওয়ার্ড</label>
                <input type="password" className="w-full bg-gray-800 border border-gray-700 rounded-[1.5rem] px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-green-600 transition-all" placeholder="******" value={messPasswordInput} onChange={e => setMessPasswordInput(e.target.value)} />
              </div>
              <button onClick={handleJoinMess} disabled={loading || !messCode || !messPasswordInput} className="w-full py-5 bg-green-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-lg shadow-green-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all">
                {loading && <Loader2 size={18} className="animate-spin"/>} অনুরোধ পাঠান
              </button>
            </div>
          </div>
        )}

        {view === 'success' && createdInfo && (
          <div className="max-w-lg mx-auto bg-gray-900 p-12 rounded-[4rem] border border-blue-500/30 shadow-2xl space-y-10 text-center animate-in zoom-in-95 duration-300">
             <div className="flex justify-center">
                <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-500/30">
                   <CheckCircle2 size={48}/>
                </div>
             </div>
             <div className="space-y-3">
                <h3 className="text-3xl font-black text-white">সফল হয়েছে!</h3>
                <p className="text-gray-400 font-bold max-w-xs mx-auto">সদস্যদের সাথে নিচের তথ্যগুলো শেয়ার করুন:</p>
             </div>
             
             <div className="space-y-4">
                <div className="p-8 bg-gray-800/50 rounded-[2.5rem] border border-gray-700/50 space-y-6">
                   <div className="relative">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">মেস আইডি</p>
                      <div className="flex items-center justify-between bg-black/20 p-4 rounded-2xl border border-gray-700">
                         <code className="text-blue-400 font-black text-xs truncate mr-2">{createdInfo.id}</code>
                         <button onClick={() => {navigator.clipboard.writeText(createdInfo.id); alert('কপি হয়েছে!')}} className="text-gray-500 hover:text-white"><Check size={16}/></button>
                      </div>
                   </div>
                   <div className="relative">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">মেস পাসওয়ার্ড</p>
                      <div className="flex items-center justify-between bg-black/20 p-4 rounded-2xl border border-gray-700">
                         <code className="text-green-500 font-black text-2xl tracking-[0.2em]">{createdInfo.pass}</code>
                         <button onClick={() => {navigator.clipboard.writeText(createdInfo.pass); alert('কপি হয়েছে!')}} className="text-gray-500 hover:text-white"><Check size={16}/></button>
                      </div>
                   </div>
                </div>
             </div>

             <button onClick={() => window.location.reload()} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all">ড্যাশবোর্ডে প্রবেশ করুন</button>
          </div>
        )}

        {view !== 'success' && (
          <div className="pt-10 border-t border-gray-900 flex justify-center gap-10">
            <button onClick={onLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-all">
              <LogOut size={14}/> লগআউট
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessSelector;
