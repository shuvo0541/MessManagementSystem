import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { 
  MessNotificationItem, 
  fetchAllMessesNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../utils/notificationService';
import { 
  playNotificationChime, 
  showDesktopNotification, 
  requestNotificationPermission,
  MESS_CHAT_SQL
} from '../utils/chatService';
import { supabase } from '../supabase';
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
  UserCheck, 
  Clock, 
  Sparkles, 
  ExternalLink,
  CheckCircle2,
  Calendar,
  Building2,
  BellRing,
  Database,
  Copy,
  Check
} from 'lucide-react';

interface NotificationCenterProps {
  user: User;
  userMesses: Array<{ id: string; mess_name: string; admin_id?: string }>;
  currentMessId: string | null;
  onNavigateToMessChat: (messId: string, targetView?: string, targetTab?: string) => void;
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'announcement' | 'member' | 'chat' | 'activity'>('all');
  const [selectedNotif, setSelectedNotif] = useState<MessNotificationItem | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  const handleCopySql = () => {
    navigator.clipboard.writeText(MESS_CHAT_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  const panelRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number>(0);

  const loadNotifications = async (triggerSoundOnNew: boolean = false) => {
    if (!user || userMesses.length === 0) return;
    try {
      const res = await fetchAllMessesNotifications(userMesses, user.id);
      
      // If new unread notifications arrived and triggerSoundOnNew is requested
      if (triggerSoundOnNew && res.totalUnreadCount > prevCountRef.current) {
        playNotificationChime();
        const latest = res.notifications.find(n => !n.is_read);
        if (latest) {
          showDesktopNotification(
            latest.metadata?.title || latest.mess_name,
            latest.content
          );
        }
      }
      prevCountRef.current = res.totalUnreadCount;
      setNotifications(res.notifications);
      setTotalUnread(res.totalUnreadCount);
    } catch (e) {
      console.warn("Error loading notifications:", e);
    }
  };

  useEffect(() => {
    loadNotifications();

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }

    // Polling interval fallback
    const interval = setInterval(() => loadNotifications(true), 8000);

    // Supabase Realtime channel subscription for instant live alerts
    const channel = supabase.channel(`global-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mess_messages' },
        (payload: any) => {
          const newMsg = payload?.new;
          if (newMsg && newMsg.user_id !== user.id) {
            loadNotifications(true);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'join_requests' },
        () => {
          loadNotifications(true);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
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
    const notifIds = notifications.map(n => n.id);
    markAllNotificationsAsRead(user.id, messIds, notifIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setTotalUnread(0);
    prevCountRef.current = 0;
  };

  const handleItemClick = (item: MessNotificationItem) => {
    // 1. Mark as read immediately
    markNotificationAsRead(user.id, item.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
    );
    setTotalUnread((c) => Math.max(0, c - 1));

    // 2. Open detail view modal
    setSelectedNotif(item);
  };

  const handleActionNavigate = (item: MessNotificationItem) => {
    setSelectedNotif(null);
    setIsOpen(false);

    const category = item.metadata?.category;

    if (category === 'join_request') {
      // Go to Dashboard where pending requests card is located
      onNavigateToMessChat(item.mess_id, 'dashboard');
    } else if (category === 'join_approved') {
      // Enter the approved mess dashboard
      onNavigateToMessChat(item.mess_id, 'dashboard');
    } else if (item.message_type === 'announcement' || category === 'announcement') {
      // Go to mess chat announcements tab
      onNavigateToMessChat(item.mess_id, 'mess-chat', 'announcements');
    } else {
      // Go to general mess chat
      onNavigateToMessChat(item.mess_id, 'mess-chat', 'chat');
    }
  };

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
  };

  const filteredList = notifications.filter((item) => {
    const cat = item.metadata?.category;
    if (activeFilter === 'announcement') {
      return item.message_type === 'announcement' || cat === 'announcement';
    }
    if (activeFilter === 'member') {
      return cat === 'member_join' || cat === 'join_request' || cat === 'join_approved';
    }
    if (activeFilter === 'chat') {
      return item.message_type === 'text' && !cat;
    }
    if (activeFilter === 'activity') {
      return cat === 'bazar' || cat === 'meal';
    }
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

  const formatFullDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
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
        className={`relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all active:scale-95 ${
          totalUnread > 0
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700/60 shadow-md shadow-blue-500/10'
            : 'bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
        }`}
        title="বিজ্ঞপ্তি কেন্দ্র (Notifications)"
        aria-label="Notifications"
      >
        <Bell size={18} className={`sm:w-5 sm:h-5 ${totalUnread > 0 ? 'animate-bounce' : ''}`} />

        {totalUnread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-md animate-pulse">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="fixed sm:absolute top-16 sm:top-14 right-2 sm:right-0 z-50 w-[95vw] sm:w-[440px] max-h-[85vh] sm:max-h-[600px] bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                <Bell size={16} />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-gray-900 dark:text-white leading-tight">
                  বিজ্ঞপ্তি কেন্দ্র
                </h3>
                <p className="text-[10px] text-gray-400 font-bold">নোটিশ, চ্যাট ও মেম্বার আপডেট</p>
              </div>
              {totalUnread > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-black border border-red-200 dark:border-red-900/50">
                  {totalUnread} নতুন
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSqlModal(true)}
                title="Supabase Realtime SQL কোড দেখুন ও কপি করুন"
                className="p-1.5 text-gray-400 hover:text-blue-500 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Database size={15} />
              </button>

              {permission !== 'granted' && (
                <button
                  onClick={handleRequestPermission}
                  title="নোটিফিকেশন অনুমতি দিন"
                  className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl text-xs font-bold transition-all"
                >
                  <BellRing size={16} />
                </button>
              )}
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
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-gray-50/70 dark:bg-gray-900/70">
            {[
              { id: 'all', label: 'সকল' },
              { id: 'announcement', label: '📢 নোটিশ' },
              { id: 'member', label: '👥 মেম্বার' },
              { id: 'chat', label: '💬 চ্যাট' },
              { id: 'activity', label: '📊 মিল ও বাজার' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all ${
                  activeFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
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
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center">
                  <Bell size={24} />
                </div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">কোনো বিজ্ঞপ্তি নেই</p>
                <p className="text-[11px] text-gray-400 max-w-xs">
                  মেসে কোনো নতুন নোটিশ, চ্যাট মেসেজ বা মেম্বার আপডেট আসলে এখানে বিস্তারিত দেখতে পাবেন।
                </p>
              </div>
            ) : (
              filteredList.map((item) => {
                const category = item.metadata?.category;
                const isAnnouncement = item.message_type === 'announcement' || category === 'announcement';
                const isJoinRequest = category === 'join_request';
                const isApproved = category === 'join_approved';
                const isMemberJoin = category === 'member_join';
                const isBazar = category === 'bazar';
                const isMeal = category === 'meal';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-4 flex items-start gap-3.5 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 relative group ${
                      !item.is_read
                        ? 'bg-blue-50/40 dark:bg-blue-950/20'
                        : ''
                    }`}
                  >
                    {/* Icon based on notification category */}
                    <div className="shrink-0 mt-0.5">
                      {isJoinRequest ? (
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                          <UserCheck size={16} />
                        </div>
                      ) : isApproved ? (
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                          <CheckCircle2 size={16} />
                        </div>
                      ) : isAnnouncement ? (
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
                          <Pin size={16} />
                        </div>
                      ) : isMemberJoin ? (
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
                          <UserPlus size={16} />
                        </div>
                      ) : isBazar ? (
                        <div className="w-9 h-9 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center border border-green-500/20">
                          <ShoppingBag size={16} />
                        </div>
                      ) : isMeal ? (
                        <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                          <UtensilsCrossed size={16} />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                          <MessagesSquare size={16} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 truncate">
                          {item.mess_name}
                        </span>
                        <span className="text-[9px] text-gray-400 shrink-0 font-medium">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>

                      {/* Title if available */}
                      {item.metadata?.title ? (
                        <h5 className="text-xs font-black text-gray-900 dark:text-white truncate">
                          {item.metadata.title}
                        </h5>
                      ) : isJoinRequest ? (
                        <h5 className="text-xs font-black text-gray-900 dark:text-white">
                          নতুন মেম্বার আবেদন
                        </h5>
                      ) : isAnnouncement ? (
                        <h5 className="text-xs font-black text-gray-900 dark:text-white">
                          মেস নোটিশ
                        </h5>
                      ) : null}

                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>

                      <div className="flex items-center gap-2 pt-0.5 text-[9px] text-gray-400 font-bold">
                        <span>{item.user_name}</span>
                        <span>•</span>
                        <span className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5 group-hover:underline">
                          বিস্তারিত দেখুন <ChevronRight size={10} />
                        </span>
                      </div>
                    </div>

                    {/* Unread indicator dot */}
                    {!item.is_read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Full Notification Detail Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  {selectedNotif.metadata?.category === 'join_request' ? (
                    <UserCheck size={24} className="text-amber-500" />
                  ) : selectedNotif.metadata?.category === 'join_approved' ? (
                    <CheckCircle2 size={24} className="text-emerald-500" />
                  ) : selectedNotif.message_type === 'announcement' ? (
                    <Pin size={24} className="text-rose-500" />
                  ) : selectedNotif.metadata?.category === 'member_join' ? (
                    <UserPlus size={24} className="text-teal-500" />
                  ) : selectedNotif.metadata?.category === 'bazar' ? (
                    <ShoppingBag size={24} className="text-green-500" />
                  ) : selectedNotif.metadata?.category === 'meal' ? (
                    <UtensilsCrossed size={24} className="text-purple-500" />
                  ) : (
                    <MessagesSquare size={24} className="text-blue-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {selectedNotif.metadata?.category === 'join_request'
                        ? 'মেম্বার আবেদন'
                        : selectedNotif.metadata?.category === 'join_approved'
                        ? 'আবেদন অনুমোদিত'
                        : selectedNotif.message_type === 'announcement'
                        ? 'মেস নোটিশ'
                        : selectedNotif.metadata?.category === 'member_join'
                        ? 'নতুন সদস্য'
                        : selectedNotif.metadata?.category === 'bazar'
                        ? 'বাজার আপডেট'
                        : selectedNotif.metadata?.category === 'meal'
                        ? 'মিল আপডেট'
                        : 'চ্যাট বার্তা'}
                    </span>
                    <span className="text-xs text-gray-500 font-bold flex items-center gap-1">
                      <Building2 size={12} /> {selectedNotif.mess_name}
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-1">
                    {selectedNotif.metadata?.title || 'বিজ্ঞপ্তির বিবরণ'}
                  </h4>
                </div>
              </div>

              <button
                onClick={() => setSelectedNotif(null)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Author and Date Meta Bar */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="font-bold text-gray-700 dark:text-gray-300">
                প্রেরক: {selectedNotif.user_name}
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <Calendar size={12} /> {formatFullDate(selectedNotif.created_at)}
              </span>
            </div>

            {/* Full Content Body */}
            <div className="p-4 bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-2xl max-h-64 overflow-y-auto">
              <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium leading-relaxed whitespace-pre-wrap">
                {selectedNotif.content}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="px-5 py-2.5 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                বন্ধ করুন
              </button>

              <button
                type="button"
                onClick={() => handleActionNavigate(selectedNotif)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>
                  {selectedNotif.metadata?.category === 'join_request'
                    ? 'আবেদন অনুমোদন করতে যান'
                    : selectedNotif.metadata?.category === 'join_approved'
                    ? 'মেসে প্রবেশ করুন'
                    : selectedNotif.message_type === 'announcement'
                    ? 'নোটিশ বোর্ডে যান'
                    : selectedNotif.metadata?.category === 'member_join'
                    ? 'চ্যাটে শুভেচ্ছা জানান'
                    : 'চ্যাটে যান ও রিপ্লাই দিন'}
                </span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Setup Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Supabase SQL সেটআপ কোড</h3>
                  <p className="text-[10px] text-gray-500 font-bold">নোটিফিকেশন ও রিয়েলটাইম চ্যাট সিঙ্ক সচল করতে এই কোড রান করুন</p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-blue-50/70 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
              💡 <strong>কীভাবে রান করবেন:</strong> আপনার <strong>Supabase Dashboard</strong>-এ লগইন করে বাম পাশের মেনু থেকে <strong>SQL Editor</strong>-এ যান, <strong>New Query</strong>-তে ক্লিক করে নিচের কোডটি পেস্ট করুন এবং <strong>Run</strong> বাটনে চাপ দিন। এতে সব মেম্বার ও এডমিনের নোটিফিকেশন রিয়েলটাইমে কাজ করবে।
            </div>

            <div className="relative">
              <pre className="bg-gray-950 text-gray-100 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-60 border border-gray-800">
                {MESS_CHAT_SQL}
              </pre>
              <button
                onClick={handleCopySql}
                className="absolute top-3 right-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                {sqlCopied ? <Check size={14} /> : <Copy size={14} />}
                {sqlCopied ? 'কপি হয়েছে!' : 'SQL কোড কপি করুন'}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-black text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
