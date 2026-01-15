'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Folder, FolderOpen, ChevronRight, Plus, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useCategoriesWithThemes } from '@/hooks/use-categories';
import { useActiveSubjects } from '@/hooks/use-subjects';
import { Subject, Theme } from '@/types/database';

interface MoveToSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (subjectId: string) => void;
  currentSubjectId?: string | null;
  onCreateSubject?: () => void;
}

export function MoveToSubjectDialog({
  open,
  onOpenChange,
  onSelect,
  currentSubjectId,
  onCreateSubject,
}: MoveToSubjectDialogProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});

  const { data: categories } = useCategoriesWithThemes();
  const { data: subjects } = useActiveSubjects();

  // Normalize string for search (remove accents, lowercase)
  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  interface CategoryWithThemesAndSubjects {
    id: string;
    title: string;
    color_hex: string;
    themes: (Theme & { subjects: Subject[] })[];
  }

  // Filter subjects based on search
  const filteredData = useMemo((): CategoryWithThemesAndSubjects[] => {
    if (!categories || !subjects) return [];

    const normalizedSearch = normalizeString(search);

    if (!search.trim()) {
      // Return all categories with their themes and subjects
      return categories.map((category) => ({
        id: category.id,
        title: category.title,
        color_hex: category.color_hex,
        themes: category.themes.map((theme) => ({
          ...theme,
          subjects: subjects.filter((s) => s.theme_id === theme.id),
        })),
      }));
    }

    // Filter based on search - match category, theme, or subject names
    const result: CategoryWithThemesAndSubjects[] = [];

    for (const category of categories) {
      const categoryMatches = normalizeString(category.title).includes(normalizedSearch);

      const filteredThemes: (Theme & { subjects: Subject[] })[] = [];

      for (const theme of category.themes) {
        const themeMatches = normalizeString(theme.title).includes(normalizedSearch);
        const filteredSubjects = subjects.filter(
          (s) =>
            s.theme_id === theme.id &&
            (normalizeString(s.title).includes(normalizedSearch) ||
              themeMatches ||
              categoryMatches)
        );

        if (filteredSubjects.length > 0 || themeMatches || categoryMatches) {
          filteredThemes.push({ ...theme, subjects: filteredSubjects });
        }
      }

      if (filteredThemes.length > 0 || categoryMatches) {
        result.push({
          id: category.id,
          title: category.title,
          color_hex: category.color_hex,
          themes: filteredThemes,
        });
      }
    }

    return result;
  }, [categories, subjects, search]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const toggleTheme = (themeId: string) => {
    setExpandedThemes((prev) => ({
      ...prev,
      [themeId]: !prev[themeId],
    }));
  };

  const handleSelect = (subjectId: string) => {
    onSelect(subjectId);
    onOpenChange(false);
    setSearch('');
  };

  // Auto-expand when searching
  const isExpanded = (id: string, type: 'category' | 'theme') => {
    if (search.trim()) return true;
    return type === 'category' ? expandedCategories[id] : expandedThemes[id];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Move to Subject</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Hierarchical list */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-1 py-2">
            <AnimatePresence mode="sync">
              {filteredData?.map((category) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Collapsible
                    open={isExpanded(category.id, 'category')}
                    onOpenChange={() => toggleCategory(category.id)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
                        <motion.div
                          animate={{ rotate: isExpanded(category.id, 'category') ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </motion.div>
                        {isExpanded(category.id, 'category') ? (
                          <FolderOpen className="h-4 w-4" style={{ color: category.color_hex }} />
                        ) : (
                          <Folder className="h-4 w-4" style={{ color: category.color_hex }} />
                        )}
                        <span className="font-medium text-sm">{category.title}</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 pl-2 border-l space-y-0.5">
                        {category.themes.map((theme) => (
                          <Collapsible
                            key={theme.id}
                            open={isExpanded(theme.id, 'theme')}
                            onOpenChange={() => toggleTheme(theme.id)}
                          >
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted transition-colors">
                                <motion.div
                                  animate={{ rotate: isExpanded(theme.id, 'theme') ? 90 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                </motion.div>
                                <div
                                  className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: theme.color_hex }}
                                />
                                <span className="text-sm">{theme.title}</span>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="ml-4 pl-2 border-l space-y-0.5">
                                {theme.subjects.map((subject) => (
                                  <button
                                    key={subject.id}
                                    onClick={() => handleSelect(subject.id)}
                                    className={cn(
                                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors',
                                      'hover:bg-primary/10',
                                      currentSubjectId === subject.id &&
                                        'bg-primary/10 text-primary'
                                    )}
                                  >
                                    <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="flex-1 truncate">{subject.title}</span>
                                    {currentSubjectId === subject.id && (
                                      <Check className="h-4 w-4 text-primary" />
                                    )}
                                  </button>
                                ))}
                                {theme.subjects.length === 0 && (
                                  <p className="text-xs text-muted-foreground px-2 py-1 italic">
                                    No subjects
                                  </p>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                        {category.themes.length === 0 && (
                          <p className="text-xs text-muted-foreground px-2 py-1 italic">
                            No themes
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredData?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No projects found
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Create new subject button */}
        {onCreateSubject && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                onCreateSubject();
                onOpenChange(false);
              }}
            >
              <Plus className="h-4 w-4" />
              Create new subject
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
