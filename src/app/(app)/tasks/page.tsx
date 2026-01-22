'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isToday, isTomorrow, isPast, addDays } from 'date-fns';
import {
  ListTodo,
  Filter,
  CheckCircle2,
  Circle,
  ChevronDown,
  X,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TaskCard } from '@/components/tasks/task-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList, SkeletonHeader } from '@/components/ui/skeleton-card';
import { useAllTasksUnlimited } from '@/hooks/use-tasks';
import { useThemes } from '@/hooks/use-themes';
import { useActiveSubjects } from '@/hooks/use-subjects';
import { useCategories } from '@/hooks/use-categories';
import { TaskWithRelations, TaskStatus } from '@/types/database';

type ViewMode = 'all' | 'by-date' | 'by-category' | 'by-theme' | 'by-subject' | 'by-status';
type DateFilter = 'all' | 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'no-date';
type StatusFilter = 'all' | 'todo' | 'waiting_for' | 'done';

interface TaskGroup {
  title: string;
  tasks: TaskWithRelations[];
  color?: string;
}

function getDateLabel(date: string | null, status?: string): string {
  if (!date) return 'Sans date';
  const d = new Date(date);
  // Les tâches terminées ne sont jamais "En retard"
  if (isPast(d) && !isToday(d) && status !== 'done') return 'En retard';
  if (isToday(d)) return "Aujourd'hui";
  if (isTomorrow(d)) return 'Demain';
  const nextWeek = addDays(new Date(), 7);
  if (d <= nextWeek) return 'Cette semaine';
  return 'Plus tard';
}

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

export default function AllTasksPage() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('by-date');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const { data: allTasks = [], isLoading } = useAllTasksUnlimited();
  const { data: categories } = useCategories();
  const { data: themes } = useThemes();
  const { data: subjects } = useActiveSubjects();

  // Cascade filter: themes filtered by category
  const filteredThemes = useMemo(() => {
    if (!themes) return [];
    if (categoryFilter === 'all') return themes;
    return themes.filter((t) => t.category_id === categoryFilter);
  }, [themes, categoryFilter]);

  // Cascade filter: subjects filtered by theme (and category)
  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    if (themeFilter !== 'all') {
      return subjects.filter((s) => s.theme_id === themeFilter);
    }
    if (categoryFilter !== 'all') {
      const themeIds = filteredThemes.map((t) => t.id);
      return subjects.filter((s) => themeIds.includes(s.theme_id));
    }
    return subjects;
  }, [subjects, themeFilter, categoryFilter, filteredThemes]);

  // Reset dependent filters when parent changes
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setThemeFilter('all');
    setSubjectFilter('all');
  };

  const handleThemeChange = (value: string) => {
    setThemeFilter(value);
    setSubjectFilter('all');
  };

  const hasActiveFilters = search || statusFilter !== 'all' || dateFilter !== 'all' || categoryFilter !== 'all' || themeFilter !== 'all' || subjectFilter !== 'all';

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      // Search in title, description, subject, theme, and labels
      if (search) {
        const query = search.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        const matchesSubject = task.subject?.title.toLowerCase().includes(query);
        const matchesTheme = task.theme?.title.toLowerCase().includes(query);
        const matchesLabels = task.labels?.some((label) => label.name.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesSubject && !matchesTheme && !matchesLabels) {
          return false;
        }
      }
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }
      if (dateFilter !== 'all') {
        const label = getDateLabel(task.do_date, task.status);
        if (dateFilter === 'overdue' && label !== 'Overdue') return false;
        if (dateFilter === 'today' && label !== 'Today') return false;
        if (dateFilter === 'tomorrow' && label !== 'Tomorrow') return false;
        if (dateFilter === 'week' && label !== 'This Week') return false;
        if (dateFilter === 'later' && label !== 'Later') return false;
        if (dateFilter === 'no-date' && task.do_date) return false;
      }
      // Category filter (via theme)
      if (categoryFilter !== 'all') {
        const taskTheme = themes?.find((t) => t.id === task.theme?.id);
        if (taskTheme?.category_id !== categoryFilter) return false;
      }
      if (themeFilter !== 'all' && task.theme?.id !== themeFilter) {
        return false;
      }
      if (subjectFilter !== 'all' && task.subject_id !== subjectFilter) {
        return false;
      }
      return true;
    });
  }, [allTasks, search, statusFilter, dateFilter, categoryFilter, themeFilter, subjectFilter, themes]);

  // Sort tasks: done at bottom, then by priority
  const sortTasksWithDoneAtBottom = (tasks: TaskWithRelations[]) => {
    return [...tasks].sort((a, b) => {
      // Done tasks go to bottom
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      // Then by priority (higher first)
      return (b.priority ?? 0) - (a.priority ?? 0);
    });
  };

  // Build hierarchy label for task (Category > Theme > Subject)
  const getHierarchyLabel = (task: TaskWithRelations): string | null => {
    const parts: string[] = [];

    // Only show hierarchy when all filters are "all"
    const showFullHierarchy = categoryFilter === 'all' && themeFilter === 'all' && subjectFilter === 'all';

    if (!showFullHierarchy) {
      // When filtering, just show the subject name if present
      return task.subject?.title || null;
    }

    // Build full hierarchy: Category > Theme > Subject
    if (task.category?.title) {
      parts.push(task.category.title);
    }
    if (task.theme?.title) {
      parts.push(task.theme.title);
    }
    if (task.subject?.title) {
      parts.push(task.subject.title);
    }

    if (parts.length === 0) return 'Inbox';
    return parts.join(' › ');
  };

  // Group tasks based on view mode
  const groupedTasks = useMemo((): TaskGroup[] => {
    if (viewMode === 'all') {
      return [{ title: 'Toutes les tâches', tasks: sortTasksWithDoneAtBottom(filteredTasks) }];
    }

    if (viewMode === 'by-date') {
      const groups: Record<string, TaskWithRelations[]> = {
        'En retard': [],
        "Aujourd'hui": [],
        'Demain': [],
        'Cette semaine': [],
        'Plus tard': [],
        'Sans date': [],
      };

      filteredTasks.forEach((task) => {
        const label = getDateLabel(task.do_date, task.status);
        groups[label].push(task);
      });

      return Object.entries(groups)
        .filter(([, tasks]) => tasks.length > 0)
        .map(([title, tasks]) => ({ title, tasks: sortTasksWithDoneAtBottom(tasks) }));
    }

    if (viewMode === 'by-category') {
      const byCategory: Record<string, { tasks: TaskWithRelations[]; color?: string }> = {
        'Sans catégorie': { tasks: [], color: undefined }
      };

      filteredTasks.forEach((task) => {
        const key = task.category?.title || 'Sans catégorie';
        if (!byCategory[key]) {
          byCategory[key] = {
            tasks: [],
            color: task.category?.color_hex,
          };
        }
        byCategory[key].tasks.push(task);
      });

      return Object.entries(byCategory)
        .filter(([, data]) => data.tasks.length > 0)
        .map(([title, data]) => ({
          title,
          tasks: sortTasksWithDoneAtBottom(data.tasks),
          color: data.color,
        }));
    }

    if (viewMode === 'by-theme') {
      const byTheme: Record<string, { tasks: TaskWithRelations[]; color?: string; categoryName?: string }> = {
        'Sans thème': { tasks: [], color: undefined, categoryName: undefined }
      };

      filteredTasks.forEach((task) => {
        const key = task.theme?.title || 'Sans thème';
        if (!byTheme[key]) {
          byTheme[key] = {
            tasks: [],
            color: task.theme?.color_hex,
            categoryName: task.category?.title,
          };
        }
        byTheme[key].tasks.push(task);
      });

      return Object.entries(byTheme)
        .filter(([, data]) => data.tasks.length > 0)
        .map(([title, data]) => ({
          title: data.categoryName ? `${title} (${data.categoryName})` : title,
          tasks: sortTasksWithDoneAtBottom(data.tasks),
          color: data.color,
        }));
    }

    if (viewMode === 'by-subject') {
      const bySubject: Record<string, { tasks: TaskWithRelations[]; color?: string; themeName?: string }> = {
        'Inbox': { tasks: [], color: undefined, themeName: undefined }
      };

      filteredTasks.forEach((task) => {
        const key = task.subject?.title || 'Inbox';
        if (!bySubject[key]) {
          bySubject[key] = {
            tasks: [],
            color: task.theme?.color_hex,
            themeName: task.theme?.title,
          };
        }
        bySubject[key].tasks.push(task);
      });

      return Object.entries(bySubject)
        .filter(([, data]) => data.tasks.length > 0)
        .map(([title, data]) => ({
          title: data.themeName ? `${title} (${data.themeName})` : title,
          tasks: sortTasksWithDoneAtBottom(data.tasks),
          color: data.color,
        }));
    }

    if (viewMode === 'by-status') {
      const byStatus: Record<TaskStatus, TaskWithRelations[]> = {
        todo: [],
        waiting_for: [],
        done: [],
      };

      filteredTasks.forEach((task) => {
        byStatus[task.status].push(task);
      });

      const statusLabels: Record<TaskStatus, string> = {
        todo: 'À faire',
        waiting_for: 'En attente',
        done: 'Terminées',
      };

      return Object.entries(byStatus)
        .filter(([, tasks]) => tasks.length > 0)
        .map(([status, tasks]) => ({
          title: statusLabels[status as TaskStatus],
          tasks,
        }));
    }

    return [];
  }, [filteredTasks, viewMode]);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: prev[title] === undefined ? false : !prev[title],
    }));
  };

  const isGroupExpanded = (title: string) => {
    return expandedGroups[title] !== false;
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('all');
    setCategoryFilter('all');
    setThemeFilter('all');
    setSubjectFilter('all');
  };

  const todoCount = filteredTasks.filter((t) => t.status === 'todo').length;
  const doneCount = filteredTasks.filter((t) => t.status === 'done').length;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <SkeletonHeader />
        <SkeletonList count={8} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-4 md:p-6 space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ListTodo className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Toutes les tâches</h1>
            <p className="text-sm text-muted-foreground">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'tâche' : 'tâches'}
              {hasActiveFilters && ' (filtrées)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <Circle className="h-3 w-3 text-blue-500 fill-blue-500/20" />
            {todoCount}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {doneCount}
          </Badge>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filters - horizontally scrollable on mobile */}
        <div className="relative">
          <div className="flex gap-2 items-center overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible scrollbar-hide">
          <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
            <Filter className="h-4 w-4" />
          </div>

          {/* View Mode */}
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-[130px] h-9 flex-shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout</SelectItem>
              <SelectItem value="by-date">Par date</SelectItem>
              <SelectItem value="by-category">Par catégorie</SelectItem>
              <SelectItem value="by-theme">Par thème</SelectItem>
              <SelectItem value="by-subject">Par sujet</SelectItem>
              <SelectItem value="by-status">Par statut</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className={`w-[120px] h-9 flex-shrink-0 ${statusFilter !== 'all' ? 'border-primary' : ''}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="todo">À faire</SelectItem>
              <SelectItem value="waiting_for">En attente</SelectItem>
              <SelectItem value="done">Terminées</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className={`w-[120px] h-9 flex-shrink-0 ${dateFilter !== 'all' ? 'border-primary' : ''}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les dates</SelectItem>
              <SelectItem value="overdue">En retard</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="tomorrow">Demain</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="later">Plus tard</SelectItem>
              <SelectItem value="no-date">Sans date</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className={`w-[130px] h-9 flex-shrink-0 ${categoryFilter !== 'all' ? 'border-primary' : ''}`}>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cat.color_hex }}
                    />
                    {cat.title}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Theme Filter (cascade from category) */}
          <Select value={themeFilter} onValueChange={handleThemeChange}>
            <SelectTrigger className={`w-[130px] h-9 flex-shrink-0 ${themeFilter !== 'all' ? 'border-primary' : ''}`}>
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les thèmes</SelectItem>
              {filteredThemes.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: theme.color_hex }}
                    />
                    {theme.title}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Subject Filter (cascade from theme) */}
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className={`w-[150px] h-9 flex-shrink-0 ${subjectFilter !== 'all' ? 'border-primary' : ''}`}>
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sujets</SelectItem>
              {filteredSubjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.title}
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
                className="flex-shrink-0"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1"
                >
                  <X className="h-3 w-3" />
                  Effacer
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
          {/* Fade gradient to hint more content - mobile only */}
          <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
        </div>
      </motion.div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <EmptyState
            type={search ? 'search' : 'success'}
            title={search ? 'Aucune tâche trouvée' : 'Aucune tâche'}
            description={search ? 'Essayez un autre terme de recherche' : 'Créez votre première tâche pour commencer'}
          />
        </motion.div>
      ) : (
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {groupedTasks.map((group) => (
            <motion.div key={group.title} variants={itemVariants}>
              <Collapsible
                open={isGroupExpanded(group.title)}
                onOpenChange={() => toggleGroup(group.title)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <motion.button
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ rotate: isGroupExpanded(group.title) ? 0 : -90 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </motion.div>
                        {group.color && (
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                        )}
                        <span className="font-semibold">{group.title}</span>
                      </div>
                      <Badge variant="secondary" className="font-medium">
                        {group.tasks.length}
                      </Badge>
                    </motion.button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t p-3 space-y-2 bg-muted/30">
                      <AnimatePresence mode="sync">
                        {group.tasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            theme={task.theme}
                            labels={task.labels}
                            showSubject
                            subjectTitle={getHierarchyLabel(task)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Bottom padding for FAB */}
      <div className="h-20 md:h-8" />
    </motion.div>
  );
}
