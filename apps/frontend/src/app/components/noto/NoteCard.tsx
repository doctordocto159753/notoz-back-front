import { useAppState, useNotoStore } from "./store";
import { TagChip } from "./TagChip";
import { motion } from "motion/react";
import { Pin, Trash2, MoreVertical, Maximize2, Bell, GripVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { NoteBlock } from "./types";

export function NoteCard({
  note,
  onExpand,
  dragHandleProps,
  isDragging,
}: {
  note: NoteBlock;
  onExpand: (id: string) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
}) {
  const state = useAppState();
  const store = useNotoStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleDelete = () => {
    setShowDelete(false);
    setShowMenu(false);
    const deleted = store.deleteNote(note.id);
    if (deleted) {
      toast("یادداشت حذف شد", {
        duration: 15000,
        action: {
          label: "بازگردانی",
          onClick: () => store.restoreNote(deleted),
        },
      });
    }
  };

  const tags = state.tags.filter((t) => note.tags.includes(t.id));
  const hasAlarm = note.alarm && note.alarm.status === "scheduled";

  // Extract plain text preview from HTML
  const preview = note.html
    ? note.html.replace(/<[^>]*>/g, "").slice(0, 120)
    : "";

  const title = note.title || "بدون عنوان";
  const timeAgo = getRelativeTime(note.updatedAt);

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        className={`group p-3 rounded-xl border cursor-pointer transition-all duration-120
          ${isDragging ? "shadow-lg border-primary/20 bg-surface scale-[1.01]" : "border-transparent hover:border-divider hover:bg-surface-2/50"}`}
        onClick={() => onExpand(note.id)}
      >
        <div className="flex items-start gap-2">
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            className="mt-1 cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {note.pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
              <h4 className="truncate text-[14px]">{title}</h4>
            </div>

            {preview && (
              <p className="text-[12px] text-muted-foreground line-clamp-2 mb-1.5">{preview}</p>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((t) => (
                <TagChip key={t.id} label={t.title} colorKey={t.colorKey} size="sm" />
              ))}
              {hasAlarm && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-warning px-1.5 py-0.5 rounded bg-yellow-50 dark:bg-yellow-900/20">
                  <Bell className="w-3 h-3" />
                </span>
              )}
              <span className="text-[10px] text-muted-foreground mr-auto">{timeAgo}</span>
            </div>
          </div>

          {/* Menu */}
          <div
            className="relative opacity-0 group-hover:opacity-100 transition-opacity"
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute left-0 top-full mt-1 w-36 bg-surface border border-divider rounded-xl shadow-lg z-40 overflow-hidden"
                style={{ boxShadow: "var(--shadow-lg)" }}
              >
                <button
                  onClick={() => { store.pinNote(note.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] hover:bg-surface-2 transition-colors"
                >
                  <Pin className="w-3.5 h-3.5" />
                  {note.pinned ? "برداشتن پین" : "پین"}
                </button>
                <button
                  onClick={() => setShowDelete(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] hover:bg-red-50 dark:hover:bg-red-900/20 text-danger transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Delete confirm */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowDelete(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-2xl p-5 w-[300px] shadow-xl border border-divider"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2">حذف یادداشت</h3>
            <p className="text-[13px] text-muted-foreground mb-4">آیا مطمئن هستید؟</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDelete(false)} className="px-3 py-1.5 rounded-lg bg-surface-2 text-[13px]">انصراف</button>
              <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg bg-danger text-white text-[13px]">حذف</button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "همین الان";
  if (mins < 60) return `${mins} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} روز پیش`;
  return new Date(iso).toLocaleDateString("fa-IR");
}