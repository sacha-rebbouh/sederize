'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  ChevronDown,
  Check,
  X,
  Folder,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useThemes } from '@/hooks/use-themes';
import { useActiveSubjects } from '@/hooks/use-subjects';
import { cn } from '@/lib/utils';

export interface FilterState {
  themeIds: string[];
  subjectIds: string[];
}

interface ThemeSubjectFilterProps {
  value: FilterState;
  onChange: (value: FilterState) => void;
  className?: string;
}

export function ThemeSubjectFilter({
  value,
  onChange,
  className,
}: ThemeSubjectFilterProps) {
  const [open, setOpen] = useState(false);
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});

  const { data: themes } = useThemes();
  const { data: subjects } = useActiveSubjects();

  // Group subjects by theme
  const subjectsByTheme = useMemo(() => {
    const grouped: Record<string, typeof subjects> = {};
    themes?.forEach((theme) => {
      grouped[theme.id] = subjects?.filter((s) => s.theme_id === theme.id) || [];
    });
    return grouped;
  }, [themes, subjects]);

  // Calculate active filter count
  const activeFilterCount = value.themeIds.length + value.subjectIds.length;

  // Check if a theme is fully selected (all its subjects selected)
  const isThemeFullySelected = (themeId: string) => {
    const themeSubjects = subjectsByTheme[themeId] || [];
    if (themeSubjects.length === 0) return value.themeIds.includes(themeId);
    return themeSubjects.every((s) => value.subjectIds.includes(s.id));
  };

  // Check if a theme is partially selected (some subjects selected)
  const isThemePartiallySelected = (themeId: string) => {
    const themeSubjects = subjectsByTheme[themeId] || [];
    const selectedCount = themeSubjects.filter((s) => value.subjectIds.includes(s.id)).length;
    return selectedCount > 0 && selectedCount < themeSubjects.length;
  };

  // Toggle theme selection
  const toggleTheme = (themeId: string) => {
    const themeSubjects = subjectsByTheme[themeId] || [];
    const themeSubjectIds = themeSubjects.map((s) => s.id);

    if (isThemeFullySelected(themeId)) {
      // Deselect all subjects of this theme
      onChange({
        themeIds: value.themeIds.filter((id) => id !== themeId),
        subjectIds: value.subjectIds.filter((id) => !themeSubjectIds.includes(id)),
      });
    } else {
      // Select all subjects of this theme
      const newSubjectIds = Array.from(new Set([...value.subjectIds, ...themeSubjectIds]));
      onChange({
        themeIds: themeSubjects.length === 0
          ? [...value.themeIds, themeId]
          : value.themeIds,
        subjectIds: newSubjectIds,
      });
    }
  };

  // Toggle subject selection
  const toggleSubject = (subjectId: string) => {
    const isSelected = value.subjectIds.includes(subjectId);

    if (isSelected) {
      onChange({
        themeIds: value.themeIds,
        subjectIds: value.subjectIds.filter((id) => id !== subjectId),
      });
    } else {
      onChange({
        themeIds: value.themeIds,
        subjectIds: [...value.subjectIds, subjectId],
      });
    }
  };

  // Clear all filters
  const clearFilters = () => {
    onChange({ themeIds: [], subjectIds: [] });
  };

  // Toggle theme expansion
  const toggleExpanded = (themeId: string) => {
    setExpandedThemes((prev) => ({
      ...prev,
      [themeId]: !prev[themeId],
    }));
  };

  // Get display label for active filters
  const getFilterLabel = () => {
    if (activeFilterCount === 0) return 'All';

    const selectedThemeNames: string[] = [];
    const selectedSubjectNames: string[] = [];

    themes?.forEach((theme) => {
      if (isThemeFullySelected(theme.id)) {
        selectedThemeNames.push(theme.title);
      } else {
        const themeSubjects = subjectsByTheme[theme.id] || [];
        themeSubjects.forEach((subject) => {
          if (value.subjectIds.includes(subject.id)) {
            selectedSubjectNames.push(subject.title);
          }
        });
      }
    });

    const allNames = [...selectedThemeNames, ...selectedSubjectNames];
    if (allNames.length <= 2) {
      return allNames.join(', ');
    }
    return `${allNames.slice(0, 2).join(', ')} +${allNames.length - 2}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            className={cn(
              'gap-2 h-9',
              activeFilterCount > 0 && 'border-primary bg-primary/5',
              className
            )}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">{getFilterLabel()}</span>
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 bg-primary/10 text-primary"
              >
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Filter by Theme & Subject</h4>
            <AnimatePresence>
              {activeFilterCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={clearFilters}
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <ScrollArea className="max-h-[300px]">
          <div className="p-2 space-y-1">
            {themes?.map((theme, index) => {
              const themeSubjects = subjectsByTheme[theme.id] || [];
              const isExpanded = expandedThemes[theme.id] ?? true;
              const isFullySelected = isThemeFullySelected(theme.id);
              const isPartiallySelected = isThemePartiallySelected(theme.id);

              return (
                <motion.div
                  key={theme.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(theme.id)}>
                    <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                      <Checkbox
                        id={`theme-${theme.id}`}
                        checked={isFullySelected}
                        ref={(el) => {
                          if (el) {
                            (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isPartiallySelected;
                          }
                        }}
                        onCheckedChange={() => toggleTheme(theme.id)}
                        className="data-[state=indeterminate]:bg-primary/50"
                      />
                      <motion.div
                        className="h-3 w-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: theme.color_hex }}
                        whileHover={{ scale: 1.2 }}
                      />
                      <label
                        htmlFor={`theme-${theme.id}`}
                        className="flex-1 text-sm font-medium cursor-pointer"
                      >
                        {theme.title}
                      </label>
                      {themeSubjects.length > 0 && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </motion.div>
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>

                    {themeSubjects.length > 0 && (
                      <CollapsibleContent>
                        <motion.div
                          className="ml-6 pl-2 border-l-2 space-y-0.5"
                          style={{ borderColor: theme.color_hex + '40' }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {themeSubjects.map((subject, subIndex) => {
                            const isSelected = value.subjectIds.includes(subject.id);
                            return (
                              <motion.div
                                key={subject.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: subIndex * 0.02 }}
                                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50"
                              >
                                <Checkbox
                                  id={`subject-${subject.id}`}
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSubject(subject.id)}
                                />
                                <Folder className="h-3 w-3 text-muted-foreground" />
                                <label
                                  htmlFor={`subject-${subject.id}`}
                                  className="flex-1 text-sm cursor-pointer"
                                >
                                  {subject.title}
                                </label>
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                  >
                                    <Check className="h-3 w-3 text-primary" />
                                  </motion.div>
                                )}
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => {
              clearFilters();
              setOpen(false);
            }}
          >
            <Check className={cn('h-4 w-4 mr-2', activeFilterCount === 0 ? 'opacity-100' : 'opacity-0')} />
            Show All
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper function to filter tasks based on filter state
export function filterTasksByThemeAndSubject<T extends { subject_id?: string | null; theme?: { id: string } | null }>(
  tasks: T[],
  filter: FilterState
): T[] {
  // No filter active = show all
  if (filter.themeIds.length === 0 && filter.subjectIds.length === 0) {
    return tasks;
  }

  return tasks.filter((task) => {
    // Check if task's subject is in the selected subjects
    if (task.subject_id && filter.subjectIds.includes(task.subject_id)) {
      return true;
    }

    // Check if task's theme is in the selected themes (for themes without subjects)
    if (task.theme?.id && filter.themeIds.includes(task.theme.id)) {
      return true;
    }

    return false;
  });
}
