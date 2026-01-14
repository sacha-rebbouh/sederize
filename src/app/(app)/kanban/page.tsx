'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import {
  ThemeSubjectFilter,
  FilterState,
  filterTasksByThemeAndSubject,
} from '@/components/filters/theme-subject-filter';
import { useKanbanTasks, useUpdateTask } from '@/hooks/use-tasks';
import { TaskStatus, TaskWithRelations } from '@/types/database';
import { cn } from '@/lib/utils';

interface KanbanColumn {
  id: TaskStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const columns: KanbanColumn[] = [
  {
    id: 'todo',
    title: 'To Do',
    icon: <Circle className="h-4 w-4" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'waiting_for',
    title: 'Waiting For',
    icon: <Hourglass className="h-4 w-4" />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'done',
    title: 'Done',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
];

// Sortable Task Card with better visuals
function SortableTaskCard({ task }: { task: TaskWithRelations }) {
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

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'group p-3 rounded-xl border bg-card cursor-grab active:cursor-grabbing',
        'hover:shadow-md hover:border-primary/20 transition-all duration-200',
        isDragging && 'shadow-xl ring-2 ring-primary/20'
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div
          {...listeners}
          className="mt-0.5 opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity cursor-grab"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Theme indicator */}
        {task.theme && (
          <div
            className="h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: task.theme.color_hex }}
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

          {task.subject && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {task.subject.title}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {task.do_date && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {new Date(task.do_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
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
                {task.priority === 2 ? 'High' : 'Medium'}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 min-w-[300px] max-w-[400px]"
    >
      <Card
        className={cn(
          'h-full flex flex-col transition-all duration-200',
          isOver && 'ring-2 ring-primary shadow-lg'
        )}
      >
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-base flex items-center gap-2">
            <motion.div
              className={cn('p-1.5 rounded-lg', column.bgColor)}
              whileHover={{ scale: 1.1 }}
            >
              <span className={column.color}>{column.icon}</span>
            </motion.div>
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
          <ScrollArea className="h-[calc(100vh-280px)]">
            <SortableContext
              items={tasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 pr-2 min-h-[100px] pb-4">
                <AnimatePresence mode="popLayout">
                  {tasks.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        'text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-xl',
                        'transition-colors duration-200',
                        isOver && 'border-primary bg-primary/5 text-primary'
                      )}
                    >
                      {isOver ? 'Drop here' : 'No tasks'}
                    </motion.div>
                  ) : (
                    tasks.map((task) => (
                      <SortableTaskCard key={task.id} task={task} />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </SortableContext>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function KanbanPage() {
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [filter, setFilter] = useState<FilterState>({ themeIds: [], subjectIds: [] });

  const { data: allTasks = [], isLoading } = useKanbanTasks();
  const updateTask = useUpdateTask();

  const hasFilters = filter.themeIds.length > 0 || filter.subjectIds.length > 0;

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

  const tasksByStatus = useMemo(() => {
    return {
      todo: filteredTasks.filter((t) => t.status === 'todo'),
      waiting_for: filteredTasks.filter((t) => t.status === 'waiting_for'),
      done: filteredTasks.filter((t) => t.status === 'done'),
    };
  }, [filteredTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = filteredTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = filteredTasks.find((t) => t.id === taskId);
    if (!task) return;

    let targetStatus: TaskStatus | null = null;

    if (['todo', 'waiting_for', 'done'].includes(over.id as string)) {
      targetStatus = over.id as TaskStatus;
    } else {
      const targetTask = filteredTasks.find((t) => t.id === over.id);
      if (targetTask) targetStatus = targetTask.status;
    }

    if (targetStatus && targetStatus !== task.status) {
      updateTask.mutate({
        id: taskId,
        status: targetStatus,
        waiting_for_note: targetStatus === 'waiting_for' ? 'Pending' : null,
      });
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 md:p-6 pb-4 space-y-4 flex-shrink-0"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
            >
              <KanbanIcon className="h-5 w-5 text-primary" />
            </motion.div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Kanban</h1>
              <p className="text-sm text-muted-foreground">
                {filteredTasks.length} tasks {hasFilters && '(filtered)'}
              </p>
            </div>
          </div>

          {/* Filter */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ThemeSubjectFilter value={filter} onChange={setFilter} />
          </motion.div>
        </div>
      </motion.div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto px-4 md:px-6 pb-6 min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {columns.map((column, i) => (
              <motion.div
                key={column.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex-1 min-w-[300px] max-w-[400px]"
              >
                <DroppableColumn
                  column={column}
                  tasks={tasksByStatus[column.id]}
                />
              </motion.div>
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <motion.div
                initial={{ scale: 1, rotate: 0 }}
                animate={{ scale: 1.05, rotate: 2 }}
                className="p-3 rounded-xl border bg-card shadow-2xl w-[300px]"
              >
                <div className="flex items-start gap-2">
                  {activeTask.theme && (
                    <div
                      className="h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: activeTask.theme.color_hex }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activeTask.title}</p>
                    {activeTask.subject && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeTask.subject.title}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </motion.div>
  );
}
