'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Inbox,
  LayoutDashboard,
  Kanban,
  ListTodo,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Folder,
  AlertTriangle,
  FolderOpen,
  Clock,
  Archive,
  MoreHorizontal,
  Trash2,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Layers, FolderPlus, Palette } from 'lucide-react';
import { useCategoriesWithThemes, CategoryWithThemes } from '@/hooks/use-categories';
import { useActiveSubjects, useZombieSubjects } from '@/hooks/use-subjects';
import { useInboxCount, useWaitingForCount } from '@/hooks/use-tasks';
import { useAuth } from '@/providers/auth-provider';
import { useState, useCallback, useMemo } from 'react';
import { Theme, SubjectWithTheme } from '@/types/database';
import { SyncIndicator } from '@/components/ui/sync-status';

const mainNavItems = [
  {
    title: 'Daily Brief',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'All Tasks',
    href: '/tasks',
    icon: ListTodo,
  },
  {
    title: 'Inbox',
    href: '/inbox',
    icon: Inbox,
  },
  {
    title: 'Calendar',
    href: '/calendar',
    icon: CalendarDays,
  },
  {
    title: 'Kanban',
    href: '/kanban',
    icon: Kanban,
  },
  {
    title: 'En Attente',
    href: '/pending',
    icon: Clock,
  },
  {
    title: 'Archives',
    href: '/archives',
    icon: Archive,
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onCreateTheme?: (categoryId?: string) => void;
  onCreateSubject?: (themeId: string) => void;
  onCreateCategory?: () => void;
  onDeleteCategory?: (id: string, title: string) => void;
  onDeleteTheme?: (id: string, title: string) => void;
  onDeleteSubject?: (id: string, title: string) => void;
  onEditCategory?: (id: string, title: string, color: string) => void;
  onEditTheme?: (id: string, title: string, color: string) => void;
  onEditSubject?: (id: string, title: string) => void;
}

export function Sidebar({
  collapsed = false,
  onCollapsedChange,
  onCreateTheme,
  onCreateSubject,
  onCreateCategory,
  onDeleteCategory,
  onDeleteTheme,
  onDeleteSubject,
  onEditCategory,
  onEditTheme,
  onEditSubject,
}: SidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { data: categories } = useCategoriesWithThemes();
  const { data: subjects } = useActiveSubjects();
  const { data: zombies } = useZombieSubjects();
  const { data: inboxCount } = useInboxCount();
  const { data: waitingCount } = useWaitingForCount();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openThemes, setOpenThemes] = useState<Record<string, boolean>>({});

  const setCategoryOpen = useCallback((categoryId: string, open: boolean) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: open,
    }));
  }, []);

  const setThemeOpen = useCallback((themeId: string, open: boolean) => {
    setOpenThemes((prev) => ({
      ...prev,
      [themeId]: open,
    }));
  }, []);

  // Memoize subjects grouped by theme
  const subjectsByTheme = useMemo(() => {
    const grouped: Record<string, SubjectWithTheme[]> = {};
    subjects?.forEach((s) => {
      if (!grouped[s.theme_id]) {
        grouped[s.theme_id] = [];
      }
      grouped[s.theme_id].push(s);
    });
    return grouped;
  }, [subjects]);

  const getSubjectsForTheme = useCallback((themeId: string) => {
    return subjectsByTheme[themeId] || [];
  }, [subjectsByTheme]);

  // Memoize zombie IDs as a Set for O(1) lookup
  const zombieIds = useMemo(() => {
    return new Set(zombies?.map((z) => z.id) || []);
  }, [zombies]);

  const isZombie = useCallback((subjectId: string) => {
    return zombieIds.has(subjectId);
  }, [zombieIds]);

  // Nav button - no animations to avoid cascade on data change
  const NavButton = ({
    href,
    icon: Icon,
    label,
    isActive,
    badge,
  }: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    isActive: boolean;
    badge?: React.ReactNode;
  }) => {
    const button = (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors relative overflow-hidden',
          collapsed ? 'justify-center px-2' : 'justify-start',
          isActive
            ? 'bg-secondary text-secondary-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{label}</span>
            {badge}
          </>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {label}
            {badge}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  // Render a theme with its subjects
  const renderTheme = (theme: Theme) => (
    <div key={theme.id}>
      <Collapsible
        open={openThemes[theme.id] ?? false}
        onOpenChange={(open) => setThemeOpen(theme.id, open)}
      >
        <div className="flex items-center group">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex-1 justify-start gap-2 h-8 text-sm"
            >
              <div
                className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: theme.color_hex }}
              />
              <span className="flex-1 text-left truncate">{theme.title}</span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  openThemes[theme.id] && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubject?.(theme.id);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTheme?.(theme.id, theme.title, theme.color_hex);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTheme?.(theme.id, theme.title);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CollapsibleContent>
          <div className="pl-4 space-y-0.5">
            {getSubjectsForTheme(theme.id).map((subject) => (
              <div
                key={subject.id}
                className="group/subjectItem flex items-center"
              >
                <Link href={`/subject/${subject.id}`} className="flex-1 min-w-0">
                  <Button
                    variant={
                      pathname === `/subject/${subject.id}`
                        ? 'secondary'
                        : 'ghost'
                    }
                    className="w-full justify-start gap-2 h-7 text-xs"
                  >
                    <Folder className="h-3 w-3" />
                    <span className="flex-1 text-left truncate">
                      {subject.title}
                    </span>
                    {isZombie(subject.id) && (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    )}
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover/subjectItem:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSubject?.(subject.id, subject.title);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Renommer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSubject?.(subject.id, subject.title);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {getSubjectsForTheme(theme.id).length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1 italic">
                No subjects
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // Render a category with its themes
  const renderCategory = (category: CategoryWithThemes) => (
    <div key={category.id}>
      <Collapsible
        open={openCategories[category.id] ?? true}
        onOpenChange={(open) => setCategoryOpen(category.id, open)}
      >
        <div className="flex items-center group">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex-1 justify-start gap-2"
            >
              {openCategories[category.id] ? (
                <FolderOpen className="h-4 w-4" style={{ color: category.color_hex }} />
              ) : (
                <Folder className="h-4 w-4" style={{ color: category.color_hex }} />
              )}
              <span className="flex-1 text-left truncate font-medium">
                {category.title}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  openCategories[category.id] && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          {category.id !== 'uncategorized' && (
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateTheme?.(category.id);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCategory?.(category.id, category.title, category.color_hex);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCategory?.(category.id, category.title);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <CollapsibleContent>
          <div className="pl-3 space-y-0.5">
            {category.themes.map((theme) => renderTheme(theme))}
            {category.themes.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1 italic">
                No themes
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  return (
    <div
      className={cn(
        "hidden md:flex h-screen flex-col border-r bg-background transition-all duration-300 ease-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4 justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">S</span>
          </div>
          {!collapsed && (
            <span className="tracking-tight overflow-hidden whitespace-nowrap">
              SEDERIZE
            </span>
          )}
        </Link>
        <div className="flex items-center gap-2">
          {/* Sync status indicator */}
          <SyncIndicator />
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => onCollapsedChange?.(true)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="px-2 py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full"
                onClick={() => onCollapsedChange?.(false)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Main Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const isInbox = item.href === '/inbox';
            const isPending = item.href === '/pending';

            let badge: React.ReactNode = null;

            if (isInbox && (inboxCount ?? 0) > 0) {
              badge = (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {inboxCount}
                </span>
              );
            } else if (isPending && (waitingCount ?? 0) > 0) {
              badge = (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500">
                  {waitingCount}
                </span>
              );
            }

            return (
              <NavButton
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.title}
                isActive={pathname === item.href}
                badge={badge}
              />
            );
          })}
        </div>

        <Separator className="my-4" />

        {/* Categories > Themes > Subjects - Hide when collapsed */}
        {!collapsed && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Catégories
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onCreateCategory}>
                    <Layers className="h-4 w-4 mr-2" />
                    Nouvelle Catégorie
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateTheme?.()}>
                    <Palette className="h-4 w-4 mr-2" />
                    Nouveau Thème
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateSubject?.('')}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Nouveau Sujet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {categories?.map((category) => renderCategory(category))}

            {(!categories || categories.length === 0) && (
              <p className="text-xs text-muted-foreground px-2 py-2 text-center">
                No categories yet
              </p>
            )}
          </div>
        )}

        {/* Collapsed: Show category color dots only */}
        {collapsed && categories && categories.length > 0 && (
          <div className="space-y-1">
            {categories.map((category) => (
              <Tooltip key={category.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-center"
                    onClick={() => {
                      onCollapsedChange?.(false);
                      setOpenCategories((prev) => ({ ...prev, [category.id]: true }));
                    }}
                  >
                    <Folder className="h-4 w-4" style={{ color: category.color_hex }} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {category.title}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-2 space-y-1">
        {collapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/settings">
                  <Button variant="ghost" className="w-full justify-center">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-center text-muted-foreground"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <Link href="/settings">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
