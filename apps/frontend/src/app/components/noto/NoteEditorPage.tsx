import { useEffect, useRef, useState, useCallback } from "react";
import { useAppState, useNotoStore } from "./store";
import { TagManager } from "./TagManager";
import { TagChip } from "./TagChip";
import { AlarmPicker } from "./AlarmPicker";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import { motion } from "motion/react";
import {
  ArrowRight, Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Highlighter, AlignRight, AlignLeft, AlignCenter, List, ListOrdered,
  Quote, Code, Heading1, Heading2, Heading3, Link as LinkIcon, Minus,
  Copy, FileDown, Tag, Bell, Pin, MoreVertical, Trash2, Palette
} from "lucide-react";
import { toast } from "sonner";

export function NoteEditorPage({
  noteId,
  onBack,
}: {
  noteId: string;
  onBack: () => void;
}) {
  const state = useAppState();
  const store = useNotoStore();
  const note = state.notes.find((n) => n.id === noteId);
  const [title, setTitle] = useState(note?.title || "");
  const [showTags, setShowTags] = useState(false);
  const [showAlarm, setShowAlarm] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "بنویس... (/ برای دستورات)",
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
    ],
    content: note?.contentJson || note?.html || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      scheduleSave(editor);
    },
  });

  const scheduleSave = useCallback((ed: any) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const html = ed.getHTML();
      const json = ed.getJSON();
      store.updateNote(noteId, { html, contentJson: json });
    }, 600);
  }, [noteId, store]);

  // Save title on change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (note && title !== note.title) {
        store.updateNote(noteId, { title });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [title, noteId, store, note]);

  // Set editor content when note changes
  useEffect(() => {
    if (editor && note) {
      const currentContent = editor.getJSON();
      if (note.contentJson && JSON.stringify(currentContent) !== JSON.stringify(note.contentJson)) {
        editor.commands.setContent(note.contentJson, false);
      }
    }
  }, [noteId]); // Only on noteId change

  const handleCopyFormatted = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHTML();
    // Wrap with RTL styling
    const styledHtml = `<div dir="rtl" style="font-family: Vazirmatn, system-ui, sans-serif; line-height: 1.7;">${html}</div>`;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([styledHtml], { type: "text/html" }),
          "text/plain": new Blob([editor.getText()], { type: "text/plain" }),
        }),
      ]);
      toast.success("با فرمت کپی شد");
    } catch {
      // Fallback
      try {
        await navigator.clipboard.writeText(editor.getText());
        toast.success("متن کپی شد");
      } catch {
        toast.error("خطا در کپی");
      }
    }
  }, [editor]);

  const handleSavePDF = useCallback(() => {
    if (!editor) return;
    const html = editor.getHTML();
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("پنجره مسدود شده. لطفاً pop-up blocker را غیرفعال کنید.");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>${title || "یادداشت NOTO"}</title>
        <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Vazirmatn', system-ui, sans-serif;
            line-height: 1.8;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            color: #1a1a2e;
            direction: rtl;
          }
          h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
          h2 { font-size: 20px; font-weight: 600; margin: 16px 0 8px; }
          h3 { font-size: 18px; font-weight: 600; margin: 12px 0 6px; }
          p { margin: 8px 0; font-size: 15px; }
          ul, ol { padding-right: 24px; margin: 8px 0; }
          li { margin: 4px 0; }
          blockquote { border-right: 3px solid #4f46e5; padding-right: 12px; margin: 12px 0; color: #555; }
          code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
          pre { background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 12px 0; overflow-x: auto; }
          pre code { background: none; padding: 0; }
          hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
          mark { background: #fef08a; padding: 0 2px; border-radius: 2px; }
          a { color: #4f46e5; text-decoration: underline; }
          .title { font-size: 28px; font-weight: 700; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        ${title ? `<div class="title">${title}</div>` : ""}
        ${html}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
    toast.success("پنجره چاپ/ذخیره PDF باز شد");
  }, [editor, title]);

  const handleToggleTag = (tagId: string) => {
    store.toggleTagOnItem(noteId, tagId, "note");
  };

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">یادداشت یافت نشد</p>
      </div>
    );
  }

  const noteTags = state.tags.filter((t) => note.tags.includes(t.id));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      className="h-full flex flex-col bg-background"
    >
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 h-12 border-b border-divider shrink-0">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <nav className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <span className="hover:text-foreground cursor-pointer" onClick={onBack}>یادداشت‌ها</span>
          <span>/</span>
          <span className="text-foreground truncate max-w-[150px]">{title || "بدون عنوان"}</span>
        </nav>
        <div className="flex-1" />

        {/* Action buttons */}
        <button
          onClick={handleCopyFormatted}
          className="p-2 rounded-lg hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
          title="کپی با فرمت"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={handleSavePDF}
          className="p-2 rounded-lg hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
          title="ذخیره PDF"
        >
          <FileDown className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowTags(!showTags)}
          className={`p-2 rounded-lg transition-colors ${showTags ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2"}`}
          title="برچسب‌ها"
        >
          <Tag className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowAlarm(!showAlarm)}
          className={`p-2 rounded-lg transition-colors ${showAlarm ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2"}`}
          title="یادآور"
        >
          <Bell className="w-4 h-4" />
        </button>
        <button
          onClick={() => store.pinNote(noteId)}
          className={`p-2 rounded-lg transition-colors ${note.pinned ? "text-primary" : "text-muted-foreground hover:bg-surface-2"}`}
          title={note.pinned ? "برداشتن پین" : "پین"}
        >
          <Pin className="w-4 h-4" />
        </button>
      </div>

      {/* Tags panel */}
      {showTags && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-b border-divider px-4 py-3 overflow-hidden"
        >
          <TagManager selectedTags={note.tags} onToggleTag={handleToggleTag} mode="assign" />
        </motion.div>
      )}

      {/* Alarm panel */}
      {showAlarm && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-b border-divider px-4 py-3 overflow-hidden"
        >
          <AlarmPicker
            alarm={note.alarm}
            onSet={(alarm) => store.setAlarm("note", noteId, alarm)}
            onRemove={() => store.setAlarm("note", noteId, undefined)}
          />
        </motion.div>
      )}

      {/* Tag chips display */}
      {noteTags.length > 0 && !showTags && (
        <div className="flex flex-wrap gap-1 px-6 pt-2">
          {noteTags.map((t) => (
            <TagChip key={t.id} label={t.title} colorKey={t.colorKey} size="sm" />
          ))}
        </div>
      )}

      {/* Title */}
      <div className="px-6 pt-4 pb-1">
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان یادداشت..."
          className="w-full bg-transparent border-none outline-none text-[22px] placeholder:text-muted-foreground/40"
          style={{ fontWeight: 600 }}
        />
      </div>

      {/* Toolbar */}
      {editor && (
        <div className="px-4 py-1 border-b border-divider flex items-center gap-0.5 overflow-x-auto shrink-0">
          <ToolBtn
            icon={<Bold className="w-4 h-4" />}
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          />
          <ToolBtn
            icon={<Italic className="w-4 h-4" />}
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          />
          <ToolBtn
            icon={<UnderlineIcon className="w-4 h-4" />}
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          />
          <ToolBtn
            icon={<Strikethrough className="w-4 h-4" />}
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          />
          <ToolBtn
            icon={<Highlighter className="w-4 h-4" />}
            active={editor.isActive("highlight")}
            onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}
            title="Highlight"
          />
          <div className="w-px h-5 bg-divider mx-1" />
          <ToolBtn
            icon={<Heading1 className="w-4 h-4" />}
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          />
          <ToolBtn
            icon={<Heading2 className="w-4 h-4" />}
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          />
          <ToolBtn
            icon={<Heading3 className="w-4 h-4" />}
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          />
          <div className="w-px h-5 bg-divider mx-1" />
          <ToolBtn
            icon={<List className="w-4 h-4" />}
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          />
          <ToolBtn
            icon={<ListOrdered className="w-4 h-4" />}
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Ordered List"
          />
          <ToolBtn
            icon={<Quote className="w-4 h-4" />}
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          />
          <ToolBtn
            icon={<Code className="w-4 h-4" />}
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
          />
          <ToolBtn
            icon={<Minus className="w-4 h-4" />}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          />
          <div className="w-px h-5 bg-divider mx-1" />
          <ToolBtn
            icon={<AlignRight className="w-4 h-4" />}
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            title="Align Right"
          />
          <ToolBtn
            icon={<AlignCenter className="w-4 h-4" />}
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            title="Align Center"
          />
          <ToolBtn
            icon={<AlignLeft className="w-4 h-4" />}
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            title="Align Left"
          />
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            className="flex items-center gap-0.5 p-1 bg-surface border border-divider rounded-xl shadow-lg"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <ToolBtn
              icon={<Bold className="w-3.5 h-3.5" />}
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
              size="sm"
            />
            <ToolBtn
              icon={<Italic className="w-3.5 h-3.5" />}
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              size="sm"
            />
            <ToolBtn
              icon={<UnderlineIcon className="w-3.5 h-3.5" />}
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              size="sm"
            />
            <ToolBtn
              icon={<Strikethrough className="w-3.5 h-3.5" />}
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              size="sm"
            />
            <ToolBtn
              icon={<Highlighter className="w-3.5 h-3.5" />}
              active={editor.isActive("highlight")}
              onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}
              size="sm"
            />
            <ToolBtn
              icon={<LinkIcon className="w-3.5 h-3.5" />}
              active={editor.isActive("link")}
              onClick={() => {
                const url = window.prompt("آدرس لینک:");
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }}
              size="sm"
            />
          </BubbleMenu>
        )}
        <EditorContent editor={editor} className="noto-editor" />
      </div>
    </motion.div>
  );
}

function ToolBtn({
  icon,
  active,
  onClick,
  title,
  size = "md",
}: {
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title?: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded-lg transition-colors duration-120
        ${size === "sm" ? "p-1" : "p-1.5"}
        ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"}`}
    >
      {icon}
    </button>
  );
}