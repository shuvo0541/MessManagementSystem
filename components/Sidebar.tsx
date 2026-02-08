
import React from 'react';
import { T } from '../translations';
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
  LineChart as LineChartIcon
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  isAdmin: boolean;
  role: Role;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onLogout, isAdmin, role }) => {
  const menuItems = [
    { id: 'dashboard', label: T.dashboard, icon: LayoutDashboard, show: true },
    { id: 'members', label: T.members, icon: Users, show: isAdmin },
    { id: 'meals', label: T.meals, icon: UtensilsCrossed, show: true },
    { id: 'bazar', label: T.bazar, icon: ShoppingBag, show: true },
    { id: 'utility', label: 'রুম ও ইউটিলিটি', icon: Home, show: true },
    { id: 'meal-bazar-ledger', label: T.mealBazarLedger, icon: TableProperties, show: true },
    { id: 'analytics', label: T.analytics, icon: LineChartIcon, show: true },
    { id: 'reports', label: T.reports, icon: FileBarChart, show: true },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 shadow-sm lg:shadow-none">
      <div className="p-6 md:p-8 border-b border-gray-50 dark:border-gray-700 shrink-0">
        <h1 className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-2">
          <UtensilsCrossed size={32} />
          {T.appName}
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

      <div className="p-6 border-t border-gray-50 dark:border-gray-700 shrink-0">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-5 py-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all font-black text-sm uppercase tracking-wider"
        >
          <LogOut size={20} />
          {T.logout}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
