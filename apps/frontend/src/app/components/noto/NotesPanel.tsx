import { useState, useRef, useCallback } from "react";
import { useAppState, useNotoStore } from "./store";
import { NoteCard } from "./NoteCard";
import { TagManager } from "./TagManager";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Filter, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { useDrag, useDrop } from "react-dnd";
import type { NoteBlock } from "./types";

const NOTE_TYPE = "NOTE_BLOCK";

function DraggableNote({
  note,
  index,
  moveItem,
  onExpand,
}: {
  note: NoteBlock;
  index: number;
  moveItem: (from: number, to: number) => void;
  onExpand: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: NOTE_TYPE,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: NOTE_TYPE,
    hover(dragItem: { index: number }, monitor) {
      if (!ref.current) return;
      const dragIndex = dragItem.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      const hoverRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverRect.bottom - hoverRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverRect.top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      moveItem(dragIndex, hoverIndex);
      dragItem.index = hoverIndex;
    },
  });

  drop(preview(ref));

  return (
    <div ref={ref}>
      <NoteCard
        note={note}
        onExpand={onExpand}
        dragHandleProps={{ ref: (node: HTMLElement | null) => drag(node) }}
        isDragging={isDragging}
      />
    </div>
  );
}

export function NotesPanel({
  searchQuery,
  onExpand,
}: {
  searchQuery: string;
  onExpand: (id: string) => void;
}) {
  const state = useAppState();
  const store = useNotoStore();
  const [showFilter, setShowFilter] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  const handleAddNote = () => {
    const note = store.addNote();
    onExpand(note.id);
  };

  const toggleFilterTag = (tagId: string) => {
    setFilterTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  let notes = state.notes
    .filter((n) => !n.archived)
    .filter((n) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (n.title || "").toLowerCase().includes(q) ||
          n.html.replace(/<[^>]*>/g, "").toLowerCase().includes(q)
        );
      }
      if (filterTags.length > 0) {
        return filterTags.some((t) => n.tags.includes(t));
      }
      return true;
    });

  const pinned = notes.filter((n) => n.pinned);
  const unpinned = notes.filter((n) => !n.pinned);
  unpinned.sort((a, b) => a.order - b.order);
  const sortedNotes = [...pinned, ...unpinned];

  const moveItem = useCallback(
    (from: number, to: number) => {
      if (searchQuery || filterTags.length > 0) return;
      const newItems = [...sortedNotes];
      const [moved] = newItems.splice(from, 1);
      newItems.splice(to, 0, moved);
      store.reorderNotes(newItems);
    },
    [sortedNotes, searchQuery, filterTags, store]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2>یادداشت‌ها</h2>
            <span className="text-[11px] text-muted-foreground bg-surface-2 px-2 py-0.5 rounded-full">
              {notes.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`p-1.5 rounded-lg transition-colors ${showFilter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2"}`}
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={handleAddNote}
              className="h-8 px-3 rounded-xl bg-primary text-primary-foreground flex items-center gap-1 text-[13px] hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              جدید
            </button>
          </div>
        </div>

        {/* Filter */}
        <AnimatePresence>
          {showFilter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-2"
            >
              <div className="p-2 rounded-xl bg-surface-2/50 space-y-2">
                <TagManager selectedTags={filterTags} onToggleTag={toggleFilterTag} mode="filter" />
                {filterTags.length > 0 && (
                  <button
                    onClick={() => setFilterTags([])}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> پاک‌سازی فیلتر
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {sortedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <FileText className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-[13px]">اولین یادداشتت را بساز.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {pinned.length > 0 && (
              <div className="px-3 pt-2 pb-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                پین‌شده
              </div>
            )}
            {sortedNotes.map((note, index) => (
              <DraggableNote
                key={note.id}
                note={note}
                index={index}
                moveItem={moveItem}
                onExpand={onExpand}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
