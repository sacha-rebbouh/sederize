'use client';

import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isBefore, startOfDay, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle,
  Hourglass,
  Clock,
  AlertCircle,
  Sparkles,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  FolderInput,
  Filter,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TaskCard } from '@/components/tasks/task-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonPage } from '@/components/ui/skeleton-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WaterfallAssignDialog, WaterfallSelection } from '@/components/tasks/waterfall-assign-dialog';
import { useDailyBriefTasks, useWaitingForTasks, useUpdateTask } from '@/hooks/use-tasks';
import { useZombieSubjects } from '@/hooks/use-subjects';
import { useCategories } from '@/hooks/use-categories';
import { useThemes } from '@/hooks/use-themes';
import { PRIORITY_LABELS, PriorityLevel } from '@/types/database';
import { TaskWithRelations, Theme, Task, Category } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type FilterType = 'all' | 'todo' | 'waiting' | 'inactive';

function formatDateLabel(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return 'Demain';
  if (isYesterday(date)) return 'Hier';
  return format(date, 'EEEE d MMMM', { locale: fr });
}

interface ThemeGroup {
  theme: Theme | null;
  tasks: TaskWithRelations[];
}

interface CategoryGroup {
  category: Category | null;
  themes: ThemeGroup[];
}

// Sort tasks: Priority DESC > Time ASC (nulls last) > Date ASC > Order ASC
function sortTasks(tasks: TaskWithRelations[]): TaskWithRelations[] {
  return [...tasks].sort((a, b) => {
    const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    if (a.do_time && b.do_time) return a.do_time.localeCompare(b.do_time);
    if (a.do_time && !b.do_time) return -1;
    if (!a.do_time && b.do_time) return 1;
    if (a.do_date && b.do_date) return a.do_date.localeCompare(b.do_date);
    return (a.order_index ?? 0) - (b.order_index ?? 0);
  });
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, duration: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.15 } }
};

export default function DailyBriefPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { data: tasks, isLoading: tasksLoading, isFetching } = useDailyBriefTasks(selectedDate);
  const { data: waitingFor } = useWaitingForTasks();
  const { data: zombies } = useZombieSubjects();
  const { data: categories } = useCategories();
  const { data: themes } = useThemes();
  const updateTask = useUpdateTask();

  // Keep track of previous tasks to avoid flash during refetch
  const prevTasksRef = useRef<typeof tasks>(undefined);
  const hasEverHadTasks = useRef(false);

  // Update refs when we get tasks
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      prevTasksRef.current = tasks;
      hasEverHadTasks.current = true;
    }
  }, [tasks]);

  // Use previous tasks during refetch if current is empty but we had tasks before
  const displayTasks = useMemo(() => {
    if (tasks && tasks.length > 0) return tasks;
    if (isFetching && hasEverHadTasks.current && prevTasksRef.current) {
      return prevTasksRef.current;
    }
    return tasks;
  }, [tasks, isFetching]);

  // Ready when loading is done (or we have data)
  const isReady = !tasksLoading || (displayTasks !== undefined && displayTasks.length > 0);

  // Cascade filter: themes filtered by category
  const filteredThemeOptions = useMemo(() => {
    if (!themes) return [];
    if (categoryFilter === 'all') return themes;
    return themes.filter((t) => t.category_id === categoryFilter);
  }, [themes, categoryFilter]);

  // Reset dependent filters when parent changes
  const handleCategoryChange = useCallback((value: string) => {
    setCategoryFilter(value);
    setThemeFilter('all');
  }, []);

  const hasActiveFilters = categoryFilter !== 'all' || themeFilter !== 'all' || priorityFilter !== 'all';

  const clearFilters = useCallback(() => {
    setCategoryFilter('all');
    setThemeFilter('all');
    setPriorityFilter('all');
  }, []);

  const goToPreviousDay = useCallback(() => setSelectedDate(d => subDays(d, 1)), []);
  const goToNextDay = useCallback(() => setSelectedDate(d => addDays(d, 1)), []);
  const goToToday = useCallback(() => setSelectedDate(new Date()), []);

  const handleOpenAssignDialog = useCallback((task: Task) => {
    setSelectedTask(task);
    setAssignDialogOpen(true);
  }, []);

  const handleAssign = useCallback((selection: WaterfallSelection) => {
    if (!selectedTask) return;

    // Build assignment label for toast
    let label = 'Inbox';
    if (selection.subjectId) label = 'sujet';
    else if (selection.themeId) label = 'thème';
    else if (selection.categoryId) label = 'catégorie';

    updateTask.mutate(
      {
        id: selectedTask.id,
        subject_id: selection.subjectId,
        theme_id: selection.themeId,
        category_id: selection.categoryId,
      },
      {
        onSuccess: () => {
          toast.success(`Assigné à ${label}`);
          setSelectedTask(null);
        },
      }
    );
  }, [selectedTask, updateTask]);

  const { overdueTasks, groupedByCategory } = useMemo(() => {
    if (!displayTasks) return { overdueTasks: [], groupedByCategory: [] };

    // Apply filters first
    const filteredTasks = displayTasks.filter((task) => {
      // Category filter
      if (categoryFilter !== 'all' && task.category?.id !== categoryFilter) {
        return false;
      }
      // Theme filter
      if (themeFilter !== 'all' && task.theme?.id !== themeFilter) {
        return false;
      }
      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== Number(priorityFilter)) {
        return false;
      }
      return true;
    });

    // Compare against selectedDate, not today!
    const selected = startOfDay(selectedDate);
    const overdue: TaskWithRelations[] = [];
    const todayOnly: TaskWithRelations[] = [];

    filteredTasks.forEach((task) => {
      if (!task.do_date) {
        todayOnly.push(task);
      } else {
        const taskDate = startOfDay(new Date(task.do_date));
        if (isBefore(taskDate, selected)) {
          overdue.push(task);
        } else {
          todayOnly.push(task);
        }
      }
    });

    // Group by Category > Theme
    const categoryMap = new Map<string | null, Map<string | null, ThemeGroup>>();
    const categoryData = new Map<string | null, Category | null>();

    sortTasks(todayOnly).forEach((task) => {
      const categoryId = task.category?.id || null;
      const themeId = task.theme?.id || null;

      // Store category data
      if (!categoryData.has(categoryId)) {
        categoryData.set(categoryId, task.category || null);
      }

      // Initialize category map if needed
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, new Map());
      }

      const themeMap = categoryMap.get(categoryId)!;
      if (!themeMap.has(themeId)) {
        themeMap.set(themeId, { theme: task.theme || null, tasks: [] });
      }
      themeMap.get(themeId)!.tasks.push(task);
    });

    // Convert to array and sort
    const result: CategoryGroup[] = Array.from(categoryMap.entries())
      .map(([categoryId, themeMap]) => ({
        category: categoryData.get(categoryId) || null,
        themes: Array.from(themeMap.values()).sort((a, b) => {
          if (!a.theme) return 1;
          if (!b.theme) return -1;
          return (a.theme.order_index || 0) - (b.theme.order_index || 0);
        }),
      }))
      .sort((a, b) => {
        if (!a.category) return 1;
        if (!b.category) return -1;
        return (a.category.order_index || 0) - (b.category.order_index || 0);
      });

    return { overdueTasks: sortTasks(overdue), groupedByCategory: result };
  }, [displayTasks, selectedDate, categoryFilter, themeFilter, priorityFilter]);

  const totalTasks = displayTasks?.length || 0;
  const overdueCount = overdueTasks.length;
  const waitingCount = waitingFor?.length || 0;
  const zombieCount = zombies?.length || 0;

  useEffect(() => {
    if (totalTasks > 0) {
      document.title = `(${totalTasks}) Daily Brief - Sederize`;
    } else {
      document.title = 'Daily Brief - Sederize';
    }
    return () => { document.title = 'Sederize - Order from Chaos'; };
  }, [totalTasks]);

  // Show skeleton until initial data is ready
  if (!isReady) {
    return <SkeletonPage />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto p-4 md:p-6 space-y-6"
    >
      {/* Header - Centered */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="relative flex items-center justify-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Brief du jour</h1>
          {totalTasks === 0 && isToday(selectedDate) && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.3 }}
              className="absolute -right-8 md:-right-9"
            >
              <Sparkles className="h-6 w-6 text-amber-500" />
            </motion.span>
          )}
        </div>

        {/* Date Navigation - Centered */}
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousDay}
            className="h-11 w-11 active:scale-95"
            aria-label="Jour précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-muted-foreground font-medium min-w-[160px] md:min-w-[180px] text-center capitalize text-sm md:text-base">
            {formatDateLabel(selectedDate)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextDay}
            className="h-11 w-11 active:scale-95"
            aria-label="Jour suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          {!isToday(selectedDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="ml-1 h-9 px-3 text-xs"
            >
              Aujourd&apos;hui
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filters Row - Scrollable on mobile */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max md:justify-center">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className={cn('w-[120px] h-10 text-xs', categoryFilter !== 'all' && 'border-primary')}>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Catégories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color_hex }} />
                    {cat.title}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Theme Filter */}
          <Select value={themeFilter} onValueChange={setThemeFilter}>
            <SelectTrigger className={cn('w-[120px] h-10 text-xs', themeFilter !== 'all' && 'border-primary')}>
              <SelectValue placeholder="Thème" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Thèmes</SelectItem>
              {filteredThemeOptions.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.color_hex }} />
                    {theme.title}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className={cn('w-[100px] h-10 text-xs', priorityFilter !== 'all' && 'border-primary')}>
              <SelectValue placeholder="Priorité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Priorités</SelectItem>
              {([3, 2, 1, 0] as PriorityLevel[]).map((p) => (
                <SelectItem key={p} value={String(p)}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 gap-1 text-xs flex-shrink-0">
                  <X className="h-3 w-3" />
                  Effacer
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
        {/* Fade gradient to hint more content - mobile only */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
      </motion.div>

      {/* Stats Row - Clickable Filters */}
      <motion.div
        className="grid grid-cols-3 gap-2 md:gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants} className="h-full">
          <Card
            onClick={() => setActiveFilter(activeFilter === 'todo' ? 'all' : 'todo')}
            className={cn(
              "h-full p-3 md:p-4 hover:shadow-md transition-all cursor-pointer active:scale-95",
              activeFilter === 'todo' && "ring-2 ring-primary shadow-md"
            )}
          >
            <div className="flex flex-col items-center text-center gap-1 md:flex-row md:text-left md:gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold">{totalTasks}</p>
                <p className="text-xs text-muted-foreground font-medium">A faire</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <Card
            onClick={() => setActiveFilter(activeFilter === 'waiting' ? 'all' : 'waiting')}
            className={cn(
              "h-full p-3 md:p-4 hover:shadow-md transition-all cursor-pointer active:scale-95",
              activeFilter === 'waiting' && "ring-2 ring-amber-500 shadow-md"
            )}
          >
            <div className="flex flex-col items-center text-center gap-1 md:flex-row md:text-left md:gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Hourglass className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold">{waitingCount}</p>
                <p className="text-xs text-muted-foreground font-medium">En attente</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <Card
            onClick={() => setActiveFilter(activeFilter === 'inactive' ? 'all' : 'inactive')}
            className={cn(
              "h-full p-3 md:p-4 hover:shadow-md transition-all cursor-pointer active:scale-95",
              activeFilter === 'inactive' && "ring-2 ring-amber-500 shadow-md"
            )}
          >
            <div className="flex flex-col items-center text-center gap-1 md:flex-row md:text-left md:gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold">{zombieCount}</p>
                <p className="text-xs text-muted-foreground font-medium">Inactifs</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Active Filter Indicator */}
      <AnimatePresence>
        {activeFilter !== 'all' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2"
          >
            <Badge variant="secondary" className="gap-1">
              Filtre : {activeFilter === 'todo' ? 'A faire' : activeFilter === 'waiting' ? 'En attente' : 'Sujets inactifs'}
              <button
                onClick={() => setActiveFilter('all')}
                className="ml-1 hover:text-destructive"
              >
                &times;
              </button>
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERDUE Section - Show when filter is 'all' or 'todo' */}
      <AnimatePresence>
        {overdueCount > 0 && (activeFilter === 'all' || activeFilter === 'todo') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="border-destructive/50 bg-gradient-to-br from-destructive/5 to-transparent overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <AlertCircle className="h-5 w-5" />
                  </motion.div>
                  En retard
                  <Badge variant="destructive" className="ml-1">
                    {overdueCount}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AnimatePresence mode="sync">
                  {overdueTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      theme={task.theme}
                      labels={task.labels}
                      showSubject
                      subjectTitle={task.subject?.title}
                    />
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State - Show when filter is 'all' or 'todo' and no tasks (only after loading and sync) */}
      {totalTasks === 0 && (activeFilter === 'all' || activeFilter === 'todo') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-dashed">
            <EmptyState
              type="success"
              title="Tout est fait !"
              description="Aucune tache pour aujourd'hui. Profitez de votre liberte ou planifiez a l'avance."
            />
          </Card>
        </motion.div>
      )}

      {/* Grouped Tasks by Category > Theme - Show when filter is 'all' or 'todo' */}
      {(activeFilter === 'all' || activeFilter === 'todo') && (
        <motion.div
          className="space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {groupedByCategory.map((categoryGroup) => (
            <motion.div
              key={categoryGroup.category?.id || 'uncategorized'}
              variants={itemVariants}
              className="space-y-4"
            >
              {/* Category Header - Centered, prominent */}
              {categoryGroup.category && (
                <div className="flex items-center justify-center gap-3 py-2">
                  <div className="h-px flex-1 bg-border/60" />
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: categoryGroup.category.color_hex }}
                    />
                    <h2 className="text-base font-bold uppercase tracking-wider">
                      {categoryGroup.category.title}
                    </h2>
                  </div>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
              )}

              {/* Theme Groups within Category */}
              <div className="space-y-5">
                {categoryGroup.themes.map((themeGroup) => (
                  <div key={themeGroup.theme?.id || 'inbox'} className="space-y-2">
                    {/* Theme Header - Left aligned */}
                    <div className="flex items-center gap-2">
                      {themeGroup.theme ? (
                        <>
                          <motion.div
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: themeGroup.theme.color_hex }}
                            whileHover={{ scale: 1.2 }}
                          />
                          <h3 className="text-sm font-semibold text-foreground/80">{themeGroup.theme.title}</h3>
                          <Badge variant="secondary" className="text-xs font-medium">
                            {themeGroup.tasks.length}
                          </Badge>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold text-muted-foreground">Boite de reception</h3>
                          <Badge variant="secondary" className="text-xs font-medium">
                            {themeGroup.tasks.length}
                          </Badge>
                        </>
                      )}
                    </div>

                    {/* Tasks */}
                    <div className="space-y-2">
                      <AnimatePresence mode="sync">
                        {themeGroup.tasks.map((task) => {
                          // Only show subject name as badge (theme/category already visible in grouping)
                          const assignmentLabel = task.subject?.title || null;
                          return (
                          <div key={task.id} className="group relative">
                            <TaskCard
                              task={task}
                              theme={task.theme}
                              labels={task.labels}
                              showSubject
                              subjectTitle={assignmentLabel}
                            />
                            {/* Assign button for unassigned tasks */}
                            {!themeGroup.theme && (
                              <div className="absolute right-24 top-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 bg-primary/10 hover:bg-primary/20 rounded-lg"
                                  onClick={() => handleOpenAssignDialog(task)}
                                  title="Assigner à un sujet"
                                >
                                  <FolderInput className="h-4 w-4 text-primary" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Waiting For Section - Show when filter is 'all' or 'waiting' */}
      <AnimatePresence>
        {waitingFor && waitingFor.length > 0 && (activeFilter === 'all' || activeFilter === 'waiting') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {activeFilter === 'all' && <Separator className="my-6" />}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hourglass className="h-4 w-4 text-amber-500" />
                  <h2 className="font-semibold">En Attente</h2>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {waitingFor.length}
                  </Badge>
                </div>
                <Link href="/pending">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    Voir tout →
                  </Button>
                </Link>
              </div>

              <div className="space-y-2">
                <AnimatePresence mode="sync">
                  {waitingFor.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      theme={task.theme}
                      labels={task.labels}
                      showSubject
                      subjectTitle={task.subject?.title}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state for Waiting filter */}
      {activeFilter === 'waiting' && (!waitingFor || waitingFor.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-dashed">
            <EmptyState
              type="success"
              title="Rien en attente"
              description="Aucune tâche en attente de réponse."
            />
          </Card>
        </motion.div>
      )}

      {/* Inactive Subjects Alert - Show when filter is 'all' or 'inactive' */}
      <AnimatePresence>
        {zombies && zombies.length > 0 && (activeFilter === 'all' || activeFilter === 'inactive') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {activeFilter === 'all' && <Separator className="my-6" />}

            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Sujets inactifs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Ces sujets n&apos;ont pas eu d&apos;activité depuis plus de 10 jours.
                </p>
                <div className="flex flex-wrap gap-2">
                  {zombies.map((subject, i) => (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link href={`/subject/${subject.id}`}>
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-accent hover:scale-105 transition-all"
                        >
                          <div
                            className="h-2 w-2 rounded-full mr-1.5"
                            style={{ backgroundColor: subject.theme?.color_hex }}
                          />
                          {subject.title}
                        </Badge>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state for Inactive filter */}
      {activeFilter === 'inactive' && (!zombies || zombies.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-dashed">
            <EmptyState
              type="success"
              title="Tout est actif"
              description="Aucun sujet inactif depuis plus de 10 jours."
            />
          </Card>
        </motion.div>
      )}

      {/* Bottom padding for FAB */}
      <div className="h-20 md:h-8" />

      {/* Waterfall Assign Dialog */}
      <WaterfallAssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onSelect={handleAssign}
        currentValue={{
          categoryId: selectedTask?.category_id || null,
          themeId: selectedTask?.theme_id || null,
          subjectId: selectedTask?.subject_id || null,
        }}
      />
    </motion.div>
  );
}
