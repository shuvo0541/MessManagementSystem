import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage } from '../types';
import { 
  fetchMessMessages, 
  sendMessMessage, 
  deleteMessMessage, 
  subscribeToMessChatAndPresence, 
  OnlineUser,
  playNotificationChime,
  showDesktopNotification,
  requestNotificationPermission
} from '../utils/chatService';
import { setLastReadTime } from '../utils/notificationService';
import { 
  MessagesSquare, 
  X, 
  Maximize2, 
  Send, 
  Bell, 
  BellRing, 
  CheckCheck, 
  ShoppingBag, 
  UtensilsCrossed, 
  Info,
  Users,
  ChevronDown
} from 'lucide-react';

interface FloatingChatWidgetProps {
  messId: string;
  messName: string;
  user: User;
  currentView: string;
  onOpenFullChat: () => void;
  t: any;
  theme: string;
}

const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  messId,
  messName,
  user,
  currentView,
  onOpenFullChat,
  t,
  theme
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  // Check if we should prompt for notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      const hasDismissed = sessionStorage.getItem('MESS_NOTIF_DISMISSED');
      if (Notification.permission === 'default' && !hasDismissed) {
        // Show after a brief delay so user experiences the app first
        const t = setTimeout(() => setShowPermissionPrompt(true), 3000);
        return () => clearTimeout(t);
      }
    }
  }, []);

  // Subscribe to real-time messages & presence
  useEffect(() => {
    if (!messId || !user?.id || currentView === 'mess-chat') return;

    // Load initial messages
    fetchMessMessages(messId).then((res) => {
      setMessages(res.data);
    });

    const unsubscribe = subscribeToMessChatAndPresence(
      messId,
      user,
      (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // If message is from someone else:
        if (newMsg.user_id !== user.id) {
          playNotificationChime();

          // Show browser desktop notification
          const notifTitle = newMsg.message_type === 'announcement'
            ? `📢 নোটিশ: ${newMsg.metadata?.title || messName}`
            : newMsg.message_type === 'system'
            ? `⚡ ${newMsg.content}`
            : `💬 ${newMsg.user_name} (${messName})`;

          const notifBody = newMsg.content;
          showDesktopNotification(notifTitle, notifBody);

          // If popup is closed or user is on another page, increment unread badge
          if (!isOpenRef.current) {
            setUnreadCount((c) => c + 1);
          }
        }
      },
      (deletedId) => {
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      },
      (updatedPresences) => {
        setOnlineUsers(updatedPresences);
      },
      'floating'
    );

    return () => {
      unsubscribe();
    };
  }, [messId, user?.id, currentView]);

  // Reset unread count when opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setLastReadTime(user.id, messId);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [isOpen, messages.length]);

  // Request browser notification permission
  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    setShowPermissionPrompt(false);
  };

  const handleDismissPermission = () => {
    sessionStorage.setItem('MESS_NOTIF_DISMISSED', 'true');
    setShowPermissionPrompt(false);
  };

  // Send message
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText('');

    const sent = await sendMessMessage(messId, user, text, 'text');
    if (sent) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
    setIsSending(false);
  };

  // Format time
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // If user is already on the full MessChat page, hide the floating widget
  if (currentView === 'mess-chat') {
    return null;
  }

  // Filter other online members (excluding self)
  const otherOnlineUsers = onlineUsers.filter((u) => u.user_id !== user.id);

  return (
    <>
      {/* Notification Permission Banner / Prompt Modal */}
      {showPermissionPrompt && (
        <div className="fixed bottom-24 right-4 sm:right-8 z-50 max-w-sm w-full bg-white dark:bg-gray-900 border border-emerald-500/30 p-5 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-md shrink-0">
              <BellRing size={20} />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                {t.notificationPermissionTitle}
              </h4>
              <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                {t.notificationPermissionDesc}
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleEnableNotifications}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  {t.allowNotifications}
                </button>
                <button
                  onClick={handleDismissPermission}
                  className="px-3 py-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs font-bold"
                >
                  {t.later}
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissPermission}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button (When Closed) */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2">
          {/* Active online user pill on button hover */}
          {onlineUsers.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-800 shadow-lg text-[10px] font-black text-gray-700 dark:text-gray-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{onlineUsers.length} {t.activeCount}</span>
            </div>
          )}

          <button
            onClick={() => setIsOpen(true)}
            className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white flex items-center justify-center shadow-2xl shadow-emerald-600/30 active:scale-95 transition-all group"
            title={t.quickChat}
          >
            <MessagesSquare size={26} className="group-hover:scale-110 transition-transform" />
            
            {/* Unread count badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-[11px] font-black flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-md animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}

            {/* Online presence dot */}
            <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-900" />
          </button>
        </div>
      )}

      {/* Floating Chat Box (When Open) */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 w-[92vw] sm:w-[390px] h-[540px] max-h-[85vh] bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <MessagesSquare size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-xs sm:text-sm truncate leading-tight">
                  {t.messChat} · {messName}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-100 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  <span>{onlineUsers.length} {t.onlineMembers}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Notification toggle */}
              <button
                onClick={handleEnableNotifications}
                title={notificationPermission === 'granted' ? t.notificationsEnabled : t.allowNotifications}
                className={`p-1.5 rounded-lg transition-colors ${
                  notificationPermission === 'granted'
                    ? 'text-emerald-200 hover:text-white'
                    : 'text-amber-200 hover:bg-white/10'
                }`}
              >
                {notificationPermission === 'granted' ? <Bell size={16} /> : <BellRing size={16} />}
              </button>

              {/* Full view button */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenFullChat();
                }}
                title={t.openFullChat}
                className="p-1.5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                <Maximize2 size={16} />
              </button>

              {/* Close/Minimize */}
              <button
                onClick={() => setIsOpen(false)}
                title={t.minimize}
                className="p-1.5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Active online members horizontal strip */}
          {otherOnlineUsers.length > 0 && (
            <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400 shrink-0">
                {t.activeNow}:
              </span>
              {otherOnlineUsers.map((u) => (
                <div
                  key={u.user_id}
                  className="flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-gray-800 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs shrink-0"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 max-w-[80px] truncate">
                    {u.user_name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-gray-50/60 dark:bg-gray-900/60">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 text-gray-400">
                <MessagesSquare size={32} className="mb-2 opacity-40 text-emerald-500" />
                <p className="text-xs font-bold">{t.noMessagesYet}</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.user_id === user.id;
                const isSystem = msg.message_type === 'system';
                const isAnnouncement = msg.message_type === 'announcement';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-1.5">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-800/40 rounded-xl text-[10px] font-bold text-blue-700 dark:text-blue-300 max-w-[90%] text-center">
                        <Info size={12} className="shrink-0" />
                        <span className="truncate">{msg.content}</span>
                      </div>
                    </div>
                  );
                }

                if (isAnnouncement) {
                  return (
                    <div key={msg.id} className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/50 rounded-2xl space-y-1">
                      <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 text-[10px] font-black">
                        <span>📢 {msg.metadata?.title || t.announcements}</span>
                        <span className="text-[8px] text-amber-600/70">{formatTime(msg.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-3 font-medium">
                        {msg.content}
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMe && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mb-0.5 shadow-xs">
                        {(msg.user_name || 'U').slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-xs ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-none'
                      }`}
                    >
                      {!isMe && (
                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 mb-0.5">
                          {msg.user_name || 'সদস্য'}
                        </p>
                      )}
                      <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <div className={`flex items-center justify-end gap-1 mt-0.5 text-[8px] ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>
                        <span>{formatTime(msg.created_at)}</span>
                        {isMe && <CheckCheck size={10} />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-1.5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {[t.quickPrompt1 || "মিল লাগবে?", t.quickPrompt2 || "বাজার সম্পন্ন"].map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p)}
                className="px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 hover:text-emerald-600 text-gray-600 dark:text-gray-300 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-2.5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t.typeMessage || "মেসেজ লিখুন..."}
                className="flex-1 bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-emerald-500 text-gray-900 dark:text-white px-3 py-2 rounded-xl text-xs font-medium outline-none transition-all placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="w-8 h-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0"
              >
                <Send size={14} className="translate-x-0.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChatWidget;
