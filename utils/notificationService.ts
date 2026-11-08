import { supabase } from '../supabase';
import { ChatMessage, User } from '../types';
import { sendMessMessage, playNotificationChime, showDesktopNotification } from './chatService';

export interface MessNotificationItem {
  id: string;
  mess_id: string;
  mess_name: string;
  user_id: string;
  user_name: string;
  message_type: 'text' | 'announcement' | 'system';
  content: string;
  metadata?: Record<string, any>;
  is_pinned?: boolean;
  created_at: string;
  is_read: boolean;
}

/**
 * Get the ISO timestamp of when the user last viewed messages in a mess
 */
export const getLastReadTime = (userId: string, messId: string): string => {
  if (!userId || !messId) return new Date(0).toISOString();
  try {
    return localStorage.getItem(`LAST_READ_${userId}_${messId}`) || new Date(0).toISOString();
  } catch (e) {
    return new Date(0).toISOString();
  }
};

/**
 * Set the last read timestamp for a specific mess
 */
export const setLastReadTime = (userId: string, messId: string): void => {
  if (!userId || !messId) return;
  try {
    localStorage.setItem(`LAST_READ_${userId}_${messId}`, new Date().toISOString());
  } catch (e) {}
};

/**
 * Get individual read notification IDs
 */
export const getReadNotificationIds = (userId: string): Set<string> => {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(`READ_NOTIFS_${userId}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
};

/**
 * Mark a single notification item as read
 */
export const markNotificationAsRead = (userId: string, notifId: string): void => {
  if (!userId || !notifId) return;
  try {
    const readSet = getReadNotificationIds(userId);
    readSet.add(notifId);
    localStorage.setItem(`READ_NOTIFS_${userId}`, JSON.stringify(Array.from(readSet).slice(-200)));
  } catch (e) {}
};

/**
 * Mark all notifications as read across messes
 */
export const markAllNotificationsAsRead = (userId: string, messIds: string[]): void => {
  if (!userId) return;
  const now = new Date().toISOString();
  messIds.forEach((mId) => {
    try {
      localStorage.setItem(`LAST_READ_${userId}_${mId}`, now);
    } catch (e) {}
  });
};

/**
 * Fetch and aggregate notifications across all messes that a user belongs to
 */
export const fetchAllMessesNotifications = async (
  userMesses: Array<{ id: string; mess_name: string }>,
  userId: string
): Promise<{
  notifications: MessNotificationItem[];
  unreadCountsByMess: Record<string, number>;
  totalUnreadCount: number;
}> => {
  if (!userMesses || userMesses.length === 0 || !userId) {
    return { notifications: [], unreadCountsByMess: {}, totalUnreadCount: 0 };
  }

  const messIds = userMesses.map((m) => m.id);
  const messNameMap = new Map(userMesses.map((m) => [m.id, m.mess_name]));
  const readSet = getReadNotificationIds(userId);

  try {
    const { data, error } = await supabase
      .from('mess_messages')
      .select('*')
      .in('mess_id', messIds)
      .order('created_at', { ascending: false })
      .limit(60);

    let rawList: any[] = data || [];

    // If supabase query failed or table doesn't exist, check local storage for each mess
    if (error || rawList.length === 0) {
      rawList = [];
      messIds.forEach((mId) => {
        try {
          const raw = localStorage.getItem(`MESS_CHAT_${mId}`);
          if (raw) {
            rawList.push(...JSON.parse(raw));
          }
        } catch (e) {}
      });
      rawList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const unreadCountsByMess: Record<string, number> = {};
    messIds.forEach((mId) => (unreadCountsByMess[mId] = 0));

    const notifications: MessNotificationItem[] = rawList.map((msg) => {
      const lastRead = getLastReadTime(userId, msg.mess_id);
      const isReadByTime = new Date(msg.created_at) <= new Date(lastRead);
      const isIndividuallyRead = readSet.has(msg.id);
      const isOwnMessage = msg.user_id === userId;
      const isRead = isOwnMessage || isReadByTime || isIndividuallyRead;

      if (!isRead) {
        unreadCountsByMess[msg.mess_id] = (unreadCountsByMess[msg.mess_id] || 0) + 1;
      }

      return {
        id: msg.id,
        mess_id: msg.mess_id,
        mess_name: messNameMap.get(msg.mess_id) || 'Mess',
        user_id: msg.user_id,
        user_name: msg.user_name || 'সদস্য',
        message_type: msg.message_type,
        content: msg.content,
        metadata: msg.metadata || {},
        is_pinned: msg.is_pinned || false,
        created_at: msg.created_at,
        is_read: isRead
      };
    });

    const totalUnreadCount = Object.values(unreadCountsByMess).reduce((sum, count) => sum + count, 0);

    return {
      notifications,
      unreadCountsByMess,
      totalUnreadCount
    };
  } catch (err) {
    console.warn("fetchNotifications error:", err);
    return { notifications: [], unreadCountsByMess: {}, totalUnreadCount: 0 };
  }
};

/**
 * Send an automated welcome notification to chat and push notification when a new member joins
 */
export const sendSystemMemberJoinAlert = async (
  messId: string,
  memberName: string,
  approvedBy?: string
) => {
  if (!messId) return;

  const content = `🎉 নতুন সদস্য ${memberName} মেসে যোগ দিয়েছেন! সবাইকে স্বাগত জানান।`;

  await sendMessMessage(
    messId,
    { id: 'system', name: 'System Bot', isAdmin: false, username: 'system' } as User,
    content,
    'system',
    { category: 'member_join', member_name: memberName, approved_by: approvedBy },
    true // pin so new arrivals are celebrated
  );

  playNotificationChime();
  showDesktopNotification('🎉 নতুন সদস্য যোগ দিয়েছেন!', `${memberName} আপনার মেসে যুক্ত হয়েছেন।`);
};
