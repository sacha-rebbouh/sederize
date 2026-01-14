# SEDERIZE - Document Architecte Principal

> **"Seder"** (Hebrew) = Order. Transform chaos into strict order.

---

## 1. VISION PRODUIT

### Mission
Sederize est un système de gestion de tâches structuré conçu pour les individus haute-performance gérant Business, Investissements et Projets Personnels.

### Philosophie Core
**"Un Daily Brief qui force l'exécution, organisé en silos stricts (Categories > Themes > Subjects)."**

### Public Cible
- Entrepreneurs, Investisseurs, Executives
- Utilisateurs non-tech : UI ultra-simple, intuitive, "foolproof"
- Pas de menus cachés ni de gestion de fichiers complexe

### Plateforme
- **v1** : Webapp (Mobile-First responsive)
- **v2+** : Application mobile native (iOS/Android)

---

## 2. BRANDING

| Élément | Valeur |
|---------|--------|
| **Nom** | SEDERIZE |
| **Domain** | sederize.com |
| **Tagline** | "Order from Chaos" |
| **Vibe** | Clean, Industrial, Executive, No-nonsense |

### Palette de Couleurs (Executive Slate)
```
Primary (Slate 900):    #0f172a
Primary Light:          #1e293b
Accent (Blue 500):      #3b82f6
Accent Hover:           #2563eb
Success (Emerald 500):  #10b981
Warning (Amber 500):    #f59e0b
Destructive (Red 500):  #ef4444
Background:             #ffffff
Muted:                  #f1f5f9
Border:                 #e2e8f0
```

---

## 3. STACK TECHNIQUE

### Frontend
| Technologie | Version | Rôle |
|-------------|---------|------|
| Next.js | 14 (App Router) | Framework React SSR/SSG |
| TypeScript | 5.x | Typage statique |
| TailwindCSS | 3.x | Styling utility-first |
| Shadcn/UI | Latest | Composants Radix primitives |
| Lucide React | Latest | Icônes |
| React Query | 5.x (TanStack) | State management serveur |
| Framer Motion | Latest | Animations |
| date-fns | Latest | Manipulation dates |
| @dnd-kit | Latest | Drag & Drop |

### Backend & Database
| Technologie | Rôle |
|-------------|------|
| Supabase | BaaS (PostgreSQL + Auth + Realtime + Storage) |
| PostgreSQL | Base de données relationnelle |
| Row Level Security (RLS) | Sécurité données multi-tenant |

### Infrastructure
| Service | Rôle |
|---------|------|
| Vercel | Hosting + CI/CD |
| Supabase | Database + Auth + Storage |
| Resend (v2) | Email transactionnel |

---

## 4. SCHÉMA DE DONNÉES

### Hiérarchie Principale
```
PROFILES
    │
    ├── 1:N ──► CATEGORIES (optionnel)
    │               │
    │               └── 1:N ──► THEMES
    │                               │
    │                               └── 1:N ──► SUBJECTS
    │                                               │
    │                                               └── 1:N ──► TASKS
    │
    ├── 1:N ──► PENDING_ITEMS (éléments en attente génériques)
    │
    └── 1:N ──► LABELS (étiquettes personnalisées)
```

### Tables Détaillées

```
┌─────────────────────────────────────────────────────────────┐
│                         PROFILES                             │
│  id (UUID, PK, FK auth.users)                               │
│  email, full_name, avatar_url                               │
│  created_at, updated_at                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        CATEGORIES                            │
│  id (UUID, PK)                                               │
│  user_id (FK profiles)                                       │
│  title, color_hex, icon, order_index                        │
│  created_at, updated_at                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                          THEMES                              │
│  id (UUID, PK)                                               │
│  user_id (FK profiles)                                       │
│  category_id (FK categories, NULLABLE)                      │
│  title, color_hex, icon, order_index                        │
│  created_at, updated_at                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         SUBJECTS                             │
│  id (UUID, PK)                                               │
│  theme_id (FK themes), user_id (FK profiles)                │
│  title, description, status (active|archived)               │
│  scratchpad (TEXT), icon, order_index                       │
│  last_activity_at, created_at, updated_at                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                          TASKS                               │
│  id (UUID, PK)                                               │
│  subject_id (FK subjects, NULLABLE for Inbox)               │
│  user_id (FK profiles)                                       │
│  title, description                                          │
│  status (todo|done|waiting_for)                             │
│  do_date (DATE), do_time (TIME), waiting_for_note           │
│  priority (0=normal, 1=high, 2=urgent)                      │
│  snooze_count (INT), order_index, completed_at              │
│  parent_task_id (FK tasks, for subtasks)                    │
│  created_at, updated_at                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      PENDING_ITEMS                           │
│  id (UUID, PK)                                               │
│  user_id (FK profiles)                                       │
│  title, description                                          │
│  status (pending|reminded|resolved)                         │
│  reminder_date, reminded_count, resolved_at                 │
│  category_id, theme_id, subject_id, task_id (FKs optionnels)│
│  created_at, updated_at                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                          LABELS                              │
│  id (UUID, PK)                                               │
│  user_id (FK profiles)                                       │
│  name, color_hex                                             │
│  created_at, updated_at                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       TASK_LABELS                            │
│  task_id (FK tasks, PK)                                      │
│  label_id (FK labels, PK)                                    │
│  created_at                                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    TASK_ATTACHMENTS                          │
│  id (UUID, PK)                                               │
│  task_id (FK tasks), user_id (FK profiles)                  │
│  file_name, file_type, file_size, storage_path              │
│  created_at                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. ARBORESCENCE DES FICHIERS

```
sederize/
├── .env.local                 # Variables d'environnement
├── .env.local.example         # Template env
├── CLAUDE.md                  # CE FICHIER - Architecture
├── best_practices.md          # Règles de codage
├── README.md                  # Documentation projet
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
├── components.json            # Config Shadcn/UI
│
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
│
├── supabase/
│   ├── schema.sql             # DDL complet + RLS policies
│   └── migrations/
│       ├── 001_initial.sql
│       ├── 002_add_categories.sql
│       ├── 003_add_pending_items.sql
│       └── 004_add_labels.sql
│
└── src/
    ├── app/
    │   ├── layout.tsx         # Root layout + Providers
    │   ├── globals.css        # Styles globaux + CSS vars
    │   │
    │   ├── (app)/             # Routes protégées
    │   │   ├── layout.tsx     # AppShell wrapper
    │   │   ├── page.tsx       # Daily Brief (/)
    │   │   ├── inbox/page.tsx
    │   │   ├── calendar/page.tsx
    │   │   ├── kanban/page.tsx
    │   │   ├── tasks/page.tsx       # All Tasks view
    │   │   ├── pending/page.tsx     # En Attente (waiting + pending items)
    │   │   ├── archives/page.tsx    # Tâches complétées
    │   │   ├── subject/[id]/page.tsx
    │   │   └── settings/page.tsx
    │   │
    │   ├── (auth)/            # Routes publiques
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx
    │   │   └── signup/page.tsx
    │   │
    │   └── auth/callback/route.ts
    │
    ├── components/
    │   ├── ui/                # Shadcn components (~25 composants)
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── dialog.tsx
    │   │   ├── priority-badge.tsx
    │   │   ├── snooze-badge.tsx
    │   │   ├── confirm-dialog.tsx
    │   │   └── ...
    │   │
    │   ├── layout/
    │   │   ├── app-shell.tsx
    │   │   ├── sidebar.tsx
    │   │   ├── bottom-nav.tsx
    │   │   └── mobile-menu.tsx
    │   │
    │   ├── tasks/
    │   │   ├── task-card.tsx
    │   │   ├── quick-add.tsx
    │   │   ├── snooze-popover.tsx
    │   │   ├── edit-task-dialog.tsx
    │   │   ├── task-focus-dialog.tsx
    │   │   ├── waiting-for-dialog.tsx
    │   │   ├── subject-picker.tsx
    │   │   └── label-picker.tsx
    │   │
    │   ├── calendar/
    │   │   ├── day-view.tsx
    │   │   ├── three-day-view.tsx
    │   │   └── week-view.tsx
    │   │
    │   ├── filters/
    │   │   └── theme-subject-filter.tsx
    │   │
    │   └── command-palette.tsx
    │
    ├── hooks/
    │   ├── use-themes.ts
    │   ├── use-subjects.ts
    │   ├── use-tasks.ts
    │   ├── use-categories.ts
    │   ├── use-pending-items.ts
    │   └── use-labels.ts
    │
    ├── lib/
    │   ├── utils.ts           # cn() helper
    │   ├── date-parser.ts     # Smart date parsing (FR+EN)
    │   └── supabase/
    │       ├── client.ts
    │       └── server.ts
    │
    ├── providers/
    │   ├── index.tsx
    │   ├── auth-provider.tsx
    │   └── query-provider.tsx
    │
    ├── types/
    │   └── database.ts        # Types TypeScript
    │
    └── middleware.ts
```

---

## 6. FONCTIONNALITÉS v1

### Core Features
| Feature | Status | Description |
|---------|--------|-------------|
| Daily Brief | ✅ Done | Tasks due today/overdue, grouped by theme |
| Themes & Subjects | ✅ Done | Hierarchical organization with colors |
| Categories | ✅ Done | Optional top-level grouping above themes |
| Subject Scratchpad | ✅ Done | Persistent notes per subject |
| Task CRUD | ✅ Done | Create, edit, delete, complete |
| Task Time | ✅ Done | Assign time to tasks (do_time) |
| Snooze | ✅ Done | Tomorrow, +3 days, pick date + counter |
| Waiting For | ✅ Done | Block tasks with notes, visible in Daily Brief |
| Pending Items | ✅ Done | Generic "waiting for" items (page "En Attente") |
| Inbox | ✅ Done | Capture without assignment |
| Calendar View | ✅ Done | Monthly + Day + 3-Day + Week views |
| Kanban View | ✅ Done | Drag-and-drop between statuses |
| All Tasks View | ✅ Done | View all tasks grouped by subject |
| Archives | ✅ Done | View completed tasks |
| Command Palette | ✅ Done | Cmd+K navigation |
| Zombie Alert | ✅ Done | Flag inactive subjects (10+ days) |
| Labels | ✅ Done | Custom colored tags on tasks |
| Priority | ✅ Done | Normal/High/Urgent with visual badges |
| Auth (Email+Google) | ✅ Done | Supabase Auth |
| Mobile-First UI | ✅ Done | Bottom nav, responsive |

### v2 Features (Backlog)
| Feature | Priority | Description |
|---------|----------|-------------|
| Email Digest | High | Daily morning summary |
| Push Notifications | Medium | PWA notifications |
| Recurring Tasks | Medium | Daily/Weekly/Monthly |
| Attachments | Medium | File uploads on tasks |
| Dark Mode | Low | Theme toggle |
| Data Export | Low | JSON/CSV export |

---

## 7. ÉTAT D'AVANCEMENT

### v1 Progress
```
[██████████████████████████████] 100%
```

| Phase | Status |
|-------|--------|
| Project Setup | ✅ Complete |
| Database Schema | ✅ Complete |
| Authentication | ✅ Complete |
| Core UI Components | ✅ Complete |
| Daily Brief | ✅ Complete |
| Subject View + Scratchpad | ✅ Complete |
| Calendar Views (4 modes) | ✅ Complete |
| Kanban View | ✅ Complete |
| Command Palette | ✅ Complete |
| Labels Feature | ✅ Complete |
| Pending Items | ✅ Complete |
| Archives | ✅ Complete |
| Bug Fixes (Jan 2025) | ✅ Complete |

---

## 8. DÉCISIONS ARCHITECTURALES

### ADR-001: API-First Design
**Contexte**: Une app mobile suivra la webapp.
**Décision**: Toutes les opérations passent par Supabase client (REST/Realtime).
**Conséquence**: Pas de API routes Next.js custom pour le CRUD.

### ADR-002: Row Level Security
**Contexte**: Multi-tenant data isolation.
**Décision**: RLS activé sur toutes les tables avec policies basées sur `auth.uid()`.
**Conséquence**: Sécurité garantie au niveau DB.

### ADR-003: React Query pour le State
**Contexte**: Besoin de cache intelligent et optimistic updates.
**Décision**: TanStack Query au lieu de Redux/Zustand.
**Conséquence**: Moins de boilerplate, invalidation automatique.

### ADR-004: Shadcn/UI over component libraries
**Contexte**: Besoin de customisation totale.
**Décision**: Shadcn (composants copiés dans le projet).
**Conséquence**: Ownership total du code.

### ADR-005: Unified "En Attente" Page
**Contexte**: Confusion entre tasks waiting_for et pending_items.
**Décision**: Une seule page "En Attente" affichant les deux.
**Conséquence**: UX unifiée, pas de double nomenclature.

---

## 9. COMMANDES UTILES

```bash
# Développement
npm run dev

# Build production
npm run build

# Linting
npm run lint

# Type checking
npx tsc --noEmit
```

---

## 10. SMART DATE PARSER

Le parser de date (`src/lib/date-parser.ts`) supporte:

### Dates Relatives (FR + EN)
- `today`, `tomorrow`, `next week`
- `aujourd'hui`, `demain`, `après-demain`, `semaine prochaine`
- Typos courants: `demian`, `demaain`, `dmain` → `demain`

### Jours de la Semaine
- EN: `monday`, `tue`, `wed`, etc.
- FR: `lundi`, `mardi`, `mercredi`, etc.

### Patterns Temporels
- `in 3 days`, `in 2 weeks`
- `dans 3 jours`, `dans 2 semaines`

### Heures (format 24h)
- `14h30`, `9h`, `18h15`
- Extrait automatiquement l'heure des inputs

---

## 11. FONCTIONNEMENT WAITING/PENDING

### Tasks "Waiting For" (status = waiting_for)
- Tâches existantes mises en attente d'une réponse
- Via menu dropdown → "Set waiting for"
- Champ `waiting_for_note` pour la raison
- Apparaît dans Daily Brief section "En attente"
- Apparaît dans page "En Attente" sous "Tâches en attente"

### Pending Items (table pending_items)
- Éléments génériques qu'on attend (pas liés à une tâche)
- Créés depuis la page "En Attente" → "+ Nouveau"
- Statuts: pending → reminded → resolved
- Actions: Relancer (+3 jours), Marquer résolu
- Compteur de relances

---

## 12. LABELS

### Fonctionnement
- Labels personnalisés avec nom + couleur
- Assignables aux tâches via Edit Task dialog
- Affichés sur les TaskCard (max 2 + "+N")
- Créés inline dans le LabelPicker

### Tables
- `labels`: id, user_id, name, color_hex
- `task_labels`: task_id, label_id (junction)

### Queries
Tous les hooks de tâches incluent les labels:
```sql
SELECT *, task_labels(label:labels(*)) FROM tasks
```

---

## 13. COMPOSANTS CLÉS

| Composant | Path | Description |
|-----------|------|-------------|
| TaskCard | `components/tasks/task-card.tsx` | Affichage d'une tâche avec priority, labels, snooze |
| TaskFocusDialog | `components/tasks/task-focus-dialog.tsx` | Modal focus pour une tâche |
| LabelPicker | `components/tasks/label-picker.tsx` | Sélecteur/créateur de labels |
| LabelBadges | `components/tasks/label-picker.tsx` | Affichage badges labels |
| SubjectPicker | `components/tasks/subject-picker.tsx` | Sélecteur hiérarchique de sujets |
| PriorityBadge | `components/ui/priority-badge.tsx` | Badge priorité (clickable pour cycle) |
| SnoozeBadge | `components/ui/snooze-badge.tsx` | Compteur de snooze |
| ConfirmDialog | `components/ui/confirm-dialog.tsx` | Dialog de confirmation |
| ThemeSubjectFilter | `components/filters/theme-subject-filter.tsx` | Filtre multi-sélection |

---

## 14. MIGRATIONS À EXÉCUTER

Si les features ne fonctionnent pas, vérifier que ces migrations ont été exécutées:

```bash
# Dans Supabase SQL Editor, exécuter dans l'ordre:
supabase/migrations/001_initial.sql      # Base schema
supabase/migrations/002_add_categories.sql  # Categories (optionnel)
supabase/migrations/003_add_pending_items.sql  # Pending items
supabase/migrations/004_add_labels.sql    # Labels system
```

### Colonnes Ajoutées aux Tasks
```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS do_time TIME;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS snooze_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id);
```

---

## 15. CHANGELOG

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-13 | 0.1.0 | Initial v1 implementation |
| 2025-01-13 | 0.1.1 | Branding update to Sederize |
| 2025-01-14 | 0.1.2 | UX: Framer Motion, skeletons, ThemeSubjectFilter |
| 2025-01-14 | 0.1.3 | Documentation: Added bugs/improvements backlog |
| 2025-01-14 | 0.2.0 | Major features: Labels, Pending Items, Archives, Calendar views |
| 2025-01-14 | 0.2.1 | Bug fixes: Priority save, date parser fuzzy matching, subject picker fallback, button overlap, unified "En Attente" page |
