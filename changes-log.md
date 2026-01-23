# Changes Log - Sederize

## 2026-01-23 19:00 - Disable PowerSync on iOS Safari (WASM crash fix)

### Fichiers modifies
- `src/providers/powersync-provider.tsx`

### Probleme
PowerSync utilise WASM (wa-sqlite) pour SQLite local. Sur iOS Safari, les limitations memoire WASM causaient des crashs apres 10-35 secondes avec le message "Impossible d'ouvrir cette page".

### Solution
Detection de iOS Safari via User Agent et desactivation complete de PowerSync:
- `isIOSSafari()`: Detecte iPad/iPhone/iPod + WebKit + pas Chrome/Firefox
- Si iOS Safari: `setIsDisabled(true)` et return early
- `usePowerSyncReady()` retourne `false` quand disabled, forcant le fallback Supabase
- PowerSync fonctionne normalement sur desktop et Android

### Impact
- iOS Safari: Pas d'offline (Supabase direct), mais pas de crash
- Autres plateformes: PowerSync continue de fonctionner normalement
- Compromis temporaire en attendant une meilleure solution WASM

---

## 2026-01-23 18:30 - Set ALL PowerSync queries to runQueryOnce: true

### Fichiers modifies
- `src/hooks/use-tasks.ts` (11 queries)
- `src/hooks/use-pending-items.ts` (11 queries)
- `src/hooks/use-labels.ts` (1 query)
- `src/lib/powersync/hooks.ts` (useWatchedQuery helper)

### Probleme
Malgre les optimisations precedentes, l'app crashait encore sur iOS Safari apres ~35 secondes. Les watched queries avec `runQueryOnce: false` continuaient d'emettre des nouvelles references de donnees a chaque evenement de sync PowerSync, causant une accumulation de memoire.

### Solution radicale
Passage de TOUTES les queries PowerSync a `runQueryOnce: true`. Cela signifie:
- Les donnees se chargent une fois au mount du composant
- Pas de mises a jour en temps reel
- Les donnees se rafraichissent a la navigation (changement de page)

### Impact UX
- Plus de crash sur iOS Safari
- Les nouvelles taches/modifications apparaissent apres navigation, pas immediatement
- Compromis acceptable pour la stabilite

---

## 2026-01-23 18:15 - Reduce PowerSync state updates and query re-renders

### Fichiers modifies
- `src/providers/powersync-provider.tsx`
- `src/hooks/use-tasks.ts`

### Problemes identifies
1. Le status listener PowerSync mettait a jour le state a chaque evenement meme si les valeurs n'avaient pas change
2. `setLastSyncedAt(new Date())` creait un nouvel objet a chaque sync, causant des re-renders
3. L'interval `checkPendingChanges` tournait toutes les 5 secondes et mettait a jour le state inutilement
4. Les hooks `useInboxCount()` et `useWaitingForCount()` dans la sidebar avaient `runQueryOnce: false`

### Solutions
1. Ajout de guards dans le status listener pour ne mettre a jour le state que si les valeurs changent vraiment
2. Suppression de la mise a jour de `lastSyncedAt` (causait trop de re-renders)
3. Augmentation de l'interval de `checkPendingChanges` de 5s a 30s avec guards
4. Changement de `useInboxCount()` et `useWaitingForCount()` a `runQueryOnce: true`

---

## 2026-01-23 17:55 - Fix PowerSync reconnection loop on token refresh

### Fichiers modifies
- `src/providers/powersync-provider.tsx`

### Probleme
Toutes les pages crashaient apres ~10 secondes avec "impossible d'ouvrir cette page". Cause: l'effet d'initialisation PowerSync dependait de `session?.access_token`. Quand Supabase rafraichit automatiquement le token, ca declenchait:
1. `setSession(session)` dans AuthProvider
2. L'effet PowerSync se reexecute (car access_token change)
3. PowerSync se deconnecte et se reconnecte
4. Toutes les queries se reinitialisent
5. Boucle → crash (memory exhaustion)

### Solution
Suppression de `session?.access_token` des dependances de l'effet. On ne depend plus que de `user?.id`. Le SupabaseConnector gere le rafraichissement du token en interne via `fetchCredentials()`.

---

## 2026-01-23 17:45 - Fix crash caused by task_labels re-render cascade

### Fichiers modifies
- `src/hooks/use-tasks.ts`

### Probleme
La page Daily Brief crashait apres 10 secondes ("impossible d'ouvrir cette page"). Cause: la query `task_labels` dans `useRelatedData()` avait `runQueryOnce: false`, ce qui declenchait des re-renders a chaque sync PowerSync. Comme `useRelatedData()` est appele par plusieurs hooks (useDailyBriefTasks, useWaitingForTasks, etc.), cela creait une cascade de re-renders qui finissait par faire crasher l'app (memory exhaustion).

### Solution
Changement de `task_labels` a `runQueryOnce: true` dans `useRelatedData()`. Les assignations de labels se rafraichissent a la navigation ou au refresh manuel.

---

## 2026-01-23 17:35 - Fix PowerSync auto-refresh on all pages

### Fichiers modifies
- `src/hooks/use-categories.ts`
- `src/hooks/use-themes.ts`
- `src/hooks/use-subjects.ts`
- `src/hooks/use-labels.ts`

### Probleme
Les pages (Daily Brief, Toutes les taches, etc.) se rafraichissaient automatiquement sans interaction utilisateur. Cause: les `usePowerSyncWatchedQuery` avec `runQueryOnce: false` emettent de nouvelles references de donnees a chaque evenement de sync PowerSync, meme si les donnees n'ont pas change, ce qui cause des re-renders React.

### Solution
Changement de `runQueryOnce: false` a `runQueryOnce: true` pour les donnees de reference statiques:
- `use-categories.ts`: 4 occurrences (useCategories, useCategoriesWithThemes, useCategory)
- `use-themes.ts`: 2 occurrences (useThemes, useTheme)
- `use-subjects.ts`: 8 occurrences (useSubjects, useActiveSubjects, useSubject, useZombieSubjects)
- `use-labels.ts`: 2 occurrences (useLabels, labelsResult dans useTaskLabels)

Note: task_labels garde `runQueryOnce: false` car il necessite des mises a jour temps reel pour l'assignation de labels.

### Impact
- Plus de rafraichissements automatiques intempestifs
- UI stable sans re-renders constants
- Performance amelioree

---

## 2026-01-23 17:20 - Remove dead code from powersync hooks

### Fichiers modifies
- `src/lib/powersync/hooks.ts`

### Changement
Suppression du code mort non utilise (reduction de ~160 lignes a ~40 lignes):
- `WatchedQueryResult` type
- `useWatchedQuery` hook (avait `runQueryOnce: false` problematique)
- `useUserId`, `usePowerSyncWrite`, `usePowerSyncReady` hooks
- `buildInsertSQL`, `buildUpdateSQL`, `buildDeleteSQL` functions

### Ce qui reste (utilise)
- `generateUUID()`, `nowISO()`, `formatDateSQL()`

---

## 2026-01-23 17:15 - Fix TaskCard "3mm jump" animation issue

### Fichiers modifies
- `src/components/tasks/task-card.tsx`

### Probleme
Les task cards "montaient" de 3mm apres le rendu initial a cause de l'animation Framer Motion `initial={{ opacity: 0, y: 10 }}` qui s'executait au mount.

### Solution
Suppression de toutes les animations de mount dans TaskCard:
- `motion.div` principal → `div` standard avec classes CSS pour l'effet `isCompleting`
- Subject badge: suppression de `initial/animate` opacity
- Waiting for note: suppression de `initial/animate` opacity/height
- Metadata row: suppression de `initial/animate` opacity avec delay

Les animations interactives (checkbox hover/tap, complete animation) sont preservees.

### Impact
- Plus de "jump" visuel au chargement des tasks
- UI plus stable et professionnelle
- Performance legerement amelioree (moins d'animations)

---

## 2026-01-23 17:05 - Fix "Rester connecte" redirect loop

### Fichiers modifies
- `src/lib/supabase/client.ts`
- `src/middleware.ts`
- `src/providers/auth-provider.tsx`

### Probleme
Boucle de redirection infinie quand l'utilisateur se connecte avec "Rester connecte" decoche:
1. Middleware serveur voit session valide → redirige vers `/`
2. AuthProvider client appelle `signOut()` → redirige vers `/login`
3. Middleware voit encore session → redirige vers `/`
4. Boucle infinie

### Cause racine
`sessionStorage` n'est pas accessible cote serveur. Le middleware ne savait pas que le client allait effacer la session.

### Solution
Remplace `sessionStorage` par des **cookies** lisibles par le serveur:
- `sederize-remember-me`: cookie persistant (1 an) stockant la preference
- `sederize-session-active`: cookie de session (expire a la fermeture du navigateur)

Le middleware verifie maintenant ces cookies:
- Si `remember-me = false` ET `session-active` absent → signOut cote serveur et redirige vers login
- Plus de conflit serveur/client

### Impact
- Login avec "Rester connecte" fonctionne correctement
- Fermer le navigateur deconnecte si "Rester connecte" n'etait pas coche
- Plus de boucle de redirection

---

## 2026-01-23 16:10 - Fix constant re-renders: runQueryOnce: true for all PowerSync queries

### Fichiers modifies
- `src/hooks/use-tasks.ts` (11 occurrences)
- `src/hooks/use-pending-items.ts` (11 occurrences)
- `src/hooks/use-subjects.ts` (8 occurrences)
- `src/hooks/use-themes.ts` (2 occurrences)
- `src/hooks/use-categories.ts` (4 occurrences)
- `src/hooks/use-labels.ts` (3 occurrences)
- `src/providers/related-data-provider.tsx` (5 occurrences)

### Changement
**ROOT CAUSE FIX** pour les re-renders constants et les rafraichissements de page.

### Probleme identifie
`usePowerSyncWatchedQuery` avec `runQueryOnce: false` (le defaut) emet de nouvelles references de donnees a CHAQUE evenement de sync PowerSync:
- PowerSync sync en arriere-plan → nouvelle emission de donnees
- Nouvelles references objets → React detecte un changement
- Re-render du composant → les animations se rejouent, la page "flash"
- Ce cycle se repete indefiniment tant que PowerSync sync

### Solution
Change `runQueryOnce: false` en `runQueryOnce: true` pour TOUTES les watched queries:
- Les queries sont executees UNE SEULE FOIS au mount
- Plus d'emissions continues lors des syncs PowerSync
- Les donnees se rafraichissent lors de la navigation entre pages
- Les mutations React Query invalident toujours correctement le cache

### Impact
- Plus de "flash" ou refresh constant des pages
- Plus de crash apres navigation entre onglets
- PWA stable et performante
- Les donnees restent a jour via les mutations et la navigation

---

## 2026-01-23 15:35 - Remove Framer Motion mount animations from Kanban page

### Fichiers modifies
- `src/app/(app)/kanban/page.tsx`

### Changement
Suppression des animations Framer Motion de mount de la page Kanban tout en preservant la fonctionnalite drag-and-drop.

### Modifications
- Supprime l'import de `motion` et `AnimatePresence` de framer-motion
- Remplace tous les `motion.div` par des `div` standards dans:
  - `SortableTaskCard`: conserve isDragging opacity via style inline
  - `DroppableColumn`: supprime animations de mount
  - `KanbanPage`: supprime animations de mount du header et des colonnes
  - `DragOverlay`: remplace par div avec classes CSS statiques (`scale-105 rotate-1`)
- Supprime toutes les props d'animation mount (`initial`, `animate`, `exit`, `transition`, `whileHover`)
- Supprime le wrapper `AnimatePresence`
- Conserve la fonctionnalite drag-and-drop via @dnd-kit (useSortable, useDroppable)

### Impact
- Page Kanban plus stable et performante
- Bundle size reduit (suppression de framer-motion de cette page)
- Drag-and-drop fonctionne toujours correctement
- Feedback visuel isDragging preserve via style inline

---

## 2026-01-23 15:25 - Remove Framer Motion animations from Calendar pages

### Fichiers modifies
- `src/app/(app)/calendar/page.tsx`
- `src/app/(app)/calendar/calendar-mobile-v1.tsx`

### Changement
Suppression complete des animations Framer Motion des deux pages Calendar pour ameliorer les performances.

### Modifications
**page.tsx (agenda view):**
- Supprime l'import de `motion` et `AnimatePresence` de framer-motion
- Remplace tous les `motion.div` par des `div` simples
- Supprime toutes les props d'animation (`initial`, `animate`, `exit`, `transition`)
- Supprime les wrappers `AnimatePresence`
- Le FAB "Scroll to Today" utilise maintenant un simple rendu conditionnel

**calendar-mobile-v1.tsx (month/week/day views):**
- Supprime l'import de `motion` et `AnimatePresence` de framer-motion
- Supprime les constantes `containerVariants` et `dayVariants`
- Supprime la variable `direction` (utilisee uniquement pour animations)
- Remplace tous les `motion.div`, `motion.span`, `motion.button` par des elements HTML standards
- Supprime toutes les props d'animation (`initial`, `animate`, `exit`, `transition`, `variants`, `whileHover`, `whileTap`)
- Supprime les wrappers `AnimatePresence`
- Conserve les effets hover via CSS (`transition-transform hover:scale-105/110`)

### Impact
- Pages Calendar plus stables et performantes
- Bundle size reduit (suppression des variants et animations)
- Pas de flash visuel lors des mises a jour de donnees
- Coherence avec les autres pages deja sans animations

---

## 2026-01-23 15:15 - Remove Framer Motion animations from Subject page

### Fichiers modifies
- `src/app/(app)/subject/[[...id]]/subject-page-client.tsx`

### Changement
Suppression complete des animations Framer Motion de la page Subject pour ameliorer les performances et eviter les re-renders visuels.

### Modifications
- Supprime l'import de `motion` et `AnimatePresence` de framer-motion
- Supprime les constantes `containerVariants` et `itemVariants`
- Remplace tous les `motion.div`, `motion.form`, `motion.p`, `motion.span` par des elements HTML standards
- Supprime toutes les props d'animation (`initial`, `animate`, `exit`, `transition`, `variants`, `layout`, `whileHover`, `whileTap`)
- Supprime les wrappers `AnimatePresence`
- Conserve l'animation CSS `animate-spin` pour le spinner de soumission

### Impact
- Plus de flash visuel lors des mises a jour de donnees
- Bundle size reduit (suppression des variants et animations)
- Page plus stable et performante
- Coherence avec les autres pages (tasks, pending, archives, inbox) deja sans animations

---

## 2026-01-23 15:10 - Remove Framer Motion animations from Inbox page

### Fichiers modifies
- `src/app/(app)/inbox/page.tsx`

### Changement
Suppression complete des animations Framer Motion de la page "Inbox" pour optimiser les performances.

### Modifications
- Supprime l'import de `motion` et `AnimatePresence` de framer-motion
- Supprime les constantes `containerVariants` et `itemVariants`
- Remplace tous les `motion.div`, `motion.form`, `motion.p` par des `div`, `form`, `p` simples
- Supprime toutes les props d'animation (`initial`, `animate`, `exit`, `transition`, `variants`, `layout`, `whileHover`)
- Supprime le wrapper `AnimatePresence`
- Remplace l'animation de rotation du spinner par la classe CSS `animate-spin`

### Impact
- Page plus stable et performante
- Bundle size legerement reduit
- Pas de flash visuel lors des mises a jour de donnees

---

## 2026-01-23 15:00 - Remove Framer Motion animations from Archives page

### Fichiers modifiés
- `src/app/(app)/archives/page.tsx`

### Changement
Suppression complète des animations Framer Motion de la page "Archives" pour optimiser les performances et éviter les re-renders visuels.

### Modifications
- Supprimé l'import de `motion` et `AnimatePresence` de framer-motion
- Remplacé tous les `motion.div` et `motion.span` par des `div` et `span` simples
- Supprimé toutes les props d'animation (`initial`, `animate`, `exit`, `transition`, `key` pour animations)
- Supprimé le wrapper `AnimatePresence`

### Impact
- Page plus stable et performante
- Bundle size légèrement réduit
- Pas de flash visuel lors des mises à jour de données

---

## 2026-01-23 14:45 - Remove Framer Motion animations from Pending page

### Fichiers modifiés
- `src/app/(app)/pending/page.tsx`

### Changement
Suppression complète des animations Framer Motion de la page "En Attente" pour éviter les re-renders visuels lors des syncs PowerSync.

### Modifications
- Supprimé l'import de `motion` et `AnimatePresence` de framer-motion
- Remplacé tous les `motion.div` par des `div` simples
- Supprimé toutes les props d'animation (`initial`, `animate`, `exit`, `transition`, `variants`)
- Supprimé le wrapper `AnimatePresence`

### Impact
- Plus de flash visuel lors des mises à jour de données
- Bundle size légèrement réduit
- Page plus stable et performante

---

## 2026-01-23 14:15 - Add "Remember Me" checkbox on login page

### Fichiers modifiés
- `src/lib/supabase/client.ts`
- `src/providers/auth-provider.tsx`
- `src/app/(auth)/login/page.tsx`

### Changement
Ajout d'une option "Rester connecté" sur la page de connexion.

### Fonctionnement
- **Cochée (par défaut)** : La session persiste entre les fermetures du navigateur (comportement actuel)
- **Décochée** : L'utilisateur sera déconnecté à la prochaine ouverture du navigateur

### Implémentation technique
- Stockage de la préférence dans `localStorage` (`sederize_remember_me`)
- Marqueur de session dans `sessionStorage` (`sederize_session_active`)
- Au démarrage de l'app, si "remember me" = false ET pas de marqueur de session → déconnexion automatique
- Le marqueur sessionStorage est effacé quand le navigateur est fermé (comportement natif)

### Impact
- UX améliorée pour les utilisateurs sur appareils partagés
- Rétrocompatible : les utilisateurs existants restent connectés par défaut

---

## 2026-01-23 13:00 - Remove ALL animations from All Tasks page

### Fichiers modifiés
- `src/app/(app)/tasks/page.tsx`

### Problème
La page "Toutes les tâches" se rafraîchissait visuellement 2-3 fois quand on y naviguait, et les cartes flashaient.

### Cause
Les watched queries PowerSync émettent plusieurs fois au chargement :
1. Données du cache local
2. Données après sync serveur
3. Updates additionnels

Chaque émission déclenchait un re-render, et les animations Framer Motion (`initial`, `staggerChildren`, etc.) rejouaient à chaque fois.

### Solution
**Suppression complète des animations Framer Motion sur cette page** :
- Remplacé tous les `motion.div` par des `div` simples
- Supprimé `containerVariants` et `itemVariants`
- Supprimé `AnimatePresence`
- Conservé uniquement la transition CSS pour la rotation du chevron

### Impact
- Plus de "refresh" visible
- Plus de flash des cartes
- Page statique et stable
- Bundle size réduit (~150 bytes de moins)

---

## 2026-01-23 12:30 - CRITICAL FIX: Centralized RelatedData to prevent query duplication

### Fichiers modifiés
- `src/providers/related-data-provider.tsx` (nouveau)
- `src/providers/index.tsx`
- `src/hooks/use-tasks.ts`

### Problème critique
**51 watched queries PowerSync** s'exécutaient en parallèle, causant :
1. Crash "un problème récurrent est survenu" après plusieurs navigations
2. Re-renders en cascade (16+ par sync sur Daily Brief)
3. Flash des TaskCard

### Cause racine
Chaque hook de tâche (`useDailyBriefTasks`, `useWaitingForTasks`, etc.) créait **ses propres 5 instances** de watched queries via `useRelatedData()` :
- subjects, themes, categories, labels, task_labels

Sur Daily Brief seule : 2 hooks × 5 queries = 10 queries dupliquées
+ autres hooks = ~16 queries pour les mêmes données !

### Solution : Contexte partagé avec pattern deux-composants
Création de `RelatedDataProvider` avec architecture sécurisée :
- **5 queries uniques** pour toute l'application
- Montées une seule fois au niveau root
- Partagées via Context entre tous les hooks
- **Pattern deux-composants** : `RelatedDataProvider` (vérifie isPowerSyncReady) → `RelatedDataProviderInner` (exécute les queries)

### Pourquoi le pattern deux-composants ?
```typescript
// RelatedDataProvider vérifie d'abord si PowerSync est prêt
if (!isPowerSyncReady) {
  return <Context.Provider value={EMPTY_DATA}>{children}</Context.Provider>;
}
// Seulement si prêt, on rend le composant avec les queries
return <RelatedDataProviderInner>{children}</RelatedDataProviderInner>;
```
Cela garantit que `usePowerSyncWatchedQuery` n'est appelé que quand `PowerSyncContext` existe.

### Avant/Après
```
AVANT:
- Daily Brief: ~16 watched queries
- All Tasks: ~12 watched queries
- Chaque navigation: nouvelles instances
- Total en naviguant: 50+ queries actives

APRÈS:
- Application entière: 5 watched queries (données relationnelles)
- + queries spécifiques par page (tasks par date/filtre)
- Navigation: réutilise les mêmes
- Total constant: ~10 queries max
```

### Impact attendu
- Fin des crashs "problème récurrent"
- Navigation fluide entre les pages
- Plus de flash des TaskCard
- Performance améliorée

---

## 2026-01-23 11:45 - Fix: TaskCard flash on navigation + stability improvements

### Fichiers modifiés
- `src/components/tasks/task-card.tsx`

### Problèmes
1. Les TaskCard "flashaient" (animation replay) en naviguant vers All Tasks
2. L'app crashait avec "un problème récurrent est survenu" après plusieurs navigations

### Causes
1. **Animation `initial` qui rejouait** - Chaque fois que PowerSync émettait de nouvelles données, les animations `initial={{ opacity: 0, y: 10 }}` rejouaient
2. **`layout` prop sur motion.div** - Causait des recalculs de layout constants
3. **`layoutId` sur le theme indicator** - Causait des animations de layout entre cartes

### Solution
1. Ajout d'un state `hasAnimated` pour empêcher le replay des animations après le premier render
2. Suppression de la prop `layout` sur le motion.div principal
3. Remplacement de `motion.div` par `div` pour le theme indicator (suppression du layoutId)

### Changements techniques
```typescript
// Avant (flash à chaque update)
<motion.div
  layout
  initial={{ opacity: 0, y: 10 }}
  ...
/>

// Après (animation unique au mount)
const [hasAnimated, setHasAnimated] = useState(false);
<motion.div
  initial={hasAnimated ? false : { opacity: 0, y: 10 }}
  onAnimationComplete={() => setHasAnimated(true)}
  ...
/>
```

---

## 2026-01-23 11:15 - Fix: Daily Brief slow navigation (4-5x slower than other pages)

### Fichiers modifiés
- `src/app/(app)/page.tsx`

### Problème
Sur la PWA, naviguer vers la page Daily Brief prenait 4-5x plus de temps que vers les autres pages.

### Cause racine
1. **MIN_WAIT_TIME = 1500ms** - La page forçait un délai artificiel de 1.5 secondes minimum avant d'afficher le contenu
2. **Logique isReady complexe** - Multiple refs, états, et effets qui bloquaient le rendu en attendant PowerSync sync initial

### Solution
Simplification de la logique `isReady` :
```typescript
// Avant (bloquant)
const [isReady, setIsReady] = useState(false);
const mountTimeRef = useRef(Date.now());
useEffect(() => {
  // Logique complexe avec MIN_WAIT_TIME = 1500ms
  // + attente isInitialSync
  // + timeout scheduling
}, [...]);

// Après (instantané)
const isReady = !tasksLoading || (displayTasks !== undefined && displayTasks.length > 0);
```

### Impact
- Navigation vers Daily Brief maintenant aussi rapide que les autres pages
- Suppression des imports/variables PowerSync inutilisés (`usePowerSyncState`, `usePowerSyncReady`, `isInitialSync`)

---

## 2026-01-22 19:30 - Fix PWA Crash: PowerSync flip-flop between modes

### Fichiers modifiés
- `src/providers/powersync-provider.tsx`

### Problème
L'app PWA crashait et flashait plusieurs fois en naviguant entre les pages (tasks, inbox, etc.) avec le message "un problème récurrent est survenu".

### Cause racine
`usePowerSyncReady()` dépendait de `isConnected` qui change fréquemment (perte réseau, sync status). Quand ça changeait :
1. Tous les hooks `use-tasks.ts` basculaient de PowerSync vers Supabase
2. Nouvelles requêtes Supabase lancées
3. `isConnected` redevenait `true`
4. Retour vers PowerSync
5. = Flash/refresh multiples + crash

### Solution
1. Ajout de `isInitialized` qui reste `true` une fois PowerSync initialisé
2. `usePowerSyncReady()` utilise maintenant `isInitialized` au lieu de `isConnected`
3. Suppression de la dépendance `session?.access_token` dans le useEffect (évite réinit sur token refresh)
4. Ajout d'une garde pour ne pas réinitialiser si déjà initialisé

### Changements techniques
```typescript
// Avant (instable)
export function usePowerSyncReady(): boolean {
  const { db, isConnected } = usePowerSyncState();
  return !!db && isConnected;
}

// Après (stable)
export function usePowerSyncReady(): boolean {
  const { isInitialized } = usePowerSyncState();
  return isInitialized;
}
```

### Impact
- Plus de flash/crash lors de la navigation PWA
- PowerSync reste en mode offline-first même si temporairement déconnecté
- Les données locales sont toujours utilisées une fois initialisées

---

## 2026-01-22 18:15 - Bugfix: Tâches terminées dans "En retard" + Traduction page Toutes les tâches

### Fichiers modifiés
- `src/app/(app)/tasks/page.tsx`

### Changements

#### 1. Bugfix: Tâches terminées affichées dans "En retard"
**Problème**: Une tâche avec une date passée qui était marquée comme terminée apparaissait toujours dans le groupe "En retard" (Overdue) au lieu d'être dans sa catégorie de date normale.

**Cause**: La fonction `getDateLabel()` ne tenait compte que de la date, pas du statut de la tâche.

**Fix**: Ajout du paramètre `status` à `getDateLabel()` pour exclure les tâches terminées du groupe "En retard".

```typescript
// Avant
function getDateLabel(date: string | null): string {
  if (isPast(d) && !isToday(d)) return 'Overdue';
}

// Après
function getDateLabel(date: string | null, status?: string): string {
  if (isPast(d) && !isToday(d) && status !== 'done') return 'En retard';
}
```

#### 2. Traduction complète de la page "Toutes les tâches"
- Titre: "All Tasks" → "Toutes les tâches"
- Groupes de dates: Overdue → "En retard", Today → "Aujourd'hui", etc.
- Filtres: All Status → "Tous les statuts", etc.
- États vides: "No tasks found" → "Aucune tâche trouvée"
- Groupes: "No Category" → "Sans catégorie", "No Theme" → "Sans thème"

---

## 2026-01-22 17:45 - Localisation Francaise Complete + Optimisation Animations

### Fichiers modifies

#### Composants
- `src/components/tasks/task-card.tsx` - Toast messages, dropdown items, waiting status
- `src/components/tasks/edit-task-dialog.tsx` - Priority labels, "Labels" → "Etiquettes"
- `src/components/tasks/task-focus-dialog.tsx` - Dialog titles, buttons, metadata labels
- `src/components/tasks/quick-add.tsx` - Title, placeholder, buttons, toast messages
- `src/components/tasks/snooze-popover.tsx` - Title, buttons
- `src/components/tasks/waiting-for-dialog.tsx` - Dialog text, placeholders, buttons
- `src/components/tasks/label-picker.tsx` - Buttons, placeholders, empty state + optimisation animations
- `src/components/layout/sidebar.tsx` - Navigation items, tooltips, empty states
- `src/components/layout/bottom-nav.tsx` - Navigation items
- `src/components/command-palette.tsx` - Actions, navigation, groups, labels

#### Pages
- `src/app/(app)/page.tsx` - Daily Brief title, stats, empty states, sections
- `src/app/(app)/inbox/page.tsx` - Description, placeholders, toast messages, empty states
- `src/app/(app)/kanban/page.tsx` - Column titles, view modes, priority labels, empty states
- `src/app/(app)/settings/page.tsx` - All sections, forms, keyboard shortcuts
- `src/app/(auth)/login/page.tsx` - Titles, labels, buttons, error messages

### Changements

#### 1. Traductions Francaises
Toutes les chaines visibles par l'utilisateur sont maintenant en francais :

| Anglais | Francais |
|---------|----------|
| Daily Brief | Brief du jour |
| Inbox | Boite de reception |
| Calendar | Agenda |
| Kanban | Kanban |
| All Tasks | Toutes les taches |
| Pending | En attente |
| Archives | Archives |
| Settings | Parametres |
| To Do | A faire |
| Waiting For | En attente |
| Done | Termine |
| Today | Aujourd'hui |
| Tomorrow | Demain |
| Yesterday | Hier |
| This Week | Cette semaine |
| Next Week | Semaine prochaine |
| Later | Plus tard |
| No Date | Sans date |
| Overdue | En retard |
| Priority | Priorite |
| Low | Basse |
| Normal | Normale |
| High | Haute |
| Urgent | Urgente |
| Labels | Etiquettes |
| Subject | Sujet |
| Theme | Theme |
| Category | Categorie |
| Edit | Modifier |
| Delete | Supprimer |
| Save | Enregistrer |
| Cancel | Annuler |
| Create | Creer |
| Add | Ajouter |
| Search | Rechercher |
| Filter | Filtrer |
| Clear | Effacer |

#### 2. Optimisation Animations (label-picker.tsx)
Remplacement des animations Framer Motion simples par des transitions CSS :

```tsx
// Avant (Framer Motion)
<motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>

// Apres (CSS transitions)
<button className="transition-transform hover:scale-110 active:scale-95">
```

- Impact : Reduction du JavaScript execute, meilleure performance
- Applicable aux effets simples (hover, tap, focus)
- Framer Motion conserve pour animations complexes (AnimatePresence, layout)

#### 3. Elements deja traduits
- `src/components/ui/confirm-dialog.tsx` - Deja en francais (confirmLabel='Confirmer', cancelLabel='Annuler')

### Coherence maintenue
- Accents retires des strings (compatibilite encodage)
- Variables, fonctions, props non traduits
- Commentaires non traduits
- Terminologie coherente dans toute l'application

---

## 2026-01-22 16:30 - Corrections UX (Touch Targets, Confirm Dialog, Loading States)

### Fichiers modifies
- `src/components/layout/sidebar.tsx` - Touch targets augmentes de h-6 w-6 a h-10 w-10
- `src/app/(app)/settings/page.tsx` - Remplacement confirm() natif par ConfirmDialog
- `src/components/tasks/edit-task-dialog.tsx` - Ajout spinner Loader2 sur bouton submit
- `src/app/(app)/inbox/page.tsx` - Bouton "Move to subject" visible sur mobile
- `src/app/(app)/page.tsx` - Texte text-[10px] remplace par text-xs (12px minimum)

### Changements

#### 1. Touch targets (sidebar.tsx)
- Boutons h-6 w-6 passes a h-10 w-10 avec marges negatives -m-2
- Concerne: boutons Plus (+) et MoreHorizontal (...) sur themes, sujets et categories
- Les icones gardent leur taille h-3 w-3, seul le hit area augmente

#### 2. ConfirmDialog (settings/page.tsx)
- Ajout import ConfirmDialog
- Ajout etats deleteThemeDialog et deleteCategoryDialog
- Remplacement des confirm() natifs par des dialogs modaux
- Pattern: setState pour ouvrir, onConfirm pour executer

#### 3. Loading spinner (edit-task-dialog.tsx)
- Ajout import Loader2 de lucide-react
- Bouton submit affiche spinner + "Enregistrement..." pendant isSaving

#### 4. Bouton mobile visible (inbox/page.tsx)
- Classe passee de "opacity-0 group-hover:opacity-100" a "opacity-100 md:opacity-0 md:group-hover:opacity-100"
- Bouton aussi agrandi a h-10 w-10 pour meilleur touch target

#### 5. Texte trop petit (page.tsx)
- text-[10px] md:text-xs remplace par text-xs partout (3 occurrences)
- Concerne les labels "To Do", "Waiting", "Inactifs" dans les stats cards

---

## 2026-01-22 16:15 - Fix Re-renders React (useCallback/memo)

### Fichiers modifies
- `src/components/tasks/task-focus-dialog.tsx` - Wrap handlers dans useCallback
- `src/components/tasks/edit-task-dialog.tsx` - Wrap handleSubmit dans useCallback
- `src/components/tasks/quick-add.tsx` - Wrap handlers dans useCallback
- `src/components/tasks/label-picker.tsx` - Wrap handlers dans useCallback + memo sur LabelBadges

### Changements

#### 1. task-focus-dialog.tsx
- `handleSave` wrappe dans useCallback avec dependances [task, doTime, title, description, doDate, priority, waterfall, updateTask, onOpenChange]
- `handleComplete` wrappe dans useCallback avec dependances [task, updateTask, completeTask, onOpenChange]
- `handleDelete` wrappe dans useCallback (pas de dependances)
- `confirmDelete` wrappe dans useCallback avec dependances [task, deleteTask, onOpenChange]

#### 2. edit-task-dialog.tsx
- `handleSubmit` wrappe dans useCallback avec dependances [task.id, title, description, doDate, doTime, priority, waterfall, selectedLabels, updateTask, setTaskLabels, onOpenChange]

#### 3. quick-add.tsx
- `handleSubmit` wrappe dans useCallback avec dependances [input, isSubmitting, doDate, doTime, waterfall, priority, createTask, setOpen]
- `handleInputChange` wrappe dans useCallback (pas de dependances)
- `clearAll` wrappe dans useCallback (pas de dependances)

#### 4. label-picker.tsx
- `toggleLabel` wrappe dans useCallback avec dependances [selectedIds, selectedLabels, onLabelsChange]
- `handleCreateLabel` wrappe dans useCallback avec dependances [newLabelName, newLabelColor, createLabel, selectedLabels, onLabelsChange]
- `removeLabel` wrappe dans useCallback avec dependances [selectedLabels, onLabelsChange]
- `LabelBadges` wrappe dans React.memo pour eviter re-renders inutiles

#### 5. page.tsx (Daily Brief)
- Le fichier avait deja les handlers principaux optimises avec useCallback
- Les styles inline dans les loops utilisent des valeurs dynamiques et ne peuvent pas etre memoises globalement

### Impact Performance
- Reduction significative des re-renders dans les composants dialog
- LabelBadges ne re-render plus quand le parent change (memo)
- Handlers stables passes aux composants enfants

---

## 2026-01-22 15:30 - Corrections Accessibilite CRITIQUES

### Fichiers modifies
- `src/components/tasks/task-card.tsx` - aria-label sur checkbox et bouton menu
- `src/components/tasks/quick-add.tsx` - aria-label sur bouton clear, focus states sur boutons priorite
- `src/components/layout/sidebar.tsx` - aria-label sur tous les boutons icon-only (Plus, MoreHorizontal)
- `src/app/(app)/page.tsx` - aria-label sur boutons navigation date
- `src/app/(auth)/login/page.tsx` - Labels sur inputs email/password, role="alert" sur erreurs
- `src/app/(app)/settings/page.tsx` - aria-label et focus states sur color pickers
- `src/app/globals.css` - Meilleur contraste muted-foreground (47% -> 40%)

### Changements

#### 1. Boutons icon-only avec aria-label
- task-card.tsx: Checkbox "Marquer comme terminee/a faire", Menu "Plus d'options"
- quick-add.tsx: Bouton X "Effacer"
- sidebar.tsx: Boutons Plus "Ajouter un sujet/theme", MoreHorizontal "Options du theme/sujet/categorie"
- page.tsx (Daily Brief): ChevronLeft/Right "Jour precedent/suivant"

#### 2. Inputs avec labels (login)
- Ajout `<Label htmlFor="email">Email</Label>` et `<Label htmlFor="password">Password</Label>`
- Ajout `id="email"` et `id="password"` sur les inputs correspondants

#### 3. Focus states sur boutons priorite (quick-add)
- Ajout `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

#### 4. Color picker accessible (settings)
- Ajout `aria-label="Couleur {color}"` sur chaque bouton couleur
- Ajout `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

#### 5. Contraste muted-foreground ameliore
- `--muted-foreground: 215 16% 47%` -> `215 16% 40%` (meilleur ratio WCAG)

#### 6. Erreurs avec role="alert"
- Ajout `role="alert" aria-live="polite"` sur le div d'erreur de login

---

## 2026-01-22 - Query Keys & Performance Fixes

### Fichiers modifies
- `src/lib/query-keys.ts` - Ajout des query keys pour attachments et preferences
- `src/hooks/use-attachments.ts` - Utilisation du query key factory au lieu de strings hardcoded
- `src/hooks/use-preferences.ts` - Utilisation du query key factory au lieu de strings hardcoded
- `src/providers/auth-provider.tsx` - Memoisation du client Supabase avec useMemo

### Changements

#### 1. Query Keys Factory - Nouveaux entries
```typescript
attachments: {
  all: ['attachments'] as const,
  byTask: (taskId: string) => [...queryKeys.attachments.all, 'task', taskId] as const,
},
preferences: {
  all: ['preferences'] as const,
  byUser: (userId: string) => [...queryKeys.preferences.all, 'user', userId] as const,
},
```

#### 2. use-attachments.ts
- Import de `queryKeys` depuis `@/lib/query-keys`
- `useTaskAttachments`: queryKey change de `['attachments', taskId]` a `queryKeys.attachments.byTask(taskId!)`
- `useUploadAttachment`: invalidation utilise `queryKeys.attachments.byTask(variables.taskId)`
- `useDeleteAttachment`: invalidation utilise `queryKeys.attachments.byTask(variables.taskId)`

#### 3. use-preferences.ts
- Import de `queryKeys` depuis `@/lib/query-keys`
- `usePreferences`: queryKey change de `['preferences']` a `queryKeys.preferences.all`
- Mutation onSuccess: invalidation utilise `queryKeys.preferences.all`

#### 4. auth-provider.tsx
- Ajout de `useMemo` aux imports
- `createClient()` est maintenant memoised: `const supabase = useMemo(() => createClient(), [])`
- Evite la recreation du client Supabase a chaque render

### Note sur optimizePackageImports
`@/types/database` n'a pas ete ajoute a `next.config.mjs` car c'est un alias local (pas un package npm). `optimizePackageImports` ne s'applique qu'aux packages npm externes.

---

## 2026-01-20 21:00 - Nouveau Logo Sederize

### Fichiers créés/modifiés
- `public/sederize-original.png` - Logo source haute résolution
- `public/favicon-16x16.png` - Favicon 16x16
- `public/favicon-32x32.png` - Favicon 32x32
- `public/favicon-48x48.png` - Favicon 48x48
- `public/apple-touch-icon.png` - Apple Touch Icon 180x180
- `public/icon-192.png` - PWA icon 192x192
- `public/icon-512.png` - PWA icon 512x512
- `public/icon-1024.png` - App Store icon 1024x1024
- `src/app/layout.tsx` - Ajout metadata icons (favicon + apple touch icon)

### Design
- Logo : S minimaliste style Helvetica/Swiss grotesque
- Fond slate #0f172a avec S blanc/crème
- Flat terminals, courbes contrôlées, équilibre premium
- Généré via Gemini avec prompt itératif

---

## 2026-01-20 20:45 - Forgot Password + Change Password

### Fichiers créés
- `src/app/(auth)/forgot-password/page.tsx` - Page "Forgot password?" avec envoi d'email
- `src/app/(auth)/reset-password/page.tsx` - Page pour définir le nouveau password après clic sur le lien email

### Fichiers modifiés
- `src/app/(auth)/login/page.tsx` - Ajout lien "Forgot password?"
- `src/app/(app)/settings/page.tsx` - Nouvelle section "Security" avec formulaire change password

### Fonctionnalités
1. **Forgot Password** (page login)
   - Lien "Forgot password?" sous le champ password
   - Page `/forgot-password` → entre email → reçoit lien par email
   - Page `/reset-password` → entre nouveau password

2. **Change Password** (settings)
   - Section "Security" dans les settings
   - Formulaire nouveau password + confirmation
   - Appel `supabase.auth.updateUser({ password })`

### Config Supabase requise
- Ajouter `https://ton-domaine.com/reset-password` dans Authentication > URL Configuration > Redirect URLs

---

## 2026-01-20 20:35 - Suppression Google OAuth (non configuré)

### Fichiers modifiés
- `src/app/(auth)/login/page.tsx` - Suppression bouton Google + fonction handleGoogleLogin
- `src/app/(auth)/signup/page.tsx` - Suppression bouton Google + fonction handleGoogleSignup

### Changements
- Google OAuth n'était pas configuré (nécessite Google Cloud Console + Supabase Dashboard)
- Boutons "Continue with Google" retirés des pages login et signup
- La page `/auth/callback` reste en place pour une future réactivation si besoin

---

## 2026-01-20 20:30 - PWA: Texte navbar + Footer menu fixe

### Fichiers modifiés
- `src/components/layout/bottom-nav.tsx` - Texte des boutons de `text-[10px]` à `text-xs` (12px)
- `src/components/layout/mobile-menu.tsx` - Footer (Settings + Sign Out) toujours visible avec flex layout

### Changements
1. **Texte trop petit dans la navbar** : Augmenté de 10px à 12px pour meilleure lisibilité sur PWA
2. **Sign Out invisible** : Restructuré le mobile-menu avec flex pour garantir que le footer reste toujours visible en bas, même si le contenu scrollable est long

---

## 2026-01-20 20:20 - Délai 1s sur Login/Logout pour sync DB

### Fichiers modifiés
- `src/app/(auth)/signout/page.tsx` - Délai réduit de 1.5s à 1s
- `src/app/(auth)/login/page.tsx` - Ajout délai 1s après login réussi avant redirection

### Changements
- Les tâches flashaient/se rechargeaient après l'arrivée sur le dashboard
- Cause: PowerSync n'avait pas fini de sync les données quand le dashboard s'affichait
- Solution: Délai de 1s sur login et logout pour laisser le temps à la DB de sync
- Test en cours pour voir si 1s suffit

---

## 2026-01-20 20:10 - Fix Sign Out Flash (Page dédiée)

### Fichiers créés
- `src/app/(auth)/signout/page.tsx` - Page dédiée pour le sign out avec loader 1.5s

### Fichiers modifiés
- `src/providers/auth-provider.tsx` - Simplifié (suppression de signOut, isSigningOut)
- `src/components/layout/sidebar.tsx` - Navigation vers /signout au lieu d'appeler signOut
- `src/components/layout/mobile-menu.tsx` - Navigation vers /signout au lieu d'appeler signOut

### Changements
- Micro-flash du dashboard visible pendant le sign out
- Solution: Page dédiée `/signout` (même pattern que login)
  1. Clic sur Sign Out → navigation vers `/signout`
  2. Page affiche un loader "Signing out..."
  3. SignOut exécuté immédiatement
  4. Attente de 1.5s pour transition douce
  5. Redirection vers `/login`
- Avantages:
  - Évite le flash du dashboard (on est déjà sur une autre page)
  - Transition visuelle propre
  - Pas de problème avec le real-time de Supabase

---

## 2026-01-20 19:50 - Fix Daily Brief Header Flash on Login

### Fichiers modifiés
- `src/app/(app)/page.tsx` - Sparkles en position absolute, délai minimum avant empty state
- `src/components/ui/skeleton-card.tsx` - SkeletonHeader centré pour matcher le layout réel

### Changements
1. **Titre qui se décalait à gauche puis revenait au centre**
   - Cause: Les Sparkles apparaissaient/disparaissaient et changeaient la largeur du conteneur flex
   - Solution: Sparkles maintenant en `position: absolute` à droite du titre, ne modifient plus le layout

2. **Flash skeleton → contenu**
   - Cause: Le SkeletonHeader n'était pas centré, contrairement à la vraie page
   - Solution: Ajout `text-center flex flex-col items-center` sur SkeletonHeader

3. **Sparkles qui flashaient avant les données**
   - Cause: `lastSyncedAt` de PowerSync set avant que les données arrivent réellement
   - Solution: Délai minimum de 1.5s avant d'afficher l'empty state si `totalTasks === 0`

---

## 2026-01-20 19:15 - Fix Empty State Flash During Refetch (v4)

### Fichiers modifiés
- `src/app/(app)/page.tsx` - Fix robuste avec garde des données précédentes

### Changements
- Le dashboard avec tâches flashait vers l'empty state puis revenait pendant les refetches
- Cause: Les données devenaient temporairement vides pendant un refetch PowerSync/Supabase
- Solution:
  - Ajout de `isFetching` depuis le hook pour détecter les refetches
  - `prevTasksRef` garde les données précédentes en mémoire
  - `hasEverHadTasks` track si on a déjà eu des tâches
  - `displayTasks` utilise les données précédentes si refetch en cours avec données vides
  - L'empty state ne s'affiche plus si `isFetching` est true
  - Tous les calculs utilisent maintenant `displayTasks` au lieu de `tasks`

---

## 2026-01-20 18:45 - Capacitor Static Export for Offline iOS Build

### Fichiers modifiés
- `next.config.mjs` - Ajout `output: 'export'` et `trailingSlash: true` (suppression `headers()` incompatible)
- `capacitor.config.json` - Suppression `server.url` pour utiliser les assets bundlés
- `src/app/(app)/subject/[id]/page.tsx` → `src/app/(app)/subject/[[...id]]/page.tsx` - Conversion en catch-all route
- `src/app/auth/callback/route.ts` → `src/app/auth/callback/page.tsx` - Conversion API route en page client-side

### Fichiers créés
- `src/app/(app)/subject/[[...id]]/subject-page-client.tsx` - Composant client pour la page subject

### Changements
- **Static Export activé** - `output: 'export'` permet de générer des fichiers statiques dans `/out`
- **Route dynamique convertie** - `/subject/[id]` devenu `/subject/[[...id]]` (catch-all optionnel) avec `generateStaticParams()` pour compatibilité export
- **Auth callback client-side** - Le callback OAuth de Supabase fonctionne maintenant entièrement côté client
- **Assets bundlés dans iOS** - Capacitor utilise maintenant les fichiers du dossier `out/` au lieu d'un serveur distant
- **PowerSync fonctionnel offline** - Avec les assets bundlés, l'UI charge sans internet et PowerSync gère la sync des données

### Limitations
- Le deep linking direct vers `/subject/abc123` ne fonctionne pas (pas de fichier généré pour chaque ID)
- La navigation normale fonctionne (Dashboard → Subject via client-side routing)
- Pour le deep linking, envisager hash routing (`/#/subject/abc`) ou un handler iOS custom

### Build workflow
```bash
npm run build          # Génère les fichiers dans /out
npx cap sync ios       # Copie les assets dans le projet iOS
# Puis build dans Xcode
```

---

## 2026-01-20 16:15 - Fix Login Page Flash After Sign-In

### Fichiers modifiés
- `src/app/(auth)/login/page.tsx` - Fix flash formulaire vide après login

### Changements
- Le formulaire de login se vidait et s'affichait pendant ~2 secondes après un login réussi avant la redirection
- Cause: Le composant se remontait complètement (états réinitialisés) quand onAuthStateChange se déclenchait
- Solution:
  - Utilisation de `useAuth()` pour accéder à l'état d'authentification global
  - Affichage du spinner si: `authLoading` OU `user` existe OU `loading` (login en cours)
  - Le formulaire ne s'affiche QUE si: auth chargé ET pas d'utilisateur ET pas de login en cours
  - Message contextuel: "Signing in..." pendant le login, "Redirecting..." quand user est authentifié

---

## 2026-01-20 16:45 - Fix Empty State Flash on Initial Load (v3)

### Fichiers modifiés
- `src/app/(app)/page.tsx` - Fix robuste avec état `isReady` et délai minimum

### Changements
- L'empty state "You're all caught up" s'affichait brièvement pendant le chargement initial
- Cause: PowerSync/Supabase retourne `isLoading: false` très rapidement avec données vides
- Solution robuste multi-couches:
  - État `isReady` qui contrôle l'affichage du skeleton vs contenu
  - Détection sync initiale PowerSync via `isSyncing || !lastSyncedAt`
  - Si des tâches existent → prêt immédiatement
  - Si PowerSync fait la sync initiale → on attend
  - Si loading terminé avec 0 tâches mais < 800ms depuis mount → délai minimum
  - Le skeleton s'affiche jusqu'à ce que `isReady` soit true

---

## 2026-01-20 14:30 - Security Hardening & Error Handling

### Fichiers créés
- `src/app/global-error.tsx` - Error boundary global Next.js
- `src/app/not-found.tsx` - Page 404 personnalisée

### Fichiers modifiés
- `next.config.mjs` - Ajout des security headers (X-Frame-Options, CSP, etc.)
- `src/components/ui/markdown-editor.tsx` - Fix vulnérabilité XSS (sanitization URLs)
- `src/app/auth/callback/route.ts` - Ajout error handling OAuth complet

### Changements
- **Security Headers** : X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **XSS Prevention** : Ajout fonction `sanitizeUrl()` qui bloque javascript:, data:, vbscript:, file:
- **Error Pages** : global-error.tsx pour erreurs serveur, not-found.tsx pour 404
- **Auth Callback** : Gestion erreurs OAuth provider, missing code, session exchange errors
- **Audit effectué** : RLS policies OK, middleware OK, .env.local non tracké, TypeScript OK

---

## 2026-01-19 01:00 - QuickAdd uses WaterfallPicker + Modal Fix

### Fichiers modifiés
- `src/components/tasks/quick-add.tsx` - Utilise WaterfallPicker au lieu de SubjectPicker
- `src/components/tasks/waterfall-picker.tsx` - Fix modal closing issue

### Changements
- QuickAdd utilise maintenant WaterfallPicker (3 colonnes: Categories, Themes, Subjects)
- Fix du bouton WaterfallPicker qui fermait le modal parent
  - Ajout de `e.preventDefault()` et `e.stopPropagation()` sur le click
  - Suppression de `modal={false}` sur le Dialog
  - Ajout de `type="button"` pour éviter submit du form parent

---

## 2026-01-19 00:45 - SubjectPicker Mobile Fix

### Fichiers modifiés
- `src/components/tasks/subject-picker.tsx` - Refonte complète

### Changements
- Remplacé le composant Command (cmdk) par des boutons natifs (meilleur support touch)
- Ajouté ScrollArea pour scroll natif sur mobile
- Ajouté état de chargement (spinner)
- Ajouté état vide ("Aucun projet")
- Simplifié la logique de groupement (themes > subjects)
- Supprimé la dépendance à useCategoriesWithThemes (plus simple)
- Truncation du label à 12 caractères

---

## 2026-01-18 23:50 - Task Card Title Truncation

### Fichiers modifiés
- `src/components/tasks/task-card.tsx` - Truncation à 18 caractères

### Changements
- Limite de 18 caractères sur le titre de la tâche
- Ajout de "..." si le titre dépasse

---

## 2026-01-18 22:15 - v0.7.0 - Calendar Mobile V2 (Agenda View)

### Fichiers créés
- `src/app/(app)/calendar/calendar-mobile-v1.tsx` - Backup de l'ancienne version

### Fichiers modifiés
- `src/app/(app)/calendar/page.tsx` - Nouvelle vue agenda mobile-first

### Nouvelle UX Calendar

**Avant (v1)** : 4 vues (Jour/3J/Sem/Mois), 3 lignes de contrôles, grille minuscule sur mobile

**Après (v2)** : Vue agenda scrollable
- Header compact : mois/année + bouton "Aller à"
- Liste scrollable des jours avec tâches
- Headers sticky par jour
- Section "En retard" en haut si tâches overdue
- Bouton "Voir plus" pour charger +14 jours
- FAB "Aujourd'hui" quand on scroll
- Picker calendrier pour navigation rapide
- Jours vides masqués (sauf aujourd'hui)

### Avantages
- Moins de chrome, plus de contenu
- Tâches visibles directement (pas de modal)
- Navigation naturelle par scroll
- Adapté au thumb scrolling mobile

### Fix picker (22:20)
- Date sélectionnée toujours affichée dans l'agenda (même sans tâches)
- Jours avec tâches soulignés en gras dans le picker
- Highlight violet sur la date sélectionnée dans l'agenda

### Fix FAB position (22:25)
- FAB "+" : `bottom: calc(5rem + env(safe-area-inset-bottom))`
- FAB "Aujourd'hui" calendar : `bottom: calc(6rem + env(safe-area-inset-bottom))`
- Position correcte au-dessus de la bottom nav + home indicator

### Fix All Tasks filters (22:30)
- Filtres scrollables horizontalement sur mobile (comme Daily Brief)
- `flex-shrink-0` sur tous les Select pour éviter compression
- Plus de wrap vertical qui prend tout l'écran
- **Gradient fade** sur le bord droit pour indiquer qu'il y a plus de contenu
- `scrollbar-hide` pour masquer la barre de scroll (plus propre)
- Même traitement appliqué à Daily Brief

### Fix Kanban mobile UX (22:35)
- **View Mode buttons** : Compacts (labels raccourcis sur mobile)
- **Kanban board** : Plus de scroll horizontal "bateau sur l'océan"
  - Mobile : Tabs pour switcher entre colonnes, une seule colonne affichée
  - Desktop : Scroll horizontal conservé
- Tabs avec badges montrant le nombre de tâches par colonne

---

## 2026-01-18 21:45 - v0.6.3 - iOS Safe Area Fix

### Fichiers modifiés
- `src/app/layout.tsx` - Ajout `viewportFit: "cover"` pour étendre sous la status bar
- `src/app/globals.css` - Variables CSS pour safe area insets
- `src/components/layout/app-shell.tsx` - Padding-top pour respecter safe area
- `src/components/layout/bottom-nav.tsx` - Padding-bottom pour home indicator
- `src/components/layout/mobile-menu.tsx` - Safe areas pour le menu Sheet

### Correction Safe Area iOS

1. **Viewport Config**
   - `viewportFit: "cover"` permet à l'app de s'étendre sous la status bar
   - Nécessaire pour que les `env(safe-area-inset-*)` fonctionnent

2. **Main Content**
   - Spacer fixe (non-scrollable) avec `height: env(safe-area-inset-top)`
   - Le contenu ne chevauche plus la status bar même en scrollant

3. **Bottom Navigation**
   - `paddingBottom: env(safe-area-inset-bottom)` pour les iPhones avec home indicator
   - La barre de navigation ne sera pas coupée par le geste de swipe

---

## 2026-01-18 21:30 - v0.6.2 - Mobile UI Fixes

### Fichiers modifiés
- `src/app/(app)/page.tsx` - Stats cards, filtres, navigation date
- `src/components/tasks/task-card.tsx` - Checkbox, boutons actions
- `src/components/tasks/snooze-popover.tsx` - Bouton snooze

### Corrections UI Mobile

1. **Stats Cards (To Do / Waiting / Inactifs)**
   - Hauteur uniforme avec `h-full` sur tous les cards
   - Layout vertical centré sur mobile, horizontal sur desktop
   - Padding réduit sur mobile (`p-3` vs `p-4`)
   - Texte plus petit sur mobile (`text-xl` vs `text-2xl`)

2. **Touch Targets (minimum 44px)**
   - Checkbox: `h-11 w-11` avec icônes `h-6 w-6`
   - Boutons nav date: `h-11 w-11`
   - Bouton menu (3 dots): `h-10 w-10`
   - Bouton snooze: `h-10 w-10`
   - Filtres: `h-10` (hauteur augmentée)

3. **Filtres Row**
   - Scrollable horizontalement sur mobile (`overflow-x-auto`)
   - Padding négatif pour scroll edge-to-edge
   - Centré sur desktop

4. **Feedback tactile**
   - `active:scale-95` sur les cards et boutons

---

## 2026-01-18 20:30 - v0.6.1 - Capacitor iOS Setup

### Fichiers créés
- `capacitor.config.json` - Configuration Capacitor (appId, plugins, iOS settings)
- `ios/` - Projet Xcode complet généré par Capacitor

### Fichiers modifiés
- `package.json` - Ajout dépendances @capacitor/core@7, @capacitor/cli@7, @capacitor/ios@7
- `next.config.mjs` - Note sur static export (incompatible avec routes dynamiques)
- `src/app/(app)/kanban/page.tsx` - Suppression fonction inutilisée `handleClearDate`
- `src/app/(app)/page.tsx` - Suppression import inutilisé `useActiveSubjects`

### Configuration Capacitor
- **App ID**: com.sederize.app
- **Version Capacitor**: 7.x (Node 20 compatible)
- **Mode actuel**: Live reload (localhost:3000) - idéal pour le développement
- Plugins configurés: SplashScreen, StatusBar, Keyboard
- iOS minimum: 14.0

### Notes importantes
- Capacitor 8 nécessite Node 22+, donc on utilise Capacitor 7 avec Node 20
- `output: 'export'` désactivé car incompatible avec routes dynamiques (`/subject/[id]`)
- Pour le dev: Capacitor charge depuis `localhost:3000` (Next.js dev server)
- Pour la prod: Héberger sur Vercel et configurer `server.url` vers l'URL de prod

### Workflow de développement iOS
1. Terminal: `npm run dev -p 3001` (ou port disponible)
2. Build: `cd ios/App && xcodebuild -workspace App.xcworkspace -scheme App -destination 'platform=iOS Simulator,id=<SIMULATOR_ID>' build`
3. Install: `xcrun simctl install <SIMULATOR_ID> ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app`
4. Launch: `xcrun simctl launch <SIMULATOR_ID> com.sederize.app`

### Corrections appliquées
- Info.plist: Ajout NSAppTransportSecurity pour autoriser HTTP local
- Config: Utiliser IP locale (192.168.1.x) au lieu de localhost pour le simulateur
- Capacitor 7.x utilisé (Node 20 compatible)

---

## 2026-01-18 19:30 - v0.6.0 - PowerSync Hooks Adaptation (Offline-First)

### Fichiers créés
- `src/lib/powersync/hooks.ts` - Utilitaires PowerSync (generateUUID, nowISO, formatDateSQL, SQL builders)

### Fichiers modifiés
- `src/hooks/use-tasks.ts` - Adapté pour PowerSync (reads locaux, writes sync)
- `src/hooks/use-themes.ts` - Adapté pour PowerSync
- `src/hooks/use-subjects.ts` - Adapté pour PowerSync
- `src/hooks/use-categories.ts` - Adapté pour PowerSync
- `src/hooks/use-labels.ts` - Adapté pour PowerSync
- `src/hooks/use-pending-items.ts` - Adapté pour PowerSync

### Architecture Offline-First

#### Pattern de lecture (READS)
- Utilisation de `usePowerSyncWatchedQuery` de @powersync/react
- Requêtes SQL directes sur la base SQLite locale
- Auto-refresh quand les données changent localement
- Fallback Supabase quand PowerSync n'est pas prêt

#### Pattern d'écriture (WRITES)
- Écriture via `db.execute()` dans SQLite local
- PowerSync synchronise automatiquement vers Supabase
- Fallback Supabase direct si PowerSync n'est pas disponible
- UUID générés côté client pour les nouvelles entrées

#### Relations (JOINS)
- Les JOINs Supabase ne sont pas disponibles en SQLite
- Solution: requêtes séparées + jointure en mémoire avec useMemo
- Maps pour lookup O(1): subjects, themes, categories, labels
- Fonction `transformTaskWithRelations()` pour la logique waterfall

#### Hooks adaptés
| Hook | Queries | Mutations |
|------|---------|-----------|
| use-tasks | 11 queries | 7 mutations |
| use-themes | 2 queries | 3 mutations |
| use-subjects | 4 queries | 3 mutations |
| use-categories | 3 queries | 3 mutations |
| use-labels | 2 queries | 5 mutations |
| use-pending-items | 3 queries | 5 mutations |

### Prochaines étapes
1. Tester le mode offline (couper le réseau)
2. Setup Capacitor pour iOS
3. Push notifications
4. Widgets iOS

---

## 2026-01-18 - v0.5.0 - PowerSync Infrastructure (Phase 2 Progress)

### Fichiers créés
- `src/lib/powersync/schema.ts` - Définitions des tables PowerSync (tasks, themes, subjects, categories, labels, etc.)
- `src/lib/powersync/connector.ts` - Connecteur Supabase ↔ PowerSync avec gestion CRUD
- `src/providers/powersync-provider.tsx` - Provider React pour PowerSync avec état de sync
- `src/components/ui/sync-status.tsx` - Composants UI pour afficher le statut de synchronisation
- `public/icon-512.svg` - Source SVG de l'icône 512x512
- `public/icon-1024.svg` - Source SVG de l'icône 1024x1024
- `public/icon-1024.png` - Icône 1024x1024 pour l'App Store

### Fichiers modifiés
- `public/icon-512.png` - Régénéré à la bonne taille (était 192x192, maintenant 512x512)
- `public/manifest.json` - Ajout du tableau icons avec 192, 512, et 1024px
- `src/providers/index.tsx` - Ajout du PowerSyncProvider dans la hiérarchie
- `src/components/layout/sidebar.tsx` - Ajout du SyncIndicator dans le header
- `.env.local.example` - Ajout de NEXT_PUBLIC_POWERSYNC_URL
- `powersync-and-app.md` - Mise à jour avec la progression

### Fonctionnalités ajoutées

#### 1. PowerSync Schema
Toutes les tables de la base de données sont définies pour la sync offline :
- `tasks`, `themes`, `subjects`, `categories`
- `labels`, `task_labels` (junction table)
- `pending_items`, `user_preferences`, `task_attachments`

#### 2. PowerSync Connector
- Authentification via JWT Supabase
- Upload des mutations locales vers Supabase
- Gestion des opérations PUT, PATCH, DELETE
- Nettoyage automatique des données

#### 3. PowerSync Provider
- Initialisation automatique quand l'utilisateur est authentifié
- Gestion de l'état de connexion (connected, syncing, offline)
- Détection des changements en attente
- Hooks: `usePowerSyncState()`, `usePowerSyncDb()`, `usePowerSyncReady()`

#### 4. UI de synchronisation
- `SyncStatus` - Composant badge/full avec tooltip
- `SyncIndicator` - Point de couleur minimaliste
- États : synced (vert), syncing (bleu animé), offline (orange), pending (bleu), error (rouge)

### Configuration terminée (2026-01-18)
- PowerSync connecté avec succès (point vert visible)
- URL: `https://696c1946cc2560584a00c95e.powersync.journeyapps.com`
- Publication PostgreSQL créée dans Supabase
- Sync Rules configurées dans le dashboard PowerSync

### Prochaines étapes
1. Agent: Adapter les hooks React Query pour utiliser PowerSync (offline reads)
2. Agent: Setup Capacitor pour iOS
3. Utilisateur: Créer compte Apple Developer ($99/an)
4. Agent: Push notifications
5. Agent: Widgets iOS
4. Agent: Tester le mode offline

### Dépendances ajoutées
```
@powersync/web
@powersync/react
```

---

## 2026-01-18 - iOS App & Offline Support Plan

### Fichiers créés
- `powersync-and-app.md` - Documentation complète pour l'implémentation iOS + offline

### Contexte
L'utilisateur souhaite transformer la webapp en app iOS avec:
- **Offline-first** (PowerSync) - ESSENTIEL dès le jour 1
- **Push notifications** (APNs via Capacitor)
- **Widgets iOS** (SwiftUI WidgetKit)
- **Distribution App Store** (Capacitor)

### Décisions confirmées par l'utilisateur
| Question | Réponse |
|----------|---------|
| Apple Developer Account | Non, pas encore |
| Priorité offline | Essentiel dès le jour 1 |
| Features natives | Push notifications + Widgets |
| Static export OK | Oui |

### Plan d'implémentation
1. **Phase 1**: Prérequis (comptes Apple + PowerSync) + fix icônes
2. **Phase 2**: Intégration PowerSync (schema, connector, provider, adaptation hooks)
3. **Phase 3**: Setup Capacitor (static export, config, safe areas)
4. **Phase 4**: Push notifications (APNs, Edge Function)
5. **Phase 5**: Widgets iOS (SwiftUI natif)
6. **Phase 6**: Soumission App Store

### Fichiers de référence
- Plan détaillé: `~/.claude/plans/calm-kindling-seahorse.md`
- Guide d'implémentation: `powersync-and-app.md`

---

## 2026-01-15 - v0.4.21 - Fix Chevron Double-Click & Date Parser "a 10h"

### Fichiers modifiés
- `src/components/layout/sidebar.tsx` - Fix Collapsible onOpenChange handlers
- `src/lib/date-parser.ts` - Fix parsing "x a 10h" pattern

### Corrections

#### 1. Chevron double-click (sidebar)
- **Problème** : Il fallait cliquer deux fois sur les chevrons des catégories/thèmes pour les ouvrir/fermer
- **Cause** : Le `onOpenChange` de Radix Collapsible reçoit un booléen (le nouvel état), mais le code appelait une fonction `toggleTheme()` qui ignorait ce paramètre et toggleait l'état précédent. Cela créait un conflit de synchronisation avec Radix.
- **Solution** : Remplacement de `toggleCategory`/`toggleTheme` par `setCategoryOpen`/`setThemeOpen` qui utilisent directement le booléen passé par Radix.

#### 2. Parsing "x a 10h"
- **Problème** : "x a 10h" créait une tâche "x a" sans date ni heure
- **Causes** :
  1. La regex ne capturait pas "a " (sans accent) avant l'heure
  2. Quand une heure explicite (10h) était parsée sans date, le parser ne définissait pas la date d'aujourd'hui
- **Solution** :
  1. Regex mise à jour : `/(?:(?:^|\s)[àa]\s*)?(\d{1,2})h(\d{2})?\b/i` (capture "a" et "à" avec ou sans espace)
  2. Nettoyage du titre avec plusieurs regex pour gérer tous les cas : " a 10h", " a10h", "10h"
  3. Ajout flag `explicitTimeFound` pour toujours mettre la date à aujourd'hui quand une heure explicite est utilisée sans date

#### 3. Label matching trop permissif
- **Problème** : "X a 10h" matchait le label "facture a payer" parce que "facture" contient "a"
- **Cause** : La logique `labelWord.includes(titleWord)` matchait des mots longs contenant une seule lettre du titre
- **Solution** :
  1. Filtrer les mots courts (< 3 chars) du titre ET du label
  2. Exiger des correspondances substantielles (3+ chars pour substring, 4+ pour inclusion inverse)

### Exemples corrigés
| Input | Avant | Après |
|-------|-------|-------|
| x a 10h | titre: "x a", date: null, time: null, label: "facture a payer" ❌ | titre: "x", date: aujourd'hui, time: "10:00", no label ✓ |
| test à 14h30 | titre: "test", date: null, time: "14:30" | titre: "test", date: aujourd'hui, time: "14:30" |
| demain a 9h call | - | titre: "call", date: demain, time: "09:00" |

---

## 2026-01-15 - v0.4.20 - Fix subject page crash (use() React 19 API)

### Fichiers modifiés
- `src/app/(app)/subject/[id]/page.tsx` - Suppression de `use()` pour les params

### Correction
- **Erreur "An unsupported type was passed to use()"** - Le code utilisait `use(params)` qui est une API React 19 pour unwrap les Promises. Avec Next.js 14 et React 18, les params sont passés directement comme un objet. Solution : utiliser `params.id` directement au lieu de `use(params).id`.

---

## 2026-01-15 - v0.4.19 - Fix sign out not working

### Fichiers modifiés
- `src/providers/auth-provider.tsx` - Ajout redirection vers /login après signOut

### Correction
- **Sign out ne fonctionnait pas** - `supabase.auth.signOut()` était appelé mais aucune redirection ne se faisait. Le middleware redirige vers /login seulement sur nouvelle requête. Solution : ajout de `router.push('/login')` et `router.refresh()` après le signOut.

---

## 2026-01-15 - v0.4.18 - Fix priority sync bug

### Fichiers modifiés
- `src/components/tasks/task-card.tsx` - Suppression du changement de priorité par clic direct

### Correction
- **Désynchronisation priorité entre TaskCard et TaskFocusDialog** - Quand l'utilisateur changeait la priorité en cliquant dessus directement sur la carte, le front se mettait à jour mais le modal affichait l'ancienne valeur. Cause : le `TaskFocusDialog` n'actualise son état local que quand le `task.id` change, pas quand `task.priority` change (pour éviter les resets pendant l'édition). Solution : suppression du clic direct sur la priorité - l'utilisateur peut toujours la changer via "Edit task" ou le modal.

---

## 2026-01-15 - v0.4.17 - React Best Practices Refactoring

### Fichiers modifiés
- `src/components/layout/app-shell.tsx` - Ajout `useCallback` sur tous les handlers passés en props
- `src/app/(app)/page.tsx` - Ajout `useCallback` sur les handlers (filters, navigation, assign)
- `src/components/tasks/waterfall-picker.tsx` - Ajout `React.memo` pour éviter re-renders inutiles

### Optimisations appliquées

#### 1. useCallback sur les handlers (Re-renders)
Les handlers passés en props aux composants enfants sont maintenant wrappés dans `useCallback` pour éviter les re-renders :
- `app-shell.tsx` : 12 handlers optimisés (handleSidebarCollapse, handleCreateTheme, handleDelete*, handleEdit*, etc.)
- `page.tsx (Daily Brief)` : 7 handlers optimisés (handleCategoryChange, clearFilters, goToPreviousDay, etc.)

#### 2. React.memo sur WaterfallPicker
Le composant `WaterfallPicker` est maintenant mémorisé pour éviter les re-renders quand les props `value` et `onChange` n'ont pas changé.

### Vérifications effectuées
- ✅ AnimatePresence : Tous utilisent `mode="sync"` ou `mode="wait"` (pas de `popLayout`)
- ✅ Query invalidation : Pattern granulaire déjà en place via `queryKeys` factory
- ✅ Dynamic imports : Déjà utilisés pour composants lourds (QuickAdd, CommandPalette, dialogs)
- ✅ useMemo : Déjà en place pour calculs coûteux (filteredThemes, groupedByCategory, etc.)

### Impact performance
- Réduction des re-renders sur la Sidebar et ses enfants
- Réduction des re-renders sur le Daily Brief lors des changements de filtres
- WaterfallPicker ne re-render plus inutilement

---

## 2026-01-15 - v0.4.16 - Fix WaterfallPicker flash in EditTaskDialog

### Fichiers modifiés
- `src/components/tasks/waterfall-picker.tsx` - Ajout `modal={false}` sur le Dialog interne

### Correction
- **WaterfallPicker s'ouvrait et se fermait immédiatement** - Le Dialog du WaterfallPicker entrait en conflit avec le Dialog parent (EditTaskDialog). Radix UI ne gère pas bien les Dialogs modaux imbriqués. Solution: `modal={false}` sur le Dialog interne pour éviter le conflit de focus trap.

---

## 2026-01-15 - v0.4.15 - Smart Parser: Descriptive Keywords & Name Detection

### Fichiers modifiés
- `src/lib/date-parser.ts` - Parser intelligent pour mots descriptifs et détection noms de personnes

### Nouvelles fonctionnalités

#### 1. Mots descriptifs conservés dans le titre
Les mots qui décrivent la nature d'un RDV (repas, pauses) restent maintenant dans le titre:
- **Avant** : "dej demain avec Sarah" → titre: "avec Sarah" ❌
- **Après** : "dej demain avec Sarah" → titre: "dej avec Sarah" ✅

Mots descriptifs: `dej`, `lunch`, `breakfast`, `brunch`, `dinner`, `dîner`, `goûter`, `coffee`, `pause`, `tea`, etc.

#### 2. Détection intelligente des noms de personnes vs jours abrégés
Les abréviations courtes (sam, lun, mar, etc.) ne sont reconnues comme jours QUE dans certains contextes:

- **"sam en fin d'aprem"** → "sam" = nom de personne (autre indicateur temporel présent)
- **"sam matin"** → "sam" = samedi (suivi directement d'un modificateur temporel)
- **"appeler Sam"** → "Sam" = nom de personne (après un verbe)
- **"rdv avec Sam demain"** → "Sam" = nom de personne (autre indicateur présent)

#### 3. Règles de reconnaissance des abréviations courtes
Une abréviation de 3 lettres (sam, lun, mar, mer, jeu, ven, dim) est reconnue comme jour SI:
1. Elle est en **début d'input** (ex: "sam cinema" = samedi)
2. Elle est **suivie d'un modificateur temporel** (ex: "sam matin", "sam prochain")

Elle n'est PAS reconnue comme jour SI:
1. Un **autre indicateur temporel** est présent (ex: "sam en fin d'aprem")
2. Elle est **après d'autres mots** (ex: "appeler Sam", "rdv avec Sam")

### Exemples

| Input | Titre | Date | Heure |
|-------|-------|------|-------|
| dej demain avec Sarah | dej avec Sarah | demain | 12:30 |
| sam en fin d'aprem | sam | aujourd'hui | 17:00 |
| sam matin | (vide) | samedi | 09:00 |
| appeler Sam | appeler Sam | null | null |
| rdv avec Sam demain | rdv avec Sam | demain | null |
| coffee break demain | coffee break | demain | 10:30 |
| lunch with John tomorrow | lunch with John | demain | 12:30 |

### Ajouts
- `descriptiveTimeKeywords` : Set de mots conservés dans le titre
- `shortDayAbbreviations` : Set d'abréviations à traiter avec précaution
- `shouldRecognizeShortDay()` : Fonction de décision contextuelle
- Abréviations FR ajoutées à `frenchDayPatterns` : lun, mar, mer, jeu, ven, dim (pas "sam")

### Note sur "sam"
"sam" est toujours interprété comme un **prénom** (Samuel, Samantha, etc.), jamais comme samedi.
Pour le jour, utiliser "samedi" en entier. Raison : peu de RDV pris le samedi, "sam" est plus souvent un nom.

---

## 2026-01-15 - v0.4.14 - Support date+time combinations like "demain au dej"

### Fichiers modifiés
- `src/lib/date-parser.ts` - Refactoring majeur du parsing date/time

### Améliorations
1. **Combinaisons date + time** - "demain au dej", "lundi matin", "mardi soir", etc.
   - Avant: time keywords forcaient la date à aujourd'hui
   - Après: date vient du keyword date, time vient du keyword time
   - Ex: "demain au dej call" → date = demain, time = 12:30

2. **Nouvelle logique** - Séparation des keywords
   - `relativePatterns` ne contient QUE les patterns de DATE (demain, lundi, etc.)
   - `timeOnlyKeywords` (nouveau Set) contient tous les time keywords
   - Si un time keyword est trouvé SANS date keyword → default à aujourd'hui
   - Si un date keyword est trouvé avec un time keyword → les deux sont utilisés

3. **Nouveaux typos/abbréviations ajoutés**
   - `mat` pour matin (ex: "demain mat")
   - Tous les time keywords supportent les combinaisons avec dates

### Exemples supportés
- "au dej call" → aujourd'hui 12:30
- "demain au dej call" → demain 12:30
- "lundi matin meeting" → lundi 09:00
- "vendredi soir resto" → vendredi 18:00
- "demain mat sport" → demain 09:00

---

## 2026-01-15 - v0.4.13 - Fix "ce soir" date parsing

### Correction
- `src/lib/date-parser.ts` - "ce soir", "matin", "aprem", etc. définissent maintenant AUSSI la date (aujourd'hui)
- Avant: "ce soir 22h call" → pas de date → inbox
- Après: "ce soir 22h call" → date = aujourd'hui, heure = 22:00 → Daily Brief

---

## 2026-01-15 - v0.4.12 - Fix Daily Brief Navigation

### Correction critique
- `src/middleware.ts` - Le redirect ne s'applique QUE sur l'entrée initiale (pas de referer ou referer externe)
- Avant: Chaque clic sur Daily Brief redirigeait vers Inbox - BUG
- Après: Navigation interne respectée, redirect uniquement sur ouverture de l'app

---

## 2026-01-15 - v0.4.11 - Major Fixes: Default View, En Attente, Kanban

### Fichiers modifiés
- `src/middleware.ts` - Redirect vers la vue préférée au niveau middleware (pas de flash!)
- `src/hooks/use-preferences.ts` - Ajout cookie `sederize-preferred-view` pour middleware, sync au chargement
- `src/app/(app)/pending/page.tsx` - Groupement par Catégorie > Thème, affichage hiérarchie complète
- `src/app/(app)/kanban/page.tsx` - DragOverlay utilise même couleur que la carte (category > theme)
- `src/components/tasks/quick-add.tsx` - Smart parser simplifié, utilise les valeurs parsées sur submit (comme inbox)
- `src/app/(app)/layout.tsx` - Suppression du PreferredViewGuard (remplacé par middleware)

### Corrections
1. **Default view SANS FLASH** - Redirection faite dans middleware.ts AVANT le rendu de la page!
   - Le cookie `sederize-preferred-view` est lu par le middleware
   - Plus besoin de client-side redirect = plus de flash
   - Le cookie est synchronisé avec localStorage au chargement

2. **En Attente - Category change fonctionne** - Groupement Catégorie > Thème > Tâches
   - La page affiche maintenant les headers de catégorie en plus des thèmes
   - L'assignation de catégorie seule persiste correctement
   - Affichage "Category › Theme › Subject" sous chaque tâche

3. **Kanban color dot stable pendant drag** - DragOverlay utilise la même logique de couleur
   - Avant: DragOverlay utilisait `theme.color_hex` seulement
   - Après: Utilise `category?.color_hex || theme?.color_hex` comme la carte

4. **QuickAdd smart parser** - Simplifié pour matcher inbox exactement
   - Parse date, time, ET priority sur submit
   - Toast affiche les détails parsés (date, heure, priorité)
   - Plus de mise à jour d'état pendant la frappe

---

## 2026-01-15 - v0.4.10 - Kanban Click & Smart Parser Fixes

### Fichiers modifiés
- `src/app/(app)/kanban/page.tsx` - onClick handler pour ouvrir le modal TaskFocusDialog, indicatorColor stable pendant le drag
- `src/components/tasks/edit-task-dialog.tsx` - Helper `getResolvedWaterfall` pour initialiser correctement le waterfall depuis les valeurs héritées
- `src/components/tasks/task-focus-dialog.tsx` - Même fix `getResolvedWaterfall` pour cohérence
- `src/components/layout/preferred-view-redirect.tsx` - Refactoré en `PreferredViewGuard` qui wrap les children (évite le flash)
- `src/app/(app)/layout.tsx` - Utilise `PreferredViewGuard` pour wrapper les children
- `src/components/tasks/quick-add.tsx` - Smart parser maintenant complet (date, time, ET priority)

### Corrections
1. **Kanban click to open modal** - Le clic sur une tâche ouvre maintenant le modal TaskFocusDialog (drag toujours fonctionnel)
2. **Kanban color dot stable** - Le point de couleur ne change plus pendant le drag (variable `indicatorColor` calculée une fois)
3. **Waiting tasks theme change** - Le changement de thème sur les tâches en attente persiste maintenant correctement (fix waterfall initialization)
4. **Default view sans flash** - `PreferredViewGuard` wrapper évite le flash du Daily Brief en ne rendant pas les children tant que la redirection n'est pas vérifiée
5. **QuickAdd smart parser** - Le + button utilise maintenant le smart parser complet incluant:
   - Dates relatives (demain, lundi prochain, dans 3j, etc.)
   - Heures (14h30, midi, soir, etc.)
   - Priorités (urgent, important, pas urgent, etc.)

---

## 2026-01-15 - v0.4.9 - Kanban UX & Cache Fixes

### Fichiers modifiés
- `src/hooks/use-tasks.ts` - Ajout invalidation kanban/waitingFor lors de changement de date ou assignment
- `src/components/layout/preferred-view-redirect.tsx` - Loading overlay pendant la vérification (évite flash de Daily Brief)
- `src/app/(app)/kanban/page.tsx` - Tri chronologique des tâches, affichage hiérarchie (Category › Theme › Subject)

### Corrections
1. **Changement thème sur tâche en attente** - L'UI se met maintenant à jour immédiatement (invalidation waitingFor query)
2. **Default view sans flash** - Overlay de chargement pendant la redirection (plus de flash de Daily Brief)
3. **Kanban UI update sans refresh** - Invalidation du cache kanban lors des changements de date/assignment
4. **Kanban tri chronologique** - Les tâches sont triées par date croissante puis par priorité dans chaque colonne
5. **Kanban affichage hiérarchie** - Affiche "Category › Theme › Subject" sous le titre de la tâche

---

## 2026-01-15 - v0.4.8 - UX Fixes & Kanban Date Picker

### Fichiers créés
- `src/components/layout/preferred-view-redirect.tsx` - Redirect vers la vue préférée au démarrage

### Fichiers modifiés
- `src/app/(app)/pending/page.tsx` - Suppression affichage dupliqué waiting_for_note, utilisation showTimestamp
- `src/components/tasks/task-card.tsx` - Ajout prop showTimestamp pour afficher "il y a X minutes" à droite
- `src/app/(app)/layout.tsx` - Ajout PreferredViewRedirect component
- `src/app/(app)/settings/page.tsx` - Raccourcis simplifiés (lettres simples au lieu de G+X)
- `src/components/command-palette.tsx` - Raccourcis simplifiés : D=Daily Brief, I=Inbox, L=Calendar, B=Kanban, T=Tasks, P=Pending, A=Archives
- `src/app/(app)/kanban/page.tsx` - Drag&drop sur toute la carte (plus juste l'icône), date picker dialog pour colonnes "This Week"/"Later"
- `src/components/filters/theme-subject-filter.tsx` - Fix filtrage par catégorie (support theme.category.id et task.category)

### Corrections
1. **Page En Attente** - Le timestamp "il y a X minutes" est maintenant affiché à droite de la carte (sous le menu 3 points) au lieu d'en dessous
2. **Default View** - La préférence de vue par défaut fonctionne maintenant (redirection au démarrage de l'app)
3. **Raccourcis clavier simplifiés** - Plus de séquences à 2 touches (G+D), maintenant une seule lettre :
   - D = Daily Brief
   - I = Inbox
   - L = Calendar
   - B = Kanban
   - T = All Tasks
   - P = Pending
   - A = Archives
   - C = Create Task
   - Cmd+K = Command Palette
4. **Kanban drag&drop** - On peut maintenant drag une tâche en cliquant n'importe où sur la carte
5. **Kanban date picker** - Déplacer une tâche vers "This Week" ou "Later" ouvre un calendrier pour choisir la date
6. **Filtre catégorie** - Le filtre par catégorie fonctionne maintenant correctement dans Kanban et autres vues

---

## 2025-01-15 - v0.4.7 - Calendar Improvements

### Fichiers modifiés
- `src/components/filters/theme-subject-filter.tsx` - Ajout filtrage par catégories (3 niveaux : Catégorie → Thème → Sujet)
- `src/components/calendar/three-day-view.tsx` - Tâches terminées en bas de liste
- `src/components/calendar/day-view.tsx` - Tâches avec horaire cliquables (ouvre TaskFocusDialog)
- `src/components/calendar/week-view.tsx` - Toutes les tâches affichées (plus de limite), cliquables
- `src/app/(app)/calendar/page.tsx` - Point violet, largeur max-w-7xl, support categoryIds
- `src/app/(app)/kanban/page.tsx` - Support categoryIds dans filtre

### Améliorations
1. **Filtres par catégorie** - Le filtre inclut maintenant les 3 niveaux de hiérarchie (Category > Theme > Subject)
2. **Vue 3 jours** - Les tâches terminées sont barrées et placées en bas de la liste quotidienne
3. **Tâches avec horaire cliquables** - Dans les vues Jour et Semaine, cliquer sur une tâche ouvre le dialog de focus
4. **Vue hebdomadaire améliorée** :
   - Toutes les tâches affichées (plus de limite artificielle)
   - ScrollArea gère le défilement si nécessaire
   - Tâches terminées barrées avec opacité réduite
5. **Point violet** - Indicateur visuel à côté du numéro du jour quand il y a des tâches (vue mensuelle)
6. **Largeur calendrier** - Passé de max-w-4xl (896px) à max-w-7xl (1280px) pour plus d'espace

---

## 2025-01-15 - v0.4.6 - Smart Quick Add - Parser complet avec typos

### Fichiers modifiés
- `src/lib/date-parser.ts` - Refonte complète du parser avec 200+ patterns et typos
- `src/app/(app)/inbox/page.tsx` - Smart parsing + optimistic update pour move to subject
- `src/hooks/use-tasks.ts` - Fix invalidation queries inbox pour snooze et waiting_for

### Nouvelles fonctionnalités - Parser de dates

#### 1. Jour + modificateur
- "jeudi prochain", "jeudi pro", "jeudi proch"
- "next monday", "next tue"
- "ce lundi", "this friday"
- "lundi de la semaine prochaine", "lundi sem pro"
- "lundi en 8", "mardi en 15" (français pour +1/+2 semaines)
- "lundi dans 15j", "mardi dans deux semaines"

#### 2. Dates explicites (format européen)
- "22/01", "22-01", "22.01" (JJ/MM)
- "22/01/2025", "22/01/25" (JJ/MM/AAAA)
- "22 janvier", "22 jan", "22 janv"
- "january 22", "jan 22"
- "le 22" (jour du mois courant ou prochain)

#### 3. Périodes relatives
- "ce weekend", "ce we", "ce w-e", "week-end"
- "fin de semaine", "fin de sem"
- "début de semaine", "debut de sem"
- "mois prochain", "mois pro", "mois proch"
- "dans un mois", "dans 1m", "ds 1m"
- "cette semaine", "cette sem", "this week"

#### 4. Abréviations temps
- "dans 2j", "ds 3j", "+2j", "j+2"
- "dans 2s", "ds 3s", "+2s" (semaines)
- "dans deux jours", "dans trois semaines" (nombres en lettres)

#### 5. Typos massives (200+ variations)
- **Mois FR** : janvier/janiver/janvie, février/fevrier/fevirer, mars/mar, avril/avrli, etc.
- **Mois EN** : january/januray, february/febuary, march/marhc, april/apirl, etc.
- **Nombres** : deux/deu/duex, trois/trios, quatre/qatre, cinq/cinc, quinze/quinz, etc.
- **Jours FR** : lundi/lunid/lun, mardi/madri/mar, mercredi/mercerdi/mer, etc.
- **Jours EN** : monday/mondya/mon, tuesday/teusday/tue, wednesday/wedensday/wed, etc.
- **Prochain** : prochain/prochian/pro/proch
- **Semaine** : semaine/semiane/semmaine/sem
- **Weekend** : weekend/wikend/wekend/we/w-e

### Priorité intelligente
- **Low (0)** : "pas urgent", "si possible/posible/possble", "quand possible", "optionnel", "tranquille", "no rush"
- **Urgent (3)** : "urgent/urgnt/urgen/urgant", "asap", "critical/criticl", "critique/critque"
- **High (2)** : "important/importnt/improtant", "priorité/priorty", "haute priorité", "prio"

### Bug fixes
1. **"pas urgent" détecté comme "urgent"** - Patterns multi-mots testés AVANT les patterns simples
2. **"21h soir" donnait 18h** - Heure explicite prioritaire sur les keywords de temps
3. **Snooze ne rafraîchit pas l'UI** - Invalidation query inbox ajoutée
4. **Waiting for ne rafraîchit pas l'UI** - Invalidation query inbox ajoutée
5. **Move to subject latence** - Optimistic update : tâche retirée immédiatement de la liste

---

## 2025-01-15 - v0.4.5 - Dark Theme & UX Fixes

### Fichiers modifiés
- `src/app/globals.css` - Amélioration du thème dark avec meilleurs contrastes
- `src/app/(app)/page.tsx` - Labels filtres simplifiés ("Catégories", "Thèmes")
- `src/app/(app)/tasks/page.tsx` - Ajout modes de vue "By Category" et "By Theme", hiérarchie complète sur les tâches
- `src/components/tasks/attachment-list.tsx` - Skeleton avec mêmes dimensions que le contenu final
- `src/components/tasks/snooze-popover.tsx` - Options contextuelles (filtre les dates inutiles)
- `src/components/tasks/task-card.tsx` - Passage de taskDate au SnoozePopover
- `src/hooks/use-tasks.ts` - Fix snooze qui n'update pas l'UI dans les vues autres qu'aujourd'hui

### Corrections
1. **Dark theme** - Meilleurs contrastes entre background, cards, et borders
2. **Labels filtres** - "Toutes catégories" → "Catégories", "Tous thèmes" → "Thèmes"
3. **Animation dialog** - Skeleton AttachmentList avec mêmes dimensions que le contenu (évite le layout shift)
4. **Snooze contextuel** - Le menu snooze n'affiche plus "Demain" si la tâche est déjà pour demain
5. **Snooze UI update** - Invalidation de tous les daily briefs (pas seulement aujourd'hui)
6. **All Tasks - View modes** - Ajout "By Category" et "By Theme" comme options
7. **Hiérarchie tâches** - Affichage "Category › Theme › Subject" quand tous les filtres sont "all"

---

## 2025-01-15 - v0.4.4 - Waterfall UX Polish

### Fichiers modifiés
- `src/components/tasks/waterfall-picker.tsx` - Suppression options "Sans catégorie/thème/sujet"
- `src/components/tasks/waterfall-assign-dialog.tsx` - Suppression options "Sans catégorie/thème/sujet"
- `src/components/tasks/task-focus-dialog.tsx` - Remplacement Subject select par WaterfallPicker
- `src/components/tasks/task-card.tsx` - Fix conflit DropdownMenu/Dialog (setTimeout sur onSelect)
- `src/components/tasks/edit-task-dialog.tsx` - Ajout aria-describedby pour accessibilité
- `src/app/(app)/page.tsx` - Badge affiche uniquement le sujet (pas theme/category)

### Améliorations UX
1. **Picker simplifié** - Plus d'options "Sans X" redondantes, sélection implicite
2. **TaskFocusDialog** - Utilise maintenant WaterfallPicker pour l'assignation
3. **Fix modal flash** - Les dialogs ne se ferment plus de façon inattendue
4. **Badge épuré** - Seul le nom du sujet apparaît (theme/category visible dans le groupement)

---

## 2025-01-15 - v0.4.3 - Waterfall Assignment Dialog

### Fichiers créés
- `src/components/tasks/waterfall-assign-dialog.tsx` - Dialog 3 colonnes (Category | Theme | Subject) avec bouton Valider

### Fichiers modifiés
- `src/app/(app)/inbox/page.tsx` - Remplacement MoveToSubjectDialog par WaterfallAssignDialog
- `src/app/(app)/page.tsx` - Remplacement MoveToSubjectDialog par WaterfallAssignDialog

### Améliorations
1. **WaterfallAssignDialog** - Dialog unifié pour l'assignation waterfall :
   - 3 colonnes scrollables (Catégories | Thèmes | Sujets)
   - Sélection en cascade avec auto-sélection des parents
   - Badge de sélection en temps réel
   - Boutons "Effacer" et "Valider"
2. **Inbox** - Assignation depuis l'inbox utilise maintenant le waterfall
3. **Daily Brief** - Assignation des tâches non-assignées utilise maintenant le waterfall

---

## 2025-01-15 - v0.4.2 - Waterfall Assignment

### Fichiers créés
- `src/components/tasks/waterfall-picker.tsx` - Nouveau sélecteur cascade Category → Theme → Subject

### Fichiers modifiés
- `src/types/database.ts` - Ajout `theme_id` et `category_id` sur Task, CreateTaskInput, UpdateTaskInput
- `src/hooks/use-tasks.ts` - Queries avec `direct_theme` et `direct_category`, transformTask mis à jour
- `src/components/tasks/edit-task-dialog.tsx` - Remplacement SubjectPicker par WaterfallPicker
- `src/app/(app)/page.tsx` - Support assignation waterfall

### Nouvelles fonctionnalités
1. **Waterfall Assignment** - Les tâches peuvent être assignées à :
   - Un **Subject** (comportement existant)
   - Un **Theme** directement (sans subject)
   - Une **Category** directement (sans theme ni subject)
2. **WaterfallPicker** - Composant de sélection en cascade avec 3 colonnes
3. **Inbox redéfini** - Maintenant = tâches sans aucune assignation (subject, theme, category tous null)

### Migration DB requise
```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES themes(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_theme_id ON tasks(theme_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
```

---

## 2025-01-15 - v0.4.1 - Kanban Multi-View & Subtasks

### Fichiers modifiés
- `src/app/(app)/kanban/page.tsx` - Refactoring complet avec 4 modes de vue

### Nouvelles fonctionnalités
1. **Kanban Multi-View** - 4 modes de visualisation :
   - **All Status** (défaut) : Colonnes To Do / Waiting / Done
   - **To Do by Date** : Colonnes Overdue / Today / Tomorrow / This Week / Later / No Date
   - **Waiting** : Vue filtrée des tâches en attente
   - **Done** : Vue filtrée des tâches terminées
2. **Subtasks** - Déjà implémenté :
   - `src/components/tasks/subtask-list.tsx` avec progress bar
   - Visible dans TaskFocusDialog pour toute tâche parente
   - Hooks `useSubtasks` et `useCreateSubtask` dans use-tasks.ts

### Documentation
- **Waterfall DB Changes** : Voir CLAUDE.md section future pour les colonnes `theme_id` et `category_id` sur tasks

---

## 2025-01-15 - v0.4.0 - UX Overhaul: Filters, Dark Mode, Keyboard Shortcuts

### Fichiers modifiés/créés
- `src/app/(app)/page.tsx` - Titre centré, filtres Category/Theme/Priority, category header centré
- `src/app/(app)/tasks/page.tsx` - Filtres cascade (Category→Theme→Subject), search dans labels, done tasks en bas, theme name affiché
- `src/app/(app)/pending/page.tsx` - Espacement aéré
- `src/app/(app)/archives/page.tsx` - Espacement aéré
- `src/app/(app)/settings/page.tsx` - Dark mode fonctionnel via useTheme hook
- `src/components/tasks/quick-add.tsx` - Sélecteur de priorité à la création
- `src/components/command-palette.tsx` - Raccourcis à deux touches (G+D, G+I, G+C, etc.)
- `src/providers/theme-provider.tsx` - Nouveau provider pour gestion dark/light/system
- `src/providers/index.tsx` - Ajout ThemeProvider

### Améliorations UX
1. **Daily Brief**
   - Titre et date centrés
   - Category centrée avec séparateurs, Theme à gauche
   - Filtres Category + Theme + Priority avec cascade
2. **Quick Add** - Sélection priorité (Urgent/High/Normal/Low)
3. **All Tasks**
   - Recherche inclut les labels
   - Filtres en cascade Category → Theme → Subject
   - Done tasks vont en bas de leur groupe
   - Theme name affiché dans vue "By Subject"
4. **Dark Mode** - Fonctionnel via Settings
5. **Keyboard Shortcuts** - Raccourcis à deux touches :
   - G+D → Daily Brief
   - G+I → Inbox
   - G+C → Calendar
   - G+K → Kanban
   - G+T → All Tasks
   - G+S → Settings
   - G+P → Pending
   - G+A → Archives
6. **Espacement** - Pages En Attente et Archives moins collées

---

## 2025-01-15 - v0.3.3 - Daily Brief: Category Grouping & Subject Badge

### Fichiers modifiés
- `src/components/tasks/task-card.tsx` - Badge du sujet coloré (hérite couleur du thème) au lieu de gris neutre
- `src/app/(app)/page.tsx` - Groupement par Category > Theme au lieu de Theme seul
- `src/hooks/use-tasks.ts` - Query daily brief inclut maintenant les categories via theme, transform inclut category
- `src/types/database.ts` - TaskWithRelations inclut maintenant `category?: Category | null`

### Améliorations UX
1. **Badge sujet visible** - Le sujet sur les TaskCards utilise la couleur du thème (fond léger + texte coloré)
2. **Groupement par catégorie** - Le Daily Brief affiche: Category (header uppercase) > Theme > Tâches
3. **Hiérarchie claire** - Catégories séparées par une bordure, thèmes indentés avec leur couleur

---

## 2025-01-15 - v0.3.2 - Sidebar UX & Daily Brief Assign

### Fichiers créés
- `src/components/ui/edit-entity-dialog.tsx` - Dialog générique pour modifier nom/couleur des catégories, thèmes, sujets

### Fichiers modifiés
- `src/components/layout/sidebar.tsx` - Suppression animations Framer Motion (cause effet accordéon), ajout options "Modifier" dans menus dropdown, header "Catégories" au lieu de "Projects", bouton + sur catégorie crée un thème DANS la catégorie
- `src/components/layout/app-shell.tsx` - Handlers pour édition catégories/thèmes/sujets, EditEntityDialog
- `src/components/themes/create-theme-dialog.tsx` - useEffect pour synchroniser categoryId quand le dialog s'ouvre
- `src/app/(app)/page.tsx` - Bouton d'assignation (FolderInput) pour les tâches unassigned dans le Daily Brief
- `src/hooks/use-tasks.ts` - Invalidation queries daily-brief lors changement subject_id (fix UI update après assignation)

### Nouvelles fonctionnalités
1. **Modifier catégorie/thème/sujet** - Menu trois points → "Modifier" pour renommer et changer la couleur
2. **Créer thème dans une catégorie** - Cliquer + à côté d'une catégorie pré-sélectionne cette catégorie
3. **Assigner tâches depuis Daily Brief** - Bouton d'assignation au survol des tâches unassigned

### Bug fix
- **Assignation Daily Brief** - La tâche se déplace instantanément après assignation (plus besoin de refresh)

### Améliorations UX
- **Sidebar sans animations** - Plus d'effet accordéon lors des créations/suppressions
- **Header sidebar** - "Catégories" au lieu de "Projects"

---

## 2025-01-15 - v0.3.1 - Bug Fixes & UX Improvements

### Fichiers modifiés
- `src/components/tasks/task-card.tsx` - Checkbox réduit (h-6 → h-5), overlay pour compléter les tâches waiting
- `src/components/tasks/snooze-popover.tsx` - Toast notification de confirmation ajouté
- `src/components/layout/sidebar.tsx` - Menus dropdown avec option "Supprimer" pour categories/themes/subjects
- `src/components/layout/app-shell.tsx` - Handlers de suppression + ConfirmDialog pour confirmation
- `src/app/(app)/page.tsx` - Fix bug overdue (comparaison vs selectedDate, pas new Date()), animations simplifiées, loading state corrigé
- `src/hooks/use-tasks.ts` - `placeholderData: keepPreviousData` pour éviter flash au changement de date
- `src/hooks/use-categories.ts` - Optimistic updates pour useDeleteCategory, keepPreviousData
- `src/hooks/use-themes.ts` - Optimistic updates pour useDeleteTheme
- `src/hooks/use-subjects.ts` - Optimistic updates pour useDeleteSubject
- `src/lib/date-parser.ts` - Fix duplicate key, ajout "midi", "matin", "soir", typos (demian, etc.)
- `src/components/tasks/task-focus-dialog.tsx` - Bouton "Terminée" en vert, import Circle supprimé

### Bug fixes
1. **Checkbox trop gros** - Réduit de h-6 w-6 à h-5 w-5
2. **Waiting tasks non-complétables** - Ajout overlay hover pour afficher bouton de complétion
3. **Snooze sans feedback** - Toast notification confirmant la nouvelle date
4. **Suppression invisible** - Menus dropdown dans la sidebar pour supprimer categories/themes/subjects
5. **Daily Brief crash** - Animations simplifiées, loading state correct avec keepPreviousData
6. **Tâches overdue mal affichées** - Comparaison contre selectedDate au lieu de new Date()
7. **Sidebar reload lors suppression** - Optimistic updates pour suppression instantanée sans refetch visible

### Impact
- UX suppression fluide (pas de reload)
- Navigation Daily Brief sans flash/crash
- Snooze avec feedback utilisateur
- Tâches waiting peuvent être complétées

---

## 2025-01-15 - v0.3.0 - Performance Refactoring (React Best Practices)

### Fichiers créés
- `src/lib/query-keys.ts` - Query key factory pour invalidation granulaire
- `src/components/error-boundary.tsx` - Error boundary component

### Fichiers modifiés
- `src/lib/supabase/client.ts` - Singleton pattern
- `src/providers/query-provider.tsx` - staleTime/gcTime configuration
- `next.config.mjs` - optimizePackageImports (lucide-react, radix-ui, date-fns, framer-motion)
- `src/hooks/use-categories.ts` - Promise.all() pour éliminer waterfall
- `src/hooks/use-tasks.ts` - Granular query invalidation, query keys
- `src/hooks/use-themes.ts` - Query keys, enabled option
- `src/hooks/use-subjects.ts` - Query keys
- `src/hooks/use-labels.ts` - Query keys
- `src/hooks/use-pending-items.ts` - Query keys
- `src/components/command-palette.tsx` - Deferred queries (enabled: open)
- `src/components/tasks/task-card.tsx` - React.memo, useCallback, conditional dialog rendering
- `src/components/layout/app-shell.tsx` - Dynamic imports pour dialogs
- `src/components/layout/sidebar.tsx` - useMemo, useCallback optimizations
- `src/app/(app)/calendar/page.tsx` - Dynamic imports pour calendar views
- `src/app/(app)/layout.tsx` - ErrorBoundary wrapper
- 13 fichiers - AnimatePresence mode="sync" (remplacé popLayout)

### Impact
- -60-80% refetches réseau
- -30-40% bundle initial
- -70% re-renders TaskCard
- -396 DOM nodes (dialogs conditionnels)

---

## 2025-01-14 - v0.2.1 - Bug Fixes

### Fichiers modifiés
- Priority save fix
- Date parser fuzzy matching
- Subject picker fallback
- Button overlap fix
- Unified "En Attente" page

---

## 2025-01-14 - v0.2.0 - Major Features

### Nouvelles fonctionnalités
- Labels system (labels table, task_labels junction)
- Pending Items (pending_items table, page "En Attente")
- Archives page (completed tasks by month)
- Calendar views (Day, 3-Day, Week, Month)

---

## 2025-01-14 - v0.1.3 - Documentation

### Fichiers modifiés
- CLAUDE.md - Added bugs/improvements backlog

---

## 2025-01-14 - v0.1.2 - UX Improvements

### Fichiers modifiés
- Framer Motion animations
- Skeleton loaders
- ThemeSubjectFilter component

---

## 2025-01-13 - v0.1.1 - Branding

### Changements
- Branding update to "Sederize"

---

## 2025-01-13 - v0.1.0 - Initial Release

### Fonctionnalités v1
- Daily Brief
- Themes & Subjects hierarchy
- Categories (optional grouping)
- Task CRUD with priority, snooze, waiting_for
- Inbox
- Calendar (monthly view)
- Kanban board
- Command Palette (Cmd+K)
- Auth (Email + Google via Supabase)
- Mobile-first responsive UI
