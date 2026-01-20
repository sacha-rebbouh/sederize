'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { MobileMenu } from './mobile-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useDeleteCategory, useUpdateCategory } from '@/hooks/use-categories';
import { useDeleteTheme, useUpdateTheme } from '@/hooks/use-themes';
import { useDeleteSubject, useUpdateSubject } from '@/hooks/use-subjects';
import { useAuth } from '@/providers/auth-provider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EditEntityDialog } from '@/components/ui/edit-entity-dialog';

// Lazy load heavy components that are conditionally rendered
const QuickAdd = dynamic(() => import('@/components/tasks/quick-add').then(m => m.QuickAdd), {
  ssr: false,
});
const CommandPalette = dynamic(() => import('@/components/command-palette').then(m => m.CommandPalette), {
  ssr: false,
});
const CreateThemeDialog = dynamic(() => import('@/components/themes/create-theme-dialog').then(m => m.CreateThemeDialog), {
  ssr: false,
});
const CreateSubjectDialog = dynamic(() => import('@/components/subjects/create-subject-dialog').then(m => m.CreateSubjectDialog), {
  ssr: false,
});
const CreateCategoryDialog = dynamic(() => import('@/components/categories/create-category-dialog').then(m => m.CreateCategoryDialog), {
  ssr: false,
});

const SIDEBAR_COLLAPSED_KEY = 'sederize-sidebar-collapsed';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isSigningOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [createThemeOpen, setCreateThemeOpen] = useState(false);
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Delete dialogs state
  const [deleteDialog, setDeleteDialog] = useState<{
    type: 'category' | 'theme' | 'subject';
    id: string;
    title: string;
  } | null>(null);

  // Edit dialogs state
  const [editDialog, setEditDialog] = useState<{
    type: 'category' | 'theme' | 'subject';
    id: string;
    title: string;
    color?: string;
  } | null>(null);

  const deleteCategory = useDeleteCategory();
  const deleteTheme = useDeleteTheme();
  const deleteSubject = useDeleteSubject();
  const updateCategory = useUpdateCategory();
  const updateTheme = useUpdateTheme();
  const updateSubject = useUpdateSubject();

  // Load sidebar state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      setSidebarCollapsed(stored === 'true');
    }
  }, []);

  // Save sidebar state to localStorage
  const handleSidebarCollapse = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, []);

  const handleCreateTheme = useCallback((categoryId?: string) => {
    setSelectedCategoryId(categoryId ?? null);
    setCreateThemeOpen(true);
  }, []);

  const handleCreateSubject = useCallback((themeId: string) => {
    setSelectedThemeId(themeId);
    setCreateSubjectOpen(true);
  }, []);

  const handleCreateSubjectFromPalette = useCallback(() => {
    // Open subject dialog without preselected theme
    setSelectedThemeId(null);
    setCreateSubjectOpen(true);
  }, []);

  const handleDeleteCategory = useCallback((id: string, title: string) => {
    setDeleteDialog({ type: 'category', id, title });
  }, []);

  const handleDeleteTheme = useCallback((id: string, title: string) => {
    setDeleteDialog({ type: 'theme', id, title });
  }, []);

  const handleDeleteSubject = useCallback((id: string, title: string) => {
    setDeleteDialog({ type: 'subject', id, title });
  }, []);

  const handleEditCategory = useCallback((id: string, title: string, color: string) => {
    setEditDialog({ type: 'category', id, title, color });
  }, []);

  const handleEditTheme = useCallback((id: string, title: string, color: string) => {
    setEditDialog({ type: 'theme', id, title, color });
  }, []);

  const handleEditSubject = useCallback((id: string, title: string) => {
    setEditDialog({ type: 'subject', id, title });
  }, []);

  const handleSaveEdit = useCallback((title: string, color?: string) => {
    if (!editDialog) return;

    const { type, id } = editDialog;

    if (type === 'category') {
      updateCategory.mutate(
        { id, title, color_hex: color },
        {
          onSuccess: () => {
            toast.success('Catégorie modifiée');
            setEditDialog(null);
          },
        }
      );
    } else if (type === 'theme') {
      updateTheme.mutate(
        { id, title, color_hex: color },
        {
          onSuccess: () => {
            toast.success('Thème modifié');
            setEditDialog(null);
          },
        }
      );
    } else if (type === 'subject') {
      updateSubject.mutate(
        { id, title },
        {
          onSuccess: () => {
            toast.success('Sujet modifié');
            setEditDialog(null);
          },
        }
      );
    }
  }, [editDialog, updateCategory, updateTheme, updateSubject]);

  const confirmDelete = useCallback(() => {
    if (!deleteDialog) return;

    const { type, id, title } = deleteDialog;

    if (type === 'category') {
      deleteCategory.mutate(id, {
        onSuccess: () => toast.success(`Catégorie "${title}" supprimée`),
      });
    } else if (type === 'theme') {
      deleteTheme.mutate(id, {
        onSuccess: () => toast.success(`Thème "${title}" supprimé`),
      });
    } else if (type === 'subject') {
      deleteSubject.mutate(id, {
        onSuccess: () => toast.success(`Sujet "${title}" supprimé`),
      });
    }

    setDeleteDialog(null);
  }, [deleteDialog, deleteCategory, deleteTheme, deleteSubject]);

  // Show loading screen during sign out to prevent flash
  if (isSigningOut) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Signing out...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={handleSidebarCollapse}
          onCreateCategory={() => setCreateCategoryOpen(true)}
          onCreateTheme={handleCreateTheme}
          onCreateSubject={handleCreateSubject}
          onDeleteCategory={handleDeleteCategory}
          onDeleteTheme={handleDeleteTheme}
          onDeleteSubject={handleDeleteSubject}
          onEditCategory={handleEditCategory}
          onEditTheme={handleEditTheme}
          onEditSubject={handleEditSubject}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Fixed safe area spacer - doesn't scroll */}
          <div
            className="flex-shrink-0 bg-background md:hidden"
            style={{ height: 'env(safe-area-inset-top, 0px)' }}
          />
          <div className="flex-1 overflow-auto pb-20 md:pb-0">
            {children}
          </div>
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
          onCreateTheme={() => handleCreateTheme()}
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
          categoryId={selectedCategoryId}
        />

        {/* Create Subject Dialog */}
        <CreateSubjectDialog
          open={createSubjectOpen}
          onOpenChange={setCreateSubjectOpen}
          themeId={selectedThemeId}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={!!deleteDialog}
          onOpenChange={(open) => !open && setDeleteDialog(null)}
          title={
            deleteDialog?.type === 'category'
              ? 'Supprimer cette catégorie ?'
              : deleteDialog?.type === 'theme'
              ? 'Supprimer ce thème ?'
              : 'Supprimer ce sujet ?'
          }
          description={
            deleteDialog?.type === 'category'
              ? `La catégorie "${deleteDialog?.title}" sera supprimée. Les thèmes qu'elle contient deviendront non-catégorisés.`
              : deleteDialog?.type === 'theme'
              ? `Le thème "${deleteDialog?.title}" et tous ses sujets et tâches seront supprimés.`
              : `Le sujet "${deleteDialog?.title}" et toutes ses tâches seront supprimés.`
          }
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          variant="destructive"
          onConfirm={confirmDelete}
        />

        {/* Edit Entity Dialog */}
        {editDialog && (
          <EditEntityDialog
            open={!!editDialog}
            onOpenChange={(open) => !open && setEditDialog(null)}
            type={editDialog.type}
            initialTitle={editDialog.title}
            initialColor={editDialog.color}
            onSave={handleSaveEdit}
            isPending={
              updateCategory.isPending ||
              updateTheme.isPending ||
              updateSubject.isPending
            }
          />
        )}
      </div>
    </TooltipProvider>
  );
}
