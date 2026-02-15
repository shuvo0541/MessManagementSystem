
import React, { useState } from 'react';
import { T } from '../translations';
import { supabase } from '../supabase';
import { Lock, User as UserIcon, UtensilsCrossed, Loader2, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('ইমেইল এবং পাসওয়ার্ড দিন');
      return;
    }

    if (isRegistering) {
      if (!fullName.trim()) {
        setError('আপনার পুরো নাম প্রদান করুন');
        return;
      }
      if (password.length < 6) {
        setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
        return;
      }
      if (password !== confirmPassword) {
        setError('পাসওয়ার্ড দুটি মিলছে না! পুনরায় চেক করুন।');
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegistering) {
        const { error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            }
          }
        });
        if (signUpError) throw signUpError;
        alert('রেজিস্ট্রেশন সফল! আপনার ইমেইল চেক করুন অথবা সরাসরি লগইন করার চেষ্টা করুন।');
        setIsRegistering(false);
        setConfirmPassword('');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onLogin();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 text-white rounded-[2rem] shadow-2xl shadow-blue-500/20 mb-4 animate-bounce">
            <UtensilsCrossed size={40} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">{T.appName}</h1>
          <p className="text-gray-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em]">
            {isRegistering ? 'নতুন একাউন্ট তৈরি করুন' : 'আপনার একাউন্টে লগইন করুন'}
          </p>
        </div>

        <div className="bg-gray-900 rounded-[3rem] shadow-2xl border border-gray-800 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-pulse"></div>
          
          <form onSubmit={handleAuth} className="p-8 md:p-10 space-y-6">
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-2xl text-red-400 text-xs text-center font-black flex items-center gap-3 animate-in shake duration-300">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isRegistering && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">আপনার পুরো নাম</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    type="text" required
                    className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 text-white rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-bold placeholder:text-gray-700 transition-all"
                    placeholder="যেমন: আরিয়ান আহমেদ"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">ইমেইল এড্রেস</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="email" required
                  className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 text-white rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-bold placeholder:text-gray-700 transition-all"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">পাসওয়ার্ড</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="password" required
                  className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 text-white rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-bold placeholder:text-gray-700 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {isRegistering && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">পাসওয়ার্ড নিশ্চিত করুন</label>
                <div className="relative group">
                  <CheckCircle2 className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${password && password === confirmPassword ? 'text-green-500' : 'text-gray-500'}`} size={18} />
                  <input 
                    type="password" required
                    className={`w-full pl-12 pr-4 py-4 bg-gray-800 border ${password && password === confirmPassword ? 'border-green-500/50' : 'border-gray-700'} text-white rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-bold placeholder:text-gray-700 transition-all`}
                    placeholder="পুনরায় পাসওয়ার্ড দিন"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button 
              type="submit" disabled={loading}
              className={`w-full py-5 rounded-[1.5rem] font-black text-sm shadow-xl transition-all active:scale-95 uppercase mt-4 flex items-center justify-center gap-3 ${isRegistering ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'} text-white disabled:opacity-50`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : null}
              {loading ? 'প্রসেস হচ্ছে...' : (isRegistering ? 'একাউন্ট তৈরি করুন' : 'লগইন করুন')}
            </button>
            
            <button 
              type="button" disabled={loading}
              onClick={() => { setIsRegistering(!isRegistering); setError(''); setConfirmPassword(''); }}
              className="w-full text-gray-500 py-2 rounded-2xl font-black text-[10px] hover:text-blue-500 transition-colors uppercase tracking-[0.2em]"
            >
              {isRegistering ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করতে এখানে ক্লিক করুন'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
