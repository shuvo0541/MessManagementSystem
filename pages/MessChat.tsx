import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Role, ChatMessage, MessSystemDB } from '../types';
import { getUserRoleInMonth } from '../db';
import { 
  fetchMessMessages, 
  sendMessMessage, 
  deleteMessMessage, 
  subscribeToMessChatAndPresence,
  OnlineUser,
  playNotificationChime,
  showDesktopNotification,
  requestNotificationPermission,
  MESS_CHAT_SQL
} from '../utils/chatService';
import { setLastReadTime } from '../utils/notificationService';
import { 
  MessagesSquare, 
  Send, 
  Pin, 
  PinOff, 
  Trash2, 
  Copy, 
  Check, 
  Bell, 
  BellRing,
  PlusCircle, 
  X, 
  ShoppingBag, 
  UtensilsCrossed, 
  AlertCircle,
  Database,
  CheckCheck,
  ChevronDown,
  Info,
  Users
} from 'lucide-react';

interface MessChatProps {
  messId: string;
  messName: string;
  user: User;
  db: MessSystemDB;
  month: string;
  t: any;
  theme: string;
}

const MessChat: React.FC<MessChatProps> = ({
  messId,
  messName,
  user,
  db,
  month,
  t,
  theme
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'announcements'>('chat');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );
  
  // Announcement Form State
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [isPinned, setIsPinned] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Check if current user is admin or manager this month
  const userRole = useMemo(() => {
    if (!db || !user?.id) return Role.MEMBER;
    return getUserRoleInMonth(db, user.id, month);
  }, [db, user?.id, month]);

  const canPostAnnouncement = (user?.isAdmin || false) || userRole === Role.MANAGER;

  // Load initial messages and presence
  useEffect(() => {
    if (!messId || !user?.id) return;
    let isMounted = true;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    const loadMessages = async () => {
      setLoading(true);
      const res = await fetchMessMessages(messId);
      if (isMounted) {
        setMessages(res.data);
        setIsLocalFallback(res.isLocalFallback);
        setLoading(false);
        setLastReadTime(user.id, messId);
      }
    };

    loadMessages();

    // Subscribe to real-time events & live online presence
    const unsubscribe = subscribeToMessChatAndPresence(
      messId,
      user,
      (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Trigger notification & audio chime if message is from another member
        if (newMsg.user_id !== user.id) {
          playNotificationChime();

          const notifTitle = newMsg.message_type === 'announcement'
            ? `📢 নোটিশ: ${newMsg.metadata?.title || messName}`
            : newMsg.message_type === 'system'
            ? `⚡ ${newMsg.content}`
            : `💬 ${newMsg.user_name} (${messName})`;

          showDesktopNotification(notifTitle, newMsg.content);
        }
      },
      (deletedId) => {
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      },
      (presences) => {
        setOnlineUsers(presences);
      },
      'page'
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [messId, user?.id]);

  const handleRequestNotification = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (activeTab === 'chat' && !loading) {
      scrollToBottom('auto');
    }
  }, [messages.length, activeTab, loading]);

  // Handle sending a regular text message
  const handleSendMessage = async (textToSend?: string) => {
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
      setTimeout(() => scrollToBottom(), 50);
    }
    setIsSending(false);
  };

  // Handle posting a new announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementContent.trim()) return;

    setIsSending(true);
    const sent = await sendMessMessage(
      messId,
      user,
      announcementContent.trim(),
      'announcement',
      { title: announcementTitle.trim() },
      isPinned
    );

    if (sent) {
      setMessages((prev) => [...prev, sent]);
      setAnnouncementTitle('');
      setAnnouncementContent('');
      setShowAnnouncementModal(false);
    }
    setIsSending(false);
  };

  // Handle deleting a message
  const handleDelete = async (msgId: string) => {
    if (window.confirm(t.confirmDeleteMessage || 'Are you sure you want to delete this message?')) {
      await deleteMessMessage(msgId, messId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
  };

  // Copy message text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy SQL script
  const handleCopySql = () => {
    navigator.clipboard.writeText(MESS_CHAT_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  // Format time (e.g. 10:45 AM or localized)
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Filter announcements
  const announcements = useMemo(() => {
    return messages.filter((m) => m.message_type === 'announcement');
  }, [messages]);

  // Latest pinned announcement
  const pinnedAnnouncement = useMemo(() => {
    return announcements.slice().reverse().find((a) => a.is_pinned);
  }, [announcements]);

  // Quick message options
  const quickPrompts = [
    t?.quickPrompt1 || "আজকে কার কার মিল লাগবে?",
    t?.quickPrompt2 || "আজকের বাজার সম্পন্ন হয়েছে।",
    t?.quickPrompt3 || "জরুরি নোটিশ চেক করুন।"
  ];

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <MessagesSquare size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{t?.messChat || 'মেস চ্যাট'}</h2>
              {isLocalFallback && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  Local Mode
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-500 font-bold">{messName || 'মেস'} · {messages.length} মেসেজ</p>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{onlineUsers.length} {t?.onlineMembers || 'অনলাইন সদস্য'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t?.generalChat || 'সাধারণ চ্যাট'}
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                activeTab === 'announcements'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Bell size={13} className="text-amber-500" />
              {t?.announcements || 'নোটিশ বোর্ড'}
              {announcements.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-bold">
                  {announcements.length}
                </span>
              )}
            </button>
          </div>

          {/* Browser notification button */}
          <button
            onClick={handleRequestNotification}
            title={notificationPermission === 'granted' ? (t?.notificationsEnabled || 'সক্রিয়') : (t?.allowNotifications || 'নোটিফিকেশন')}
            className={`p-2.5 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
              notificationPermission === 'granted'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 animate-pulse'
            }`}
          >
            {notificationPermission === 'granted' ? <Bell size={16} /> : <BellRing size={16} />}
            <span className="hidden md:inline">{notificationPermission === 'granted' ? 'সক্রিয়' : 'নোটিফিকেশন'}</span>
          </button>

          {canPostAnnouncement && (
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              <PlusCircle size={15} />
              <span className="hidden sm:inline">{t?.postAnnouncement || 'নোটিশ দিন'}</span>
              <span className="sm:hidden">নোটিশ</span>
            </button>
          )}

          <button
            onClick={() => setShowSqlModal(true)}
            title={t?.viewSqlNotice || 'SQL সেটআপ'}
            className="p-2.5 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors"
          >
            <Database size={17} />
          </button>
        </div>
      </div>

      {/* Pinned Announcement Alert (Visible in chat tab if active) */}
      {activeTab === 'chat' && pinnedAnnouncement && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/40 p-4 rounded-2xl shadow-sm flex items-start gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5">
            <Pin size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                {t.pinned} · {pinnedAnnouncement.user_name}
              </span>
              <span className="text-[9px] text-amber-600/70 font-semibold">
                {formatTime(pinnedAnnouncement.created_at)}
              </span>
            </div>
            {pinnedAnnouncement.metadata?.title && (
              <h4 className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-100 mt-0.5">
                {pinnedAnnouncement.metadata.title}
              </h4>
            )}
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90 font-medium line-clamp-2 mt-0.5">
              {pinnedAnnouncement.content}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('announcements')}
            className="text-[10px] font-black text-amber-700 dark:text-amber-300 hover:underline shrink-0"
          >
            সব দেখুন →
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'chat' ? (
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col h-[650px] overflow-hidden">
          {/* Message Stream */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/50 dark:bg-gray-900/50"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400 font-bold text-xs">
                লোড হচ্ছে...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 p-6">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                  <MessagesSquare size={32} />
                </div>
                <h3 className="font-black text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                  {t.noMessagesYet}
                </h3>
                <p className="text-xs text-gray-500 max-w-sm">
                  মেসের প্রতিদিনের মিল, বাজার বা যেকোনো বিষয় নিয়ে এখানে সবার সাথে কথা বলুন।
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.user_id === user.id;
                const isSystem = msg.message_type === 'system';
                const isAnnouncement = msg.message_type === 'announcement';

                // Render Automated System Message
                if (isSystem) {
                  const isBazar = msg.metadata?.category === 'bazar';
                  const isMeal = msg.metadata?.category === 'meal';

                  return (
                    <div key={msg.id} className="flex justify-center my-3 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2.5 px-4 py-2 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 rounded-2xl max-w-lg text-center shadow-sm">
                        {isBazar ? (
                          <ShoppingBag size={15} className="text-green-600 dark:text-green-400 shrink-0" />
                        ) : isMeal ? (
                          <UtensilsCrossed size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        ) : (
                          <Info size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        )}
                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                          {msg.content}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono shrink-0">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Render Announcement Card within Stream
                if (isAnnouncement) {
                  return (
                    <div key={msg.id} className="flex justify-center my-4 animate-in zoom-in-95 duration-300">
                      <div className="w-full max-w-md bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 rounded-2xl p-4 shadow-md space-y-2">
                        <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
                          <div className="flex items-center gap-1.5 font-black text-xs">
                            <Pin size={14} className="text-amber-600" />
                            <span>{msg.metadata?.title || t.announcements}</span>
                          </div>
                          <span className="text-[9px] font-semibold text-amber-700/70">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        <div className="pt-1 flex items-center justify-between text-[10px] text-gray-500 border-t border-amber-200/50 dark:border-amber-800/40">
                          <span className="font-bold">{msg.user_name} ({msg.user_role === 'admin' ? 'এডমিন' : 'ম্যানেজার'})</span>
                          {(user.isAdmin || isMe) && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              className="text-red-500 hover:text-red-700 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Trash2 size={11} /> মুছে ফেলুন
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Render Regular WhatsApp/Messenger-style speech bubbles
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Other user avatar/initial */}
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mb-1 shadow-sm">
                        {(msg.user_name || 'U').slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div
                      className={`relative max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm transition-all ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-none'
                      }`}
                    >
                      {/* Sender Name header if from someone else */}
                      {!isMe && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">
                            {msg.user_name || 'সদস্য'}
                          </span>
                          {msg.user_role === 'admin' && (
                            <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-[8px] font-black uppercase">
                              Admin
                            </span>
                          )}
                        </div>
                      )}

                      {/* Message Text */}
                      <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>

                      {/* Timestamp & Status */}
                      <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>
                        <span>{formatTime(msg.created_at)}</span>
                        {isMe && <CheckCheck size={12} className="text-emerald-200" />}
                      </div>

                      {/* Hover action menu */}
                      <div className={`absolute top-1 ${isMe ? '-left-14' : '-right-14'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 rounded-xl shadow-lg z-10`}>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="Copy text"
                          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        </button>
                        {(isMe || user.isAdmin) && (
                          <button
                            onClick={() => handleDelete(msg.id)}
                            title="Delete"
                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Pills */}
          <div className="px-4 py-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 text-gray-600 dark:text-gray-300 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border border-transparent hover:border-emerald-300 active:scale-95 shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Message Input Bar */}
          <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t?.typeMessage || "মেসেজ লিখুন..."}
                  className="w-full bg-gray-100 dark:bg-gray-800/80 border border-transparent focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="w-11 h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20 active:scale-95 transition-all shrink-0"
              >
                <Send size={18} className="translate-x-0.5" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Notice Board View */
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-12 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center mx-auto">
                <Bell size={30} />
              </div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">{t?.noAnnouncementsYet || 'এখনো কোনো নোটিশ পোস্ট করা হয়নি।'}</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                এডমিন বা ম্যানেজার মেসের জরুরি নিয়মাবলী ও ঘোষণা এখানে পোস্ট করবেন।
              </p>
              {canPostAnnouncement && (
                <button
                  onClick={() => setShowAnnouncementModal(true)}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-amber-500/20 inline-flex items-center gap-2"
                >
                  <PlusCircle size={16} />
                  {t?.postAnnouncement || 'নোটিশ দিন'}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-gray-900 p-6 rounded-[2rem] border shadow-xl relative space-y-4 transition-all hover:shadow-2xl ${
                    item.is_pinned
                      ? 'border-amber-300 dark:border-amber-700/60 ring-2 ring-amber-400/10'
                      : 'border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      {item.is_pinned && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                          <Pin size={10} /> {t?.pinned || 'পিন করা'}
                        </span>
                      )}
                      <h4 className="text-base font-black text-gray-900 dark:text-white">
                        {item.metadata?.title || 'নোটিশ'}
                      </h4>
                    </div>

                    {(user?.isAdmin || item.user_id === user?.id) && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-pre-wrap leading-relaxed">
                    {item.content}
                  </p>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
                    <span className="font-bold text-gray-600 dark:text-gray-400">
                      পোস্টকারী: {item.user_name}
                    </span>
                    <span>{new Date(item.created_at).toLocaleDateString()} · {formatTime(item.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-md">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{t?.newAnnouncement || 'নতুন নোটিশ'}</h3>
                  <p className="text-[10px] text-gray-500 font-bold">মেসের সদস্যদের জন্য নোটিশ জারি করুন</p>
                </div>
              </div>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 dark:text-gray-300">{t?.announcementTitle || 'নোটিশের শিরোনাম'}</label>
                <input
                  type="text"
                  required
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="যেমন: মিল বন্ধের নিয়মাবলী বা ভাড়া প্রদানের তারিখ"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 dark:text-gray-300">{t?.announcementDesc || 'নোটিশের বিবরণ'}</label>
                <textarea
                  required
                  rows={4}
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="বিস্তারিত বর্ণনা লিখুন..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                />
                <label htmlFor="pinCheck" className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                  {t?.pinNotice || 'উপরে পিন করে রাখুন'}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {t?.closeModal || 'বন্ধ করুন'}
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-2xl font-black text-xs shadow-lg shadow-amber-500/20"
                >
                  {isSending ? 'পোস্ট হচ্ছে...' : (t?.send || 'পাঠান')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL Setup Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500 text-white rounded-2xl shadow-md">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{t?.sqlSetupTitle || 'Supabase SQL সেটআপ'}</h3>
                  <p className="text-[10px] text-gray-500 font-bold">Supabase Realtime সক্রিয় করতে SQL স্ক্রিপ্ট</p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-blue-50/70 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
              💡 <strong>টিপস:</strong> আপনি যদি Supabase-এ রিয়েলটাইম চ্যাট সিঙ্ক চালু করতে চান, নিচের কোডটি কপি করে আপনার Supabase প্রোজেক্টের <strong>SQL Editor</strong>-এ গিয়ে রান করুন। অ্যাপটি ইতিমধ্যেই ব্যাকআপ মোডে কাজ করছে।
            </div>

            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-60 border border-gray-800">
                {MESS_CHAT_SQL}
              </pre>
              <button
                onClick={handleCopySql}
                className="absolute top-3 right-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                {sqlCopied ? (t?.sqlCopied || 'কপি হয়েছে!') : (t?.copySql || 'কপি করুন')}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-black text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {t?.closeModal || 'বন্ধ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessChat;
