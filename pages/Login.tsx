
import React, { useState } from 'react';
import { T } from '../translations';
import { INITIAL_DB } from '../db';
import { User, MessSystemDB } from '../types';
import { supabase } from '../supabase';
import { Lock, User as UserIcon, UtensilsCrossed, Key, Loader2, Mail, AlertCircle, Info } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User, messId: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ইমেইল ফরম্যাট ঠিক করার ফাংশন
  const getFormattedEmail = (input: string) => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed.includes('@') && trimmed.includes('.')) {
      return trimmed;
    }
    const cleanUsername = trimmed.replace(/\s+/g, '.');
    return `${cleanUsername}@mess.app`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('ইউজারনেম এবং পাসওয়ার্ড দিন');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const email = getFormattedEmail(username);
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('আপনার ইমেইলটি এখনও কনফার্ম করা হয়নি। দয়া করে এডমিনের সাথে যোগাযোগ করুন অথবা সুপারবেস ড্যাশবোর্ডে Confirm Email বন্ধ করুন।');
        }
        throw new Error('ইউজারনেম বা পাসওয়ার্ড সঠিক নয়।');
      }

      const { data: messData, error: messError } = await supabase
        .from('messes')
        .select('id, db_json')
        .eq('admin_id', authData.user.id);

      if (messData && messData.length > 0) {
          const db = messData[0].db_json as MessSystemDB;
          const u = db.users.find(usr => usr.id === authData.user.id || usr.username.toLowerCase() === username.toLowerCase());
          onLogin(u || db.users[0], messData[0].id);
      } else {
          const { data: allMesses } = await supabase.from('messes').select('id, db_json');
          const foundMess = allMesses?.find(m => 
            (m.db_json as MessSystemDB).users.some(u => u.username.toLowerCase() === username.toLowerCase())
          );

          if (foundMess) {
             const db = foundMess.db_json as MessSystemDB;
             const u = db.users.find(usr => usr.username.toLowerCase() === username.toLowerCase())!;
             onLogin(u, foundMess.id);
          } else {
             throw new Error('আপনার কোনো মেস রেকর্ড পাওয়া যায়নি।');
          }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password) {
      setError('সবগুলো ঘর পূরণ করুন');
      return;
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const email = getFormattedEmail(username);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) {
        if (authError.message.includes('rate limit')) {
          throw new Error('ইমেইল রেট লিমিট অতিক্রম করেছে। দয়া করে ১ ঘণ্টা অপেক্ষা করুন অথবা আপনার সুপারবেস ড্যাশবোর্ড থেকে Authentication > Providers > Email > Confirm Email অপশনটি বন্ধ (OFF) করে দিন।');
        }
        if (authError.message.includes('already registered')) {
          throw new Error('এই ইউজারনেম বা ইমেইল দিয়ে ইতিমধ্যে একাউন্ট খোলা হয়েছে।');
        }
        throw authError;
      }

      if (!authData.user) throw new Error('রেজিস্ট্রেশন প্রসেস সফল হয়নি।');

      const newUser: User = {
        id: authData.user.id,
        name,
        username: username.trim(),
        password,
        isAdmin: true 
      };

      const newDB: MessSystemDB = {
        ...INITIAL_DB,
        users: [newUser]
      };

      const { data: messData, error: messError } = await supabase
        .from('messes')
        .insert([{ 
          admin_id: authData.user.id, 
          mess_name: `${name}'র মেস`,
          db_json: newDB 
        }])
        .select();

      if (messError) throw messError;

      onLogin(newUser, messData[0].id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 animate-in fade-in duration-700">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-500/20 mb-4">
            <UtensilsCrossed size={40} />
          </div>
          <h1 className="text-3xl font-black text-white">{T.appName}</h1>
          <p className="text-gray-400 font-bold mt-2">
            {isRegistering ? 'সুপারবেস ক্লাউড রেজিস্টার' : 'আপনার একাউন্টে লগইন করুন'}
          </p>
        </div>

        <div className="bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-800 overflow-hidden">
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="p-8 md:p-10 space-y-5">
            {error && (
              <div className="space-y-4">
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-2xl text-red-400 text-sm text-center font-bold flex items-center gap-3">
                  <AlertCircle size={20} className="shrink-0" />
                  <span>{error}</span>
                </div>
                {error.includes('রেট লিমিট') && (
                  <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-2xl flex items-start gap-3">
                    <Info className="text-blue-500 shrink-0 mt-0.5" size={16}/>
                    <div className="space-y-2">
                      <p className="text-[10px] text-blue-200/70 font-bold leading-relaxed uppercase">সমাধানের উপায়:</p>
                      <p className="text-[11px] text-gray-400">সুপারবেস ড্যাশবোর্ডে গিয়ে <strong>Auth > Providers > Email</strong> থেকে <strong>Confirm Email</strong> অপশনটি অফ করে দিন। এতে ইমেইল ভেরিফিকেশন লাগবে না।</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {isRegistering && (
              <div className="space-y-4">
                <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3 mb-2">
                   <Key className="text-blue-500 shrink-0 mt-0.5" size={16}/>
                   <p className="text-[10px] text-blue-200/70 font-bold leading-relaxed uppercase">রেজিস্ট্রেশন করলে আপনি মেসের অ্যাডমিন হিসেবে গণ্য হবেন।</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">আপনার পুরো নাম</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500" size={18} />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 text-white rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all outline-none font-bold placeholder:text-gray-600"
                      placeholder="যেমন: মোঃ রহিম"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">ইউজারনেম অথবা জিমেইল</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500" size={18} />
                <input 
                  type="text" 
                  required
                  className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 text-white rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all outline-none font-bold placeholder:text-gray-600"
                  placeholder="user123 অথবা mail@gmail.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500" size={18} />
                <input 
                  type="password" 
                  required
                  className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 text-white rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all outline-none font-bold placeholder:text-gray-600"
                  placeholder="পাসওয়ার্ড"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all active:scale-[0.98] uppercase mt-2 flex items-center justify-center gap-2 ${isRegistering ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'} text-white disabled:opacity-50`}
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              {loading ? 'প্রসেস হচ্ছে...' : (isRegistering ? 'একাউন্ট খুলুন' : 'লগইন করুন')}
            </button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-800"></span></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-gray-900 px-3 text-gray-600 font-black tracking-widest">অথবা</span></div>
            </div>

            <button 
              type="button"
              disabled={loading}
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              className="w-full text-gray-500 py-2 rounded-2xl font-black text-xs hover:text-blue-500 transition-colors uppercase tracking-widest disabled:opacity-50"
            >
              {isRegistering ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'নতুন মেস একাউন্ট তৈরি করতে এখানে ক্লিক করুন'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
