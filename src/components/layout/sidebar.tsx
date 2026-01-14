'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
} from '@/components/ui/dropdown-menu';
import { Layers, FolderPlus, Palette } from 'lucide-react';
import { useCategoriesWithThemes, CategoryWithThemes } from '@/hooks/use-categories';
import { useActiveSubjects, useZombieSubjects } from '@/hooks/use-subjects';
import { useInboxCount, useWaitingForCount } from '@/hooks/use-tasks';
import { useAuth } from '@/providers/auth-provider';
import { useState } from 'react';
import { Theme } from '@/types/database';

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
  onCreateTheme?: () => void;
  onCreateSubject?: (themeId: string) => void;
  onCreateCategory?: () => void;
}

export function Sidebar({
  collapsed = false,
  onCollapsedChange,
  onCreateTheme,
  onCreateSubject,
  onCreateCategory,
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

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const toggleTheme = (themeId: string) => {
    setOpenThemes((prev) => ({
      ...prev,
      [themeId]: !prev[themeId],
    }));
  };

  const getSubjectsForTheme = (themeId: string) => {
    return subjects?.filter((s) => s.theme_id === themeId) || [];
  };

  const isZombie = (subjectId: string) => {
    return zombies?.some((z) => z.id === subjectId) || false;
  };

  // Nav button with animations - simplified to avoid double-click issues
  const NavButton = ({
    href,
    icon: Icon,
    label,
    isActive,
    badge,
    index,
  }: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    isActive: boolean;
    badge?: React.ReactNode;
    index: number;
  }) => {
    const button = (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
      >
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
      </motion.div>
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
  const renderTheme = (theme: Theme, themeIndex: number) => (
    <motion.div
      key={theme.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: themeIndex * 0.03 }}
    >
      <Collapsible
        open={openThemes[theme.id] ?? false}
        onOpenChange={() => toggleTheme(theme.id)}
      >
        <div className="flex items-center group">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex-1 justify-start gap-2 h-8 text-sm"
            >
              <motion.div
                className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: theme.color_hex }}
                whileHover={{ scale: 1.2 }}
              />
              <span className="flex-1 text-left truncate">{theme.title}</span>
              <motion.div
                animate={{ rotate: openThemes[theme.id] ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-3 w-3" />
              </motion.div>
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onCreateSubject?.(theme.id);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pl-4 space-y-0.5"
          >
            {getSubjectsForTheme(theme.id).map((subject, subIndex) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: subIndex * 0.02 }}
              >
                <Link href={`/subject/${subject.id}`}>
                  <Button
                    variant={
                      pathname === `/subject/${subject.id}`
                        ? 'secondary'
                        : 'ghost'
                    }
                    className="w-full justify-start gap-2 h-7 text-xs group/subject"
                  >
                    <motion.div
                      whileHover={{ rotate: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Folder className="h-3 w-3" />
                    </motion.div>
                    <span className="flex-1 text-left truncate">
                      {subject.title}
                    </span>
                    {isZombie(subject.id) && (
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                      </motion.div>
                    )}
                  </Button>
                </Link>
              </motion.div>
            ))}
            {getSubjectsForTheme(theme.id).length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1 italic">
                No subjects
              </p>
            )}
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );

  // Render a category with its themes
  const renderCategory = (category: CategoryWithThemes, catIndex: number) => (
    <motion.div
      key={category.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: catIndex * 0.05 }}
    >
      <Collapsible
        open={openCategories[category.id] ?? true}
        onOpenChange={() => toggleCategory(category.id)}
      >
        <div className="flex items-center group">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex-1 justify-start gap-2"
            >
              <motion.div whileHover={{ rotate: 10 }} transition={{ duration: 0.2 }}>
                {openCategories[category.id] ? (
                  <FolderOpen className="h-4 w-4" style={{ color: category.color_hex }} />
                ) : (
                  <Folder className="h-4 w-4" style={{ color: category.color_hex }} />
                )}
              </motion.div>
              <span className="flex-1 text-left truncate font-medium">
                {category.title}
              </span>
              <motion.div
                animate={{ rotate: openCategories[category.id] ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </Button>
          </CollapsibleTrigger>
          {category.id !== 'uncategorized' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onCreateTheme?.();
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pl-3 space-y-0.5"
          >
            {category.themes.map((theme, themeIndex) => renderTheme(theme, themeIndex))}
            {category.themes.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1 italic">
                No themes
              </p>
            )}
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="hidden md:flex h-screen flex-col border-r bg-background"
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4 justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <motion.div
            className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0"
            whileHover={{ scale: 1.05, rotate: 3 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-white text-sm font-bold">S</span>
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="tracking-tight overflow-hidden whitespace-nowrap"
              >
                SEDERIZE
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => onCollapsedChange?.(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expand button when collapsed */}
      <AnimatePresence>
        {collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-2 py-2"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full"
                  onClick={() => onCollapsedChange?.(false)}
                >
                  <motion.div
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {mainNavItems.map((item, index) => {
            const isInbox = item.href === '/inbox';
            const isPending = item.href === '/pending';

            let badge: React.ReactNode = null;

            if (isInbox && (inboxCount ?? 0) > 0) {
              badge = (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                >
                  {inboxCount}
                </motion.span>
              );
            } else if (isPending && (waitingCount ?? 0) > 0) {
              badge = (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500"
                >
                  {waitingCount}
                </motion.span>
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
                index={index}
              />
            );
          })}
        </div>

        <Separator className="my-4" />

        {/* Categories > Themes > Subjects - Hide when collapsed */}
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Projects
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={onCreateCategory}>
                      <Layers className="h-4 w-4 mr-2" />
                      Nouvelle Catégorie
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onCreateTheme}>
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

              {categories?.map((category, index) => renderCategory(category, index))}

              {(!categories || categories.length === 0) && (
                <p className="text-xs text-muted-foreground px-2 py-2 text-center">
                  No categories yet
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed: Show category color dots only */}
        <AnimatePresence>
          {collapsed && categories && categories.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              {categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-center"
                        onClick={() => {
                          onCollapsedChange?.(false);
                          setOpenCategories((prev) => ({ ...prev, [category.id]: true }));
                        }}
                      >
                        <motion.div whileHover={{ scale: 1.2 }}>
                          <Folder className="h-4 w-4" style={{ color: category.color_hex }} />
                        </motion.div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {category.title}
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Footer */}
      <motion.div
        className="border-t p-2 space-y-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {collapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/settings">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" className="w-full justify-center">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="ghost"
                    className="w-full justify-center text-muted-foreground"
                    onClick={signOut}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <Link href="/settings">
              <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </motion.div>
            </Link>
            <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </motion.div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
