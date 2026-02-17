
import React, { useState, useEffect, useMemo } from 'react';
import { fetchMessDB, syncDBToSupabase, getCurrentMonthStr, getUserRoleInMonth, INITIAL_DB } from './db';
import { User, Role, MessSystemDB } from './types';
import { T } from './translations';
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

  const generateUniqueUsername = (name: string, email: string) => {
    const safeName = (name || 'user').toString().split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || 'user';
    const emailPrefix = (email || 'abc').toString().split('@')[0].slice(0, 3).toLowerCase();
    const randomSuffix = Math.floor(100 + Math.random() * 899);
    return `${safeName}${emailPrefix}${randomSuffix}`;
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

  // Global Sync Logic: ইউজার যে কয়টি মেসের মেম্বার, সবখানে তার নাম আপডেট করবে
  const syncUserNameGlobally = async (userId: string, metaName: string, messes: any[]) => {
    for (const mess of messes) {
      const messDB = { ...mess.db_json } as MessSystemDB;
      const uIdx = messDB.users.findIndex(u => u.id === userId);
      
      if (uIdx > -1 && messDB.users[uIdx].name !== metaName) {
        messDB.users[uIdx].name = metaName;
        await syncDBToSupabase(messDB, mess.id);
      }
    }
  };

  const enterMess = async (messData: any, userId: string, metaName: string) => {
    const messDB = { ...messData.db_json } as MessSystemDB;
    const userIdx = messDB.users.findIndex(u => u.id === userId);
    
    if (userIdx > -1) {
      // লোকাল স্টেট আপডেট
      if (messDB.users[userIdx].name !== metaName) {
        messDB.users[userIdx].name = metaName;
        await syncDBToSupabase(messDB, messData.id);
      }
      
      const activeUser = { ...messDB.users[userIdx], isAdmin: messData.admin_id === userId || messDB.users[userIdx].isAdmin };
      setUser(activeUser);
      setDb(messDB);
    } else if (messData.admin_id === userId) {
      const adminUser: User = { 
        id: userId, 
        name: metaName, 
        username: 'admin', 
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
          const messes = await fetchUserMesses(userId);
          
          const metadata = session.user.user_metadata;
          const metaName = metadata?.full_name || metadata?.name || session.user.email?.split('@')[0] || 'User';

          // মেম্বার লগইন করা মাত্রই তার নাম সব মেসে আপডেট করে দেওয়া হবে
          await syncUserNameGlobally(userId, metaName, messes);

          const lastMessId = localStorage.getItem('ACTIVE_MESS_ID');
          const lastMess = messes.find(m => m.id === lastMessId);
          
          if (lastMess) {
            await enterMess(lastMess, userId, metaName);
          } else {
            const baseUser: User = { 
              id: userId, 
              name: metaName, 
              username: generateUniqueUsername(metaName, session.user.email || ''), 
              isAdmin: false,
              monthlyOff: []
            };
            setUser(baseUser);
            setMessId(null);
            setView('profile');
          }
        }
      } catch (err: any) {
        setInitError(err.message || "অ্যাপ লোড করতে সমস্যা হচ্ছে।");
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  const updateDB = (updates: Partial<MessSystemDB>) => {
    setDb(prev => {
      const next = { ...prev, ...updates };
      if (messId) {
        syncDBToSupabase(next, messId);
      }
      return next;
    });
  };

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
      <div className="h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <AlertTriangle size={40} />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">সংযোগ বিচ্ছিন্ন!</h1>
        <p className="text-gray-500 max-w-xs mb-8 font-bold">{initError}</p>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-sm shadow-xl shadow-blue-500/20">
          <RefreshCcw size={18} /> রিফ্রেশ করুন
        </button>
      </div>
    );
  }

  if (!authEmail) {
    return <Login onLogin={() => window.location.reload()} />;
  }

  if (isPending) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-blue-500/20 mb-8 animate-bounce">
          <Clock size={48} />
        </div>
        <h2 className="text-3xl font-black text-white mb-3">অনুমোদনের জন্য অপেক্ষা করুন</h2>
        <p className="text-gray-500 max-sm mx-auto font-bold mb-10 leading-relaxed">
          আপনার যোগদানের অনুরোধ মেস এডমিনের কাছে পাঠানো হয়েছে। এডমিন অনুমতি দিলে আপনি স্বয়ংক্রিয়ভাবে ড্যাশবোর্ড দেখতে পাবেন।
        </p>
        <div className="flex flex-col gap-4">
           <button onClick={() => window.location.reload()} className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs transition-all">
             <RefreshCcw size={16} /> স্ট্যাটাস চেক করুন
           </button>
           <button onClick={() => setIsPending(false)} className="flex items-center justify-center gap-2 text-blue-500 font-black uppercase text-[10px] tracking-widest hover:text-blue-400 transition-all">
             প্রোফাইলে ফিরে যান
           </button>
        </div>
      </div>
    );
  }

  const commonProps = { db, updateDB, month: selectedMonth, user: user!, messId };

  const renderContent = () => {
    if (view !== 'profile' && !isMonthAllowed) {
       return (
         <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-red-900/10 border border-red-500/20 text-red-500 rounded-[2.5rem] flex items-center justify-center mb-6">
               <Lock size={40} />
            </div>
            <h3 className="text-2xl font-black text-white">অ্যাক্সেস রেস্ট্রিক্টেড</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2 font-bold leading-relaxed">
               আপনি {selectedMonth} মাসে এই মেসে অ্যাক্টিভ ছিলেন না। তাই এই মাসের কোনো ডাটা আপনার জন্য দৃশ্যমান নয়।
            </p>
            <button 
              onClick={() => setSelectedMonth(user?.joiningMonth || getCurrentMonthStr())}
              className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
               অ্যাক্টিভ মাসে ফিরে যান
            </button>
         </div>
       );
    }

    switch (view) {
      case 'dashboard': return <Dashboard {...commonProps} />;
      case 'members': return <Members {...commonProps} role={userRole} isAdmin={user?.isAdmin || false} messAdminId={messAdminId} messId={messId!} messName={messName} user={user!} />;
      case 'utility': return <UtilityRoom {...commonProps} />;
      case 'meal-bazar-ledger': return <MealBazarLedger {...commonProps} />;
      case 'analytics': return <Analytics db={db} user={user!} month={selectedMonth} />;
      case 'meals': return <MealEntry {...commonProps} role={userRole} userId={user?.id || ''} isAdmin={user?.isAdmin || false} />;
      case 'bazar': return <BazarEntry {...commonProps} userId={user?.id || ''} isAdmin={user?.isAdmin || false} />;
      case 'reports': return <Reports {...commonProps} />;
      case 'profile': return (
        <Profile 
          user={user!} 
          authEmail={authEmail} 
          userMesses={userMesses} 
          onSelectMess={(m) => enterMess(m, user?.id || '', user?.name || '')} 
          onLogout={handleLogout} 
          onPending={() => setIsPending(true)} 
        />
      );
      default: return <Dashboard {...commonProps} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden text-gray-100 bg-gray-950">
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
            hasActiveMess={!!messId}
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
