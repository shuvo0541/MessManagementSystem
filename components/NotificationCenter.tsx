import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { 
  MessNotificationItem, 
  fetchAllMessesNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../utils/notificationService';
import { 
  Bell, 
  CheckCheck, 
  X, 
  UserPlus, 
  ShoppingBag, 
  UtensilsCrossed, 
  Pin, 
  MessagesSquare, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface NotificationCenterProps {
  user: User;
  userMesses: Array<{ id: string; mess_name: string }>;
  currentMessId: string | null;
  onNavigateToMessChat: (messId: string) => void;
  t: any;
  theme: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  user,
  userMesses,
  currentMessId,
  onNavigateToMessChat,
  t,
  theme
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<MessNotificationItem[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'announcement' | 'member' | 'chat'>('all');
  const [loading, setLoading] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (!user || userMesses.length === 0) return;
    const res = await fetchAllMessesNotifications(userMesses, user.id);
    setNotifications(res.notifications);
    setTotalUnread(res.totalUnreadCount);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000); // sync every 10s
    return () => clearInterval(interval);
  }, [user?.id, userMesses.length]);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = () => {
    const messIds = userMesses.map((m) => m.id);
    markAllNotificationsAsRead(user.id, messIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setTotalUnread(0);
  };

  const handleItemClick = (item: MessNotificationItem) => {
    markNotificationAsRead(user.id, item.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
    );
    setTotalUnread((c) => Math.max(0, c - 1));
    setIsOpen(false);
    onNavigateToMessChat(item.mess_id);
  };

  const filteredList = notifications.filter((item) => {
    if (activeFilter === 'announcement') return item.message_type === 'announcement';
    if (activeFilter === 'member') return item.metadata?.category === 'member_join';
    if (activeFilter === 'chat') return item.message_type === 'text';
    return true;
  });

  // Localized time helper
  const formatTimeAgo = (isoString: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return 'এইমাত্র';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} মিনিট আগে`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ঘণ্টা আগে`;
      return `${Math.floor(diffSec / 86400)} দিন আগে`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className="relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/60 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-95"
        title="বিজ্ঞপ্তি"
      >
        <Bell size={18} className="sm:w-5 sm:h-5" />

        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-md animate-pulse">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="fixed sm:absolute top-16 sm:top-14 right-2 sm:right-0 z-50 w-[95vw] sm:w-[420px] max-h-[85vh] sm:max-h-[580px] bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base text-gray-900 dark:text-white">
                বিজ্ঞপ্তি
              </h3>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-black border border-red-200 dark:border-red-900/50">
                  {totalUnread} নতুন
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {totalUnread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 active:scale-95"
                >
                  <CheckCheck size={13} />
                  সব পড়া হয়েছে
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
            {[
              { id: 'all', label: 'সকল' },
              { id: 'announcement', label: '📢 নোটিশ' },
              { id: 'member', label: '🎉 মেম্বার' },
              { id: 'chat', label: '💬 চ্যাট' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1 rounded-xl text-[11px] font-black whitespace-nowrap transition-all ${
                  activeFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60 bg-white dark:bg-gray-900">
            {filteredList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center">
                  <Bell size={22} />
                </div>
                <p className="text-xs font-bold text-gray-500">কোনো নতুন বিজ্ঞপ্তি নেই</p>
              </div>
            ) : (
              filteredList.map((item) => {
                const isAnnouncement = item.message_type === 'announcement';
                const isMemberJoin = item.metadata?.category === 'member_join';
                const isBazar = item.metadata?.category === 'bazar';
                const isMeal = item.metadata?.category === 'meal';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 sm:p-4 flex items-start gap-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 relative group ${
                      !item.is_read
                        ? 'bg-blue-50/30 dark:bg-blue-950/20'
                        : ''
                    }`}
                  >
                    {/* Icon based on notification category */}
                    <div className="shrink-0 mt-0.5">
                      {isAnnouncement ? (
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                          <Pin size={15} />
                        </div>
                      ) : isMemberJoin ? (
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                          <UserPlus size={15} />
                        </div>
                      ) : isBazar ? (
                        <div className="w-8 h-8 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center border border-green-500/20">
                          <ShoppingBag size={15} />
                        </div>
                      ) : isMeal ? (
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                          <UtensilsCrossed size={15} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                          <MessagesSquare size={15} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 truncate">
                          {item.mess_name}
                        </span>
                        <span className="text-[9px] text-gray-400 shrink-0 font-medium">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>

                      {item.metadata?.title && (
                        <h5 className="text-xs font-black text-gray-900 dark:text-white truncate">
                          {item.metadata.title}
                        </h5>
                      )}

                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    </div>

                    {/* Unread indicator dot */}
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
