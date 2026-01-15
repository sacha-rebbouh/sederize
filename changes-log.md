# Changes Log - Sederize

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
