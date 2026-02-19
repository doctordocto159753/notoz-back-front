import { useState, useEffect, useRef, useCallback } from "react";
import { useAppState, useNotoStore } from "./store";
import { TagManager } from "./TagManager";
import { TagChip } from "./TagChip";
import { AlarmPicker } from "./AlarmPicker";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Underline } from "@tiptap/extension-underline";
import { Highlight } from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { motion } from "motion/react";
import {
  ArrowRight, Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Tag, Bell, Pin
} from "lucide-react";

export function ChecklistExpandPage({
  itemId,
  onBack,
}: {
  itemId: string;
  onBack: () => void;
}) {
  const state = useAppState();
  const store = useNotoStore();
  const item = state.checklist.find((c) => c.id === itemId);
  const [title, setTitle] = useState(item?.title || "");
  const [showTags, setShowTags] = useState(false);
  const [showAlarm, setShowAlarm] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "توضیحات...",
        showOnlyWhenEditable: true,
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
    ],
    content: item?.descriptionHtml || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        store.updateChecklistItem(itemId, { descriptionHtml: editor.getHTML() });
      }, 600);
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (item && title !== item.title) {
        store.updateChecklistItem(itemId, { title });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [title, itemId, store, item]);

  const handleToggleTag = (tagId: string) => {
    store.toggleTagOnItem(itemId, tagId, "checklist");
  };

  if (!item) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">آیتم یافت نشد</p>
      </div>
    );
  }

  const itemTags = state.tags.filter((t) => item.tags.includes(t.id));

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
          <span className="hover:text-foreground cursor-pointer" onClick={onBack}>چک‌لیست</span>
          <span>/</span>
          <span className="text-foreground truncate max-w-[150px]">{title || "بدون عنوان"}</span>
        </nav>
        <div className="flex-1" />
        <button
          onClick={() => setShowTags(!showTags)}
          className={`p-2 rounded-lg transition-colors ${showTags ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2"}`}
        >
          <Tag className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowAlarm(!showAlarm)}
          className={`p-2 rounded-lg transition-colors ${showAlarm ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2"}`}
        >
          <Bell className="w-4 h-4" />
        </button>
        <button
          onClick={() => store.pinChecklistItem(itemId)}
          className={`p-2 rounded-lg transition-colors ${item.pinned ? "text-primary" : "text-muted-foreground hover:bg-surface-2"}`}
        >
          <Pin className="w-4 h-4" />
        </button>
      </div>

      {/* Tags panel */}
      {showTags && (
        <div className="border-b border-divider px-4 py-3">
          <TagManager selectedTags={item.tags} onToggleTag={handleToggleTag} mode="assign" />
        </div>
      )}

      {/* Alarm panel */}
      {showAlarm && (
        <div className="border-b border-divider px-4 py-3">
          <AlarmPicker
            alarm={item.alarm}
            onSet={(alarm) => store.setAlarm("checklist", itemId, alarm)}
            onRemove={() => store.setAlarm("checklist", itemId, undefined)}
          />
        </div>
      )}

      {/* Tags display */}
      {itemTags.length > 0 && !showTags && (
        <div className="flex flex-wrap gap-1 px-6 pt-2">
          {itemTags.map((t) => (
            <TagChip key={t.id} label={t.title} colorKey={t.colorKey} size="sm" />
          ))}
        </div>
      )}

      {/* Checked status */}
      <div className="px-6 pt-4 flex items-center gap-3">
        <button
          onClick={() => store.toggleChecklistItem(itemId)}
          className={`w-6 h-6 rounded-lg border-2 shrink-0 flex items-center justify-center transition-all
            ${item.checked ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary"}`}
        >
          {item.checked && (
            <svg className="w-4 h-4 text-primary-foreground" viewBox="0 0 12 12">
              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان آیتم..."
          className={`flex-1 bg-transparent border-none outline-none text-[20px] ${item.checked ? "line-through text-muted-foreground" : ""}`}
          style={{ fontWeight: 600 }}
        />
      </div>

      {/* Mini toolbar */}
      {editor && (
        <div className="px-4 py-1 border-b border-divider flex items-center gap-0.5 mt-2">
          <MiniBtn icon={<Bold className="w-3.5 h-3.5" />} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
          <MiniBtn icon={<Italic className="w-3.5 h-3.5" />} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <MiniBtn icon={<UnderlineIcon className="w-3.5 h-3.5" />} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <MiniBtn icon={<List className="w-3.5 h-3.5" />} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <MiniBtn icon={<ListOrdered className="w-3.5 h-3.5" />} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <EditorContent editor={editor} className="noto-editor" />
      </div>
    </motion.div>
  );
}

function MiniBtn({ icon, active, onClick }: { icon: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded-lg transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2"}`}
    >
      {icon}
    </button>
  );
}
