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
} from 'lucide-react';
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
import { useLocalPreferences } from '@/hooks/use-preferences';
import { cn } from '@/lib/utils';

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
  { action: 'Open Command Palette', keys: ['Cmd', 'K'] },
  { action: 'Quick Add Task', keys: ['C'] },
  { action: 'Go to Daily Brief', keys: ['G', 'D'] },
  { action: 'Go to Inbox', keys: ['G', 'I'] },
  { action: 'Go to Calendar', keys: ['G', 'C'] },
  { action: 'Go to Kanban', keys: ['G', 'K'] },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: themes } = useThemes();
  const deleteTheme = useDeleteTheme();
  const updateTheme = useUpdateTheme();
  const { preferences, updatePreference } = useLocalPreferences();

  const [editingTheme, setEditingTheme] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('');

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
    if (confirm(`Delete "${title}"? This will also delete all subjects and tasks within it.`)) {
      deleteTheme.mutate(themeId);
    }
  };

  const handleExportData = async () => {
    // TODO: Implement full data export
    toast.success('Export feature coming soon!');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
      </div>

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how Sederize looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Mode */}
          <div className="space-y-3">
            <Label>Theme</Label>
            <div className="flex gap-2">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' },
              ].map((mode) => (
                <Button
                  key={mode.value}
                  variant={preferences.theme_mode === mode.value ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => updatePreference('theme_mode', mode.value as 'light' | 'dark' | 'system')}
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
              <Label>Default View</Label>
              <p className="text-sm text-muted-foreground">
                The view shown when you open the app
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
                <SelectItem value="daily-brief">Daily Brief</SelectItem>
                <SelectItem value="inbox">Inbox</SelectItem>
                <SelectItem value="calendar">Calendar</SelectItem>
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
          <CardDescription>Manage email digests and reminders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Daily Email Digest</Label>
              <p className="text-sm text-muted-foreground">
                Receive a summary of your tasks each morning
              </p>
            </div>
            <Switch
              checked={preferences.email_digest_enabled}
              onCheckedChange={(checked) => updatePreference('email_digest_enabled', checked)}
            />
          </div>

          {preferences.email_digest_enabled && (
            <div className="flex items-center justify-between pl-4 border-l-2">
              <Label>Digest Time</Label>
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

      {/* Themes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Themes
          </CardTitle>
          <CardDescription>Manage your themes and their colors</CardDescription>
        </CardHeader>
        <CardContent>
          {!themes || themes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No themes yet. Create one from the sidebar.
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
                                'h-6 w-6 rounded-md transition-transform',
                                editColor === color && 'ring-2 ring-offset-2 ring-primary scale-110'
                              )}
                              style={{ backgroundColor: color }}
                              onClick={() => setEditColor(color)}
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
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTheme(null)}
                        >
                          Cancel
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
            Keyboard Shortcuts
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
            Data
          </CardTitle>
          <CardDescription>Export or manage your data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export All Data
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About</CardTitle>
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
    </div>
  );
}
