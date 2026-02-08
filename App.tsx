
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
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { supabase } from './supabase';
import { Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';

const App: React.FC = () => {
  const [db, setDb] = useState<MessSystemDB>(INITIAL_DB);
  const [user, setUser] = useState<User | null>(null);
  const [messId, setMessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [view, setView] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session) {
          const activeMessId = localStorage.getItem('ACTIVE_MESS_ID');
          if (activeMessId) {
            const remoteDB = await fetchMessDB(activeMessId);
            setDb(remoteDB);
            setMessId(activeMessId);
            
            const sessionUserStr = sessionStorage.getItem('user');
            if (sessionUserStr) {
                const sessionUser = JSON.parse(sessionUserStr);
                const freshUser = remoteDB.users.find(u => u.id === sessionUser.id || u.username === sessionUser.username);
                if (freshUser) setUser(freshUser);
            }
          }
        }
      } catch (err: any) {
        console.error("Initialization Error:", err);
        setInitError(err.message || "অ্যাপলোড করতে সমস্যা হচ্ছে।");
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

  const handleLoginSuccess = async (loggedInUser: User, activeMessId: string) => {
    try {
      setLoading(true);
      const remoteDB = await fetchMessDB(activeMessId);
      setDb(remoteDB);
      setMessId(activeMessId);
      setUser(loggedInUser);
      localStorage.setItem('ACTIVE_MESS_ID', activeMessId);
      sessionStorage.setItem('user', JSON.stringify(loggedInUser));
    } catch (err: any) {
      alert("ডাটাবেস কানেক্ট করা যাচ্ছে না। দয়া করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('user');
    localStorage.removeItem('ACTIVE_MESS_ID');
    setUser(null);
    setMessId(null);
    setView('dashboard');
  };

  const userRole = useMemo(() => {
    if (!user) return Role.MEMBER;
    return getUserRoleInMonth(db, user.id, selectedMonth);
  }, [user, selectedMonth, db]);

  if (loading) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">আপনার ডাটা লোড হচ্ছে...</p>
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
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
        >
          <RefreshCcw size={18} /> রিফ্রেশ করুন
        </button>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  const renderContent = () => {
    const commonProps = { db, updateDB, month: selectedMonth };
    switch (view) {
      case 'dashboard': return <Dashboard {...commonProps} />;
      case 'members': return <Members {...commonProps} isAdmin={user.isAdmin} />;
      case 'utility': return <UtilityRoom {...commonProps} />;
      case 'meal-bazar-ledger': return <MealBazarLedger {...commonProps} />;
      case 'analytics': return <Analytics db={db} />;
      case 'meals': return <MealEntry {...commonProps} role={userRole} userId={user.id} isAdmin={user.isAdmin} />;
      case 'bazar': return <BazarEntry {...commonProps} userId={user.id} isAdmin={user.isAdmin} />;
      case 'reports': return <Reports {...commonProps} />;
      default: return <Dashboard {...commonProps} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden text-gray-100 bg-gray-950">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm animate-in fade-in duration-300 no-print"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] no-print
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        w-72 lg:w-80 flex-shrink-0
      `}>
        <Sidebar 
          currentView={view} 
          onViewChange={(v) => { setView(v); setIsSidebarOpen(false); }} 
          onLogout={handleLogout}
          isAdmin={user.isAdmin}
          role={userRole}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="no-print">
          <Header 
            user={user} 
            role={userRole}
            selectedMonth={selectedMonth} 
            onMonthChange={setSelectedMonth} 
            onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
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
