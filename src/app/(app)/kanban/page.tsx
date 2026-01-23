'use client';

import { useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { isToday, isTomorrow, isPast, addDays, startOfDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Kanban as KanbanIcon,
  CheckCircle,
  Circle,
  Hourglass,
  GripVertical,
  CalendarDays,
  Clock,
  CalendarClock,
  CalendarX,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ThemeSubjectFilter,
  FilterState,
  filterTasksByThemeAndSubject,
} from '@/components/filters/theme-subject-filter';
import { useKanbanTasks, useUpdateTask } from '@/hooks/use-tasks';
import { TaskStatus, TaskWithRelations } from '@/types/database';
import { cn } from '@/lib/utils';

type ViewMode = 'all-status' | 'todo-by-date' | 'waiting' | 'done';

interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

// Columns for status view (original)
const statusColumns: KanbanColumn[] = [
  {
    id: 'todo',
    title: 'A faire',
    icon: <Circle className="h-4 w-4" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'waiting_for',
    title: 'En attente',
    icon: <Hourglass className="h-4 w-4" />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'done',
    title: 'Termine',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
];

// Columns for to-do by date view
const dateColumns: KanbanColumn[] = [
  {
    id: 'overdue',
    title: 'En retard',
    icon: <CalendarX className="h-4 w-4" />,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    id: 'today',
    title: 'Aujourd\'hui',
    icon: <CalendarDays className="h-4 w-4" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'tomorrow',
    title: 'Demain',
    icon: <CalendarClock className="h-4 w-4" />,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'this-week',
    title: 'Cette semaine',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    id: 'later',
    title: 'Plus tard',
    icon: <CalendarDays className="h-4 w-4" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  },
  {
    id: 'no-date',
    title: 'Sans date',
    icon: <Circle className="h-4 w-4" />,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
];

// Helper to categorize task by date
function getDateCategory(doDate: string | null): string {
  if (!doDate) return 'no-date';
  const date = startOfDay(new Date(doDate));
  const today = startOfDay(new Date());
  if (isPast(date) && !isToday(date)) return 'overdue';
  if (isToday(date)) return 'today';
  if (isTomorrow(date)) return 'tomorrow';
  const nextWeek = addDays(today, 7);
  if (date <= nextWeek) return 'this-week';
  return 'later';
}

// View mode options
const viewModes = [
  { id: 'all-status' as ViewMode, label: 'Tous les statuts', icon: <Layers className="h-4 w-4" /> },
  { id: 'todo-by-date' as ViewMode, label: 'A faire', icon: <CalendarDays className="h-4 w-4" /> },
  { id: 'waiting' as ViewMode, label: 'En attente', icon: <Hourglass className="h-4 w-4" /> },
  { id: 'done' as ViewMode, label: 'Termine', icon: <CheckCircle className="h-4 w-4" /> },
];

// Build hierarchy label: Category › Theme › Subject
function getHierarchyLabel(task: TaskWithRelations): string | null {
  const parts: string[] = [];
  if (task.category?.title) parts.push(task.category.title);
  if (task.theme?.title) parts.push(task.theme.title);
  if (task.subject?.title) parts.push(task.subject.title);
  return parts.length > 0 ? parts.join(' › ') : null;
}

// Lazy load TaskFocusDialog
const TaskFocusDialog = dynamic(
  () => import('@/components/tasks/task-focus-dialog').then((m) => m.TaskFocusDialog),
  { ssr: false }
);

// Sortable Task Card with better visuals
function SortableTaskCard({ task }: { task: TaskWithRelations }) {
  const [focusOpen, setFocusOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hierarchyLabel = getHierarchyLabel(task);

  // Get stable color for the indicator (use category color if available, else theme)
  const indicatorColor = task.category?.color_hex || task.theme?.color_hex;

  const handleClick = (e: React.MouseEvent) => {
    // Only open modal if not dragging (distance < 5px)
    if (!isDragging) {
      e.stopPropagation();
      setFocusOpen(true);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          opacity: isDragging ? 0.5 : 1,
        }}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className={cn(
          'group p-3 rounded-xl border bg-card cursor-grab active:cursor-grabbing',
          'hover:shadow-md hover:border-primary/20 transition-all duration-200',
          isDragging && 'shadow-xl ring-2 ring-primary/20'
        )}
      >
        <div className="flex items-start gap-2">
          {/* Drag indicator */}
          <div className="mt-0.5 opacity-0 group-hover:opacity-50 transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Theme/Category indicator - use stable color */}
          {indicatorColor && (
            <div
              className="h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: indicatorColor }}
            />
          )}

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-sm font-medium leading-snug',
                task.status === 'done' && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </p>

            {/* Hierarchy: Category › Theme › Subject */}
            {hierarchyLabel && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {hierarchyLabel}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {task.do_date && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {new Date(task.do_date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              )}

              {task.status === 'waiting_for' && task.waiting_for_note && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 truncate max-w-[120px]">
                  {task.waiting_for_note}
                </span>
              )}

              {(task.priority ?? 0) > 0 && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-medium',
                    task.priority === 2
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  )}
                >
                  {task.priority === 2 ? 'Haute' : 'Moyenne'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Focus Dialog */}
      {focusOpen && (
        <TaskFocusDialog
          task={task}
          open={focusOpen}
          onOpenChange={setFocusOpen}
        />
      )}
    </>
  );
}

// Droppable Column with animations
function DroppableColumn({
  column,
  tasks,
}: {
  column: KanbanColumn;
  tasks: TaskWithRelations[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex-1 min-w-[300px] max-w-[400px]">
      <Card
        className={cn(
          'h-full flex flex-col transition-all duration-200',
          isOver && 'ring-2 ring-primary shadow-lg'
        )}
      >
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-base flex items-center gap-2">
            <div className={cn('p-1.5 rounded-lg', column.bgColor)}>
              <span className={column.color}>{column.icon}</span>
            </div>
            <span>{column.title}</span>
            <Badge
              variant="secondary"
              className={cn('ml-auto font-medium', tasks.length > 0 && column.bgColor)}
            >
              {tasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 pt-0 min-h-0" ref={setNodeRef}>
          <ScrollArea className="h-[calc(100vh-280px)] md:h-[calc(100vh-280px)]">
            <SortableContext
              items={tasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 pr-2 min-h-[100px] pb-24 md:pb-4">
                {tasks.length === 0 ? (
                  <div
                    className={cn(
                      'text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-xl',
                      'transition-colors duration-200',
                      isOver && 'border-primary bg-primary/5 text-primary'
                    )}
                  >
                    {isOver ? 'Deposer ici' : 'Aucune tache'}
                  </div>
                ) : (
                  tasks.map((task) => (
                    <SortableTaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </SortableContext>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Date picker dialog for date column changes
interface DatePickerState {
  isOpen: boolean;
  taskId: string | null;
  targetColumn: string | null;
}

export default function KanbanPage() {
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [filter, setFilter] = useState<FilterState>({ categoryIds: [], themeIds: [], subjectIds: [] });
  const [viewMode, setViewMode] = useState<ViewMode>('todo-by-date');
  const [mobileColumnIndex, setMobileColumnIndex] = useState(0);
  const [datePicker, setDatePicker] = useState<DatePickerState>({
    isOpen: false,
    taskId: null,
    targetColumn: null,
  });

  const { data: allTasks = [], isLoading } = useKanbanTasks();
  const updateTask = useUpdateTask();

  const hasFilters = (filter.categoryIds?.length || 0) > 0 || (filter.themeIds?.length || 0) > 0 || (filter.subjectIds?.length || 0) > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredTasks = useMemo(() => {
    return filterTasksByThemeAndSubject(allTasks, filter);
  }, [allTasks, filter]);

  // Get columns and tasks based on view mode
  const { columns, tasksByColumn, visibleTasks } = useMemo(() => {
    let cols: KanbanColumn[];
    const byColumn: Record<string, TaskWithRelations[]> = {};
    let tasks: TaskWithRelations[];

    // Sort tasks by date (chronological), then by priority
    const sortByDateAndPriority = (taskList: TaskWithRelations[]) => {
      return [...taskList].sort((a, b) => {
        // First sort by date (ascending, nulls last)
        if (a.do_date && b.do_date) {
          const dateCompare = a.do_date.localeCompare(b.do_date);
          if (dateCompare !== 0) return dateCompare;
        }
        if (a.do_date && !b.do_date) return -1;
        if (!a.do_date && b.do_date) return 1;
        // Then by priority (descending)
        return (b.priority ?? 0) - (a.priority ?? 0);
      });
    };

    switch (viewMode) {
      case 'all-status':
        cols = statusColumns;
        tasks = filteredTasks;
        cols.forEach((col) => {
          byColumn[col.id] = sortByDateAndPriority(tasks.filter((t) => t.status === col.id));
        });
        break;

      case 'todo-by-date':
        cols = dateColumns;
        tasks = filteredTasks.filter((t) => t.status === 'todo');
        cols.forEach((col) => {
          byColumn[col.id] = sortByDateAndPriority(tasks.filter((t) => getDateCategory(t.do_date) === col.id));
        });
        break;

      case 'waiting':
        cols = [{
          id: 'waiting_for',
          title: 'En attente',
          icon: <Hourglass className="h-4 w-4" />,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
        }];
        tasks = filteredTasks.filter((t) => t.status === 'waiting_for');
        byColumn['waiting_for'] = sortByDateAndPriority(tasks);
        break;

      case 'done':
        cols = [{
          id: 'done',
          title: 'Termine',
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
        }];
        tasks = filteredTasks.filter((t) => t.status === 'done');
        byColumn['done'] = sortByDateAndPriority(tasks);
        break;

      default:
        cols = statusColumns;
        tasks = filteredTasks;
        cols.forEach((col) => {
          byColumn[col.id] = sortByDateAndPriority(tasks.filter((t) => t.status === col.id));
        });
    }

    return { columns: cols, tasksByColumn: byColumn, visibleTasks: tasks };
  }, [filteredTasks, viewMode]);

  // Reset mobile column index when view mode or columns change
  const columnsLength = columns.length;
  useMemo(() => {
    if (mobileColumnIndex >= columnsLength) {
      setMobileColumnIndex(0);
    }
  }, [columnsLength, mobileColumnIndex]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = visibleTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  // Get the target date for a column (for quick moves like today/tomorrow)
  const getDateForColumn = useCallback((columnId: string): Date | null => {
    const today = startOfDay(new Date());
    switch (columnId) {
      case 'overdue':
      case 'today':
        return today;
      case 'tomorrow':
        return addDays(today, 1);
      default:
        return null; // this-week, later, no-date need picker
    }
  }, []);

  // Handle date selection from the picker dialog
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date && datePicker.taskId) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      updateTask.mutate(
        { id: datePicker.taskId, do_date: formattedDate },
        {
          onSuccess: () => {
            toast.success(`Date mise à jour: ${format(date, 'EEEE d MMMM', { locale: fr })}`);
          },
        }
      );
    }
    setDatePicker({ isOpen: false, taskId: null, targetColumn: null });
  }, [datePicker.taskId, updateTask]);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = visibleTasks.find((t) => t.id === taskId);
    if (!task) return;

    // Handle status changes in 'all-status' mode
    if (viewMode === 'all-status') {
      let targetStatus: TaskStatus | null = null;

      if (['todo', 'waiting_for', 'done'].includes(over.id as string)) {
        targetStatus = over.id as TaskStatus;
      } else {
        const targetTask = visibleTasks.find((t) => t.id === over.id);
        if (targetTask) targetStatus = targetTask.status;
      }

      if (targetStatus && targetStatus !== task.status) {
        updateTask.mutate({
          id: taskId,
          status: targetStatus,
          waiting_for_note: targetStatus === 'waiting_for' ? 'Pending' : null,
        });
      }
      return;
    }

    // Handle date changes in 'todo-by-date' mode
    if (viewMode === 'todo-by-date') {
      // Determine target column
      let targetColumnId = over.id as string;

      // If dropped on a task, find its column
      if (!dateColumns.some((col) => col.id === targetColumnId)) {
        const targetTask = visibleTasks.find((t) => t.id === over.id);
        if (targetTask) {
          targetColumnId = getDateCategory(targetTask.do_date);
        }
      }

      // Get current column of the task
      const currentColumnId = getDateCategory(task.do_date);

      // Don't do anything if same column
      if (targetColumnId === currentColumnId) return;

      // Check if we can set date directly (today, tomorrow) or need picker
      const quickDate = getDateForColumn(targetColumnId);

      if (quickDate) {
        // Direct update for today/tomorrow/overdue
        updateTask.mutate(
          { id: taskId, do_date: format(quickDate, 'yyyy-MM-dd') },
          {
            onSuccess: () => {
              toast.success(`Date: ${format(quickDate, 'EEEE d MMMM', { locale: fr })}`);
            },
          }
        );
      } else if (targetColumnId === 'no-date') {
        // Moving to no-date clears the date
        updateTask.mutate(
          { id: taskId, do_date: null },
          {
            onSuccess: () => {
              toast.success('Date supprimée');
            },
          }
        );
      } else {
        // For this-week and later, show date picker
        setDatePicker({
          isOpen: true,
          taskId: taskId,
          targetColumn: targetColumnId,
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-4 md:p-6">
        <div className="h-10 w-48 bg-muted rounded-lg animate-pulse mb-6" />
        <div className="flex gap-4 flex-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 min-w-[300px] max-w-[400px]">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <SkeletonCard key={j} />
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 pb-4 space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <KanbanIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Kanban</h1>
              <p className="text-sm text-muted-foreground">
                {visibleTasks.length} taches {hasFilters && '(filtrees)'}
              </p>
            </div>
          </div>

          {/* Filter */}
          <div>
            <ThemeSubjectFilter value={filter} onChange={setFilter} />
          </div>
        </div>

        {/* View Mode Selector - compact on mobile */}
        <div className="flex items-center gap-1.5 justify-center">
          {viewModes.map((mode) => (
            <Button
              key={mode.id}
              variant={viewMode === mode.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(mode.id)}
              className="gap-1 px-2 md:px-3 h-8 text-xs"
            >
              {mode.icon}
              <span className="hidden sm:inline">{mode.label}</span>
              <span className="sm:hidden">
                {mode.id === 'all-status' ? 'All' : mode.id === 'todo-by-date' ? 'Todo' : mode.label}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Mobile: Column Tabs + Single Column */}
        <div className="md:hidden flex-1 flex flex-col min-h-0 px-4 pb-20">
          {/* Column Tabs */}
          <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-hide pb-1">
            {columns.map((column, i) => (
              <button
                key={column.id}
                onClick={() => setMobileColumnIndex(i)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0',
                  mobileColumnIndex === i
                    ? `${column.bgColor} ${column.color}`
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {column.icon}
                {column.title}
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {(tasksByColumn[column.id] || []).length}
                </Badge>
              </button>
            ))}
          </div>

          {/* Single Column Content */}
          {columns[mobileColumnIndex] && (
            <div className="flex-1 min-h-0">
              <DroppableColumn
                column={columns[mobileColumnIndex]}
                tasks={tasksByColumn[columns[mobileColumnIndex].id] || []}
              />
            </div>
          )}
        </div>

        {/* Desktop: Horizontal Scroll */}
        <div className="hidden md:block flex-1 overflow-x-auto px-6 pb-6 min-h-0">
          <div className="flex gap-4 h-full min-w-max">
            {columns.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                tasks={tasksByColumn[column.id] || []}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <div
              className="p-3 rounded-xl border bg-card shadow-2xl w-[300px] scale-105 rotate-1"
            >
              <div className="flex items-start gap-2">
                {(activeTask.category?.color_hex || activeTask.theme?.color_hex) && (
                  <div
                    className="h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: activeTask.category?.color_hex || activeTask.theme?.color_hex }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activeTask.title}</p>
                  {getHierarchyLabel(activeTask) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getHierarchyLabel(activeTask)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Date Picker Dialog */}
      <Dialog
        open={datePicker.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDatePicker({ isOpen: false, taskId: null, targetColumn: null });
          }
        }}
      >
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Choisir une date</DialogTitle>
            <DialogDescription>
              {datePicker.targetColumn === 'this-week'
                ? 'Sélectionnez une date cette semaine'
                : 'Sélectionnez une date'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <Calendar
              mode="single"
              selected={undefined}
              onSelect={handleDateSelect}
              disabled={(date) => date < startOfDay(new Date())}
              initialFocus
            />
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDatePicker({ isOpen: false, taskId: null, targetColumn: null })}
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
