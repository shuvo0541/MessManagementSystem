# Universal Notification Center, Profile Unread Badges & Member Join Alerts

An end-to-end, multi-mess notification architecture featuring a universal Top Header notification center, unread message badges on Profile mess cards, automated new member welcome alerts, and read/unread state tracking.

### User Review & Critical Decisions

> [!IMPORTANT]
> The architectural decisions have been aligned based on your selections:

- **Confirmed - Notification Placement**: A global Notification Bell in the **Top Header** accessible anywhere in the app, plus **unread red badges** on each mess card in the **Profile page**.
- **Confirmed - Instant Notification Events**: Chat messages, admin announcements, and automated alerts when **new members join** the mess.
- **Confirmed - Clearing Mechanism**: A "Mark all as read" (সব পড়া হয়েছে মার্ক করুন) button inside the notification center, plus clicking any specific notification automatically marks it as read and navigates to the relevant mess.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Top Header Notification Center**: A persistent notification bell showing live unread count. Clicking it opens a dropdown panel listing recent announcements, chat messages, and member join events across all user messes.
  2. **Profile Page Mess Badges**: In the Profile mess list, each mess card displays a prominent badge showing how many unseen messages exist in that specific mess.
  3. **New Member Join Alerts**: When an admin approves a join request, a welcome notification is automatically broadcast to all members.
  4. **Read / Unread State Tracking**: Tracks the last read timestamp per mess per user (`last_read_${messId}`) so unread counts remain accurate across page refreshes.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Receiving a Notification**: User is on any page. A new message, announcement, or new member approval occurs. The top header bell increments with an animation badge, a desktop notification appears, and an audio chime plays.
2. **Reviewing Notifications**: User clicks the top header bell. A sleek notification drawer opens:
   - Shows chronological notifications with icons (Announcement 📢, Member Join 🎉, Chat 💬).
   - Unread items have a subtle highlighted background and blue unread dot.
3. **Navigating from Notification**: Clicking a notification opens that specific mess and navigates to the Mess Chat.
4. **Marking as Read**: Clicking "সব পড়া হয়েছে মার্ক করুন" instantly clears the badge count and sets unread dots to read.
5. **Browsing Messes in Profile**: When viewing the Profile page, messes with unread messages show a red count badge (e.g., `৩টি নতুন`).

#### Visual Identity & Theme
- **Bell Button**: Rounded-2xl button in header with active badge overlay (`bg-red-500 text-white animate-pulse`).
- **Notification Dropdown**:
  - Desktop: 420px wide floating card with backdrop blur and hairline border.
  - Mobile: Full-width bottom sheet or slide-over.
- **Color Coding**:
  - Announcements: Amber badge & border (`text-amber-500 bg-amber-50 dark:bg-amber-950/40`).
  - New Member Joined: Emerald/Green badge (`text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40`).
  - Chat Messages: Blue badge (`text-blue-500 bg-blue-50 dark:bg-blue-900/30`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Universal Header Placement vs Single Page**
  - *Approach*: Header notification center is global and independent of the active mess or month.
  - *Why*: Users can stay informed about activity across *all* their messes without needing to manually switch messes.
- **Decision 2: Client-side Read Timestamp Persistence**
  - *Approach*: Persist `last_read_${messId}` timestamps per user in `localStorage` and Supabase sync.
  - *Why*: Instant, zero-latency badge calculation without complex read-receipt database joins for every single message.
- **Decision 3: Approval Trigger for Member Join Notifications**
  - *Approach*: Hook directly into `handleApprove` in `Dashboard.tsx` and `Members.tsx` to emit a `system` message (`category: 'member_join'`).
  - *Why*: Ensures instant broadcast via Supabase Realtime so all connected users receive the welcome notification immediately.

---

### 4. Technical Architecture & Component Mapping

#### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                 Header (Top Navigation Bar)                 │
│  [ Brand ]     [ Month Switcher ]     [ 🔔 Bell Badge (3) ]  │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Click)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               NotificationCenter Dropdown Panel             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Header: "বিজ্ঞপ্তি" (3)       [ সব পড়া হয়েছে মার্ক করুন ] │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ 🎉 নতুন সদস্য: রিয়াদ মেসে যুক্ত হয়েছেন! (ধানমন্ডি মেস)   │  │
│  │ 📢 নোটিশ: আগামীকালের মিল বন্ধের সময় (মিরপুর মেস)          │  │
│  │ 💬 আকাশ: আজকের বাজার সম্পন্ন হয়েছে                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Profile Mess Switcher                   │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │ ধানমন্ডি মেস             │   │ মিরপুর মেস              │  │
│  │ [ 🔴 ২ টি নতুন মেসেজ ]   │   │ [ সব দেখা হয়েছে ]        │  │
│  └─────────────────────────┘   └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Step-by-Step Implementation Strategy:

1. **Notification Utility (`utils/notificationService.ts`)**:
   - Manages read timestamps per user & mess (`getLastReadTime(messId)`, `setLastReadTime(messId)`).
   - Calculates unread counts per mess and total unread count across all user messes.
   - Emits member join announcement helper `sendSystemMemberJoinAlert(messId, memberName)`.
2. **Header Notification Component (`components/NotificationCenter.tsx`)**:
   - Bell button with animated unread badge.
   - Dropdown menu displaying latest notifications from all user messes with "Mark all as read" button.
   - Filter chips and click-to-switch mess action.
3. **Profile Page Mess Cards Update (`pages/Profile.tsx`)**:
   - Display unread message badges on each mess card in the profile switcher.
4. **Member Approval Integration (`pages/Dashboard.tsx` & `pages/Members.tsx`)**:
   - Trigger automated notification when join requests are approved.
