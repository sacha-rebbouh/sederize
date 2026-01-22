'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Inbox,
  LayoutDashboard,
  Kanban,
  Folder,
  FileText,
  Plus,
  Settings,
  StickyNote,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useThemes } from '@/hooks/use-themes';
import { useActiveSubjects } from '@/hooks/use-subjects';
import { useAllTasks } from '@/hooks/use-tasks';
import { matchesSearch } from '@/lib/utils';

interface CommandPaletteProps {
  onCreateTask?: () => void;
  onCreateTheme?: () => void;
  onCreateSubject?: () => void;
}

export function CommandPalette({
  onCreateTask,
  onCreateTheme,
  onCreateSubject,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  // DEFERRED QUERIES: Only fetch when dialog is open
  // This eliminates 3 unnecessary API calls on every page load
  const { data: themes } = useThemes({ enabled: open });
  const { data: subjects } = useActiveSubjects({ enabled: open });
  const { data: tasks } = useAllTasks({ enabled: open });

  // Keyboard shortcuts - simplified to single keys
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Skip if typing in an input
      const isTyping =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      // Cmd+K or Ctrl+K to open (always works)
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
        return;
      }

      // Skip other shortcuts if typing
      if (isTyping) return;

      // Single-key shortcuts (no modifier required)
      switch (e.key.toLowerCase()) {
        case 'c':
          // "C" to create task
          e.preventDefault();
          onCreateTask?.();
          break;
        case 'd':
          // "D" for Daily Brief
          e.preventDefault();
          router.push('/');
          break;
        case 'i':
          // "I" for Inbox
          e.preventDefault();
          router.push('/inbox');
          break;
        case 'l':
          // "L" for caLendar
          e.preventDefault();
          router.push('/calendar');
          break;
        case 'b':
          // "B" for kanBan
          e.preventDefault();
          router.push('/kanban');
          break;
        case 't':
          // "T" for Tasks
          e.preventDefault();
          router.push('/tasks');
          break;
        case 'p':
          // "P" for Pending
          e.preventDefault();
          router.push('/pending');
          break;
        case 'a':
          // "A" for Archives
          e.preventDefault();
          router.push('/archives');
          break;
      }
    };

    document.addEventListener('keydown', down);
    return () => {
      document.removeEventListener('keydown', down);
    };
  }, [onCreateTask, router]);

  const navigate = useCallback(
    (path: string) => {
      router.push(path);
      setOpen(false);
      setSearch('');
    },
    [router]
  );

  const handleAction = useCallback(
    (action: () => void) => {
      action();
      setOpen(false);
      setSearch('');
    },
    []
  );

  // Search in scratchpads (accent-insensitive)
  const scratchpadResults = useMemo(() => {
    if (!search || search.length < 2 || !subjects) return [];

    return subjects
      .filter((s) => s.scratchpad && matchesSearch(s.scratchpad, search))
      .slice(0, 5);
  }, [search, subjects]);

  // Filter tasks by search (accent-insensitive, multi-field)
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (!search) return tasks.slice(0, 8);

    return tasks
      .filter((t) =>
        // Search in task fields
        matchesSearch(t.title, search) ||
        matchesSearch(t.description, search) ||
        // Search in related subject/theme names
        matchesSearch(t.subject?.title, search) ||
        matchesSearch(t.theme?.title, search) ||
        // Search in waiting for note
        matchesSearch(t.waiting_for_note, search)
      )
      .slice(0, 15);
  }, [search, tasks]);

  // Filter subjects by search (accent-insensitive, multi-field)
  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    if (!search) return subjects.slice(0, 10);

    return subjects
      .filter((s) =>
        matchesSearch(s.title, search) ||
        matchesSearch(s.description, search) ||
        // Search in parent theme name
        matchesSearch(s.theme?.title, search)
      )
      .slice(0, 10);
  }, [search, subjects]);

  // Filter themes by search (accent-insensitive)
  const filteredThemes = useMemo(() => {
    if (!themes) return [];
    if (!search) return themes;

    return themes.filter((t) => matchesSearch(t.title, search));
  }, [search, themes]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Rechercher tâches, projets, notes..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Aucun resultat.</CommandEmpty>

        {/* Actions */}
        <CommandGroup heading="Actions">
          {onCreateTask && (
            <CommandItem onSelect={() => handleAction(onCreateTask)}>
              <Plus className="mr-2 h-4 w-4" />
              Creer une tache
              <CommandShortcut>C</CommandShortcut>
            </CommandItem>
          )}
          {onCreateTheme && (
            <CommandItem onSelect={() => handleAction(onCreateTheme)}>
              <Plus className="mr-2 h-4 w-4" />
              Creer un theme
            </CommandItem>
          )}
          {onCreateSubject && (
            <CommandItem onSelect={() => handleAction(onCreateSubject)}>
              <Plus className="mr-2 h-4 w-4" />
              Creer un sujet
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate('/')}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Brief du jour
          </CommandItem>
          <CommandItem onSelect={() => navigate('/inbox')}>
            <Inbox className="mr-2 h-4 w-4" />
            Boite de reception
          </CommandItem>
          <CommandItem onSelect={() => navigate('/calendar')}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Calendrier
          </CommandItem>
          <CommandItem onSelect={() => navigate('/kanban')}>
            <Kanban className="mr-2 h-4 w-4" />
            Kanban
          </CommandItem>
          <CommandItem onSelect={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Parametres
          </CommandItem>
        </CommandGroup>

        {/* Themes - Quick Go */}
        {filteredThemes && filteredThemes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Themes">
              {filteredThemes.map((theme) => (
                <CommandItem
                  key={theme.id}
                  onSelect={() => {
                    // Navigate to first subject in theme, or just close
                    const firstSubject = subjects?.find(
                      (s) => s.theme_id === theme.id
                    );
                    if (firstSubject) {
                      navigate(`/subject/${firstSubject.id}`);
                    } else {
                      setOpen(false);
                    }
                  }}
                >
                  <div
                    className="mr-2 h-3 w-3 rounded-sm"
                    style={{ backgroundColor: theme.color_hex }}
                  />
                  <span>Aller a {theme.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        {/* Subjects */}
        {filteredSubjects.length > 0 && (
          <CommandGroup heading="Sujets">
            {filteredSubjects.map((subject) => (
              <CommandItem
                key={subject.id}
                onSelect={() => navigate(`/subject/${subject.id}`)}
              >
                <div className="flex items-center gap-2">
                  {subject.theme && (
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: subject.theme.color_hex }}
                    />
                  )}
                  <Folder className="h-4 w-4" />
                  <span>{subject.title}</span>
                  {subject.theme && (
                    <span className="text-xs text-muted-foreground">
                      dans {subject.theme.title}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Scratchpad Results */}
        {scratchpadResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Trouve dans les notes">
              {scratchpadResults.map((subject) => (
                <CommandItem
                  key={`scratchpad-${subject.id}`}
                  onSelect={() => navigate(`/subject/${subject.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-amber-500" />
                    <span>{subject.title}</span>
                    <span className="text-xs text-muted-foreground">
                      - trouve dans les notes
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        {/* Tasks */}
        {filteredTasks.length > 0 && (
          <CommandGroup heading={search ? 'Taches correspondantes' : 'Taches recentes'}>
            {filteredTasks.map((task) => (
              <CommandItem
                key={task.id}
                onSelect={() => {
                  if (task.subject_id) {
                    navigate(`/subject/${task.subject_id}`);
                  } else {
                    navigate('/inbox');
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {task.theme && (
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: task.theme.color_hex }}
                    />
                  )}
                  <FileText className="h-4 w-4" />
                  <span className="truncate">{task.title}</span>
                  {task.subject?.title && (
                    <span className="text-xs text-muted-foreground">
                      dans {task.subject.title}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
