'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent, type JSONContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ReviewCommentStatus } from '@repo/shared';

export interface ArticleCommentHighlight {
  id: string;
  from: number;
  to: number;
  status: ReviewCommentStatus;
}

interface ArticleContentProps {
  body: JSONContent;
  comments?: ArticleCommentHighlight[];
  onSelectionChange?: (range: { from: number; to: number } | null, text: string) => void;
  onClickHighlight?: (commentId: string) => void;
  activeCommentId?: string | null;
}

export function ArticleContent({
  body,
  comments = [],
  onSelectionChange,
  onClickHighlight,
  activeCommentId,
}: ArticleContentProps) {
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const activeCommentIdRef = useRef(activeCommentId);
  activeCommentIdRef.current = activeCommentId;
  const onClickHighlightRef = useRef(onClickHighlight);
  onClickHighlightRef.current = onClickHighlight;

  const commentHighlightPlugin = useRef(
    new Plugin({
      key: new PluginKey('commentHighlightPlugin'),
      props: {
        decorations(state) {
          const decos: Decoration[] = [];
          const currentComments = commentsRef.current || [];
          const currentActiveId = activeCommentIdRef.current;
          const docLength = state.doc.content.size;

          currentComments.forEach((h) => {
            const from = Math.max(0, Math.min(h.from, docLength));
            const to = Math.max(0, Math.min(h.to, docLength));
            if (from === to) return;

            const isActive = currentActiveId === h.id;
            const isResolved = h.status === 'Resolved';

            let className = 'bg-amber-100/80 border-b border-amber-400 cursor-pointer';
            if (isActive) {
              className = 'bg-amber-200/95 border-b-2 border-amber-600 font-semibold cursor-pointer';
            } else if (isResolved) {
              className = 'bg-gray-100/50 border-b border-gray-300 opacity-60 cursor-pointer';
            }

            decos.push(
              Decoration.inline(from, to, {
                class: className,
                'data-comment-id': h.id,
              })
            );
          });
          return DecorationSet.create(state.doc, decos);
        },
        handleDOMEvents: {
          click(view, event) {
            const target = event.target as HTMLElement;
            const commentSpan = target.closest('[data-comment-id]');
            if (commentSpan && onClickHighlightRef.current) {
              const commentId = commentSpan.getAttribute('data-comment-id');
              if (commentId) {
                onClickHighlightRef.current(commentId);
                return true;
              }
            }
            return false;
          },
        },
      },
    })
  );

  const CommentHighlightExtension = useRef(
    Extension.create({
      name: 'commentHighlight',
      addProseMirrorPlugins() {
        return [commentHighlightPlugin.current];
      },
    })
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    content: body,
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      CommentHighlightExtension.current,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg focus:outline-none max-w-none',
      },
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      if (from !== to) {
        const text = ed.state.doc.textBetween(from, to, ' ');
        onSelectionChange?.({ from, to }, text);
      } else {
        onSelectionChange?.(null, '');
      }
    },
  });

  // Force decorations update on comments or active selection change
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const { tr } = editor.state;
      editor.view.dispatch(tr);
    }
  }, [editor, comments, activeCommentId]);

  // Handle auto-scroll and focus to active comment
  useEffect(() => {
    if (editor && !editor.isDestroyed && activeCommentId) {
      const activeComment = comments.find((c) => c.id === activeCommentId);
      if (activeComment) {
        const { from, to } = activeComment;
        const docLength = editor.state.doc.content.size;
        const boundedFrom = Math.max(0, Math.min(from, docLength));
        const boundedTo = Math.max(0, Math.min(to, docLength));

        // Focus the editor and set the selection
        editor.commands.setTextSelection({ from: boundedFrom, to: boundedTo });

        // Scroll the element into view
        try {
          const domNode = editor.view.domAtPos(boundedFrom).node;
          const element = domNode.nodeType === Node.TEXT_NODE ? domNode.parentElement : (domNode as HTMLElement);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {
          // ignore scroll errors
        }
      }
    }
  }, [editor, activeCommentId, comments]);

  return (
    <div data-testid="article-content" className="prose max-w-none">
      <EditorContent editor={editor} />
    </div>
  );
}
