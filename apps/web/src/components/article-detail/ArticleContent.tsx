'use client';

import React from 'react';
import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

interface ArticleContentProps {
  body: JSONContent;
}

export function ArticleContent({ body }: ArticleContentProps) {
  const editor = useEditor({
    editable: false,
    content: body,
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
  });

  return (
    <div>
      <EditorContent editor={editor} />
    </div>
  );
}
