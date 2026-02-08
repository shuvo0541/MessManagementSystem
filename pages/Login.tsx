
import React, { useState } from 'react';
import { T } from '../translations';
import { getDB, saveDB, INITIAL_DB } from '../db';
import { User, MessSystemDB } from '../types';
import { Lock, User as UserIcon, UtensilsCrossed, AlertTriangle, Key } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const MASTER_KEY = 'MESS_MASTER_INDEX';
  const MESS_PREFIX = 'MESS_DB_';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // মাস্টার ইনডেক্স থেকে সকল মেস ডাটাবেস চেক করা
    const messIds = JSON.parse(localStorage.getItem(MASTER_KEY) || '[]');
    let foundUser: User | null = null;
    let foundMessId: string | null = null;

    for (const mId of messIds) {
      const dbStr = localStorage.getItem(MESS_PREFIX + mId);
      if (dbStr) {
        const db: MessSystemDB = JSON.parse(dbStr);
        const user = db.users.find(u => 
          u.username.toLowerCase() === username.toLowerCase() && 
          u.password === password
        );
        if (user) {
          foundUser = user;
          foundMessId = mId;
          break;
        }
      }
    }
    
    if (foundUser && foundMessId) {
      localStorage.setItem('ACTIVE_MESS_ID', foundMessId);
      sessionStorage.setItem('user', JSON.stringify(foundUser));
      onLogin(foundUser);
    } else {
      setError('ইউজারনেম বা পাসওয়ার্ড সঠিক নয়। নতুন মেস শুরু করতে নিচে ক্লিক করুন।');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password) {
      setError('সবগুলো ঘর পূরণ করুন');
      return;
    }

    // ইউজারনেম কি ইউনিক?
    const messIds = JSON.parse(localStorage.getItem(MASTER_KEY) || '[]');
    for (const mId of messIds) {
      const dbStr = localStorage.getItem(MESS_PREFIX + mId);
      if (dbStr) {
        const db: MessSystemDB = JSON.parse(dbStr);
        if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
          setError('এই ইউজারনেম ইতিমধ্যে অন্য কেউ ব্যবহার করছেন।');
          return;
        }
      }
    }

    const newMessId = crypto.randomUUID();
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      username,
      password,
      isAdmin: true 
    };

    const nextDB: MessSystemDB = {
      ...INITIAL_DB,
      users: [newUser]
    };

    // সেভ করা
    localStorage.setItem('ACTIVE_MESS_ID', newMessId);
    saveDB(nextDB, newMessId);
    
    sessionStorage.setItem('user', JSON.stringify(newUser));
    onLogin(newUser);
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
            {isRegistering ? 'নতুন মেস একাউন্ট তৈরি করুন' : 'আপনার একাউন্টে লগইন করুন'}
          </p>
        </div>

        <div className="bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-800 overflow-hidden">
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="p-8 md:p-10 space-y-5">
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-2xl text-red-400 text-sm text-center font-bold">
                {error}
              </div>
            )}
            
            {isRegistering && (
              <div className="space-y-4">
                <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3 mb-2">
                   <Key className="text-blue-500 shrink-0 mt-0.5" size={16}/>
                   <p className="text-[10px] text-blue-200/70 font-bold leading-relaxed uppercase">আপনি একটি সম্পূর্ণ নতুন মেস শুরু করতে যাচ্ছেন। মেম্বারদের জন্য আপনিই এডমিন হবেন।</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">আপনার নাম</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500" size={18} />
                    <input 
                      type="text" 
                      className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 text-white rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all outline-none font-bold placeholder:text-gray-600"
                      placeholder="পুরো নাম"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">ইউজারনেম</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500" size={18} />
                <input 
                  type="text" 
                  className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 text-white rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all outline-none font-bold placeholder:text-gray-600"
                  placeholder="ইউজারনেম"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">পাসওয়ার্ড</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500" size={18} />
                <input 
                  type="password" 
                  className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 text-white rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all outline-none font-bold placeholder:text-gray-600"
                  placeholder="পাসওয়ার্ড"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all active:scale-[0.98] uppercase mt-2 ${isRegistering ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'} text-white`}
            >
              {isRegistering ? 'মেস একাউন্ট খুলুন' : 'লগইন করুন'}
            </button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-800"></span></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-gray-900 px-3 text-gray-600 font-black tracking-widest">অথবা</span></div>
            </div>

            <button 
              type="button"
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              className="w-full text-gray-500 py-2 rounded-2xl font-black text-xs hover:text-blue-500 transition-colors uppercase tracking-widest"
            >
              {isRegistering ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন' : 'সম্পূর্ণ নতুন মেস ডাটাবেস খুলুন (সাইন-আপ)'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
