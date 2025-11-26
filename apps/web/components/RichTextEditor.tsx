'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Undo,
  Redo,
  Keyboard,
  X,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  editable?: boolean;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  if (!editor) return null;

  const buttonClass = (isActive: boolean) =>
    `p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
      isActive
        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
        : 'text-gray-700 dark:text-gray-300'
    }`;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-t-lg">
      <div className="flex items-center gap-1 flex-wrap">
        {/* Text formatting */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleBold().run();
          }}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={buttonClass(editor.isActive('bold'))}
          title="Bold (Cmd+B)"
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleItalic().run();
          }}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={buttonClass(editor.isActive('italic'))}
          title="Italic (Cmd+I)"
        >
          <Italic className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleUnderline().run();
          }}
          disabled={!editor.can().chain().focus().toggleUnderline().run()}
          className={buttonClass(editor.isActive('underline'))}
          title="Underline (Cmd+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleStrike().run();
          }}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={buttonClass(editor.isActive('strike'))}
          title="Strikethrough (Cmd+Shift+X)"
        >
          <Strikethrough className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleCode().run();
          }}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={buttonClass(editor.isActive('code'))}
          title="Inline Code (Cmd+E)"
        >
          <Code className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Headings */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleHeading({ level: 1 }).run();
          }}
          className={buttonClass(editor.isActive('heading', { level: 1 }))}
          title="Heading 1 (Cmd+Alt+1)"
        >
          <Heading1 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleHeading({ level: 2 }).run();
          }}
          className={buttonClass(editor.isActive('heading', { level: 2 }))}
          title="Heading 2 (Cmd+Alt+2)"
        >
          <Heading2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          className={buttonClass(editor.isActive('heading', { level: 3 }))}
          title="Heading 3 (Cmd+Alt+3)"
        >
          <Heading3 className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleBulletList().run();
          }}
          className={buttonClass(editor.isActive('bulletList'))}
          title="Bullet List (Cmd+Shift+8)"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleOrderedList().run();
          }}
          className={buttonClass(editor.isActive('orderedList'))}
          title="Numbered List (Cmd+Shift+7)"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().undo().run();
          }}
          disabled={!editor.can().chain().focus().undo().run()}
          className={buttonClass(false)}
          title="Undo (Cmd+Z)"
        >
          <Undo className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().redo().run();
          }}
          disabled={!editor.can().chain().focus().redo().run()}
          className={buttonClass(false)}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo className="h-4 w-4" />
        </button>

        <div className="flex-1" />

        {/* Keyboard shortcuts toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowShortcuts(!showShortcuts);
          }}
          className={buttonClass(showShortcuts)}
          title="Keyboard Shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </button>
      </div>

      {/* Keyboard shortcuts panel */}
      {showShortcuts && (
        <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h4>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowShortcuts(false);
              }}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-gray-700 dark:text-gray-300">
            <div><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Cmd+B</kbd> Bold</div>
            <div><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Cmd+I</kbd> Italic</div>
            <div><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Cmd+U</kbd> Underline</div>
            <div><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Cmd+E</kbd> Code</div>
            <div><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Cmd+Alt+1</kbd> H1</div>
            <div><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Cmd+Alt+2</kbd> H2</div>
            <div><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Cmd+Shift+8</kbd> Bullet List</div>
            <div><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Cmd+Shift+7</kbd> Numbered List</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  className = '',
  minHeight = 'min-h-[150px]',
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-purple-600 dark:text-purple-400 underline hover:text-purple-700 dark:hover:text-purple-300',
        },
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none ${minHeight} p-4`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      {editable && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
