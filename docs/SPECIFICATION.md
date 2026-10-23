# HavenChat — Web Room Chat Specification & Architecture
**Project**: HavenChat (Real-time Web Room Chat)  
**Target Platform**: Vercel Serverless / Edge  
**Design Standard**: Claude Aesthetic (Warm Editorial Minimalist — shadcn/ui)  
**Alliance**: Antigravity × Hermes × OpenCode × OpenClaw × OMP (Penta-Engine)

---

## 1. Overview & Objectives
HavenChat is a modern, frictionless, real-time web room chat application designed to run seamlessly on Vercel's serverless environment. Users can instantly create private or public chat rooms, share invite links, chat in real-time, view presence indicators, send reactions, quote messages, and toggle sound cues without mandatory login barriers.

### Core Value Proposition
- **Frictionless Entry**: 0-step barrier; enter display name, pick an avatar, and instantly jump into any room via shortcode or direct URL (`/room/[roomId]`).
- **Serverless-Optimized Realtime Engine**: Built with a robust hybrid SSE (Server-Sent Events) + Adaptive Delta Polling architecture with in-memory synchronization and deduplication, ensuring 100% functionality on Vercel without hard external database dependencies, while maintaining extensible adaptors for Supabase/Pusher.
- **Claude Warm Minimalist UI**: Crafted with shadcn/ui principles, Warm Sand (`#FAF9F5`) / Warm Charcoal (`#1F1E1D`) backgrounds, Terracotta (`#CC5A37`) primary accents, Editorial Serif headings, and spacious typography.

---

## 2. Universal Penta-Engine Split Workload
| Engine | Role | Domain Responsibilities |
|---|---|---|
| **Antigravity** | The Mind & UI Architect | System architecture, technical specification, Claude Warm Editorial design, component hierarchy, TDD test suite, and final code review. |
| **Hermes Agent** | The Nervous System & Operator | System automation, Obsidian Task Inbox tracking (`08 - HERMES/Task Inbox.md`), background verification, and Vercel deployment orchestration. |
| **OpenCode** | The Autonomous Specialist | Core room data models, state store, Next.js API route handlers, delta synchronization, and autonomous test execution until green. |
| **OpenClaw** | Multi-Channel Gateway | Channel routing, real-time event pipeline audit, and gateway readiness. |
| **OMP** | Deep Plan & Goal Specialist | Deep architectural planning (`omp --plan`), LSP code intelligence verification, and disconnection resilience analysis. |

---

## 3. Architecture & Data Model

### 3.1 Data Structures
```typescript
export interface Participant {
  id: string;
  name: string;
  avatar: string; // Warm emoji / avatar identifier
  joinedAt: number;
  lastActiveAt: number;
  isTyping: boolean;
}

export interface Reaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: number;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  reactions: Record<string, string[]>; // emoji -> array of userIds
  isSystem?: boolean;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  hostId: string;
  participants: Record<string, Participant>;
  messages: Message[];
}
```

### 3.2 Real-time API Endpoints
- `GET /api/rooms`: List or verify active rooms.
- `POST /api/rooms`: Create a new room with custom ID or random slug.
- `GET /api/rooms/[roomId]`: Fetch room metadata and recent message buffer.
- `POST /api/rooms/[roomId]/join`: Register participant presence.
- `POST /api/rooms/[roomId]/messages`: Post a new message or system event.
- `POST /api/rooms/[roomId]/reactions`: Toggle message emoji reaction.
- `POST /api/rooms/[roomId]/typing`: Update ephemeral typing status.
- `GET /api/rooms/[roomId]/poll`: Adaptive delta polling endpoint (returns new messages since timestamp + active participants).

---

## 4. UI/UX Design System (Claude Aesthetic)
- **Palette**:
  - Light: `#FAF9F5` (Warm Sand), `#FFFFFF` (Surface), `#E5E3DC` (Stone Border), `#1F1E1D` (Ink Text), `#6F6D66` (Muted).
  - Dark: `#1F1E1D` (Warm Charcoal), `#2A2826` (Surface), `#3A3834` (Border), `#ECEAE4` (Text), `#9B988F` (Muted).
  - Accent: `#CC5A37` (Terracotta Clay), `#B84E2E` (Hover), `#D97706` (Amber).
- **Layout**: Split-view responsive layout (desktop: room info & member sidebar + main chat timeline; mobile: drawer navigation).
- **Interactions**: Web Audio sound cues, copy link toast, typing status bubble, emoji quick-reactions, reply banner.

---

## 5. Verification & TDD Strategy
- Unit tests covering room creation, message posting, reaction toggles, and participant timeout sweeps.
- Integration test for API route handlers and delta updates.
- 100% build pass: `next build` produces zero errors.
- Live Vercel deployment verification.
