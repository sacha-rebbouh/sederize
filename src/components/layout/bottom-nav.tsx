'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Inbox,
  LayoutDashboard,
  Menu,
  ListTodo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useInboxCount } from '@/hooks/use-tasks';

const INBOX_ALERT_THRESHOLD = 5;

interface BottomNavProps {
  onMenuClick?: () => void;
}

const navItems = [
  {
    title: 'Brief',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Taches',
    href: '/tasks',
    icon: ListTodo,
  },
  {
    title: 'Inbox',
    href: '/inbox',
    icon: Inbox,
  },
  {
    title: 'Agenda',
    href: '/calendar',
    icon: CalendarDays,
  },
];

export function BottomNav({ onMenuClick }: BottomNavProps) {
  const pathname = usePathname();
  const { data: inboxCount } = useInboxCount();
  const showInboxAlert = (inboxCount ?? 0) >= INBOX_ALERT_THRESHOLD;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isInbox = item.href === '/inbox';
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <Button
                variant="ghost"
                className={cn(
                  'w-full h-14 flex-col gap-1 rounded-xl relative',
                  isActive && 'bg-primary/10 text-primary'
                )}
              >
                <div className="relative">
                  <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                  {/* Inbox alert badge */}
                  {isInbox && (inboxCount ?? 0) > 0 && (
                    <span
                      className={cn(
                        'absolute -top-1 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold rounded-full',
                        showInboxAlert
                          ? 'bg-amber-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {inboxCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{item.title}</span>
              </Button>
            </Link>
          );
        })}
        <Button
          variant="ghost"
          className="flex-1 h-14 flex-col gap-1 rounded-xl"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs font-medium">Plus</span>
        </Button>
      </div>
    </nav>
  );
}
