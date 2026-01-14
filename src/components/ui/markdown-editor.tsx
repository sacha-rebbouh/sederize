'use client';

import { useState, useCallback, useMemo } from 'react';
import { Eye, Pencil, Bold, Italic, Link as LinkIcon, List, Code, Heading } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  isSaving?: boolean;
}

// Simple markdown to HTML parser
function parseMarkdown(text: string): string {
  if (!text) return '';

  let html = text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers (## Header)
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    // Bold (**text** or __text__)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>')
    // Italic (*text* or _text_)
    .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
    .replace(/_([^_]+)_/g, '<em class="italic">$1</em>')
    // Inline code (`code`)
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">$1</code>')
    // Links [text](url)
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline">$1</a>'
    )
    // Unordered lists (- item)
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Ordered lists (1. item)
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Horizontal rule (---)
    .replace(/^---$/gm, '<hr class="my-4 border-border" />')
    // Code blocks (```code```)
    .replace(
      /```([\s\S]*?)```/g,
      '<pre class="p-3 rounded-md bg-muted overflow-x-auto my-2"><code class="text-sm font-mono">$1</code></pre>'
    )
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br />');

  // Wrap list items in ul/ol
  html = html.replace(
    /(<li class="ml-4 list-disc">[\s\S]*?<\/li>)+/g,
    '<ul class="my-2">$&</ul>'
  );
  html = html.replace(
    /(<li class="ml-4 list-decimal">[\s\S]*?<\/li>)+/g,
    '<ol class="my-2">$&</ol>'
  );

  return `<p class="mb-2">${html}</p>`;
}

// Toolbar button helper
function insertMarkdown(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  defaultText: string,
  onChange: (value: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end) || defaultText;
  const newValue =
    textarea.value.substring(0, start) +
    before +
    selectedText +
    after +
    textarea.value.substring(end);

  onChange(newValue);

  // Restore cursor position
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(
      start + before.length,
      start + before.length + selectedText.length
    );
  }, 0);
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write something...',
  minHeight = '300px',
  className,
  isSaving,
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useCallback((node: HTMLTextAreaElement | null) => {
    if (node) {
      (window as unknown as { _mdTextarea: HTMLTextAreaElement })._mdTextarea = node;
    }
  }, []);

  const getTextarea = () =>
    (window as unknown as { _mdTextarea: HTMLTextAreaElement })._mdTextarea;

  const renderedMarkdown = useMemo(() => parseMarkdown(value), [value]);

  const toolbarButtons = [
    {
      icon: Heading,
      label: 'Heading',
      action: () => {
        const ta = getTextarea();
        if (ta) insertMarkdown(ta, '## ', '', 'Heading', onChange);
      },
    },
    {
      icon: Bold,
      label: 'Bold',
      action: () => {
        const ta = getTextarea();
        if (ta) insertMarkdown(ta, '**', '**', 'bold text', onChange);
      },
    },
    {
      icon: Italic,
      label: 'Italic',
      action: () => {
        const ta = getTextarea();
        if (ta) insertMarkdown(ta, '*', '*', 'italic text', onChange);
      },
    },
    {
      icon: LinkIcon,
      label: 'Link',
      action: () => {
        const ta = getTextarea();
        if (ta) insertMarkdown(ta, '[', '](url)', 'link text', onChange);
      },
    },
    {
      icon: List,
      label: 'List',
      action: () => {
        const ta = getTextarea();
        if (ta) insertMarkdown(ta, '- ', '', 'list item', onChange);
      },
    },
    {
      icon: Code,
      label: 'Code',
      action: () => {
        const ta = getTextarea();
        if (ta) insertMarkdown(ta, '`', '`', 'code', onChange);
      },
    },
  ];

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-2 py-1">
        <div className="flex items-center gap-0.5">
          {!isPreview &&
            toolbarButtons.map((btn) => (
              <Button
                key={btn.label}
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={btn.action}
                title={btn.label}
              >
                <btn.icon className="h-3.5 w-3.5" />
              </Button>
            ))}
        </div>

        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          <div className="flex border rounded overflow-hidden">
            <Button
              type="button"
              variant={!isPreview ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 rounded-none px-2 text-xs"
              onClick={() => setIsPreview(false)}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              type="button"
              variant={isPreview ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 rounded-none px-2 text-xs"
              onClick={() => setIsPreview(true)}
            >
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isPreview ? (
        <div
          className="p-4 prose prose-sm dark:prose-invert max-w-none overflow-auto"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: renderedMarkdown || `<p class="text-muted-foreground italic">Nothing to preview</p>` }}
        />
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="border-0 rounded-none resize-none focus-visible:ring-0 font-mono text-sm"
          style={{ minHeight }}
        />
      )}

      {/* Help text */}
      {!isPreview && (
        <div className="px-3 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
          Supports Markdown: **bold**, *italic*, `code`, [links](url), ## headings, - lists
        </div>
      )}
    </div>
  );
}

// Standalone markdown renderer for read-only display
export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div
      className={cn('prose prose-sm dark:prose-invert max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
