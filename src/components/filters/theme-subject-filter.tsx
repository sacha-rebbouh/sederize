'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  ChevronDown,
  Check,
  X,
  Folder,
  Layers,
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
import { useCategoriesWithThemes } from '@/hooks/use-categories';
import { useActiveSubjects } from '@/hooks/use-subjects';
import { cn } from '@/lib/utils';

export interface FilterState {
  categoryIds: string[];
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
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});

  const { data: categoriesWithThemes } = useCategoriesWithThemes();
  const { data: subjects } = useActiveSubjects();

  // Group subjects by theme
  const subjectsByTheme = useMemo(() => {
    const grouped: Record<string, typeof subjects> = {};
    categoriesWithThemes?.forEach((category) => {
      category.themes.forEach((theme) => {
        grouped[theme.id] = subjects?.filter((s) => s.theme_id === theme.id) || [];
      });
    });
    return grouped;
  }, [categoriesWithThemes, subjects]);

  // Calculate active filter count
  const activeFilterCount = (value.categoryIds?.length || 0) + (value.themeIds?.length || 0) + (value.subjectIds?.length || 0);

  // Check if a category is fully selected (all its themes and subjects selected)
  const isCategoryFullySelected = (categoryId: string) => {
    const category = categoriesWithThemes?.find((c) => c.id === categoryId);
    if (!category || category.themes.length === 0) return value.categoryIds?.includes(categoryId) || false;
    return category.themes.every((theme) => isThemeFullySelected(theme.id));
  };

  // Check if a category is partially selected
  const isCategoryPartiallySelected = (categoryId: string) => {
    const category = categoriesWithThemes?.find((c) => c.id === categoryId);
    if (!category) return false;
    const selectedCount = category.themes.filter((theme) =>
      isThemeFullySelected(theme.id) || isThemePartiallySelected(theme.id)
    ).length;
    return selectedCount > 0 && selectedCount < category.themes.length;
  };

  // Check if a theme is fully selected (all its subjects selected)
  const isThemeFullySelected = (themeId: string) => {
    const themeSubjects = subjectsByTheme[themeId] || [];
    if (themeSubjects.length === 0) return value.themeIds?.includes(themeId) || false;
    return themeSubjects.every((s) => value.subjectIds?.includes(s.id));
  };

  // Check if a theme is partially selected (some subjects selected)
  const isThemePartiallySelected = (themeId: string) => {
    const themeSubjects = subjectsByTheme[themeId] || [];
    const selectedCount = themeSubjects.filter((s) => value.subjectIds?.includes(s.id)).length;
    return selectedCount > 0 && selectedCount < themeSubjects.length;
  };

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    const category = categoriesWithThemes?.find((c) => c.id === categoryId);
    if (!category) return;

    const categoryThemeIds = category.themes.map((t) => t.id);
    const categorySubjectIds = category.themes.flatMap((t) =>
      (subjectsByTheme[t.id] || []).map((s) => s.id)
    );

    if (isCategoryFullySelected(categoryId)) {
      // Deselect category and all its themes/subjects
      onChange({
        categoryIds: (value.categoryIds || []).filter((id) => id !== categoryId),
        themeIds: (value.themeIds || []).filter((id) => !categoryThemeIds.includes(id)),
        subjectIds: (value.subjectIds || []).filter((id) => !categorySubjectIds.includes(id)),
      });
    } else {
      // Select category AND all its themes/subjects
      // Always add categoryId for proper filtering
      const newCategoryIds = Array.from(new Set([...(value.categoryIds || []), categoryId]));
      const newThemeIds = category.themes.every((t) => (subjectsByTheme[t.id] || []).length > 0)
        ? value.themeIds || []
        : Array.from(new Set([...(value.themeIds || []), ...categoryThemeIds.filter((tid) => (subjectsByTheme[tid] || []).length === 0)]));
      const newSubjectIds = Array.from(new Set([...(value.subjectIds || []), ...categorySubjectIds]));
      onChange({
        categoryIds: newCategoryIds,
        themeIds: newThemeIds,
        subjectIds: newSubjectIds,
      });
    }
  };

  // Toggle theme selection
  const toggleTheme = (themeId: string) => {
    const themeSubjects = subjectsByTheme[themeId] || [];
    const themeSubjectIds = themeSubjects.map((s) => s.id);

    if (isThemeFullySelected(themeId)) {
      // Deselect all subjects of this theme
      onChange({
        categoryIds: value.categoryIds || [],
        themeIds: (value.themeIds || []).filter((id) => id !== themeId),
        subjectIds: (value.subjectIds || []).filter((id) => !themeSubjectIds.includes(id)),
      });
    } else {
      // Select all subjects of this theme
      const newSubjectIds = Array.from(new Set([...(value.subjectIds || []), ...themeSubjectIds]));
      onChange({
        categoryIds: value.categoryIds || [],
        themeIds: themeSubjects.length === 0
          ? [...(value.themeIds || []), themeId]
          : (value.themeIds || []),
        subjectIds: newSubjectIds,
      });
    }
  };

  // Toggle subject selection
  const toggleSubject = (subjectId: string) => {
    const isSelected = value.subjectIds?.includes(subjectId) || false;

    if (isSelected) {
      onChange({
        categoryIds: value.categoryIds || [],
        themeIds: value.themeIds || [],
        subjectIds: (value.subjectIds || []).filter((id) => id !== subjectId),
      });
    } else {
      onChange({
        categoryIds: value.categoryIds || [],
        themeIds: value.themeIds || [],
        subjectIds: [...(value.subjectIds || []), subjectId],
      });
    }
  };

  // Clear all filters
  const clearFilters = () => {
    onChange({ categoryIds: [], themeIds: [], subjectIds: [] });
  };

  // Toggle category expansion
  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Toggle theme expansion
  const toggleThemeExpanded = (themeId: string) => {
    setExpandedThemes((prev) => ({
      ...prev,
      [themeId]: !prev[themeId],
    }));
  };

  // Get display label for active filters
  const getFilterLabel = () => {
    if (activeFilterCount === 0) return 'All';

    const selectedNames: string[] = [];

    categoriesWithThemes?.forEach((category) => {
      if (isCategoryFullySelected(category.id)) {
        selectedNames.push(category.title);
      } else {
        category.themes.forEach((theme) => {
          if (isThemeFullySelected(theme.id)) {
            selectedNames.push(theme.title);
          } else {
            const themeSubjects = subjectsByTheme[theme.id] || [];
            themeSubjects.forEach((subject) => {
              if (value.subjectIds?.includes(subject.id)) {
                selectedNames.push(subject.title);
              }
            });
          }
        });
      }
    });

    if (selectedNames.length <= 2) {
      return selectedNames.join(', ');
    }
    return `${selectedNames.slice(0, 2).join(', ')} +${selectedNames.length - 2}`;
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
            <h4 className="font-semibold text-sm">Filtrer par Catégorie / Thème / Sujet</h4>
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
                    Effacer
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="p-2 space-y-1">
            {categoriesWithThemes?.map((category, catIndex) => {
              const isCatExpanded = expandedCategories[category.id] ?? true;
              const isCatFullySelected = isCategoryFullySelected(category.id);
              const isCatPartiallySelected = isCategoryPartiallySelected(category.id);

              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: catIndex * 0.03 }}
                >
                  <Collapsible open={isCatExpanded} onOpenChange={() => toggleCategoryExpanded(category.id)}>
                    {/* Category row */}
                    <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 bg-muted/30">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={isCatFullySelected}
                        ref={(el) => {
                          if (el) {
                            (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isCatPartiallySelected;
                          }
                        }}
                        onCheckedChange={() => toggleCategory(category.id)}
                        className="data-[state=indeterminate]:bg-primary/50"
                      />
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      <label
                        htmlFor={`category-${category.id}`}
                        className="flex-1 text-sm font-semibold cursor-pointer"
                      >
                        {category.title}
                      </label>
                      {category.themes.length > 0 && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <motion.div
                              animate={{ rotate: isCatExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </motion.div>
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>

                    {/* Themes within category */}
                    {category.themes.length > 0 && (
                      <CollapsibleContent>
                        <div className="ml-4 mt-1 space-y-1">
                          {category.themes.map((theme, themeIndex) => {
                            const themeSubjects = subjectsByTheme[theme.id] || [];
                            const isThemeExpanded = expandedThemes[theme.id] ?? true;
                            const isFullySelected = isThemeFullySelected(theme.id);
                            const isPartiallySelected = isThemePartiallySelected(theme.id);

                            return (
                              <motion.div
                                key={theme.id}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: themeIndex * 0.02 }}
                              >
                                <Collapsible open={isThemeExpanded} onOpenChange={() => toggleThemeExpanded(theme.id)}>
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
                                            animate={{ rotate: isThemeExpanded ? 180 : 0 }}
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
                                          const isSelected = value.subjectIds?.includes(subject.id) || false;
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
export function filterTasksByThemeAndSubject<T extends {
  subject_id?: string | null;
  theme?: {
    id: string;
    category_id?: string | null;
    category?: { id: string } | null;
  } | null;
  category?: { id: string } | null;
}>(
  tasks: T[],
  filter: FilterState
): T[] {
  // No filter active = show all
  const categoryIds = filter.categoryIds || [];
  const themeIds = filter.themeIds || [];
  const subjectIds = filter.subjectIds || [];

  if (categoryIds.length === 0 && themeIds.length === 0 && subjectIds.length === 0) {
    return tasks;
  }

  return tasks.filter((task) => {
    // Check if task's subject is in the selected subjects
    if (task.subject_id && subjectIds.includes(task.subject_id)) {
      return true;
    }

    // Check if task's theme is in the selected themes (for themes without subjects)
    if (task.theme?.id && themeIds.includes(task.theme.id)) {
      return true;
    }

    // Check if task's theme belongs to a selected category
    // Support both category_id and category.id patterns
    const themeCategoryId = task.theme?.category_id || task.theme?.category?.id;
    if (themeCategoryId && categoryIds.includes(themeCategoryId)) {
      return true;
    }

    // Check if task has a direct category assignment
    if (task.category?.id && categoryIds.includes(task.category.id)) {
      return true;
    }

    return false;
  });
}
