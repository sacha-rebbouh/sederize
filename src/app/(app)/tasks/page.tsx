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
import { TaskWithRelations, TaskStatus } from '@/types/database';

type ViewMode = 'all' | 'by-date' | 'by-subject' | 'by-status';
type DateFilter = 'all' | 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'no-date';
type StatusFilter = 'all' | 'todo' | 'waiting_for' | 'done';

interface TaskGroup {
  title: string;
  tasks: TaskWithRelations[];
  color?: string;
}

function getDateLabel(date: string | null): string {
  if (!date) return 'No Date';
  const d = new Date(date);
  if (isPast(d) && !isToday(d)) return 'Overdue';
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  const nextWeek = addDays(new Date(), 7);
  if (d <= nextWeek) return 'This Week';
  return 'Later';
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
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const { data: allTasks = [], isLoading } = useAllTasksUnlimited();
  const { data: themes } = useThemes();
  const { data: subjects } = useActiveSubjects();

  const hasActiveFilters = search || statusFilter !== 'all' || dateFilter !== 'all' || themeFilter !== 'all' || subjectFilter !== 'all';

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }
      if (dateFilter !== 'all') {
        const label = getDateLabel(task.do_date);
        if (dateFilter === 'overdue' && label !== 'Overdue') return false;
        if (dateFilter === 'today' && label !== 'Today') return false;
        if (dateFilter === 'tomorrow' && label !== 'Tomorrow') return false;
        if (dateFilter === 'week' && label !== 'This Week') return false;
        if (dateFilter === 'later' && label !== 'Later') return false;
        if (dateFilter === 'no-date' && task.do_date) return false;
      }
      if (themeFilter !== 'all' && task.theme?.id !== themeFilter) {
        return false;
      }
      if (subjectFilter !== 'all' && task.subject_id !== subjectFilter) {
        return false;
      }
      return true;
    });
  }, [allTasks, search, statusFilter, dateFilter, themeFilter, subjectFilter]);

  // Group tasks based on view mode
  const groupedTasks = useMemo((): TaskGroup[] => {
    if (viewMode === 'all') {
      return [{ title: 'All Tasks', tasks: filteredTasks }];
    }

    if (viewMode === 'by-date') {
      const groups: Record<string, TaskWithRelations[]> = {
        'Overdue': [],
        'Today': [],
        'Tomorrow': [],
        'This Week': [],
        'Later': [],
        'No Date': [],
      };

      filteredTasks.forEach((task) => {
        const label = getDateLabel(task.do_date);
        groups[label].push(task);
      });

      return Object.entries(groups)
        .filter(([, tasks]) => tasks.length > 0)
        .map(([title, tasks]) => ({ title, tasks }));
    }

    if (viewMode === 'by-subject') {
      const bySubject: Record<string, TaskWithRelations[]> = { 'Inbox': [] };

      filteredTasks.forEach((task) => {
        const key = task.subject?.title || 'Inbox';
        if (!bySubject[key]) bySubject[key] = [];
        bySubject[key].push(task);
      });

      return Object.entries(bySubject)
        .filter(([, tasks]) => tasks.length > 0)
        .map(([title, tasks]) => ({
          title,
          tasks,
          color: tasks[0]?.theme?.color_hex,
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
        todo: 'To Do',
        waiting_for: 'Waiting For',
        done: 'Done',
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">All Tasks</h1>
            <p className="text-sm text-muted-foreground">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
              {hasActiveFilters && ' (filtered)'}
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
            placeholder="Search tasks..."
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

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
          </div>

          {/* View Mode */}
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="by-date">By Date</SelectItem>
              <SelectItem value="by-subject">By Subject</SelectItem>
              <SelectItem value="by-status">By Status</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className={`w-[120px] h-9 ${statusFilter !== 'all' ? 'border-primary' : ''}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="waiting_for">Waiting</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className={`w-[120px] h-9 ${dateFilter !== 'all' ? 'border-primary' : ''}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="later">Later</SelectItem>
              <SelectItem value="no-date">No Date</SelectItem>
            </SelectContent>
          </Select>

          {/* Theme Filter */}
          <Select value={themeFilter} onValueChange={setThemeFilter}>
            <SelectTrigger className={`w-[130px] h-9 ${themeFilter !== 'all' ? 'border-primary' : ''}`}>
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Themes</SelectItem>
              {themes?.map((theme) => (
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

          {/* Subject Filter */}
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className={`w-[150px] h-9 ${subjectFilter !== 'all' ? 'border-primary' : ''}`}>
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects?.map((subject) => (
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
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
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
            title={search ? 'No tasks found' : 'No tasks yet'}
            description={search ? 'Try a different search term' : 'Create your first task to get started'}
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
                      <AnimatePresence mode="popLayout">
                        {group.tasks.map((task) => (
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
