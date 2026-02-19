import { useState, useRef, useCallback } from "react";
import { useAppState, useNotoStore } from "./store";
import { ChecklistItemRow } from "./ChecklistItemRow";
import { TagManager } from "./TagManager";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Filter, X, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useDrag, useDrop } from "react-dnd";
import type { ChecklistItem } from "./types";

const ITEM_TYPE = "CHECKLIST_ITEM";

function DraggableItem({
  item,
  index,
  moveItem,
  onExpand,
}: {
  item: ChecklistItem;
  index: number;
  moveItem: (from: number, to: number) => void;
  onExpand: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
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
      <ChecklistItemRow
        item={item}
        onExpand={onExpand}
        dragHandleProps={{ ref: (node: HTMLElement | null) => drag(node) }}
        isDragging={isDragging}
      />
    </div>
  );
}

export function ChecklistPanel({
  searchQuery,
  onExpand,
}: {
  searchQuery: string;
  onExpand: (id: string) => void;
}) {
  const state = useAppState();
  const store = useNotoStore();
  const [newTitle, setNewTitle] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [hideCompleted, setHideCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) return;
    store.addChecklistItem(title);
    setNewTitle("");
    inputRef.current?.focus();
    toast.success("آیتم اضافه شد");
  };

  const toggleFilterTag = (tagId: string) => {
    setFilterTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  // Filter and sort
  let items = state.checklist
    .filter((c) => !c.archived)
    .filter((c) => {
      if (hideCompleted && c.checked) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return c.title.toLowerCase().includes(q) || c.descriptionHtml.toLowerCase().includes(q);
      }
      if (filterTags.length > 0) {
        return filterTags.some((t) => c.tags.includes(t));
      }
      return true;
    });

  // Sort: pinned first, then unchecked, then by order
  const pinned = items.filter((c) => c.pinned && !c.checked);
  const unchecked = items.filter((c) => !c.pinned && !c.checked);
  const checked = items.filter((c) => c.checked);

  unchecked.sort((a, b) => a.order - b.order);
  checked.sort((a, b) => a.order - b.order);

  const sortedItems = [...pinned, ...unchecked, ...checked];

  const moveItem = useCallback(
    (from: number, to: number) => {
      if (searchQuery || filterTags.length > 0) return;
      const newItems = [...sortedItems];
      const [moved] = newItems.splice(from, 1);
      newItems.splice(to, 0, moved);
      store.reorderChecklist(newItems);
    },
    [sortedItems, searchQuery, filterTags, store]
  );

  const activeCount = state.checklist.filter((c) => !c.checked && !c.archived).length;
  const doneCount = state.checklist.filter((c) => c.checked && !c.archived).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            <h2>چک‌لیست</h2>
            <span className="text-[11px] text-muted-foreground bg-surface-2 px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`p-1.5 rounded-lg transition-colors ${showFilter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2"}`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Filter section */}
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
                <label className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideCompleted}
                    onChange={(e) => setHideCompleted(e.target.checked)}
                    className="rounded"
                  />
                  پنهان‌سازی انجام‌شده‌ها
                </label>
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

        {/* Add form */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="آیتم جدید..."
            className="flex-1 h-9 px-3 rounded-xl bg-surface-2 border-none outline-none text-[13px] focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="h-9 px-3 rounded-xl bg-primary text-primary-foreground flex items-center gap-1 text-[13px] disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            افزودن
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <ListChecks className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-[13px]">هنوز کاری اضافه نکردی.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {pinned.length > 0 && (
              <div className="px-3 pt-2 pb-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                پین‌شده
              </div>
            )}
            {sortedItems.map((item, index) => (
              <DraggableItem
                key={item.id}
                item={item}
                index={index}
                moveItem={moveItem}
                onExpand={onExpand}
              />
            ))}
            {doneCount > 0 && !hideCompleted && (
              <div className="px-3 pt-3 pb-1 text-[11px] text-muted-foreground">
                {doneCount} آیتم انجام‌شده
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
