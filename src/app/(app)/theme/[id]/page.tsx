'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Palette,
  FileText,
  Hourglass,
  CheckCircle2,
  Folder,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TaskCard } from '@/components/tasks/task-card';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard, SkeletonHeader } from '@/components/ui/skeleton-card';
import { useTheme } from '@/hooks/use-themes';
import { useThemeTasks } from '@/hooks/use-tasks';
import { useSubjects } from '@/hooks/use-subjects';

interface ThemePageProps {
  params: { id: string };
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function ThemePage({ params }: ThemePageProps) {
  const router = useRouter();
  const { data: theme, isLoading: themeLoading } = useTheme(params.id);
  const { data: tasks } = useThemeTasks(params.id);
  const { data: subjects } = useSubjects(params.id);

  const todoTasks = useMemo(() => tasks?.filter((t) => t.status === 'todo') || [], [tasks]);
  const waitingTasks = useMemo(() => tasks?.filter((t) => t.status === 'waiting_for') || [], [tasks]);
  const doneTasks = useMemo(() => tasks?.filter((t) => t.status === 'done') || [], [tasks]);

  // Group todo tasks by subject
  const tasksBySubject = useMemo(() => {
    const grouped = new Map<string | null, typeof todoTasks>();
    for (const task of todoTasks) {
      const key = task.subject_id;
      const existing = grouped.get(key) || [];
      existing.push(task);
      grouped.set(key, existing);
    }
    return grouped;
  }, [todoTasks]);

  const subjectsMap = useMemo(() => {
    return new Map((subjects || []).map((s) => [s.id, s]));
  }, [subjects]);

  if (themeLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b p-4">
          <div className="max-w-5xl mx-auto">
            <SkeletonHeader />
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <div className="max-w-5xl mx-auto space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (!theme) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center h-full"
      >
        <EmptyState
          type="folder"
          title="Theme introuvable"
          description="Ce theme a peut-etre ete supprime."
          action={
            <Button onClick={() => router.push('/')}>
              Retour au Dashboard
            </Button>
          }
        />
      </motion.div>
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
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b p-4"
      >
        <div className="max-w-5xl mx-auto space-y-3">
          <Breadcrumbs
            items={[
              { label: theme.title, icon: <div className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.color_hex }} /> },
            ]}
            className="hidden md:flex"
          />

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <motion.div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: theme.color_hex + '20' }}
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Palette
                className="h-5 w-5"
                style={{ color: theme.color_hex }}
              />
            </motion.div>

            <div>
              <h1 className="text-xl font-bold">{theme.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{todoTasks.length} taches</span>
                {subjects && subjects.length > 0 && (
                  <span>· {subjects.length} sujets</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* To Do - grouped by subject */}
          <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={itemVariants} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <h2 className="font-semibold">A faire</h2>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                {todoTasks.length}
              </Badge>
            </motion.div>

            {todoTasks.length === 0 ? (
              <motion.div variants={itemVariants}>
                <Card className="border-2 border-dashed p-6">
                  <EmptyState
                    type="folder"
                    title="Aucune tache"
                    description="Ce theme n'a aucune tache active."
                    className="py-4"
                  />
                </Card>
              </motion.div>
            ) : (
              Array.from(tasksBySubject.entries()).map(([subjectId, subjectTasks]) => {
                const subject = subjectId ? subjectsMap.get(subjectId) : null;
                return (
                  <motion.div key={subjectId || 'no-subject'} variants={itemVariants} className="space-y-2">
                    {subjectId && (
                      <button
                        onClick={() => router.push(`/subject/${subjectId}`)}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Folder className="h-3.5 w-3.5" />
                        {subject?.title || 'Sujet inconnu'}
                      </button>
                    )}
                    <AnimatePresence mode="sync">
                      {subjectTasks.map((task) => (
                        <motion.div key={task.id} layout>
                          <TaskCard task={task} theme={theme} labels={task.labels} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </motion.div>

          {/* Waiting For */}
          <AnimatePresence>
            {waitingTasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Hourglass className="h-4 w-4 text-amber-500" />
                  </motion.div>
                  <h2 className="font-semibold text-amber-600">En attente</h2>
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                    {waitingTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <AnimatePresence mode="sync">
                    {waitingTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                      >
                        <TaskCard task={task} theme={theme} labels={task.labels} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Done */}
          <AnimatePresence>
            {doneTasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <h2 className="font-semibold text-muted-foreground">Terminees</h2>
                  <Badge variant="secondary">
                    {doneTasks.length}
                  </Badge>
                </div>
                <motion.div
                  className="space-y-2"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {doneTasks.slice(0, 5).map((task, index) => (
                    <motion.div
                      key={task.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.03 }}
                    >
                      <TaskCard task={task} theme={theme} labels={task.labels} compact />
                    </motion.div>
                  ))}
                  {doneTasks.length > 5 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-muted-foreground text-center py-2"
                    >
                      + {doneTasks.length - 5} taches terminees
                    </motion.p>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-20 md:h-8" />
        </div>
      </div>
    </motion.div>
  );
}
