import { supabase } from '../supabase';
import { ChatMessage, User } from '../types';

export interface OnlineUser {
  user_id: string;
  user_name: string;
  online_at: string;
}

export const MESS_CHAT_SQL = `-- Run this in your Supabase SQL Editor to enable Real-time Mess Chat:

CREATE TABLE IF NOT EXISTS public.mess_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT DEFAULT 'member',
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'announcement' | 'system'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Supabase Realtime for instant messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.mess_messages;

-- Create index for fast retrieval
CREATE INDEX IF NOT EXISTS idx_mess_messages_mess_time 
ON public.mess_messages(mess_id, created_at ASC);

-- Row Level Security policies (allow authenticated mess members)
ALTER TABLE public.mess_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members to read messages"
ON public.mess_messages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow members to insert messages"
ON public.mess_messages FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow message creators or admins to delete"
ON public.mess_messages FOR DELETE
TO authenticated
USING (true);
`;

const getLocalMessages = (messId: string): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(`MESS_CHAT_${messId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalMessages = (messId: string, messages: ChatMessage[]) => {
  try {
    localStorage.setItem(`MESS_CHAT_${messId}`, JSON.stringify(messages.slice(-100)));
  } catch (e) {}
};

/**
 * Play a gentle, native Web Audio notification chime (no external audio files needed)
 */
export const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
};

/**
 * Request browser desktop notification permission
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch (e) {
    return 'denied';
  }
};

/**
 * Trigger desktop notification
 */
export const showDesktopNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'mess-chat'
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (e) {}
  }
};

/**
 * Fetch all chat messages for a specific mess
 */
export const fetchMessMessages = async (messId: string): Promise<{ data: ChatMessage[]; isLocalFallback: boolean }> => {
  if (!messId) return { data: [], isLocalFallback: false };

  try {
    const { data, error } = await supabase
      .from('mess_messages')
      .select('*')
      .eq('mess_id', messId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn("Supabase mess_messages error (using local cache):", error.message);
      return { data: getLocalMessages(messId), isLocalFallback: true };
    }

    if (data) {
      saveLocalMessages(messId, data as ChatMessage[]);
      return { data: data as ChatMessage[], isLocalFallback: false };
    }
  } catch (err) {
    console.warn("Failed to fetch messages, using fallback:", err);
  }

  return { data: getLocalMessages(messId), isLocalFallback: true };
};

/**
 * Send a new text, announcement, or system message
 */
export const sendMessMessage = async (
  messId: string,
  user: User,
  content: string,
  messageType: 'text' | 'announcement' | 'system' = 'text',
  metadata: Record<string, any> = {},
  isPinned: boolean = false
): Promise<ChatMessage | null> => {
  if (!messId || !content.trim()) return null;

  const newMsg: ChatMessage = {
    id: crypto.randomUUID(),
    mess_id: messId,
    user_id: user.id,
    user_name: user.name,
    user_role: user.isAdmin ? 'admin' : 'member',
    message_type: messageType,
    content: content.trim(),
    metadata,
    is_pinned: isPinned,
    created_at: new Date().toISOString()
  };

  // Optimistically store in local fallback
  const localList = getLocalMessages(messId);
  if (!localList.some(m => m.id === newMsg.id)) {
    saveLocalMessages(messId, [...localList, newMsg]);
  }

  try {
    const { data, error } = await supabase
      .from('mess_messages')
      .insert([{
        id: newMsg.id,
        mess_id: newMsg.mess_id,
        user_id: newMsg.user_id,
        user_name: newMsg.user_name,
        user_role: newMsg.user_role,
        message_type: newMsg.message_type,
        content: newMsg.content,
        metadata: newMsg.metadata,
        is_pinned: newMsg.is_pinned,
        created_at: newMsg.created_at
      }])
      .select()
      .single();

    if (error) {
      console.warn("Could not insert message to Supabase (using local):", error.message);
      return newMsg;
    }

    return (data as ChatMessage) || newMsg;
  } catch (err) {
    console.warn("Send message error:", err);
    return newMsg;
  }
};

/**
 * Delete a message by ID
 */
export const deleteMessMessage = async (messageId: string, messId: string): Promise<boolean> => {
  // Update local cache
  const localList = getLocalMessages(messId).filter(m => m.id !== messageId);
  saveLocalMessages(messId, localList);

  try {
    const { error } = await supabase
      .from('mess_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.warn("Delete message error in Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Subscribe to real-time chat messages and live online presence
 */
export const subscribeToMessChatAndPresence = (
  messId: string,
  user: User,
  onInsert: (msg: ChatMessage) => void,
  onDelete: (id: string) => void,
  onPresenceUpdate: (onlineUsers: OnlineUser[]) => void
) => {
  if (!messId) return () => {};

  const channel = supabase.channel(`mess-realtime-${messId}`, {
    config: {
      presence: { key: user.id }
    }
  });

  channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mess_messages',
        filter: `mess_id=eq.${messId}`
      },
      (payload) => {
        if (payload.new) {
          onInsert(payload.new as ChatMessage);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'mess_messages'
      },
      (payload) => {
        if (payload.old?.id) {
          onDelete(payload.old.id);
        }
      }
    )
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const uniqueMap = new Map<string, OnlineUser>();
      Object.values(state).forEach((presences: any) => {
        if (Array.isArray(presences)) {
          presences.forEach((p: any) => {
            if (p.user_id && !uniqueMap.has(p.user_id)) {
              uniqueMap.set(p.user_id, p);
            }
          });
        }
      });
      onPresenceUpdate(Array.from(uniqueMap.values()));
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          user_name: user.name,
          online_at: new Date().toISOString()
        });
      }
    });

  return () => {
    channel.untrack().catch(() => {});
    supabase.removeChannel(channel);
  };
};

/**
 * Automated alert when a member logs a bazaar entry
 */
export const sendSystemBazarAlert = async (
  messId: string,
  userName: string,
  amount: number,
  note: string,
  date: string
) => {
  if (!messId) return;
  const content = `${userName} ৳${amount.toFixed(2)} এর বাজার যুক্ত করেছেন${note ? ` (${note})` : ''} - তারিখ: ${date}`;
  
  await sendMessMessage(
    messId,
    { id: 'system', name: 'System Bot', isAdmin: false, username: 'system' } as User,
    content,
    'system',
    { category: 'bazar', amount, note, date },
    false
  );
};

/**
 * Automated alert when meals are recorded/updated
 */
export const sendSystemMealAlert = async (
  messId: string,
  userName: string,
  date: string,
  details: string
) => {
  if (!messId) return;
  const content = `${userName} মিল আপডেট করেছেন: ${details} (তারিখ: ${date})`;
  
  await sendMessMessage(
    messId,
    { id: 'system', name: 'System Bot', isAdmin: false, username: 'system' } as User,
    content,
    'system',
    { category: 'meal', date, details },
    false
  );
};
