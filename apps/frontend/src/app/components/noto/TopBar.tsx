import { useState, useRef, useEffect } from "react";
import { useAppState, useNotoStore } from "./store";
import { PixelLogo } from "./PixelLogo";
import {
  Sun, Moon, Search, Download, Upload, Undo2, Redo2, Settings,
  X, PanelLeftClose, PanelRightClose, Keyboard
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

export function TopBar({
  onSearch,
  searchQuery,
  onToggleSettings,
  onToggleTodayDashboard,
}: {
  onSearch: (q: string) => void;
  searchQuery: string;
  onToggleSettings: () => void;
  onToggleTodayDashboard: () => void;
}) {
  const state = useAppState();
  const store = useNotoStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const toggleTheme = () => {
    const next = state.settings.theme === "light" ? "dark" : "light";
    store.setTheme(next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleExport = () => {
    const data = store.exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noto-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("خروجی با موفقیت ذخیره شد");
  };

  const handleImport = () => {
    fileRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = store.importData(reader.result as string);
      if (result.success) {
        toast.success("ورودی با موفقیت بارگذاری شد");
      } else {
        toast.error(result.error || "خطا");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleUndo = () => {
    store.undo();
    toast("عملیات بازگردانی شد", { duration: 2000 });
  };

  const collapseLeft = () => {
    const current = state.settings.panelLayout.collapsed;
    store.setPanelLayout({ collapsed: current === "left" ? "none" : "left" });
  };

  const collapseRight = () => {
    const current = state.settings.panelLayout.collapsed;
    store.setPanelLayout({ collapsed: current === "right" ? "none" : "right" });
  };

  return (
    <header className="h-12 flex items-center gap-1 px-3 border-b border-divider bg-surface shrink-0 relative z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 ml-2">
        <PixelLogo size={24} />
        <span className="hidden sm:inline-block tracking-widest text-[13px] opacity-70">NOTO</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="relative">
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="جست‌وجو..."
                className="w-full h-8 pr-8 pl-3 rounded-lg bg-surface-2 border-none outline-none text-[13px]"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5">
        <BarButton
          icon={<Search className="w-4 h-4" />}
          tooltip="جست‌وجو (Ctrl+K)"
          onClick={() => {
            setSearchOpen(!searchOpen);
            if (searchOpen) onSearch("");
          }}
          active={searchOpen}
        />
        <BarButton
          icon={state.settings.theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          tooltip="تغییر تم"
          onClick={toggleTheme}
        />
        <div className="hidden sm:flex items-center gap-0.5">
          <BarButton icon={<PanelRightClose className="w-4 h-4" />} tooltip="جمع پنل چپ" onClick={collapseLeft} active={state.settings.panelLayout.collapsed === "left"} />
          <BarButton icon={<PanelLeftClose className="w-4 h-4" />} tooltip="جمع پنل راست" onClick={collapseRight} active={state.settings.panelLayout.collapsed === "right"} />
        </div>
        <BarButton icon={<Undo2 className="w-4 h-4" />} tooltip="بازگردانی (Ctrl+Z)" onClick={handleUndo} />
        <BarButton icon={<Download className="w-4 h-4" />} tooltip="خروجی JSON" onClick={handleExport} />
        <BarButton icon={<Upload className="w-4 h-4" />} tooltip="ورودی JSON" onClick={handleImport} />
        <BarButton
          icon={<Keyboard className="w-4 h-4" />}
          tooltip="میانبرها (Ctrl+/)"
          onClick={() => setShowShortcuts(!showShortcuts)}
        />
        <BarButton icon={<Settings className="w-4 h-4" />} tooltip="تنظیمات" onClick={onToggleSettings} />
      </div>

      <input ref={fileRef} type="file" accept=".json" onChange={onFileSelected} className="hidden" />

      {/* Shortcuts overlay */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-12 left-4 bg-surface border border-divider rounded-xl p-4 shadow-lg z-50 min-w-[260px]"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] opacity-70">میانبرهای کیبورد</span>
              <button onClick={() => setShowShortcuts(false)} className="p-1 rounded hover:bg-surface-2"><X className="w-3 h-3" /></button>
            </div>
            <div className="space-y-2 text-[13px]">
              {[
                ["Ctrl + N", "یادداشت جدید"],
                ["Ctrl + Shift + N", "آیتم چک‌لیست جدید"],
                ["Ctrl + K", "جست‌وجو"],
                ["Ctrl + Z", "بازگردانی"],
                ["Ctrl + /", "میانبرها"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-surface-2 text-[11px] font-mono">{key}</kbd>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function BarButton({
  icon,
  tooltip,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`p-2 rounded-lg transition-colors duration-120 min-w-[36px] min-h-[36px] flex items-center justify-center
        ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"}`}
    >
      {icon}
    </button>
  );
}
