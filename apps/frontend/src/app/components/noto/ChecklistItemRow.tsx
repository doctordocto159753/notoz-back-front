import { useState, useRef, useEffect } from "react";
import { useAppState, useNotoStore } from "./store";
import { TagChip } from "./TagChip";
import { motion } from "motion/react";
import {
  GripVertical, Pin, Trash2, MoreVertical, Maximize2,
  Bell, Tag, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import type { ChecklistItem } from "./types";

export function ChecklistItemRow({
  item,
  onExpand,
  dragHandleProps,
  isDragging,
}: {
  item: ChecklistItem;
  onExpand: (id: string) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
}) {
  const state = useAppState();
  const store = useNotoStore();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.title);
  const [showMenu, setShowMenu] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleTitleSave = () => {
    if (editValue.trim()) {
      store.updateChecklistItem(item.id, { title: editValue.trim() });
    } else {
      setEditValue(item.title);
    }
    setEditing(false);
  };

  const handleCheck = () => {
    store.toggleChecklistItem(item.id);
  };

  const handleDelete = () => {
    setShowDelete(false);
    setShowMenu(false);
    const deleted = store.deleteChecklistItem(item.id);
    if (deleted) {
      toast("آیتم حذف شد", {
        duration: 15000,
        action: {
          label: "بازگردانی",
          onClick: () => store.restoreChecklistItem(deleted),
        },
      });
    }
  };

  const tags = state.tags.filter((t) => item.tags.includes(t.id));
  const hasAlarm = item.alarm && item.alarm.status === "scheduled";

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        className={`group flex items-start gap-2 p-3 rounded-xl border transition-all duration-120
          ${isDragging ? "shadow-lg border-primary/20 bg-surface scale-[1.01]" : "border-transparent hover:border-divider hover:bg-surface-2/50"}
          ${item.checked ? "opacity-50" : ""}`}
      >
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="mt-1 cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Checkbox */}
        <button
          onClick={handleCheck}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all duration-200
            ${item.checked
              ? "bg-primary border-primary"
              : "border-muted-foreground/30 hover:border-primary"}`}
        >
          {item.checked && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3 text-primary-foreground"
              viewBox="0 0 12 12"
            >
              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </motion.svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSave();
                if (e.key === "Escape") { setEditValue(item.title); setEditing(false); }
              }}
              className="w-full bg-transparent outline-none text-[14px]"
            />
          ) : (
            <div
              className={`text-[14px] cursor-text break-words ${item.checked ? "line-through text-muted-foreground" : ""}`}
              onClick={() => { if (!item.checked) { setEditing(true); setEditValue(item.title); } }}
            >
              {item.title}
            </div>
          )}

          {/* Tags + alarm indicators */}
          {(tags.length > 0 || hasAlarm) && (
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {tags.map((t) => (
                <TagChip key={t.id} label={t.title} colorKey={t.colorKey} size="sm" />
              ))}
              {hasAlarm && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-warning px-1.5 py-0.5 rounded bg-yellow-50 dark:bg-yellow-900/20">
                  <Bell className="w-3 h-3" />
                  یادآور
                </span>
              )}
            </div>
          )}
        </div>

        {/* Pin indicator */}
        {item.pinned && (
          <Pin className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onExpand(item.id)}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
            title="باز کردن"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <div className="relative" ref={menuRef}>
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
                className="absolute left-0 top-full mt-1 w-40 bg-surface border border-divider rounded-xl shadow-lg z-40 overflow-hidden"
                style={{ boxShadow: "var(--shadow-lg)" }}
              >
                <button
                  onClick={() => { store.pinChecklistItem(item.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] hover:bg-surface-2 transition-colors"
                >
                  <Pin className="w-3.5 h-3.5" />
                  {item.pinned ? "برداشتن پین" : "پین کردن"}
                </button>
                <button
                  onClick={() => { onExpand(item.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] hover:bg-surface-2 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  باز کردن
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

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowDelete(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-2xl p-5 w-[300px] shadow-xl border border-divider"
            style={{ boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2">حذف آیتم</h3>
            <p className="text-[13px] text-muted-foreground mb-4">آیا مطمئن هستید؟ این عملیات قابل بازگشت از طریق Undo است.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDelete(false)}
                className="px-3 py-1.5 rounded-lg bg-surface-2 text-[13px] hover:bg-surface-3 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg bg-danger text-white text-[13px] hover:opacity-90 transition-opacity"
              >
                حذف
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}