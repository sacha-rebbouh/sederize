'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Clock,
  Hourglass,
  Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWaitingForTasks } from '@/hooks/use-tasks';
import { TaskCard } from '@/components/tasks/task-card';
import { EmptyState } from '@/components/ui/empty-state';
import { TaskWithRelations, Theme } from '@/types/database';

interface GroupedByTheme {
  theme: Theme | null;
  tasks: TaskWithRelations[];
}

export default function PendingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: waitingTasks = [], isLoading } = useWaitingForTasks();

  // Filter tasks by search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return waitingTasks;

    const query = searchQuery.toLowerCase();
    return waitingTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.waiting_for_note?.toLowerCase().includes(query) ||
        task.subject?.title.toLowerCase().includes(query) ||
        task.theme?.title.toLowerCase().includes(query)
    );
  }, [waitingTasks, searchQuery]);

  // Group tasks by theme
  const groupedTasks = useMemo(() => {
    const groups: Map<string | null, GroupedByTheme> = new Map();

    filteredTasks.forEach((task) => {
      const themeId = task.theme?.id || null;
      if (!groups.has(themeId)) {
        groups.set(themeId, { theme: task.theme || null, tasks: [] });
      }
      groups.get(themeId)!.tasks.push(task);
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (!a.theme) return 1;
      if (!b.theme) return -1;
      return (a.theme.order_index || 0) - (b.theme.order_index || 0);
    });
  }, [filteredTasks]);

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <Hourglass className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold">En Attente</h1>
        </div>
        <p className="text-muted-foreground">
          Tâches en attente d&apos;un retour externe
        </p>
      </motion.div>

      {/* Stats + Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between gap-4"
      >
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{waitingTasks.length}</p>
              <p className="text-xs text-muted-foreground">
                Tâche{waitingTasks.length !== 1 && 's'} en attente
              </p>
            </div>
            {searchQuery && (
              <Badge variant="secondary" className="ml-auto">
                {filteredTasks.length} résultat{filteredTasks.length !== 1 && 's'}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>

      {/* Task List */}
      <ScrollArea className="h-[calc(100vh-300px)]">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-24" />
              </Card>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-2 border-dashed">
              <EmptyState
                type="success"
                title={searchQuery ? 'Aucun résultat' : 'Aucune tâche en attente'}
                description={
                  searchQuery
                    ? 'Aucune tâche ne correspond à votre recherche.'
                    : 'Toutes vos tâches sont prêtes à être exécutées !'
                }
              />
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {groupedTasks.map((group, groupIndex) => (
              <motion.div
                key={group.theme?.id || 'unassigned'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.05 }}
                className="space-y-3"
              >
                {/* Theme Header */}
                <div className="flex items-center gap-2">
                  {group.theme ? (
                    <>
                      <div
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: group.theme.color_hex }}
                      />
                      <h2 className="font-semibold">{group.theme.title}</h2>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <h2 className="font-semibold text-muted-foreground">Sans thème</h2>
                    </>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {group.tasks.length}
                  </Badge>
                </div>

                {/* Tasks */}
                <AnimatePresence mode="popLayout">
                  <div className="space-y-2">
                    {group.tasks.map((task, taskIndex) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: taskIndex * 0.03 }}
                      >
                        <div className="relative">
                          <TaskCard
                            task={task}
                            theme={task.theme}
                            labels={task.labels}
                            showSubject
                            subjectTitle={task.subject?.title}
                          />
                          {/* Waiting note indicator */}
                          {task.waiting_for_note && (
                            <div className="mt-1 ml-10 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Hourglass className="h-3 w-3" />
                              <span className="italic">{task.waiting_for_note}</span>
                              <span className="text-muted-foreground">
                                · {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true, locale: fr })}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Bottom padding */}
      <div className="h-16 md:h-8" />
    </div>
  );
}
