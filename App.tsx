
import React, { useState, useEffect, useMemo } from 'react';
import { fetchMessDB, syncDBToSupabase, getCurrentMonthStr, getUserRoleInMonth, INITIAL_DB } from './db';
import { User, Role, MessSystemDB } from './types';
import { translations, Language } from './translations';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import MealEntry from './pages/MealEntry';
import BazarEntry from './pages/BazarEntry';
import Reports from './pages/Reports';
import UtilityRoom from './pages/UtilityRoom';
import MealBazarLedger from './pages/MealBazarLedger';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import PersonalAccount from './pages/PersonalAccount';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { supabase } from './supabase';
import { Loader2, AlertTriangle, RefreshCcw, Clock, ShieldAlert, Lock } from 'lucide-react';

const App: React.FC = () => {
  const [db, setDb] = useState<MessSystemDB>(INITIAL_DB);
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [messId, setMessId] = useState<string | null>(null);
  const [messName, setMessName] = useState<string>('');
  const [messAdminId, setMessAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [view, setView] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [userMesses, setUserMesses] = useState<any[]>([]);
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'bn');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const T = translations[lang];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.title = T.appName;
  }, [lang, T.appName]);

  // Internal helper to ensure ID compliance
  const generateUserIdFromRules = (name: string) => {
    const cleanName = name.replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase();
    const words = cleanName.split(/\s+/).filter(w => w.length > 0);
    let letters = "";
    if (words.length >= 3) {
      letters = (words[0][0] || '') + (words[1][0] || '') + (words[2][0] || '');
    } else if (words.length === 2) {
      letters = (words[0][0] || '') + (words[1][0] || '') + (words[0][1] || words[1][1] || 'x');
    } else if (words.length === 1) {
      letters = (words[0] + 'xxx').substring(0, 3);
    } else {
      letters = "usr";
    }
    const digits = Math.floor(10000 + Math.random() * 90000);
    return `@${letters.substring(0, 3)}${digits}`;
  };

  const fetchUserMesses = async (userId: string) => {
    try {
      const { data: allMesses, error } = await supabase.from('messes').select('id, mess_name, admin_id, db_json');
      if (error) throw error;
      
      const filtered = (allMesses || []).filter(m => {
        const messDB = m.db_json as MessSystemDB;
        return m.admin_id === userId || messDB.users.some(u => u.id === userId);
      });
      
      setUserMesses(filtered);
      return filtered;
    } catch (err) {
      console.error("Error fetching user messes:", err);
      return [];
    }
  };

  const syncUserNameGlobally = async (userId: string, metaName: string, metaUserId: string, email: string, phone: string | undefined, messes: any[]) => {
    // Update public profile table
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: metaName,
        user_id: metaUserId,
        email: email,
        phone: phone
      });
    } catch (err) {
      console.error("Error syncing profile:", err);
    }

    for (const mess of messes) {
      const messDB = { ...mess.db_json } as MessSystemDB;
      const uIdx = messDB.users.findIndex(u => u.id === userId);
      
      if (uIdx > -1) {
        let changed = false;
        if (messDB.users[uIdx].name !== metaName) {
           messDB.users[uIdx].name = metaName;
           changed = true;
        }
        if (messDB.users[uIdx].userId !== metaUserId) {
           messDB.users[uIdx].userId = metaUserId;
           changed = true;
        }
        if (messDB.users[uIdx].email !== email) {
           messDB.users[uIdx].email = email;
           changed = true;
        }
        if (messDB.users[uIdx].phone !== phone) {
           messDB.users[uIdx].phone = phone;
           changed = true;
        }
        if (changed) {
          await syncDBToSupabase(messDB, mess.id);
        }
      }
    }
  };

  const enterMess = async (messData: any, userId: string, metaName: string, metaUsername: string, metaUserId: string, email: string, phone: string | undefined) => {
    const messDB = { ...messData.db_json } as MessSystemDB;
    const userIdx = messDB.users.findIndex(u => u.id === userId);
    
    if (userIdx > -1) {
      let changed = false;
      if (messDB.users[userIdx].name !== metaName || messDB.users[userIdx].username !== metaUsername || messDB.users[userIdx].userId !== metaUserId || messDB.users[userIdx].email !== email || messDB.users[userIdx].phone !== phone) {
        messDB.users[userIdx].name = metaName;
        messDB.users[userIdx].username = metaUsername;
        messDB.users[userIdx].userId = metaUserId;
        messDB.users[userIdx].email = email;
        messDB.users[userIdx].phone = phone;
        changed = true;
      }
      
      if (changed) {
        await syncDBToSupabase(messDB, messData.id);
      }
      
      const activeUser = { ...messDB.users[userIdx], isAdmin: messData.admin_id === userId || messDB.users[userIdx].isAdmin };
      setUser(activeUser);
      setDb(messDB);
    } else if (messData.admin_id === userId) {
      const adminUser: User = { 
        id: userId, 
        name: metaName, 
        email: email,
        phone: phone,
        username: metaUsername, 
        userId: metaUserId,
        isAdmin: true, 
        monthlyOff: [] 
      };
      setUser(adminUser);
      if (!messDB.users.some(u => u.id === userId)) {
        messDB.users.push(adminUser);
        await syncDBToSupabase(messDB, messData.id);
        setDb(messDB);
      }
    }
    
    setMessId(messData.id);
    setMessName(messData.mess_name);
    setMessAdminId(messData.admin_id);
    
    localStorage.setItem('ACTIVE_MESS_ID', messData.id);
    setView('dashboard');
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session) {
          setAuthEmail(session.user.email || null);
          const userId = session.user.id;
          
          const metadata = session.user.user_metadata;
          const metaName = metadata?.full_name || metadata?.name || T.user;
          const metaUsername = metadata?.username || "user_" + userId.slice(0, 5);
          
          // ID REPAIR LOGIC: If missing or generic, generate properly and update metadata
          let metaUserId = metadata?.user_id;
          if (!metaUserId || metaUserId.startsWith('@user')) {
             metaUserId = generateUserIdFromRules(metaName);
             // Save to auth metadata permanently
             await supabase.auth.updateUser({
                data: { user_id: metaUserId }
             });
             // Also update profiles table
             await supabase.from('profiles').update({ user_id: metaUserId }).eq('id', userId);
          }

          const messes = await fetchUserMesses(userId);
          await syncUserNameGlobally(userId, metaName, metaUserId, session.user.email || '', metadata?.phone || '', messes);

          const lastMessId = localStorage.getItem('ACTIVE_MESS_ID');
          const lastMess = messes.find(m => m.id === lastMessId);
          
          if (lastMess) {
            await enterMess(lastMess, userId, metaName, metaUsername, metaUserId, session.user.email || '', metadata?.phone || '');
          } else {
            const baseUser: User = { 
              id: userId, 
              name: metaName, 
              email: session.user.email || '',
              phone: metadata?.phone || '',
              username: metaUsername, 
              userId: metaUserId,
              isAdmin: false,
              monthlyOff: []
            };
            setUser(baseUser);
            setMessId(null);
            setView('profile');
          }
        }
      } catch (err: any) {
        setInitError(err.message || T.appLoadError);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  const updateDB = (updates: Partial<MessSystemDB> | ((prev: MessSystemDB) => MessSystemDB)) => {
    setDb(prev => {
      const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      return next;
    });
  };

  // Debounced Sync to Supabase
  useEffect(() => {
    if (!messId || db === INITIAL_DB) return;
    
    const timer = setTimeout(() => {
      syncDBToSupabase(db, messId);
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [db, messId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('ACTIVE_MESS_ID');
    setUser(null);
    setMessId(null);
    setAuthEmail(null);
    setIsPending(false);
    setUserMesses([]);
    setView('dashboard');
  };

  const switchMess = () => {
    setMessId(null);
    localStorage.removeItem('ACTIVE_MESS_ID');
    setView('profile');
  };

  const userRole = useMemo(() => {
    if (!user || !messId) return Role.MEMBER;
    return getUserRoleInMonth(db, user.id, selectedMonth);
  }, [user, messId, selectedMonth, db]);

  const isMonthAllowed = useMemo(() => {
    if (!user || user.isAdmin) return true;
    const isAfterJoin = !user.joiningMonth || selectedMonth >= user.joiningMonth;
    const isBeforeLeave = !user.leavingMonth || selectedMonth <= user.leavingMonth;
    return isAfterJoin && isBeforeLeave;
  }, [user, selectedMonth]);

  if (loading) {
    return (
      <div className="h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">{T.loading}</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-200 dark:border-red-500/20">
          <AlertTriangle size={40} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{T.connectionLost}</h1>
        <p className="text-gray-500 max-w-xs mb-8 font-bold">{initError}</p>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-sm shadow-xl shadow-blue-500/20">
          <RefreshCcw size={18} /> {T.refresh}
        </button>
      </div>
    );
  }

  if (!authEmail) {
    return <Login onLogin={() => window.location.reload()} t={T} />;
  }

  if (isPending) {
    return (
      <div className="h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-blue-500/20 mb-8 animate-bounce">
          <Clock size={48} />
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">{T.waitForApproval}</h2>
        <p className="text-gray-500 max-sm mx-auto font-bold mb-10 leading-relaxed">
          {T.approvalDesc}
        </p>
        <div className="flex flex-col gap-4">
           <button onClick={() => window.location.reload()} className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs transition-all">
             <RefreshCcw size={16} /> {T.checkStatus}
           </button>
           <button onClick={() => setIsPending(false)} className="flex items-center justify-center gap-2 text-blue-500 font-black uppercase text-[10px] tracking-widest hover:text-blue-400 transition-all">
             {T.backToProfile}
           </button>
        </div>
      </div>
    );
  }

  const commonProps = { db, updateDB, month: selectedMonth, user: user!, messId, messAdminId, onViewChange: (v: string) => setView(v), t: T, theme };

  const handleUpdateUser = async (updates: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);

    // 1. Update Auth Metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { 
        full_name: updatedUser.name,
        phone: updatedUser.phone
      }
    });
    if (authError) throw authError;

    // 2. Sync globally across all messes and profiles table
    await syncUserNameGlobally(user.id, updatedUser.name, user.userId || '', user.email || '', updatedUser.phone, userMesses);
  };

  const renderContent = () => {
    if (view !== 'profile' && !isMonthAllowed) {
       return (
         <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-red-900/10 border border-red-500/20 text-red-500 rounded-[2.5rem] flex items-center justify-center mb-6">
               <Lock size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">{T.accessRestricted}</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2 font-bold leading-relaxed">
               {T.accessRestrictedMonthDesc.replace('{month}', selectedMonth)}
            </p>
            <button 
              onClick={() => setSelectedMonth(user?.joiningMonth || getCurrentMonthStr())}
              className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
               {T.backToActiveMonth}
            </button>
         </div>
       );
    }

    switch (view) {
      case 'dashboard': return <Dashboard {...commonProps} />;
      case 'personal-account': return <PersonalAccount {...commonProps} />;
      case 'members': return <Members {...commonProps} role={userRole} isAdmin={user?.isAdmin || false} messAdminId={messAdminId} messId={messId!} messName={messName} user={user!} />;
      case 'utility': return <UtilityRoom {...commonProps} />;
      case 'meal-bazar-ledger': return <MealBazarLedger {...commonProps} />;
      case 'analytics': return <Analytics {...commonProps} />;
      case 'meals': return <MealEntry {...commonProps} role={userRole} userId={user?.id || ''} isAdmin={user?.isAdmin || false} />;
      case 'bazar': return <BazarEntry {...commonProps} userId={user?.id || ''} isAdmin={user?.isAdmin || false} />;
      case 'reports': return <Reports {...commonProps} isAdmin={user?.isAdmin || false} role={userRole} />;
      case 'profile': return (
        <Profile 
          user={user!} 
          authEmail={authEmail} 
          userMesses={userMesses} 
          onSelectMess={(m) => enterMess(m, user?.id || '', user?.name || '', user?.username || '', user?.userId || '', authEmail || '', user?.phone || '')} 
          onLogout={handleLogout} 
          onPending={() => setIsPending(true)} 
          t={T}
          theme={theme}
        />
      );
      case 'settings': return (
        <Settings 
          user={user!} 
          onUpdateUser={handleUpdateUser} 
          onLanguageChange={(l) => setLang(l)} 
          currentLang={lang} 
          theme={theme}
          onThemeChange={setTheme}
          t={T}
        />
      );
      default: return <Dashboard {...commonProps} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm animate-in fade-in duration-300 no-print" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] no-print ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-72 lg:w-80 flex-shrink-0`}>
        <Sidebar 
          currentView={view} 
          onViewChange={(v) => { setView(v); setIsSidebarOpen(false); }} 
          onLogout={handleLogout} 
          onSwitchMess={switchMess}
          isAdmin={user?.isAdmin || false} 
          role={userRole} 
          hasActiveMess={!!messId}
          t={T}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="no-print">
          <Header 
            user={user!} 
            role={userRole} 
            messName={messName}
            messId={messId}
            selectedMonth={selectedMonth} 
            onMonthChange={setSelectedMonth} 
            onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
            onViewChange={(v) => { setView(v); setIsSidebarOpen(false); }}
            hasActiveMess={!!messId}
            t={T}
          />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
