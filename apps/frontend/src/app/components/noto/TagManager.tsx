import { useState } from "react";
import { useAppState, useNotoStore } from "./store";
import { TagChip, getTagColors } from "./TagChip";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function TagManager({
  selectedTags,
  onToggleTag,
  mode,
}: {
  selectedTags?: string[];
  onToggleTag?: (tagId: string) => void;
  mode: "filter" | "assign" | "manage";
}) {
  const state = useAppState();
  const store = useNotoStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    store.addTag(newTitle.trim(), newColor);
    setNewTitle("");
    setShowAdd(false);
  };

  const handleRename = (id: string) => {
    if (!editTitle.trim()) return;
    store.updateTag(id, { title: editTitle.trim() });
    setEditingId(null);
  };

  const colors = getTagColors();

  return (
    <div className="space-y-2">
      {/* Tag list */}
      <div className="flex flex-wrap gap-1.5">
        {state.tags.map((tag) => (
          <div key={tag.id} className="group relative">
            {editingId === tag.id ? (
              <div className="flex items-center gap-1">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRename(tag.id); if (e.key === "Escape") setEditingId(null); }}
                  className="h-6 px-2 text-[11px] rounded bg-surface-2 border-none outline-none w-20"
                  autoFocus
                />
                <button onClick={() => handleRename(tag.id)} className="text-success p-0.5"><Plus className="w-3 h-3" /></button>
                <button onClick={() => setEditingId(null)} className="text-muted-foreground p-0.5"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <TagChip
                label={tag.title}
                colorKey={tag.colorKey}
                selected={selectedTags?.includes(tag.id)}
                onClick={() => onToggleTag?.(tag.id)}
              />
            )}
            {mode === "manage" && editingId !== tag.id && (
              <div className="absolute -top-1 -left-1 hidden group-hover:flex gap-0.5 bg-surface border border-divider rounded-md p-0.5 shadow-sm z-10">
                <button
                  onClick={() => { setEditingId(tag.id); setEditTitle(tag.title); }}
                  className="p-0.5 hover:bg-surface-2 rounded"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => store.deleteTag(tag.id)}
                  className="p-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-danger"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add button */}
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-3 h-3" />
            برچسب
          </button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setShowAdd(false); }}
                placeholder="نام برچسب..."
                className="h-7 px-2 text-[12px] rounded bg-surface border border-divider outline-none flex-1 min-w-0"
                autoFocus
              />
              <div className="flex gap-1">
                {colors.slice(0, 4).map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      newColor === c ? "border-primary scale-110" : "border-transparent"
                    }`}
                    style={{
                      backgroundColor: c === "blue" ? "#3b82f6" : c === "green" ? "#10b981" : c === "red" ? "#ef4444" : c === "yellow" ? "#f59e0b" : "#8b5cf6",
                    }}
                  />
                ))}
              </div>
              <button onClick={handleAdd} className="px-2 py-1 text-[11px] bg-primary text-primary-foreground rounded-md">
                افزودن
              </button>
              <button onClick={() => setShowAdd(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
