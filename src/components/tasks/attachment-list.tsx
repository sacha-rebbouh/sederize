'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Upload,
  X,
  Trash2,
  Download,
  Image as ImageIcon,
  FileText,
  Film,
  Music,
  Archive,
  File,
  Table,
  Presentation,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useTaskAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  formatFileSize,
  getFileIcon,
} from '@/hooks/use-attachments';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface AttachmentListProps {
  taskId: string;
  className?: string;
  readOnly?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  image: <ImageIcon className="h-4 w-4" />,
  video: <Film className="h-4 w-4" />,
  audio: <Music className="h-4 w-4" />,
  'file-text': <FileText className="h-4 w-4" />,
  table: <Table className="h-4 w-4" />,
  presentation: <Presentation className="h-4 w-4" />,
  archive: <Archive className="h-4 w-4" />,
  file: <File className="h-4 w-4" />,
};

export function AttachmentList({ taskId, className, readOnly = false }: AttachmentListProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments, isLoading } = useTaskAttachments(taskId);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    return null;
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        continue;
      }

      uploadAttachment.mutate(
        { taskId, file },
        {
          onSuccess: () => {
            toast.success(`Uploaded ${file.name}`);
          },
          onError: (err) => {
            toast.error(`Failed to upload ${file.name}`);
            console.error(err);
          },
        }
      );
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleUpload(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [taskId]
  );

  const handleDelete = (attachmentId: string, storagePath: string, fileName: string) => {
    if (confirm(`Delete ${fileName}?`)) {
      deleteAttachment.mutate(
        { id: attachmentId, storagePath, taskId },
        {
          onSuccess: () => {
            toast.success('Attachment deleted');
          },
          onError: () => {
            toast.error('Failed to delete attachment');
          },
        }
      );
    }
  };

  const handleDownload = async (storagePath: string, fileName: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(storagePath, 60);

      if (error) throw error;

      // Open in new tab or trigger download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error('Failed to download file');
      console.error(err);
    }
  };

  const handlePreview = async (storagePath: string, fileType: string) => {
    if (!fileType.startsWith('image/')) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(storagePath, 300);

      if (error) throw error;
      setPreviewUrl(data.signedUrl);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground animate-pulse">
        Loading attachments...
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Attachments</span>
        {attachments && attachments.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {attachments.length} file{attachments.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Drop zone */}
      {!readOnly && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          {uploadAttachment.isPending ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Upload className="h-5 w-5" />
              <span className="text-sm">Drop files here or click to upload</span>
              <span className="text-xs">Max 10MB per file</span>
            </div>
          )}
        </div>
      )}

      {/* Attachment list */}
      {attachments && attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const iconType = getFileIcon(attachment.file_type);
            const isImage = attachment.file_type.startsWith('image/');

            return (
              <div
                key={attachment.id}
                className="group flex items-center gap-3 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
              >
                {/* Icon */}
                <div className="flex-shrink-0 h-8 w-8 rounded bg-background flex items-center justify-center text-muted-foreground">
                  {iconMap[iconType] || iconMap.file}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      isImage && 'cursor-pointer hover:underline'
                    )}
                    onClick={() => isImage && handlePreview(attachment.storage_path, attachment.file_type)}
                  >
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDownload(attachment.storage_path, attachment.file_name)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() =>
                        handleDelete(attachment.id, attachment.storage_path, attachment.file_name)
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {(!attachments || attachments.length === 0) && readOnly && (
        <p className="text-xs text-muted-foreground italic py-2">
          No attachments
        </p>
      )}

      {/* Image preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
