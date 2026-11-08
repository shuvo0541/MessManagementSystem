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
  metadata?: {
    category?: 'announcement' | 'join_request' | 'join_approved' | 'member_join' | 'bazar' | 'meal';
    title?: string;
    target_user_id?: string;
    applicant_id?: string;
    applicant_name?: string;
    applicant_username?: string;
    request_id?: string;
    approved_by?: string;
    amount?: number;
    date?: string;
    [key: string]: any;
  };
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
    localStorage.setItem(`READ_NOTIFS_${userId}`, JSON.stringify(Array.from(readSet).slice(-300)));
  } catch (e) {}
};

/**
 * Mark all notifications as read across messes
 */
export const markAllNotificationsAsRead = (userId: string, messIds: string[], notifIds: string[] = []): void => {
  if (!userId) return;
  const now = new Date().toISOString();
  messIds.forEach((mId) => {
    try {
      localStorage.setItem(`LAST_READ_${userId}_${mId}`, now);
    } catch (e) {}
  });

  if (notifIds.length > 0) {
    try {
      const readSet = getReadNotificationIds(userId);
      notifIds.forEach(id => readSet.add(id));
      localStorage.setItem(`READ_NOTIFS_${userId}`, JSON.stringify(Array.from(readSet).slice(-300)));
    } catch (e) {}
  }
};

/**
 * Fetch and aggregate notifications across all messes that a user belongs to
 * Plus pending join requests for messes where the user is Admin
 */
export const fetchAllMessesNotifications = async (
  userMesses: Array<{ id: string; mess_name: string; admin_id?: string }>,
  userId: string
): Promise<{
  notifications: MessNotificationItem[];
  unreadCountsByMess: Record<string, number>;
  totalUnreadCount: number;
}> => {
  if (!userId) {
    return { notifications: [], unreadCountsByMess: {}, totalUnreadCount: 0 };
  }

  const messIds = userMesses.map((m) => m.id);
  const messNameMap = new Map(userMesses.map((m) => [m.id, m.mess_name]));
  const adminMessIds = new Set(
    userMesses.filter((m) => m.admin_id === userId).map((m) => m.id)
  );
  const readSet = getReadNotificationIds(userId);

  try {
    let rawList: any[] = [];

    // 1. Fetch recent messages from mess_messages
    if (messIds.length > 0) {
      try {
        const { data, error } = await supabase
          .from('mess_messages')
          .select('*')
          .in('mess_id', messIds)
          .order('created_at', { ascending: false })
          .limit(80);

        if (!error && data) {
          rawList.push(...data);
        }
      } catch (err) {
        console.warn("Error querying mess_messages:", err);
      }
    }

    // Also check local cache for each mess if list is short
    messIds.forEach((mId) => {
      try {
        const raw = localStorage.getItem(`MESS_CHAT_${mId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((m) => {
              if (!rawList.some((r) => r.id === m.id)) {
                rawList.push(m);
              }
            });
          }
        }
      } catch (e) {}
    });

    // 2. Fetch pending join requests for messes where current user is Admin
    if (adminMessIds.size > 0) {
      try {
        const { data: pendingReqs } = await supabase
          .from('join_requests')
          .select('*')
          .in('mess_id', Array.from(adminMessIds))
          .eq('status', 'pending');

        if (pendingReqs && pendingReqs.length > 0) {
          pendingReqs.forEach((req) => {
            const reqNotifId = `join-req-${req.id}`;
            rawList.push({
              id: reqNotifId,
              mess_id: req.mess_id,
              user_id: req.user_id,
              user_name: req.user_name || 'নতুন সদস্য',
              message_type: 'system',
              content: `${req.user_name || 'একজন ব্যবহারকারী'} (${req.user_username || 'মেম্বার'}) এই মেসে যুক্ত হওয়ার আবেদন করেছেন। অনুগ্রহ করে আবেদনটি যাচাই ও অনুমোদন করুন।`,
              metadata: {
                category: 'join_request',
                title: 'নতুন মেম্বার আবেদন',
                request_id: req.id,
                applicant_id: req.user_id,
                applicant_name: req.user_name,
                applicant_username: req.user_username
              },
              is_pinned: true,
              created_at: req.created_at || new Date().toISOString()
            });
          });
        }
      } catch (e) {
        console.warn("Could not query pending join_requests:", e);
      }
    }

    // 3. Check personal notifications stored in localStorage for this user
    try {
      const personalRaw = localStorage.getItem(`PERSONAL_NOTIFS_${userId}`);
      if (personalRaw) {
        const personalList = JSON.parse(personalRaw);
        if (Array.isArray(personalList)) {
          personalList.forEach((pn) => {
            if (!rawList.some((r) => r.id === pn.id)) {
              rawList.push(pn);
            }
          });
        }
      }
    } catch (e) {}

    // Sort by created_at descending
    rawList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const unreadCountsByMess: Record<string, number> = {};
    messIds.forEach((mId) => (unreadCountsByMess[mId] = 0));

    const notifications: MessNotificationItem[] = [];

    for (const msg of rawList) {
      const category = msg.metadata?.category;
      const targetUserId = msg.metadata?.target_user_id;

      // Privacy checks:
      // A. If targeted to a specific user and not this user, skip
      if (targetUserId && targetUserId !== userId) {
        continue;
      }

      // B. If it's a join request alert, ONLY show to the mess admin
      if (category === 'join_request' && !adminMessIds.has(msg.mess_id)) {
        continue;
      }

      const lastRead = getLastReadTime(userId, msg.mess_id);
      const isReadByTime = new Date(msg.created_at) <= new Date(lastRead);
      const isIndividuallyRead = readSet.has(msg.id);
      const isOwnMessage = msg.user_id === userId && category !== 'join_approved';
      const isRead = isOwnMessage || isReadByTime || isIndividuallyRead;

      if (!isRead) {
        unreadCountsByMess[msg.mess_id] = (unreadCountsByMess[msg.mess_id] || 0) + 1;
      }

      notifications.push({
        id: msg.id,
        mess_id: msg.mess_id,
        mess_name: msg.mess_name || messNameMap.get(msg.mess_id) || 'মেস',
        user_id: msg.user_id,
        user_name: msg.user_name || 'সদস্য',
        message_type: msg.message_type,
        content: msg.content,
        metadata: msg.metadata || {},
        is_pinned: msg.is_pinned || false,
        created_at: msg.created_at,
        is_read: isRead
      });
    }

    const totalUnreadCount = notifications.filter(n => !n.is_read).length;

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
 * Send an alert to mess admin when a new user requests to join
 */
export const sendJoinRequestAlert = async (
  messId: string,
  applicant: User,
  messName: string,
  adminId?: string
) => {
  if (!messId) return;

  const content = `📝 ${applicant.name} (${applicant.userId || applicant.username}) মেসে যোগ দেওয়ার আবেদন পাঠিয়েছেন। অনুমোদন করতে ক্লিক করুন।`;

  await sendMessMessage(
    messId,
    { id: applicant.id, name: applicant.name, isAdmin: false, username: applicant.username } as User,
    content,
    'system',
    {
      category: 'join_request',
      title: 'নতুন সদস্যের আবেদন',
      applicant_id: applicant.id,
      applicant_name: applicant.name,
      applicant_username: applicant.userId || applicant.username,
      admin_id: adminId
    },
    true
  );

  playNotificationChime();
  showDesktopNotification('📝 নতুন মেম্বার আবেদন', `${applicant.name} মেসে যোগ দেওয়ার আবেদন করেছেন।`);
};

/**
 * Send personal notification to the applicant when admin approves their join request
 */
export const sendPersonalApprovalNotification = async (
  messId: string,
  messName: string,
  applicantId: string,
  applicantName: string,
  approvedBy: string
) => {
  const notifId = `approval-${messId}-${applicantId}-${Date.now()}`;
  const content = `🎉 অভিনন্দন ${applicantName}! '${messName}' মেসে আপনার যোগ দেওয়ার আবেদন এডমিন ${approvedBy} কর্তৃক অনুমোদিত হয়েছে। এখন আপনি ড্যাশবোর্ড, মিল-বাজার ও মেস চ্যাটে অংশ নিতে পারবেন।`;

  const item: MessNotificationItem = {
    id: notifId,
    mess_id: messId,
    mess_name: messName,
    user_id: 'system',
    user_name: approvedBy || 'মেস এডমিন',
    message_type: 'system',
    content,
    metadata: {
      category: 'join_approved',
      title: 'আবেদন অনুমোদিত হয়েছে! 🎉',
      target_user_id: applicantId,
      approved_by: approvedBy
    },
    is_pinned: true,
    created_at: new Date().toISOString(),
    is_read: false
  };

  // 1. Save in target user's personal notifications in localStorage
  try {
    const raw = localStorage.getItem(`PERSONAL_NOTIFS_${applicantId}`);
    const list = raw ? JSON.parse(raw) : [];
    localStorage.setItem(`PERSONAL_NOTIFS_${applicantId}`, JSON.stringify([item, ...list].slice(0, 50)));
  } catch (e) {}

  // 2. Also send to mess_messages with target_user_id
  await sendMessMessage(
    messId,
    { id: 'system', name: approvedBy || 'মেস এডমিন', isAdmin: true, username: 'admin' } as User,
    content,
    'system',
    {
      category: 'join_approved',
      title: 'আবেদন অনুমোদিত হয়েছে! 🎉',
      target_user_id: applicantId,
      approved_by: approvedBy
    },
    false
  );

  playNotificationChime();
  showDesktopNotification('🎉 মেসে আবেদন অনুমোদিত!', `'${messName}' মেসে আপনার আবেদন গ্রহণ করা হয়েছে।`);
};

/**
 * Send an automated welcome notification to chat and push notification when a new member joins
 * This notifies ALL existing members of the mess
 */
export const sendSystemMemberJoinAlert = async (
  messId: string,
  memberName: string,
  approvedBy?: string
) => {
  if (!messId) return;

  const content = `🎉 নতুন সদস্য ${memberName} আমাদের মেসে যোগ দিয়েছেন! সবাই তাকে আন্তরিকভাবে স্বাগত জানান।`;

  await sendMessMessage(
    messId,
    { id: 'system', name: 'System Bot', isAdmin: false, username: 'system' } as User,
    content,
    'system',
    {
      category: 'member_join',
      title: 'নতুন মেম্বার যুক্ত হয়েছেন 🥳',
      member_name: memberName,
      approved_by: approvedBy
    },
    true // pin so new arrivals are celebrated
  );

  playNotificationChime();
  showDesktopNotification('🎉 নতুন সদস্য যোগ দিয়েছেন!', `${memberName} আপনার মেসে যুক্ত হয়েছেন।`);
};
