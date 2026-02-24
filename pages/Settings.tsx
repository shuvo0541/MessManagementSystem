
import React, { useState } from 'react';
import { User, MessSystemDB } from '../types';
import { supabase } from '../supabase';
import { 
  Settings as SettingsIcon, 
  User as UserIcon, 
  Phone, 
  Moon, 
  Sun, 
  Languages, 
  Lock, 
  HelpCircle, 
  ChevronRight, 
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface SettingsProps {
  user: User;
  onUpdateUser: (updates: Partial<User>) => Promise<void>;
  onLanguageChange: (lang: 'bn' | 'en') => void;
  currentLang: string;
  theme: string;
  onThemeChange: (theme: string) => void;
  t: any;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser, onLanguageChange, currentLang, theme, onThemeChange, t }) => {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isDarkMode = theme === 'dark';

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await onUpdateUser({ name, phone });
      setMessage({ type: 'success', text: t.profileUpdated });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t.updateFailed });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: t.passwordMinChars });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage({ type: 'success', text: t.passwordChanged });
      setNewPassword('');
      setCurrentPassword('');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t.passwordChangeFailed });
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    onThemeChange(isDarkMode ? 'light' : 'dark');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{t.settings}</h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">{t.profileAppPreferences}</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-green-900/20 border border-green-500/30 text-green-400' : 'bg-red-900/20 border border-red-500/30 text-red-400'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="font-bold text-sm">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Section */}
        <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <UserIcon className="text-blue-500" size={20} />
            <h2 className="text-lg font-black text-gray-900 dark:text-white">{t.editProfile}</h2>
          </div>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{t.yourName}</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{t.phoneNumberOptional}</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="tel" 
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold transition-all"
                  placeholder="যেমন: 017XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <button 
              type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {t.save}
            </button>
          </form>
        </section>

        {/* Security Section */}
        <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="text-red-500" size={20} />
            <h2 className="text-lg font-black text-gray-900 dark:text-white">{t.security}</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{t.newPasswordLabel}</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold transition-all"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button 
              type="submit" disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Lock size={16} />}
              {t.changePasswordBtn}
            </button>
          </form>
        </section>

        {/* Theme & Language Section */}
        <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <Languages className="text-emerald-500" size={20} />
            <h2 className="text-lg font-black text-gray-900 dark:text-white">{t.themeAndLanguage}</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-amber-500" />}
                <span className="font-bold text-sm text-gray-900 dark:text-white">{t.darkMode}</span>
              </div>
              <button 
                onClick={toggleTheme}
                className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-blue-600' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDarkMode ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Languages size={18} className="text-emerald-500" />
                <span className="font-bold text-sm text-gray-900 dark:text-white">{t.language}</span>
              </div>
              <select 
                value={currentLang}
                onChange={(e) => onLanguageChange(e.target.value as 'bn' | 'en')}
                className="bg-transparent border-none text-[10px] font-black uppercase text-gray-900 dark:text-white rounded-lg focus:ring-0"
              >
                <option value="bn" className="bg-white dark:bg-gray-900">বাংলা</option>
                <option value="en" className="bg-white dark:bg-gray-900">English</option>
              </select>
            </div>
          </div>
        </section>

        {/* Help Section */}
        <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
            Upcoming
          </div>
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="text-purple-500" size={20} />
            <h2 className="text-lg font-black text-gray-900 dark:text-white">{t.appTutorial}</h2>
          </div>
          <div className="p-10 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
            <HelpCircle size={48} className="text-gray-300 dark:text-gray-800" />
            <p className="text-gray-400 dark:text-gray-600 font-bold text-sm">{t.comingSoonTutorial}</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
