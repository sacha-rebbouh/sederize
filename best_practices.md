# SEDERIZE - Best Practices & Coding Standards

> Ce document définit les règles de codage obligatoires pour tout développement sur Sederize.

---

## 1. CONVENTIONS DE NOMMAGE

### Fichiers & Dossiers
| Type | Convention | Exemple |
|------|------------|---------|
| Components | kebab-case | `task-card.tsx` |
| Hooks | camelCase avec prefix `use` | `use-tasks.ts` |
| Types | kebab-case | `database.ts` |
| Pages (App Router) | `page.tsx` dans dossier route | `app/inbox/page.tsx` |
| Utilities | kebab-case | `date-parser.ts` |

### Code
| Type | Convention | Exemple |
|------|------------|---------|
| Components | PascalCase | `TaskCard`, `DailyBrief` |
| Functions | camelCase | `handleSubmit`, `parseTaskInput` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_TASKS_PER_PAGE` |
| Types/Interfaces | PascalCase | `Task`, `CreateTaskInput` |
| Enums | PascalCase + PascalCase values | `TaskStatus.WaitingFor` |
| Boolean variables | Prefix `is/has/should` | `isLoading`, `hasError` |
| Event handlers | Prefix `handle/on` | `handleClick`, `onSubmit` |

---

## 2. STRUCTURE DES COMPOSANTS

### Pattern Standard
```tsx
'use client'; // Si composant client

// 1. Imports externes (React, Next, libs)
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Imports internes (components, hooks, utils)
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';

// 3. Imports types
import { Task, Label } from '@/types/database';

// 4. Interface Props (toujours nommée avec suffix Props)
interface TaskCardProps {
  task: Task;
  labels?: Label[];
  onComplete?: () => void;
  className?: string;
}

// 5. Component (export nommé préféré, default pour pages)
export function TaskCard({ task, labels = [], onComplete, className }: TaskCardProps) {
  // 5a. Hooks (toujours en premier)
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 5b. Derived state / Memos
  const isOverdue = task.do_date && new Date(task.do_date) < new Date();

  // 5c. Effects
  useEffect(() => {
    // ...
  }, []);

  // 5d. Handlers
  const handleClick = () => {
    // ...
  };

  // 5e. Early returns (loading, error, empty states)
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // 5f. Main render
  return (
    <div className={cn('base-classes', className)}>
      {/* JSX */}
    </div>
  );
}
```

---

## 3. TYPESCRIPT

### Règles Strictes
- **NO `any`** : Toujours typer explicitement
- **NO `as` casting** sauf nécessité absolue (documenter pourquoi)
- **Prefer `interface` over `type`** pour les objets extensibles
- **Use `type` for unions/intersections**

### Types Obligatoires
```tsx
// ✅ Bon
function createTask(input: CreateTaskInput): Promise<Task> { }

// ❌ Mauvais
function createTask(input: any): any { }
```

### Nullability
```tsx
// ✅ Utiliser optional chaining
const title = task?.subject?.title;

// ✅ Nullish coalescing pour defaults
const color = theme?.color_hex ?? '#6366f1';

// ❌ Éviter les assertions non-null sauf si garanti
const id = task!.id; // Dangereux
```

---

## 4. REACT QUERY PATTERNS

### Naming Convention
```tsx
// Queries: use[Entity][Qualifier]
useThemes()
useTheme(id)
useActiveSubjects()
useDailyBriefTasks()
useWaitingForTasks()
useLabels()
useTaskLabels(taskId)

// Mutations: use[Action][Entity]
useCreateTask()
useUpdateTask()
useDeleteTask()
useCompleteTask()
useSnoozeTask()
useCreateLabel()
useSetTaskLabels()
```

### Query Keys Structure
```tsx
// Hiérarchique pour invalidation granulaire
queryKey: ['tasks']                           // Tous les tasks
queryKey: ['tasks', 'daily-brief']            // Daily brief
queryKey: ['tasks', 'subject', subjectId]     // Tasks d'un subject
queryKey: ['tasks', 'waiting-for']            // Tasks en attente
queryKey: ['subjects', 'active']              // Subjects actifs
queryKey: ['labels']                          // Tous les labels
queryKey: ['task-labels', taskId]             // Labels d'une task
queryKey: ['pending-items']                   // Pending items
```

### Mutation Pattern avec Labels
```tsx
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const supabase = createClient();
      // ... logic
    },
    onSuccess: () => {
      // Invalider les queries affectées
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-labels'] });
    },
    onError: (error) => {
      console.error('Failed to create task:', error);
    },
  });
}
```

### Query avec Relations Many-to-Many (Labels)
```tsx
// Pattern pour fetcher les tasks avec leurs labels
const { data, error } = await supabase
  .from('tasks')
  .select(`
    *,
    subject:subjects(*, theme:themes(*)),
    task_labels(label:labels(*))
  `)
  .eq('status', 'todo');

// Transformer pour avoir labels au niveau top
return data.map((task) => ({
  ...task,
  theme: task.subject?.theme || null,
  labels: task.task_labels?.map((tl: any) => tl.label).filter(Boolean) || [],
})) as TaskWithRelations[];
```

---

## 5. SUPABASE & BASE DE DONNÉES

### Client Creation
```tsx
// ✅ Créer le client DANS la fonction (pas au niveau module)
export function useMyHook() {
  return useQuery({
    queryFn: async () => {
      const supabase = createClient(); // ICI
      // ...
    },
  });
}

// ❌ Éviter le client au niveau module
const supabase = createClient(); // Problèmes de SSR
```

### Queries avec Relations
```tsx
// Utiliser la syntaxe de sélection Supabase
const { data } = await supabase
  .from('tasks')
  .select(`
    *,
    subject:subjects(
      *,
      theme:themes(*)
    ),
    task_labels(label:labels(*))
  `)
  .eq('status', 'todo');
```

### Row Level Security
- **TOUJOURS** activer RLS sur les nouvelles tables
- **TOUJOURS** créer les policies CRUD
- Pattern standard:
```sql
CREATE POLICY "Users can view their own data"
  ON public.table_name FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 6. STYLING (TAILWIND)

### Ordre des Classes
1. Layout (flex, grid, position)
2. Sizing (w, h, p, m)
3. Typography (text, font)
4. Colors (bg, text-color, border)
5. Effects (shadow, opacity, transition)
6. States (hover, focus, active)

```tsx
// ✅ Organisé
className="flex items-center gap-2 p-4 text-sm font-medium bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow"

// ❌ Chaotique
className="hover:shadow-md text-sm flex p-4 bg-card gap-2 items-center"
```

### Utiliser cn() pour Conditions
```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  'base-classes p-4 rounded-lg',
  isActive && 'bg-primary text-primary-foreground',
  isDisabled && 'opacity-50 cursor-not-allowed',
  className
)} />
```

### Responsive Design
- **Mobile-First**: Toujours commencer par mobile
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)

```tsx
// ✅ Mobile-first
className="text-sm md:text-base p-2 md:p-4"

// ❌ Desktop-first
className="text-base sm:text-sm"
```

---

## 7. GESTION DES ERREURS

### Pattern Try-Catch
```tsx
const handleSubmit = async () => {
  try {
    setIsLoading(true);
    await createTask(input);
    // Success handling
  } catch (error) {
    // Type-safe error handling
    if (error instanceof Error) {
      setError(error.message);
    } else {
      setError('An unexpected error occurred');
    }
  } finally {
    setIsLoading(false);
  }
};
```

### User-Facing Errors
- Messages clairs et actionnables
- Pas de stack traces en production
- Toast notifications pour feedback immédiat

---

## 8. SÉCURITÉ

### Règles Absolues
1. **JAMAIS** de credentials dans le code
2. **TOUJOURS** utiliser `.env.local` pour les secrets
3. **JAMAIS** de `NEXT_PUBLIC_` pour les secrets (exposés au client)
4. **TOUJOURS** valider les inputs côté serveur (RLS)
5. **JAMAIS** de `dangerouslySetInnerHTML` sans sanitization

### Variables d'Environnement
```bash
# .env.local (JAMAIS committé)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx  # Clé publique OK
# SUPABASE_SERVICE_KEY=xxx          # JAMAIS NEXT_PUBLIC_
```

---

## 9. PERFORMANCE

### Optimisations Obligatoires
```tsx
// Mémoïser les callbacks passés aux enfants
const handleClick = useCallback(() => {
  // ...
}, [dependency]);

// Mémoïser les calculs coûteux
const sortedTasks = useMemo(() => {
  return tasks.sort((a, b) => /* ... */);
}, [tasks]);

// Lazy loading pour les routes
const Calendar = dynamic(() => import('./calendar'), {
  loading: () => <Skeleton />,
});
```

### Images
- Utiliser `next/image` pour l'optimisation automatique
- Toujours spécifier `width` et `height`

---

## 10. COMMITS & GIT

### Format des Commits
```
type(scope): description courte

[body optionnel]

[footer optionnel]
```

### Types
| Type | Description |
|------|-------------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `style` | Formatage (pas de changement de code) |
| `refactor` | Refactoring |
| `test` | Ajout de tests |
| `chore` | Maintenance |

### Exemples
```
feat(tasks): add snooze functionality
fix(auth): resolve Google OAuth redirect issue
docs: update CLAUDE.md with new architecture
refactor(hooks): extract supabase client creation
feat(labels): add label management to tasks
fix(priority): fix priority change not saving
```

---

## 11. TESTS (Future)

### Structure
```
__tests__/
├── components/
│   └── task-card.test.tsx
├── hooks/
│   └── use-tasks.test.ts
└── utils/
    └── date-parser.test.ts
```

### Conventions
- Fichiers: `[name].test.ts(x)`
- Describe blocks par feature
- Test names: "should [expected behavior] when [condition]"

---

## 12. UX & INTERACTIONS

### Principes Fondamentaux
1. **Clickable = Large Zone** : Toute la card/div est cliquable, pas juste le texte
2. **Feedback Immédiat** : Toast notifications pour chaque action
3. **Loading States** : Skeleton loaders, jamais "Loading..."
4. **Animations Subtiles** : Framer Motion pour transitions fluides

### Zones Cliquables
```tsx
// ✅ Bon - Toute la card est cliquable
<Card onClick={handleClick} className="cursor-pointer hover:shadow-md">
  <CardContent>
    <h3>{title}</h3>
    <p>{description}</p>
  </CardContent>
</Card>

// ❌ Mauvais - Seul le titre est cliquable
<Card>
  <CardContent>
    <h3 onClick={handleClick} className="cursor-pointer">{title}</h3>
    <p>{description}</p>
  </CardContent>
</Card>
```

### Event Propagation
```tsx
// ✅ Stopper la propagation pour les éléments interactifs imbriqués
const handlePriorityChange = (e: React.MouseEvent) => {
  e.stopPropagation(); // Empêche le click de remonter à la card
  // ... logic
};
```

### Filtres & Sélection
```tsx
// Pour listes courtes (< 10 items): Dropdown/Select
<Select value={value} onValueChange={onChange}>
  {items.map(item => <SelectItem key={item.id} />)}
</Select>

// Pour listes longues (> 10 items): Modal avec recherche
<Dialog>
  <Input placeholder="Rechercher..." />
  <ScrollArea>
    {filteredItems.map(item => ...)}
  </ScrollArea>
</Dialog>

// Pour sélection hiérarchique (Theme > Subject): Accordéon ou fallback
// Voir SubjectPicker pour l'implémentation avec fallback si pas de categories
```

### Icônes Claires
| Action | Icône Recommandée | À Éviter |
|--------|-------------------|----------|
| Déplacer vers | `FolderInput`, `MoveRight` | `ArrowRight` (confus) |
| Attribuer à | `UserPlus`, `FolderPlus` | `Plus` seul |
| En attente de | `Hourglass`, `Clock` | `Pause` |
| Relancer | `RefreshCw`, `Send` | `Redo` |
| Labels | `Tag` | `Label` |
| Priorité | `Flag`, `AlertTriangle` | `Star` |

### Navigation Temporelle
```tsx
// Pattern pour navigation jour par jour
<div className="flex items-center gap-2">
  <Button onClick={goToPreviousDay}>
    <ChevronLeft />
  </Button>
  <span>{formatDate(currentDate)}</span>
  <Button onClick={goToNextDay}>
    <ChevronRight />
  </Button>
  <Button onClick={goToToday}>Today</Button>
</div>
```

### Stats Cards Interactives
```tsx
// Les cards de stats doivent être cliquables pour filtrer
<Card
  onClick={() => setFilter('waiting')}
  className={cn(
    "cursor-pointer hover:shadow-md transition-shadow",
    filter === 'waiting' && "ring-2 ring-primary"
  )}
>
  <CardContent>
    <Hourglass className="h-5 w-5" />
    <span>{waitingCount}</span>
    <span>Waiting</span>
  </CardContent>
</Card>
```

---

## 13. FRAMER MOTION PATTERNS

### Container + Items (Stagger)
```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

<motion.div variants={containerVariants} initial="hidden" animate="show">
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

### AnimatePresence pour Exits
```tsx
<AnimatePresence mode="popLayout">
  {tasks.map(task => (
    <motion.div
      key={task.id}
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
    >
      <TaskCard task={task} labels={task.labels} />
    </motion.div>
  ))}
</AnimatePresence>
```

### Hover Effects
```tsx
<motion.div
  whileHover={{ scale: 1.02, y: -2 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.2 }}
>
  {content}
</motion.div>
```

---

## 14. LABELS PATTERNS

### Affichage sur TaskCard
```tsx
// Toujours passer les labels au TaskCard
<TaskCard
  task={task}
  theme={task.theme}
  labels={task.labels}  // Important!
  showSubject
  subjectTitle={task.subject?.title}
/>
```

### LabelBadges Component
```tsx
// Pour affichage read-only des labels
<LabelBadges labels={labels} max={2} />
// Affiche max 2 labels + "+N" si plus
```

### LabelPicker Component
```tsx
// Pour sélection/création de labels dans un formulaire
<LabelPicker
  selectedLabels={selectedLabels}
  onLabelsChange={setSelectedLabels}
/>
```

### Couleurs des Labels
```tsx
// Les labels utilisent la couleur hex avec transparence
style={{
  backgroundColor: label.color_hex + '20', // 20 = 12% opacity
  borderColor: label.color_hex,
  color: label.color_hex,
}}
```

---

## 15. PRIORITY PATTERNS

### PriorityBadge avec Click
```tsx
// Le badge est clickable pour cycler la priorité
<PriorityBadge
  priority={(task.priority ?? 0) as PriorityLevel}
  onClick={handlePriorityChange}
/>

// Handler avec stopPropagation
const handlePriorityChange = (e: React.MouseEvent) => {
  e.stopPropagation(); // Important pour ne pas trigger le click de la card
  const currentPriority = (task.priority ?? 0) as PriorityLevel;
  const newPriority = cyclePriority(currentPriority);
  updateTask.mutate({ id: task.id, priority: newPriority });
};
```

### Cycle de Priorité
```tsx
// 0 (Normal) → 1 (High) → 2 (Urgent) → 0 (Normal)
export function cyclePriority(current: PriorityLevel): PriorityLevel {
  return ((current + 1) % 3) as PriorityLevel;
}
```

---

## 16. DATE PARSER PATTERNS

### Fuzzy Matching pour Typos
```tsx
// Le parser inclut des typos courants français
const relativePatterns = {
  'demain': () => addDays(new Date(), 1),
  'demian': () => addDays(new Date(), 1),  // typo
  'demaain': () => addDays(new Date(), 1), // typo
  'dmain': () => addDays(new Date(), 1),   // typo
};
```

### Extraction de l'Heure
```tsx
// Format français 24h
// "rdv demain 14h30" → date: tomorrow, time: "14:30"
const frenchTimeRegex = /(?:à\s*)?(\d{1,2})h(\d{2})?\b/i;
```

---

## 17. CHECKLIST AVANT PR

- [ ] Code compile sans erreur (`npm run build`)
- [ ] Lint passe (`npm run lint`)
- [ ] Types corrects (`npx tsc --noEmit`)
- [ ] Responsive testé (mobile + desktop)
- [ ] CLAUDE.md mis à jour si architecture change
- [ ] Pas de `console.log` restants (sauf debug intentionnel)
- [ ] Pas de TODO non documentés
- [ ] Zones cliquables larges (pas juste le texte)
- [ ] Loading states avec skeletons
- [ ] Animations fluides avec Framer Motion
- [ ] Icônes explicites et cohérentes
- [ ] Labels passés aux TaskCard
- [ ] Event propagation gérée (stopPropagation si nécessaire)
- [ ] Queries avec labels inclus (`task_labels(label:labels(*))`)
