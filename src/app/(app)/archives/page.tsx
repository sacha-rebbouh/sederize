'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Archive,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskCard } from '@/components/tasks/task-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { TaskWithRelations } from '@/types/database';

export default function ArchivesPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

  const { data: completedTasks = [], isLoading } = useQuery({
    queryKey: ['archived-tasks', startDate, endDate],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          subject:subjects(*, theme:themes(*))
        `)
        .eq('status', 'done')
        .gte('completed_at', startDate)
        .lte('completed_at', endDate + 'T23:59:59')
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((task: any) => ({
        ...task,
        theme: task.subject?.theme || null,
      })) as TaskWithRelations[];
    },
  });

  const goToPreviousMonth = () => setSelectedMonth((d) => subMonths(d, 1));
  const goToNextMonth = () => {
    const nextMonth = new Date(selectedMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth);
    }
  };

  // Filter tasks by search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return completedTasks;

    const query = searchQuery.toLowerCase();
    return completedTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.subject?.title.toLowerCase().includes(query) ||
        task.theme?.title.toLowerCase().includes(query)
    );
  }, [completedTasks, searchQuery]);

  // Group tasks by completion date
  const groupedTasks = useMemo(() => {
    const groups: Record<string, TaskWithRelations[]> = {};

    filteredTasks.forEach((task) => {
      if (task.completed_at) {
        const dateKey = format(new Date(task.completed_at), 'yyyy-MM-dd');
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(task);
      }
    });

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, tasks]) => ({
        date,
        dateLabel: format(new Date(date), 'EEEE d MMMM', { locale: fr }),
        tasks,
      }));
  }, [filteredTasks]);

  const isCurrentMonth =
    selectedMonth.getMonth() === new Date().getMonth() &&
    selectedMonth.getFullYear() === new Date().getFullYear();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pt-6 md:pt-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Archive className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Archives</h1>
        </div>
        <p className="text-muted-foreground">
          Retrouvez vos tâches complétées
        </p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-medium capitalize min-w-[160px] text-center">
            {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedTasks.length}</p>
              <p className="text-xs text-muted-foreground">
                Tâches complétées ce mois
              </p>
            </div>
          </div>
          {searchQuery && (
            <Badge variant="secondary">
              {filteredTasks.length} résultat{filteredTasks.length !== 1 && 's'}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Task List */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-20" />
              </Card>
            ))}
          </div>
        ) : groupedTasks.length > 0 ? (
          <div className="space-y-6">
            {groupedTasks.map((group) => (
              <div key={group.date} className="space-y-2">
                {/* Date Header */}
                <div className="flex items-center gap-2 px-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground capitalize">
                    {group.dateLabel}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {group.tasks.length}
                  </Badge>
                </div>

                {/* Tasks */}
                <div className="space-y-2">
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-2 border-dashed">
            <EmptyState
              type="success"
              title={searchQuery ? 'Aucun résultat' : 'Aucune archive'}
              description={
                searchQuery
                  ? 'Aucune tâche ne correspond à votre recherche.'
                  : 'Aucune tâche complétée ce mois-ci.'
              }
            />
          </Card>
        )}
      </ScrollArea>

      {/* Bottom padding */}
      <div className="h-16 md:h-8" />
    </div>
  );
}
