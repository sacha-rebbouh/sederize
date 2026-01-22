'use client';

import { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Palette,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Download,
  Keyboard,
  Bell,
  Layers,
  Lock,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/providers/auth-provider';
import { useThemes, useDeleteTheme, useUpdateTheme } from '@/hooks/use-themes';
import { useCategories, useDeleteCategory, useUpdateCategory } from '@/hooks/use-categories';
import { useLocalPreferences } from '@/hooks/use-preferences';
import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const THEME_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

const KEYBOARD_SHORTCUTS = [
  { action: 'Palette de commandes', keys: ['Cmd', 'K'] },
  { action: 'Creer une tache', keys: ['C'] },
  { action: 'Brief du jour', keys: ['D'] },
  { action: 'Boite de reception', keys: ['I'] },
  { action: 'Calendrier', keys: ['L'] },
  { action: 'Kanban', keys: ['B'] },
  { action: 'Toutes les taches', keys: ['T'] },
  { action: 'En attente', keys: ['P'] },
  { action: 'Archives', keys: ['A'] },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: themes } = useThemes();
  const { data: categories } = useCategories();
  const deleteTheme = useDeleteTheme();
  const updateTheme = useUpdateTheme();
  const deleteCategory = useDeleteCategory();
  const updateCategory = useUpdateCategory();
  const { preferences, updatePreference } = useLocalPreferences();
  const { theme: themeMode, setTheme: setThemeMode } = useTheme();

  const [editingTheme, setEditingTheme] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('');

  // Delete confirmation dialogs
  const [deleteThemeDialog, setDeleteThemeDialog] = useState<{open: boolean, id: string, title: string}>({open: false, id: '', title: ''});
  const [deleteCategoryDialog, setDeleteCategoryDialog] = useState<{open: boolean, id: string, title: string}>({open: false, id: '', title: ''});

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const supabase = createClient();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Le mot de passe actuel est requis');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }

    setPasswordLoading(true);

    try {
      // First, verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        setPasswordError('Mot de passe actuel incorrect');
        setPasswordLoading(false);
        return;
      }

      // If current password is correct, update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Mot de passe mis a jour avec succes');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Erreur lors de la mise a jour du mot de passe');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleStartEdit = (themeId: string, currentTitle: string, currentColor: string) => {
    setEditingTheme(themeId);
    setEditTitle(currentTitle);
    setEditColor(currentColor);
  };

  const handleSaveEdit = (themeId: string) => {
    if (editTitle.trim()) {
      updateTheme.mutate({ id: themeId, title: editTitle, color_hex: editColor });
    }
    setEditingTheme(null);
    setEditTitle('');
    setEditColor('');
  };

  const handleDeleteTheme = (themeId: string, title: string) => {
    setDeleteThemeDialog({ open: true, id: themeId, title });
  };

  const handleStartCategoryEdit = (categoryId: string, currentTitle: string, currentColor: string) => {
    setEditingCategory(categoryId);
    setEditTitle(currentTitle);
    setEditColor(currentColor);
  };

  const handleSaveCategoryEdit = (categoryId: string) => {
    if (editTitle.trim()) {
      updateCategory.mutate({ id: categoryId, title: editTitle, color_hex: editColor });
    }
    setEditingCategory(null);
    setEditTitle('');
    setEditColor('');
  };

  const handleDeleteCategory = (categoryId: string, title: string) => {
    setDeleteCategoryDialog({ open: true, id: categoryId, title });
  };

  const handleExportData = async () => {
    // TODO: Implement full data export
    toast.success('Fonctionnalite d\'export bientot disponible !');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-2xl md:text-3xl font-bold">Parametres</h1>
      </div>

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Apparence
          </CardTitle>
          <CardDescription>Personnalisez l'apparence de Sederize</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Mode */}
          <div className="space-y-3">
            <Label>Theme</Label>
            <div className="flex gap-2">
              {[
                { value: 'light', icon: Sun, label: 'Clair' },
                { value: 'dark', icon: Moon, label: 'Sombre' },
                { value: 'system', icon: Monitor, label: 'Systeme' },
              ].map((mode) => (
                <Button
                  key={mode.value}
                  variant={themeMode === mode.value ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setThemeMode(mode.value as 'light' | 'dark' | 'system')}
                >
                  <mode.icon className="h-4 w-4 mr-2" />
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Default View */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Vue par defaut</Label>
              <p className="text-sm text-muted-foreground">
                La vue affichee a l'ouverture de l'application
              </p>
            </div>
            <Select
              value={preferences.preferred_view}
              onValueChange={(value) => updatePreference('preferred_view', value as 'daily-brief' | 'inbox' | 'calendar' | 'kanban')}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily-brief">Brief du jour</SelectItem>
                <SelectItem value="inbox">Boite de reception</SelectItem>
                <SelectItem value="calendar">Calendrier</SelectItem>
                <SelectItem value="kanban">Kanban</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Gerez les resumés par email et les rappels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Resume quotidien par email</Label>
              <p className="text-sm text-muted-foreground">
                Recevez un resume de vos taches chaque matin
              </p>
            </div>
            <Switch
              checked={preferences.email_digest_enabled}
              onCheckedChange={(checked) => updatePreference('email_digest_enabled', checked)}
            />
          </div>

          {preferences.email_digest_enabled && (
            <div className="flex items-center justify-between pl-4 border-l-2">
              <Label>Heure d'envoi</Label>
              <Input
                type="time"
                value={preferences.email_digest_time}
                onChange={(e) => updatePreference('email_digest_time', e.target.value)}
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">User ID</Label>
            <p className="font-mono text-sm text-muted-foreground">{user?.id}</p>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Securite
          </CardTitle>
          <CardDescription>Changez votre mot de passe</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 text-sm text-green-600 bg-green-500/10 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Mot de passe mis a jour avec succes
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Entrez le mot de passe actuel"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Entrez le nouveau mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirmez le nouveau mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mise a jour...
                </>
              ) : (
                'Mettre a jour le mot de passe'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Categories Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Catégories
          </CardTitle>
          <CardDescription>Gérez vos catégories de projets</CardDescription>
        </CardHeader>
        <CardContent>
          {!categories || categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune catégorie. Créez-en une depuis la sidebar.
            </p>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {editingCategory === category.id ? (
                      <>
                        {/* Color picker */}
                        <div className="flex gap-1">
                          {THEME_COLORS.map((color) => (
                            <button
                              key={color}
                              className={cn(
                                'h-6 w-6 rounded-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                editColor === color && 'ring-2 ring-offset-2 ring-primary scale-110'
                              )}
                              style={{ backgroundColor: color }}
                              onClick={() => setEditColor(color)}
                              aria-label={`Couleur ${color}`}
                            />
                          ))}
                        </div>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCategoryEdit(category.id);
                            if (e.key === 'Escape') setEditingCategory(null);
                          }}
                          className="h-8 flex-1"
                          autoFocus
                        />
                        <Button size="sm" onClick={() => handleSaveCategoryEdit(category.id)}>
                          Enregistrer
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCategory(null)}
                        >
                          Annuler
                        </Button>
                      </>
                    ) : (
                      <>
                        <div
                          className="h-6 w-6 rounded-md cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: category.color_hex }}
                          onClick={() =>
                            handleStartCategoryEdit(category.id, category.title, category.color_hex)
                          }
                        />
                        <span
                          className="font-medium cursor-pointer hover:underline"
                          onClick={() =>
                            handleStartCategoryEdit(category.id, category.title, category.color_hex)
                          }
                        >
                          {category.title}
                        </span>
                      </>
                    )}
                  </div>

                  {editingCategory !== category.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCategory(category.id, category.title)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Themes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Themes
          </CardTitle>
          <CardDescription>Gerez vos themes et leurs couleurs</CardDescription>
        </CardHeader>
        <CardContent>
          {!themes || themes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun theme. Creez-en un depuis la sidebar.
            </p>
          ) : (
            <div className="space-y-3">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {editingTheme === theme.id ? (
                      <>
                        {/* Color picker */}
                        <div className="flex gap-1">
                          {THEME_COLORS.map((color) => (
                            <button
                              key={color}
                              className={cn(
                                'h-6 w-6 rounded-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                editColor === color && 'ring-2 ring-offset-2 ring-primary scale-110'
                              )}
                              style={{ backgroundColor: color }}
                              onClick={() => setEditColor(color)}
                              aria-label={`Couleur ${color}`}
                            />
                          ))}
                        </div>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(theme.id);
                            if (e.key === 'Escape') setEditingTheme(null);
                          }}
                          className="h-8 flex-1"
                          autoFocus
                        />
                        <Button size="sm" onClick={() => handleSaveEdit(theme.id)}>
                          Enregistrer
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTheme(null)}
                        >
                          Annuler
                        </Button>
                      </>
                    ) : (
                      <>
                        <div
                          className="h-6 w-6 rounded-md cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: theme.color_hex }}
                          onClick={() =>
                            handleStartEdit(theme.id, theme.title, theme.color_hex)
                          }
                        />
                        <span
                          className="font-medium cursor-pointer hover:underline"
                          onClick={() =>
                            handleStartEdit(theme.id, theme.title, theme.color_hex)
                          }
                        >
                          {theme.title}
                        </span>
                      </>
                    )}
                  </div>

                  {editingTheme !== theme.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTheme(theme.id, theme.title)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Raccourcis clavier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {KEYBOARD_SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.action}
                className="flex items-center justify-between py-1"
              >
                <span className="text-sm">{shortcut.action}</span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key) => (
                    <Badge key={key} variant="outline" className="font-mono text-xs">
                      {key}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5" />
            Donnees
          </CardTitle>
          <CardDescription>Exportez ou gerez vos donnees</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Exporter toutes les donnees
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">A propos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong>SEDERIZE</strong> - Order from Chaos. A structured task
            management system for high-performance individuals.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with Next.js, Supabase, and Tailwind CSS.
          </p>
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
        </CardContent>
      </Card>

      {/* Delete Theme Confirmation Dialog */}
      <ConfirmDialog
        open={deleteThemeDialog.open}
        onOpenChange={(open) => setDeleteThemeDialog(prev => ({...prev, open}))}
        title="Supprimer le thème"
        description={`Supprimer "${deleteThemeDialog.title}" ? Cela supprimera aussi tous les sujets et tâches associés.`}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => {
          deleteTheme.mutate(deleteThemeDialog.id);
          setDeleteThemeDialog({ open: false, id: '', title: '' });
        }}
      />

      {/* Delete Category Confirmation Dialog */}
      <ConfirmDialog
        open={deleteCategoryDialog.open}
        onOpenChange={(open) => setDeleteCategoryDialog(prev => ({...prev, open}))}
        title="Supprimer la catégorie"
        description={`Supprimer "${deleteCategoryDialog.title}" ? Les thèmes de cette catégorie deviendront non-catégorisés.`}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => {
          deleteCategory.mutate(deleteCategoryDialog.id);
          setDeleteCategoryDialog({ open: false, id: '', title: '' });
        }}
      />
    </div>
  );
}
