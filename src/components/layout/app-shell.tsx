'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { MobileMenu } from './mobile-menu';
import { QuickAdd } from '@/components/tasks/quick-add';
import { CommandPalette } from '@/components/command-palette';
import { CreateThemeDialog } from '@/components/themes/create-theme-dialog';
import { CreateSubjectDialog } from '@/components/subjects/create-subject-dialog';
import { CreateCategoryDialog } from '@/components/categories/create-category-dialog';
import { TooltipProvider } from '@/components/ui/tooltip';

const SIDEBAR_COLLAPSED_KEY = 'sederize-sidebar-collapsed';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [createThemeOpen, setCreateThemeOpen] = useState(false);
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      setSidebarCollapsed(stored === 'true');
    }
  }, []);

  // Save sidebar state to localStorage
  const handleSidebarCollapse = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  };

  const handleCreateSubject = (themeId: string) => {
    setSelectedThemeId(themeId);
    setCreateSubjectOpen(true);
  };

  const handleCreateSubjectFromPalette = () => {
    // Open subject dialog without preselected theme
    setSelectedThemeId(null);
    setCreateSubjectOpen(true);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={handleSidebarCollapse}
          onCreateCategory={() => setCreateCategoryOpen(true)}
          onCreateTheme={() => setCreateThemeOpen(true)}
          onCreateSubject={handleCreateSubject}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto pb-20 md:pb-0">{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav onMenuClick={() => setMobileMenuOpen(true)} />

        {/* Mobile Menu Sheet */}
        <MobileMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

        {/* Quick Add FAB */}
        <QuickAdd open={quickAddOpen} onOpenChange={setQuickAddOpen} />

        {/* Command Palette (Cmd+K) */}
        <CommandPalette
          onCreateTask={() => setQuickAddOpen(true)}
          onCreateTheme={() => setCreateThemeOpen(true)}
          onCreateSubject={handleCreateSubjectFromPalette}
        />

        {/* Create Category Dialog */}
        <CreateCategoryDialog
          open={createCategoryOpen}
          onOpenChange={setCreateCategoryOpen}
        />

        {/* Create Theme Dialog */}
        <CreateThemeDialog
          open={createThemeOpen}
          onOpenChange={setCreateThemeOpen}
        />

        {/* Create Subject Dialog */}
        <CreateSubjectDialog
          open={createSubjectOpen}
          onOpenChange={setCreateSubjectOpen}
          themeId={selectedThemeId}
        />
      </div>
    </TooltipProvider>
  );
}
