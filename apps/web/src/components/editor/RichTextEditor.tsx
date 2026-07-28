'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Image as ImageIcon,
  Undo,
  Redo,
  X,
} from 'lucide-react';
import { useEditorDraft } from '@/components/editor/EditorDraftContext';
import { POPULAR_TAGS } from '@/components/editor/data';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  onOpenImageEmbed: () => void;
}

const MenuBar = ({
  editor,
  onOpenImageEmbed,
}: {
  editor: ReturnType<typeof useEditor>;
  onOpenImageEmbed: () => void;
}) => {
  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    isActive,
    disabled,
    children,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-2 rounded transition-colors',
        isActive
          ? 'bg-brand-red/10 text-brand-red'
          : 'text-brand-text-secondary hover:bg-brand-hover hover:text-brand-text-primary',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-brand-border bg-white p-2">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-2 h-6 w-px bg-brand-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-2 h-6 w-px bg-brand-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-2 h-6 w-px bg-brand-border" />

      <button
        onClick={onOpenImageEmbed}
        className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium text-brand-text-primary hover:bg-brand-hover transition-colors"
      >
        <ImageIcon className="h-4 w-4 text-brand-red" />
        Embed Image
      </button>

      <div className="mx-2 h-6 w-px bg-brand-border" />

      <div className="ml-auto flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </div>
  );
};

export function RichTextEditor({ onOpenImageEmbed }: RichTextEditorProps) {
  const {
    title,
    setTitle,
    tags,
    setTags,
    registerEditor,
    handleTitleBlur,
    notifyContentChanged,
    initialBody,
  } = useEditorDraft();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: initialBody ?? '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none max-w-none p-6 min-h-[400px]',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const text = ed.state.doc.textContent;
      const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
      const chars = text.length;
      notifyContentChanged(words, chars);
    },
  });

  // Register the TipTap editor instance in context so saveDraft/uploadImage
  // can call editor.getJSON()
  useEffect(() => {
    registerEditor(editor ?? null);
    return () => registerEditor(null);
  }, [editor, registerEditor]);

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const addTag = (tagToAdd: string) => {
    if (!tags.includes(tagToAdd)) {
      setTags([...tags, tagToAdd]);
    }
  };

  return (
    <div className="flex flex-col rounded-xl bg-white shadow-sm border border-brand-border overflow-hidden">
      <div className="p-8 pb-4">
        <p className="text-xs font-bold tracking-widest text-brand-text-secondary uppercase mb-2">
          Article Title
        </p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Enter an inspiring title..."
          className="w-full bg-transparent text-4xl font-bold font-display text-brand-text-primary outline-none placeholder:text-gray-400 mb-8"
        />

        <p className="text-xs font-bold tracking-widest text-brand-text-secondary uppercase mb-3">
          Tags & Classification
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-brand-bg rounded-lg border border-brand-border">
          {tags.map((tag) => (
            <div
              key={tag}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium border border-brand-border shadow-sm"
            >
              <span className="text-brand-red">#</span> {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 text-gray-400 hover:text-brand-red"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <input
            type="text"
            placeholder="Add tag..."
            className="bg-transparent text-sm outline-none px-2 text-brand-text-primary placeholder:text-gray-400 flex-1 min-w-[100px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                addTag(e.currentTarget.value.trim());
                e.currentTarget.value = '';
              }
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wide mr-2">
            Popular Suggestions:
          </span>
          {POPULAR_TAGS.map((tag) => {
            const isSelected = tags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => addTag(tag)}
                disabled={isSelected}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  isSelected
                    ? 'bg-brand-red text-white opacity-50 cursor-not-allowed'
                    : 'border border-brand-border bg-white text-brand-text-secondary hover:border-brand-red hover:text-brand-red'
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col border-t border-brand-border">
        <div className="px-8 py-3 bg-brand-bg border-b border-brand-border">
          <p className="text-xs font-bold tracking-widest text-brand-text-secondary uppercase">
            Rich Story Content
          </p>
        </div>
        <MenuBar editor={editor} onOpenImageEmbed={onOpenImageEmbed} />
        <div className="bg-white">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
