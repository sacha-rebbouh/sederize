'use client';

import { useState } from 'react';
import { ChevronRight, Inbox, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useCategoriesWithThemes } from '@/hooks/use-categories';
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
  const { data: categories } = useCategoriesWithThemes();
  const { data: subjects } = useActiveSubjects();
  const { data: themes } = useThemes();

  // Find selected subject details
  const selectedSubject = subjects?.find((s) => s.id === value);
  const selectedTheme = selectedSubject?.theme;

  // Check if we should use the simple theme-based view (no categories exist)
  const hasCategories = categories && categories.length > 0 && categories.some(c => c.id !== 'uncategorized');

  const getDisplayLabel = () => {
    if (!value || !selectedSubject) {
      return 'Inbox';
    }
    return selectedSubject.title;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-auto min-w-[120px] h-9 justify-between transition-all',
            value && 'bg-primary/10 border-primary text-primary',
            className
          )}
        >
          <div className="flex items-center gap-2">
            {selectedTheme ? (
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: selectedTheme.color_hex }}
              />
            ) : (
              <Inbox className="h-4 w-4" />
            )}
            <span className="truncate max-w-[150px]">{getDisplayLabel()}</span>
          </div>
          <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un projet..." />
          <CommandList>
            <CommandEmpty>Aucun projet trouvé.</CommandEmpty>

            {/* Inbox Option */}
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <Inbox className="h-4 w-4 text-muted-foreground" />
                <span>Inbox</span>
                {!value && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* If categories exist, show Category > Theme > Subject hierarchy */}
            {hasCategories ? (
              <>
                {categories?.map((category) => (
                  <CommandGroup key={category.id} heading={category.title}>
                    {category.themes?.map((theme) => {
                      const themeSubjects = subjects?.filter(
                        (s) => s.theme_id === theme.id
                      );

                      if (!themeSubjects?.length) return null;

                      return themeSubjects.map((subject) => (
                        <CommandItem
                          key={subject.id}
                          onSelect={() => {
                            onChange(subject.id);
                            setOpen(false);
                          }}
                          className="flex items-center gap-2 pl-4"
                        >
                          <div
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: theme.color_hex }}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">{subject.title}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {theme.title}
                            </span>
                          </div>
                          {value === subject.id && <Check className="ml-auto h-4 w-4 flex-shrink-0" />}
                        </CommandItem>
                      ));
                    })}
                  </CommandGroup>
                ))}
              </>
            ) : (
              /* Fallback: Show subjects grouped by theme when no categories */
              themes?.map((theme) => {
                const themeSubjects = subjects?.filter((s) => s.theme_id === theme.id);
                if (!themeSubjects?.length) return null;

                return (
                  <CommandGroup key={theme.id} heading={theme.title}>
                    {themeSubjects.map((subject) => (
                      <CommandItem
                        key={subject.id}
                        onSelect={() => {
                          onChange(subject.id);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2"
                      >
                        <div
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: theme.color_hex }}
                        />
                        <span className="truncate">{subject.title}</span>
                        {value === subject.id && <Check className="ml-auto h-4 w-4 flex-shrink-0" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
