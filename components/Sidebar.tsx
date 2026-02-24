
import React from 'react';
import { Role } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  UtensilsCrossed, 
  ShoppingBag, 
  FileBarChart, 
  LogOut,
  Home,
  TableProperties,
  LineChart as LineChartIcon,
  LayoutGrid,
  User as UserIcon,
  CircleDollarSign,
  Settings as SettingsIcon
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  onSwitchMess: () => void;
  isAdmin: boolean;
  role: Role;
  hasActiveMess: boolean;
  t: any;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onLogout, onSwitchMess, isAdmin, role, hasActiveMess, t }) => {
  const menuItems = [
    { id: 'profile', label: t.profile, icon: UserIcon, show: true },
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard, show: hasActiveMess },
    { id: 'personal-account', label: t.personalAccount, icon: CircleDollarSign, show: hasActiveMess },
    { id: 'members', label: t.members, icon: Users, show: hasActiveMess },
    { id: 'meals', label: t.meals, icon: UtensilsCrossed, show: hasActiveMess },
    { id: 'bazar', label: t.bazar, icon: ShoppingBag, show: hasActiveMess },
    { id: 'utility', label: t.roomAndUtility, icon: Home, show: hasActiveMess },
    { id: 'meal-bazar-ledger', label: t.mealBazarLedger, icon: TableProperties, show: hasActiveMess },
    { id: 'analytics', label: t.analytics, icon: LineChartIcon, show: hasActiveMess },
    { id: 'reports', label: t.reports, icon: FileBarChart, show: hasActiveMess },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 shadow-sm lg:shadow-none">
      {/* Brand Header - Clickable to Profile */}
      <div 
        onClick={() => onViewChange('profile')}
        className="p-6 md:p-8 border-b border-gray-50 dark:border-gray-700 shrink-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all active:scale-95 group"
      >
        <h1 className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-2xl text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
            <UtensilsCrossed size={28} />
          </div>
          <span className="group-hover:text-blue-500 transition-colors">{t.appName}</span>
        </h1>
      </div>
      
      <nav className="flex-1 p-4 md:p-6 space-y-2 overflow-y-auto">
        {menuItems.filter(item => item.show).map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
              currentView === item.id
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 font-black'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 font-bold'
            }`}
          >
            <item.icon size={20} className={currentView === item.id ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
            <span className="truncate text-sm uppercase tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-gray-50 dark:border-gray-700 shrink-0 space-y-3">
        {hasActiveMess && (
          <button
            onClick={onSwitchMess}
            className="w-full flex items-center gap-4 px-5 py-3.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-2xl transition-all font-black text-xs uppercase tracking-wider"
          >
            <LayoutGrid size={20} />
            {t.switchMess}
          </button>
        )}
        <button
          onClick={() => onViewChange('settings')}
          className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
            currentView === 'settings'
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 font-black'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 font-bold'
          }`}
        >
          <SettingsIcon size={20} className={currentView === 'settings' ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
          <span className="truncate text-sm uppercase tracking-wide">{t.settings}</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-5 py-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all font-black text-xs uppercase tracking-wider"
        >
          <LogOut size={20} />
          {t.logout}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
