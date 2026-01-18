'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, Inbox, Check, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useActiveSubjects } from '@/hooks/use-subjects';
import { useThemes } from '@/hooks/use-themes';
import { cn } from '@/lib/utils';

interface SubjectPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export function SubjectPicker({ value, onChange, className }: SubjectPickerProps) {
  const [open, setOpen] = useState(false);
  const { data: subjects, isLoading: subjectsLoading } = useActiveSubjects();
  const { data: themes, isLoading: themesLoading } = useThemes();

  const isLoading = subjectsLoading || themesLoading;

  // Find selected subject details
  const selectedSubject = subjects?.find((s) => s.id === value);
  const selectedTheme = selectedSubject?.theme;

  // Group subjects by theme
  const subjectsByTheme = useMemo(() => {
    if (!subjects || !themes) return [];

    const grouped: { theme: typeof themes[0]; subjects: typeof subjects }[] = [];

    for (const theme of themes) {
      const themeSubjects = subjects.filter((s) => s.theme_id === theme.id);
      if (themeSubjects.length > 0) {
        grouped.push({ theme, subjects: themeSubjects });
      }
    }

    return grouped;
  }, [subjects, themes]);

  const getDisplayLabel = () => {
    if (!value || !selectedSubject) {
      return 'Inbox';
    }
    return selectedSubject.title.length > 12
      ? `${selectedSubject.title.slice(0, 12)}...`
      : selectedSubject.title;
  };

  const handleSelect = (subjectId: string | null) => {
    onChange(subjectId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-auto min-w-[100px] h-9 justify-between transition-all',
            value && 'bg-primary/10 border-primary text-primary',
            className
          )}
        >
          <div className="flex items-center gap-2">
            {selectedTheme ? (
              <div
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedTheme.color_hex }}
              />
            ) : (
              <Inbox className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="truncate">{getDisplayLabel()}</span>
          </div>
          <ChevronRight className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto overscroll-contain p-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Inbox Option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                !value ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
              )}
            >
              <Inbox className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 font-medium">Inbox</span>
              {!value && <Check className="h-4 w-4 flex-shrink-0" />}
            </button>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Empty State */}
            {!isLoading && subjectsByTheme.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FolderOpen className="h-8 w-8 mb-2" />
                <p className="text-sm">Aucun projet</p>
              </div>
            )}

            {/* Subjects grouped by Theme */}
            {!isLoading && subjectsByTheme.map(({ theme, subjects: themeSubjects }) => (
              <div key={theme.id} className="mt-3">
                {/* Theme Header */}
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <div
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: theme.color_hex }}
                  />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {theme.title}
                  </span>
                </div>

                {/* Subjects */}
                {themeSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => handleSelect(subject.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                      value === subject.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                    )}
                  >
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0 opacity-50"
                      style={{ backgroundColor: theme.color_hex }}
                    />
                    <span className="flex-1 truncate">{subject.title}</span>
                    {value === subject.id && <Check className="h-4 w-4 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
