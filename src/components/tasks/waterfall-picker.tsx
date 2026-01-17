'use client';

import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { ChevronRight, Inbox, Check, X, Layers, Palette, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCategoriesWithThemes } from '@/hooks/use-categories';
import { useActiveSubjects } from '@/hooks/use-subjects';
import { useThemes } from '@/hooks/use-themes';
import { cn } from '@/lib/utils';

// Waterfall assignment: can be at any level
export interface WaterfallValue {
  categoryId: string | null;
  themeId: string | null;
  subjectId: string | null;
}

interface WaterfallPickerProps {
  value: WaterfallValue;
  onChange: (value: WaterfallValue) => void;
  className?: string;
}

export const WaterfallPicker = memo(function WaterfallPicker({ value, onChange, className }: WaterfallPickerProps) {
  const [open, setOpen] = useState(false);

  // Local state for selection before validation
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const { data: categoriesWithThemes } = useCategoriesWithThemes();
  const { data: subjects } = useActiveSubjects();
  const { data: themes } = useThemes();

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedCategoryId(value.categoryId);
      setSelectedThemeId(value.themeId);
      setSelectedSubjectId(value.subjectId);
    }
  }, [open, value]);

  // Get current display info based on value
  const displayInfo = useMemo(() => {
    if (value.subjectId) {
      const subject = subjects?.find((s) => s.id === value.subjectId);
      const theme = subject?.theme || themes?.find((t) => t.id === value.themeId);
      return {
        label: subject?.title || 'Subject',
        color: theme?.color_hex,
        level: 'subject' as const,
      };
    }
    if (value.themeId) {
      const theme = themes?.find((t) => t.id === value.themeId);
      return {
        label: theme?.title || 'Theme',
        color: theme?.color_hex,
        level: 'theme' as const,
      };
    }
    if (value.categoryId) {
      const category = categoriesWithThemes?.find((c) => c.id === value.categoryId);
      return {
        label: category?.title || 'Category',
        color: category?.color_hex,
        level: 'category' as const,
      };
    }
    return {
      label: 'Inbox',
      color: undefined,
      level: 'inbox' as const,
    };
  }, [value, subjects, themes, categoriesWithThemes]);

  // Filtered themes based on selected category
  const filteredThemes = useMemo(() => {
    if (!themes) return [];
    if (!selectedCategoryId) return themes;
    return themes.filter((t) => t.category_id === selectedCategoryId);
  }, [themes, selectedCategoryId]);

  // Filtered subjects based on selected theme
  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    if (!selectedThemeId) {
      // If category is selected but no theme, show subjects from all themes in that category
      if (selectedCategoryId) {
        const categoryThemeIds = themes?.filter(t => t.category_id === selectedCategoryId).map(t => t.id) || [];
        return subjects.filter((s) => categoryThemeIds.includes(s.theme_id));
      }
      return subjects;
    }
    return subjects.filter((s) => s.theme_id === selectedThemeId);
  }, [subjects, selectedThemeId, selectedCategoryId, themes]);

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    // Reset theme and subject when category changes
    setSelectedThemeId(null);
    setSelectedSubjectId(null);
  }, []);

  // Handle theme selection
  const handleThemeSelect = useCallback((themeId: string | null) => {
    setSelectedThemeId(themeId);
    // Reset subject when theme changes
    setSelectedSubjectId(null);
    // Auto-select category if theme has one
    if (themeId) {
      const theme = themes?.find(t => t.id === themeId);
      if (theme?.category_id && !selectedCategoryId) {
        setSelectedCategoryId(theme.category_id);
      }
    }
  }, [themes, selectedCategoryId]);

  // Handle subject selection
  const handleSubjectSelect = useCallback((subjectId: string | null) => {
    setSelectedSubjectId(subjectId);
    // Auto-select theme and category
    if (subjectId) {
      const subject = subjects?.find(s => s.id === subjectId);
      if (subject) {
        setSelectedThemeId(subject.theme_id);
        const theme = themes?.find(t => t.id === subject.theme_id);
        if (theme?.category_id) {
          setSelectedCategoryId(theme.category_id);
        }
      }
    }
  }, [subjects, themes]);

  // Handle validation
  const handleValidate = useCallback(() => {
    onChange({
      categoryId: selectedCategoryId,
      themeId: selectedThemeId,
      subjectId: selectedSubjectId,
    });
    setOpen(false);
  }, [onChange, selectedCategoryId, selectedThemeId, selectedSubjectId]);

  // Handle inbox (clear all)
  const handleInbox = useCallback(() => {
    setSelectedCategoryId(null);
    setSelectedThemeId(null);
    setSelectedSubjectId(null);
  }, []);

  // Get selection summary for display
  const getSelectionSummary = () => {
    const parts: string[] = [];
    if (selectedCategoryId) {
      const cat = categoriesWithThemes?.find(c => c.id === selectedCategoryId);
      parts.push(cat?.title || 'Category');
    }
    if (selectedThemeId) {
      const theme = themes?.find(t => t.id === selectedThemeId);
      parts.push(theme?.title || 'Theme');
    }
    if (selectedSubjectId) {
      const subject = subjects?.find(s => s.id === selectedSubjectId);
      parts.push(subject?.title || 'Subject');
    }
    if (parts.length === 0) return 'Inbox (non assigné)';
    return parts.join(' → ');
  };

  const renderIcon = () => {
    if (displayInfo.color) {
      return (
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: displayInfo.color }}
        />
      );
    }
    return <Inbox className="h-4 w-4" />;
  };

  return (
    <>
      <Button
        variant="outline"
        role="combobox"
        onClick={() => setOpen(true)}
        className={cn(
          'w-full h-9 justify-between transition-all',
          (value.categoryId || value.themeId || value.subjectId) &&
            'bg-primary/10 border-primary text-primary',
          className
        )}
      >
        <div className="flex items-center gap-2">
          {renderIcon()}
          <span className="truncate">{displayInfo.label}</span>
          {displayInfo.level !== 'inbox' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {displayInfo.level === 'category' ? 'Cat' : displayInfo.level === 'theme' ? 'Thème' : 'Sujet'}
            </Badge>
          )}
        </div>
        <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent
          className="sm:max-w-4xl max-h-[85vh] flex flex-col p-0"
          aria-describedby={undefined}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Assigner la tâche</DialogTitle>
            {/* Current selection summary */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Sélection:</span>
              <Badge variant="outline" className="font-normal">
                {getSelectionSummary()}
              </Badge>
              {(selectedCategoryId || selectedThemeId || selectedSubjectId) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInbox}
                  className="h-6 px-2 text-xs text-muted-foreground"
                >
                  <X className="h-3 w-3 mr-1" />
                  Effacer
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* 3 Column Layout */}
          <div className="flex-1 grid grid-cols-3 divide-x overflow-hidden">
            {/* Column 1: Categories */}
            <div className="flex flex-col min-h-0">
              <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Catégories</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {categoriesWithThemes?.length || 0}
                </Badge>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {categoriesWithThemes?.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors',
                        'hover:bg-muted',
                        selectedCategoryId === category.id && 'bg-primary/10 text-primary font-medium'
                      )}
                    >
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color_hex }}
                      />
                      <span className="truncate">{category.title}</span>
                      {selectedCategoryId === category.id && <Check className="h-4 w-4 ml-auto flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Column 2: Themes */}
            <div className="flex flex-col min-h-0">
              <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Thèmes</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {filteredThemes.length}
                </Badge>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {filteredThemes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeSelect(theme.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors',
                        'hover:bg-muted',
                        selectedThemeId === theme.id && 'bg-primary/10 text-primary font-medium'
                      )}
                    >
                      <div
                        className="h-3 w-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: theme.color_hex }}
                      />
                      <span className="truncate">{theme.title}</span>
                      {selectedThemeId === theme.id && <Check className="h-4 w-4 ml-auto flex-shrink-0" />}
                    </button>
                  ))}

                  {filteredThemes.length === 0 && selectedCategoryId && (
                    <p className="text-xs text-muted-foreground text-center py-4 italic">
                      Aucun thème dans cette catégorie
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Column 3: Subjects */}
            <div className="flex flex-col min-h-0">
              <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Sujets</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {filteredSubjects.length}
                </Badge>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {filteredSubjects.map((subject) => {
                    const theme = themes?.find(t => t.id === subject.theme_id);
                    return (
                      <button
                        key={subject.id}
                        onClick={() => handleSubjectSelect(subject.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors',
                          'hover:bg-muted',
                          selectedSubjectId === subject.id && 'bg-primary/10 text-primary font-medium'
                        )}
                      >
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: theme?.color_hex || '#888' }}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate">{subject.title}</span>
                          {!selectedThemeId && theme && (
                            <span className="text-xs text-muted-foreground truncate">
                              {theme.title}
                            </span>
                          )}
                        </div>
                        {selectedSubjectId === subject.id && <Check className="h-4 w-4 flex-shrink-0" />}
                      </button>
                    );
                  })}

                  {filteredSubjects.length === 0 && (selectedThemeId || selectedCategoryId) && (
                    <p className="text-xs text-muted-foreground text-center py-4 italic">
                      Aucun sujet {selectedThemeId ? 'dans ce thème' : 'dans cette catégorie'}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Footer with Validate button */}
          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button onClick={handleValidate}>
                <Check className="h-4 w-4 mr-2" />
                Valider
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
