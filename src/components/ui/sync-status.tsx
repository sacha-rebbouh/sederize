'use client';

import { usePowerSyncState } from '@/providers/powersync-provider';
import { Cloud, CloudOff, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SyncStatusProps {
  /** Show as compact badge (icon only) or full (icon + text) */
  variant?: 'compact' | 'full';
  /** Additional CSS classes */
  className?: string;
  /** Show refresh button */
  showRefresh?: boolean;
}

/**
 * Displays the current PowerSync synchronization status
 * Shows: connected/offline, syncing, pending changes count
 */
export function SyncStatus({
  variant = 'compact',
  className,
  showRefresh = false,
}: SyncStatusProps) {
  const {
    isConnected,
    isSyncing,
    hasPendingChanges,
    pendingChangesCount,
    lastSyncedAt,
    syncError,
    triggerSync,
  } = usePowerSyncState();

  // Determine status
  const getStatus = () => {
    if (syncError) return 'error';
    if (isSyncing) return 'syncing';
    if (!isConnected) return 'offline';
    if (hasPendingChanges) return 'pending';
    return 'synced';
  };

  const status = getStatus();

  // Status config
  const statusConfig: Record<string, {
    icon: typeof Cloud;
    label: string;
    color: string;
    bgColor: string;
    animate?: boolean;
  }> = {
    synced: {
      icon: Cloud,
      label: 'Synchronisé',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    syncing: {
      icon: Loader2,
      label: 'Synchronisation...',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      animate: true,
    },
    offline: {
      icon: CloudOff,
      label: 'Hors ligne',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    pending: {
      icon: Cloud,
      label: `${pendingChangesCount} en attente`,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    error: {
      icon: AlertCircle,
      label: 'Erreur de sync',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  // Build tooltip content
  const tooltipContent = () => {
    const lines: string[] = [];

    if (status === 'synced') {
      lines.push('Toutes les données sont synchronisées');
    } else if (status === 'syncing') {
      lines.push('Synchronisation en cours...');
    } else if (status === 'offline') {
      lines.push('Mode hors ligne');
      lines.push('Les modifications seront synchronisées à la reconnexion');
    } else if (status === 'pending') {
      lines.push(`${pendingChangesCount} modification(s) en attente`);
    } else if (status === 'error') {
      lines.push('Erreur de synchronisation');
      if (syncError) lines.push(syncError.message);
    }

    if (lastSyncedAt) {
      lines.push(
        `Dernière sync: ${formatDistanceToNow(lastSyncedAt, {
          addSuffix: true,
          locale: fr,
        })}`
      );
    }

    return lines;
  };

  // Compact variant (icon only)
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2 py-1',
                config.bgColor,
                className
              )}
            >
              <Icon
                className={cn(
                  'h-3.5 w-3.5',
                  config.color,
                  config.animate && 'animate-spin'
                )}
              />
              {hasPendingChanges && !isSyncing && (
                <span className={cn('text-xs font-medium', config.color)}>
                  {pendingChangesCount}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              {tooltipContent().map((line, i) => (
                <p key={i} className="text-xs">
                  {line}
                </p>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full variant (icon + text + optional refresh)
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2',
        config.bgColor,
        className
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4',
          config.color,
          config.animate && 'animate-spin'
        )}
      />
      <div className="flex flex-col">
        <span className={cn('text-sm font-medium', config.color)}>
          {config.label}
        </span>
        {lastSyncedAt && status === 'synced' && (
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(lastSyncedAt, {
              addSuffix: true,
              locale: fr,
            })}
          </span>
        )}
      </div>

      {showRefresh && !isSyncing && (
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8"
          onClick={() => triggerSync()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Minimal sync indicator for the header/navbar
 * Just shows a small dot with appropriate color
 */
export function SyncIndicator({ className }: { className?: string }) {
  const { isConnected, isSyncing, hasPendingChanges, syncError } =
    usePowerSyncState();

  const getColor = () => {
    if (syncError) return 'bg-red-500';
    if (isSyncing) return 'bg-blue-500 animate-pulse';
    if (!isConnected) return 'bg-amber-500';
    if (hasPendingChanges) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn('h-2 w-2 rounded-full', getColor(), className)}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {syncError
              ? 'Erreur de sync'
              : isSyncing
                ? 'Synchronisation...'
                : !isConnected
                  ? 'Hors ligne'
                  : hasPendingChanges
                    ? 'Modifications en attente'
                    : 'Synchronisé'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
