# Mess Real-time Community Chat & Announcement System

A dedicated, real-time communication hub embedded directly inside each mess, featuring WhatsApp/Messenger-style instant messaging, an admin-only announcement noticeboard, and automated meal and bazaar status alerts.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were aligned based on your preferences:

- **Confirmed - Chat Interface Style**: WhatsApp/Messenger-style interactive message stream with left/right speech bubbles, timestamps, sender badges, and sticky bottom input composer with quick-action shortcuts.
- **Confirmed - Announcement Authority**: Admin and Managers only can broadcast messages in the Announcement & Notice board tab to prevent clutter, while regular members have read-only access to announcements.
- **Confirmed - Automated Activity Alerts**: Real-time system notifications (automated activity cards) will be broadcast directly into the chat when members record new bazaar expenses or update meal tallies.
- **Implementation Note**: Per your request, this plan outlines the exact architecture, database design, and visual blueprint so it is ready to be implemented whenever you want to proceed.

---

### 1. Overview & Core Concept

- **What It Does**: Provides an all-in-one in-app chat ecosystem for each mess. Members can communicate daily meal requirements, coordinate bazaar trips, view pinned announcements from management, and observe real-time system alerts without needing external apps.
- **Target Audience / Persona**: Mess members, bazaar runners, meal managers, and mess admins who need coordinated daily communication in one centralized place.
- **Key Value**: Eliminates communication friction between mess accounts, meal tracking, and communication. Keeps all mess-related discussions archived, searchable, and contextual to the active mess session.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Entering the Chat Hub**: User selects "Mess Chat" (মেস চ্যাট) from the sidebar. The view loads the active mess message thread instantly.
2. **Tab Switching**: A top segmented switch allows toggling between **General Chat (সাধারণ চ্যাট)** and **Announcements (নোটিশ বোর্ড)**.
3. **Sending Messages**: Members type in the bottom composer with auto-expanding textarea, emoji picker support, and immediate optimistic send.
4. **Admin Announcement Creation**: Admins and managers see a distinct "Post Announcement" modal with title, urgency flags, and pinning options.
5. **System Notifications in Chat**: When a user adds a bazaar or meal entry, a compact, themed system banner appears in the chat stream: *"Akash added a bazaar of ৳850 (Chicken, Vegetables)"*.

#### Visual Identity & Theme
- **Aesthetic Direction**: Modern communication interface matching the existing slate/emerald theme with WhatsApp/Messenger familiar bubble physics.
- **Color Palette & Surface Roles**:
  - Outgoing bubbles (Current User): Emerald/Green tint (`bg-emerald-600 text-white dark:bg-emerald-500`) with rounded-2xl corners and subtle bottom-right pinch.
  - Incoming bubbles (Other Members): Slate neutral (`bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100`).
  - Announcement Cards: Amber/Gold accent (`bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200`).
  - System Alert Badges: Subtle centered capsule badges (`bg-blue-50/80 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40`).
- **Typography & Formatting**: Clean sender name headers, localized Bangla timestamps (e.g., `০৪:১৫ অপরাহ্ন`), and high-legibility body prose.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Real-time Transport via Supabase Realtime Channels**
  - *Approach*: Leverage Supabase Realtime PostgreSQL replication (`postgres_changes` listener on `mess_messages` table with `mess_id` filter).
  - *Why*: Provides sub-100ms message delivery across mobile and desktop without managing custom Node WebSocket infrastructure or Redis servers.
  - *Alternative Considered*: Client polling (3-5s interval) — rejected due to battery drain and lagging user feel.
- **Decision 2: Message Categorization & Data Structure**
  - *Approach*: A single unified `mess_messages` table with an enum/varchar `message_type` (`text`, `announcement`, `system_event`).
  - *Why*: Unified schema allows filtering into separate tabs (General vs Noticeboard) while maintaining chronological continuity for system activity feeds.
- **Decision 3: Role-Based Publishing for Announcements**
  - *Approach*: The UI verifies `user.isAdmin` or manager status before rendering the announcement publisher tool; Supabase RLS policies enforce it server-side.

---

### 4. Technical Architecture & Data Strategy

#### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Sidebar Navigation                     │
│               [ মেস চ্যাট / Mess Community ]                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     MessChat Container                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Segmented Switcher: [ সাধারণ চ্যাট ] | [ নোটিশ বোর্ড ] │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                     Pinned Banner                     │  │
│  │      Latest active announcement from Admin/Manager    │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Virtualized Chat Stream               │  │
│  │  - Incoming message bubble (User A, 10:14 AM)         │  │
│  │  - Outgoing message bubble (You, 10:15 AM)            │  │
│  │  - System Card: "বাজার এন্ট্রি: ৳১২৫০ - রিয়াদ"        │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                Sticky Message Composer                │  │
│  │  [ টেক্সট লিখুন... ]                  [ সেন্ড বাটন ]   │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Supabase Realtime Broadcast & DB                │
│  - Table: public.mess_messages (mess_id, user_id, content)  │
│  - Realtime Channel: supabase.channel('mess-chat-${id}')    │
└─────────────────────────────────────────────────────────────┘
```

#### Supabase Database Schema (Ready for execution)

```sql
-- Create table for mess chat messages & announcements
CREATE TABLE IF NOT EXISTS public.mess_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT DEFAULT 'member',
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'announcement' | 'system'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- e.g. { amount: 500, category: 'bazar' }
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.mess_messages;

-- Index for instant querying by mess and timestamp
CREATE INDEX IF NOT EXISTS idx_mess_messages_mess_created 
ON public.mess_messages(mess_id, created_at ASC);
```

#### Interactive Component & State Mapping

| Component | Responsibility | Interaction / Handlers |
| :--- | :--- | :--- |
| `MessChat.tsx` | Main page view | Manages realtime subscription, message pagination, and view mode |
| `MessageBubble.tsx` | Visual rendering of each chat entry | Handles copy text, timestamp formatting, sender avatar/initials |
| `AnnouncementCard.tsx` | Noticeboard rendering | Displays title, author, pin status, and admin delete options |
| `SystemAlertCard.tsx` | Automated meal & bazaar logs | Highlights monetary values and meal count deltas with direct links |
| `ChatComposer.tsx` | Input bar & send button | Handles `Enter` to submit, `Shift+Enter` for newlines, loading states |
| `CreateAnnouncementModal.tsx` | Admin announcement popup | Form validation, title, body, and priority pin toggle |
