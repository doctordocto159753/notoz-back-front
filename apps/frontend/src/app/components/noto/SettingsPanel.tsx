import { useAppState, useNotoStore } from "./store";
import { TagManager } from "./TagManager";
import { motion } from "motion/react";
import { X, Tag, Sun, Moon, Info } from "lucide-react";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const state = useAppState();
  const store = useNotoStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        className="bg-surface rounded-2xl w-full max-w-md mx-4 shadow-xl border border-divider overflow-hidden"
        style={{ boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-divider">
          <h3>تنظیمات</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Theme */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-[13px]">
              {state.settings.theme === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              تم ظاهری
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { store.setTheme("light"); document.documentElement.classList.remove("dark"); }}
                className={`flex-1 py-2 rounded-xl text-[13px] transition-all ${
                  state.settings.theme === "light" ? "bg-primary text-primary-foreground" : "bg-surface-2 hover:bg-surface-3"
                }`}
              >
                روشن
              </button>
              <button
                onClick={() => { store.setTheme("dark"); document.documentElement.classList.add("dark"); }}
                className={`flex-1 py-2 rounded-xl text-[13px] transition-all ${
                  state.settings.theme === "dark" ? "bg-primary text-primary-foreground" : "bg-surface-2 hover:bg-surface-3"
                }`}
              >
                تاریک
              </button>
            </div>
          </div>

          {/* Tags Management */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-[13px]">
              <Tag className="w-4 h-4" />
              مدیریت برچسب‌ها
            </div>
            <TagManager mode="manage" />
          </div>

          {/* About */}
          <div className="pt-2 border-t border-divider">
            <div className="flex items-center gap-2 mb-2 text-[13px]">
              <Info className="w-4 h-4" />
              درباره
            </div>
            <div className="text-[12px] text-muted-foreground space-y-1">
              <p><strong>NOTO</strong> — دفترچه و چک‌لیست</p>
              <p>نسخه ۱.۰.۰</p>
              <p>داده‌ها به‌صورت محلی در مرورگر شما ذخیره می‌شوند.</p>
            </div>
          </div>

          {/* Storage info */}
          <div className="text-[11px] text-muted-foreground bg-surface-2 p-3 rounded-xl">
            <p>تعداد آیتم‌های چک‌لیست: {state.checklist.length}</p>
            <p>تعداد یادداشت‌ها: {state.notes.length}</p>
            <p>تعداد برچسب‌ها: {state.tags.length}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
