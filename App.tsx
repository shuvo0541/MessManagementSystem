
import React, { useState, useEffect, useMemo } from 'react';
import { getDB, saveDB, getCurrentMonthStr, getUserRoleInMonth } from './db';
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

const App: React.FC = () => {
  const [db, setDb] = useState<MessSystemDB>(() => getDB());
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    const session = sessionStorage.getItem('user');
    if (session) {
      const parsedUser = JSON.parse(session);
      const freshUser = db.users.find(u => u.id === parsedUser.id);
      if (freshUser) {
        setUser(freshUser);
      } else {
        setUser(parsedUser);
      }
    }
  }, [db.users]);

  const updateDB = (updates: Partial<MessSystemDB>) => {
    setDb(prev => {
      const next = { ...prev, ...updates };
      saveDB(next);
      return next;
    });
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    const freshDB = getDB();
    setDb(freshDB);
    setUser(loggedInUser);
    sessionStorage.setItem('user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    setUser(null);
    setView('dashboard');
  };

  const userRole = useMemo(() => {
    if (!user) return Role.MEMBER;
    return getUserRoleInMonth(db, user.id, selectedMonth);
  }, [user, selectedMonth, db]);

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
