# SEDERIZE

> **"Seder"** (Hebrew) = Order. Transform chaos into strict order.

A structured task management system designed for high-performance individuals managing Business, Investments, and Personal projects.

![Sederize](https://img.shields.io/badge/version-0.1.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

---

## Philosophy

**"A Daily Brief that forces execution, organized in strict silos (Themes > Subjects)."**

- **Clean**: No clutter, high contrast, clear labels
- **Industrial**: Efficient, no-nonsense interface
- **Executive**: Built for decision makers
- **Mobile-First**: Large buttons, thumb-friendly navigation

---

## Features

### Core

- **Daily Brief** - Tasks due today/overdue, grouped by theme
- **Themes & Subjects** - Hierarchical organization (e.g., Consulting > Client A)
- **Scratchpad** - Persistent notes per subject (codes, contacts, info)
- **Waiting For** - Block tasks with notes on what you're waiting for
- **Snooze** - Quick reschedule (Tomorrow, +3 days, pick date)
- **Inbox** - Capture tasks without immediate assignment

### Views

- **List View** - Standard hierarchy navigation
- **Calendar View** - Monthly grid with colored task dots
- **Kanban View** - Drag-and-drop between statuses

### Power Features

- **Smart Date Parsing** - Type "Call Mark Tuesday" to auto-set date
- **Command Palette** - `Cmd+K` for instant navigation
- **Zombie Alert** - Flags subjects inactive for 10+ days

---

## Tech Stack

| Category    | Technology                     |
| ----------- | ------------------------------ |
| Framework   | Next.js 14 (App Router)        |
| Language    | TypeScript                     |
| Styling     | TailwindCSS + Shadcn/UI        |
| Database    | Supabase (PostgreSQL)          |
| Auth        | Supabase Auth (Email + Google) |
| State       | TanStack Query (React Query)   |
| Drag & Drop | @dnd-kit                       |
| Icons       | Lucide React                   |
| Dates       | date-fns                       |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone & Install

```bash
git clone https://github.com/your-username/sederize.git
cd sederize
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Enable Google OAuth in Authentication > Providers (optional)

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
sederize/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (app)/        # Protected routes
│   │   └── (auth)/       # Auth routes
│   ├── components/       # React components
│   │   ├── ui/           # Shadcn primitives
│   │   ├── layout/       # App shell, nav
│   │   └── tasks/        # Task-related
│   ├── hooks/            # React Query hooks
│   ├── lib/              # Utilities
│   ├── providers/        # Context providers
│   └── types/            # TypeScript types
├── supabase/
│   └── schema.sql        # Database DDL + RLS
├── CLAUDE.md             # Architecture doc
└── best_practices.md     # Coding standards
```

---

## Documentation

| Document                                     | Purpose                         |
| -------------------------------------------- | ------------------------------- |
| [CLAUDE.md](./CLAUDE.md)                     | Architecture, schema, decisions |
| [best_practices.md](./best_practices.md)     | Coding standards & patterns     |
| [supabase/schema.sql](./supabase/schema.sql) | Database setup                  |

---

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables (Production)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

---

## Roadmap

### v1.0 (Current)

- [x] Daily Brief view
- [x] Themes & Subjects hierarchy
- [x] Task CRUD with snooze
- [x] Waiting For status
- [x] Calendar view
- [x] Kanban view
- [x] Command palette
- [x] Mobile-first responsive UI

### v1.1

- [ ] Email digest (daily summary)
- [ ] PWA installation
- [ ] Dark mode

### v2.0

- [ ] Native mobile app (iOS/Android)
- [ ] Recurring tasks
- [ ] Push notifications
- [ ] Team collaboration

---

## License

MIT

---

## Author

Built with precision.
