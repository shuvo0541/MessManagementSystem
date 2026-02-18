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
      const { data } = await supabase.from('invitations').select('*').eq('invitee_email', userEmail.toLowerCase()).eq('status', 'pending');
      if (data) setInvitations(data);
    } catch (err) {}
  };

  const fetchSentRequests = async () => {
    try {
      const { data } = await supabase.from('join_requests').select('*, messes(mess_name)').eq('user_id', userId).eq('status', 'pending');
      if (data) setSentRequests(data);
    } catch (err) {}
  };

  const handleCreateMess = async () => {
    if (!messName.trim()) return;
    setLoading(true);
    setError('');
    const messPass = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      const newUser: User = { id: userId, name: userName, username: userUsername, isAdmin: true, monthlyOff: [], joiningMonth: getCurrentMonthStr() };
      const newDB: MessSystemDB = { ...INITIAL_DB, users: [newUser], messPassword: messPass };
      const { data, error: insertError } = await supabase.from('messes').insert([{ admin_id: userId, mess_name: messName, db_json: newDB }]).select();
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
      setError('আইডি এবং পাসওয়ার্ড প্রদান করুন।');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: mess, error: fetchError } = await supabase.from('messes').select('id, db_json').eq('id', cleanId).maybeSingle();
      if (fetchError || !mess) throw new Error('সঠিক মেস আইডি দিন।');
      const db = mess.db_json as MessSystemDB;
      if (db.messPassword !== cleanPass) throw new Error('ভুল মেস পাসওয়ার্ড!');
      
      const { error: reqError } = await supabase.from('join_requests').insert([{
        mess_id: mess.id,
        user_id: userId,
        user_email: userEmail,
        user_name: userName, 
        user_username: userUsername, 
        status: 'pending'
      }]);
      if (reqError) throw new Error('ইতিমধ্যে আবেদন পাঠানো হয়েছে।');
      onPending();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-5xl w-full space-y-12 animate-in fade-in duration-500">
        {view === 'selection' && (
          <div className="space-y-10">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center p-5 bg-blue-600 text-white rounded-[2.5rem] shadow-2xl mb-2"><UtensilsCrossed size={48} /></div>
              <h2 className="text-4xl font-black text-white">আমার মেসসমূহ</h2>
              <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">স্বাগতম, {userName}!</p>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {existingMesses.map(mess => (
                <button key={mess.id} onClick={() => onSelectMess(mess)} className="group w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.33%-1.5rem)] bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 hover:border-blue-500 transition-all text-left space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-blue-500 font-black text-xl">{mess.mess_name[0].toUpperCase()}</div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${mess.admin_id === userId ? 'bg-purple-900/40 text-purple-400 border border-purple-500/20' : 'bg-blue-900/40 text-blue-400 border border-blue-500/20'}`}>
                      {mess.admin_id === userId ? 'Admin' : 'Member'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors truncate">{mess.mess_name}</h3>
                  <div className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase">প্রবেশ করুন <ChevronRight size={14} /></div>
                </button>
              ))}
              <button onClick={() => setView('create')} className="w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.33%-1.5rem)] bg-blue-600/5 p-8 rounded-[2.5rem] border border-blue-500/20 hover:bg-blue-600 transition-all text-left space-y-4">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white"><PlusCircle size={28} /></div>
                <h3 className="text-xl font-black text-white">নতুন মেস তৈরি</h3>
              </button>
              <button onClick={() => setView('join')} className="w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.33%-1.5rem)] bg-green-600/5 p-8 rounded-[2.5rem] border border-green-500/20 hover:bg-green-600 transition-all text-left space-y-4">
                <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center text-white"><UserPlus size={28} /></div>
                <h3 className="text-xl font-black text-white">মেসে যোগ দিন</h3>
              </button>
            </div>
          </div>
        )}
        {view === 'create' && (
          <div className="max-w-md mx-auto bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl space-y-8">
            <h3 className="text-2xl font-black text-white">নতুন মেস</h3>
            {error && <p className="text-red-500 text-xs font-bold bg-red-500/10 p-4 rounded-xl">{error}</p>}
            <div className="space-y-6">
              <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-blue-600" placeholder="মেসের নাম" value={messName} onChange={e => setMessName(e.target.value)} />
              <button onClick={handleCreateMess} disabled={loading || !messName} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl transition-all">মেস তৈরি করুন</button>
              <button onClick={() => setView('selection')} className="w-full text-gray-500 font-black uppercase text-[10px]">ফিরে যান</button>
            </div>
          </div>
        )}
        {view === 'join' && (
          <div className="max-w-md mx-auto bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl space-y-8">
            <h3 className="text-2xl font-black text-white">মেসে যোগ দিন</h3>
            {error && <p className="text-red-500 text-xs font-bold bg-red-500/10 p-4 rounded-xl">{error}</p>}
            <div className="space-y-6">
              <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-green-600" placeholder="মেস আইডি" value={messCode} onChange={e => setMessCode(e.target.value)} />
              <input type="password" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-green-600" placeholder="পাসওয়ার্ড" value={messPasswordInput} onChange={e => setMessPasswordInput(e.target.value)} />
              <button onClick={handleJoinMess} disabled={loading} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl transition-all">আবেদন পাঠান</button>
              <button onClick={() => setView('selection')} className="w-full text-gray-500 font-black uppercase text-[10px]">ফিরে যান</button>
            </div>
          </div>
        )}
        {view === 'success' && createdInfo && (
          <div className="max-w-lg mx-auto bg-gray-900 p-12 rounded-[4rem] border border-blue-500/30 text-center space-y-10">
             <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl"><CheckCircle2 size={48}/></div>
             <div className="bg-gray-800 p-8 rounded-[2.5rem] border border-gray-700 space-y-6">
                <div className="text-left"><p className="text-[10px] font-black text-gray-500 uppercase mb-2">মেস আইডি</p><code className="text-blue-400 font-black text-xs break-all">{createdInfo.id}</code></div>
                <div className="text-left"><p className="text-[10px] font-black text-gray-500 uppercase mb-2">মেস পাসওয়ার্ড</p><code className="text-green-500 font-black text-2xl tracking-[0.2em]">{createdInfo.pass}</code></div>
             </div>
             <button onClick={() => window.location.reload()} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-sm shadow-xl transition-all">প্রবেশ করুন</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessSelector;