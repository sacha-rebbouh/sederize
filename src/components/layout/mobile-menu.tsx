'use client';

import Link from 'next/link';
import {
  Settings,
  LogOut,
  Folder,
  AlertTriangle,
  ChevronRight,
  Clock,
  Archive,
  Kanban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useThemes } from '@/hooks/use-themes';
import { useActiveSubjects, useZombieSubjects } from '@/hooks/use-subjects';
import { useAuth } from '@/providers/auth-provider';

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMenu({ open, onOpenChange }: MobileMenuProps) {
  const { signOut } = useAuth();
  const { data: themes } = useThemes();
  const { data: subjects } = useActiveSubjects();
  const { data: zombies } = useZombieSubjects();

  const getSubjectsForTheme = (themeId: string) => {
    return subjects?.filter((s) => s.theme_id === themeId) || [];
  };

  const isZombie = (subjectId: string) => {
    return zombies?.some((z) => z.id === subjectId) || false;
  };

  const handleNavigation = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
          <div className="p-4 space-y-4">
            {/* Quick Links */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Navigation
              </h3>
              <div className="space-y-1">
                <Link href="/kanban" onClick={handleNavigation}>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <Kanban className="h-4 w-4" />
                    Kanban
                  </Button>
                </Link>
                <Link href="/pending" onClick={handleNavigation}>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <Clock className="h-4 w-4" />
                    En Attente
                  </Button>
                </Link>
                <Link href="/archives" onClick={handleNavigation}>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <Archive className="h-4 w-4" />
                    Archives
                  </Button>
                </Link>
              </div>
            </div>

            <Separator />

            {/* Themes & Subjects */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Themes & Subjects
              </h3>

              {themes?.map((theme) => (
                <div key={theme.id} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: theme.color_hex }}
                    />
                    <span className="font-medium text-sm">{theme.title}</span>
                  </div>

                  <div className="pl-5 space-y-1">
                    {getSubjectsForTheme(theme.id).map((subject) => (
                      <Link
                        key={subject.id}
                        href={`/subject/${subject.id}`}
                        onClick={handleNavigation}
                      >
                        <Button
                          variant="ghost"
                          className="w-full justify-between h-10"
                        >
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            <span className="truncate">{subject.title}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {isZombie(subject.id) && (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <Separator />

        <div className="p-4 space-y-2">
          <Link href="/settings" onClick={handleNavigation}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => {
              handleNavigation();
              signOut();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
