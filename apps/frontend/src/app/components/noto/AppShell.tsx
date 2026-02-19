import { useState, useEffect, useCallback, useRef } from "react";
import { useAppState, useNotoStore } from "./store";
import { TopBar } from "./TopBar";
import { ChecklistPanel } from "./ChecklistPanel";
import { NotesPanel } from "./NotesPanel";
import { NoteEditorPage } from "./NoteEditorPage";
import { ChecklistExpandPage } from "./ChecklistExpandPage";
import { TodayDashboard } from "./TodayDashboard";
import { SettingsPanel } from "./SettingsPanel";
import { BottomNav, MobileTab } from "./BottomNav";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Bell } from "lucide-react";
import { TagManager } from "./TagManager";

// Mobile-specific inline components
function MobileReminders({ onNavigate }: { onNavigate: (type: "note" | "checklist", id: string) => void }) {
  const state = useAppState();
  const store = useNotoStore();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  type AlarmEntry = { type: "checklist" | "note"; id: string; title: string; alarm: any };
  const alarms: AlarmEntry[] = [];
  state.checklist.forEach((c) => { if (c.alarm) alarms.push({ type: "checklist", id: c.id, title: c.title, alarm: c.alarm }); });
  state.notes.forEach((n) => { if (n.alarm) alarms.push({ type: "note", id: n.id, title: n.title || "بدون عنوان", alarm: n.alarm }); });

  const todayAlarms = alarms.filter((a) => {
    const at = new Date(a.alarm.at);
    return at >= today && at < tomorrow && a.alarm.status !== "dismissed";
  });
  const missedAlarms = alarms.filter((a) => new Date(a.alarm.at) < new Date() && a.alarm.status === "scheduled");

  return (
    <div className="p-4 pb-20 overflow-y-auto h-full">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-primary" />
        <h2>یادآورها</h2>
      </div>
      {missedAlarms.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] text-danger mb-2">از دست رفته</p>
          {missedAlarms.map((a) => (
            <div key={a.id} className="p-3 rounded-xl bg-red-50/50 dark:bg-red-900/10 mb-1 flex items-center gap-2" onClick={() => onNavigate(a.type, a.id)}>
              <Bell className="w-4 h-4 text-danger" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] truncate">{a.title}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(a.alarm.at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); store.dismissAlarm(a.type, a.id); }} className="px-2 py-1 text-[11px] bg-surface-2 rounded-lg">رد</button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mb-2">امروز</p>
      {todayAlarms.length === 0 ? (
        <p className="text-[13px] text-muted-foreground text-center py-8">یادآوری برای امروز ندارید</p>
      ) : (
        todayAlarms.map((a) => (
          <div key={a.id} className="p-3 rounded-xl hover:bg-surface-2 mb-1 flex items-center gap-2 cursor-pointer" onClick={() => onNavigate(a.type, a.id)}>
            <Bell className="w-4 h-4 text-warning" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] truncate">{a.title}</div>
              <div className="text-[11px] text-muted-foreground">{new Date(a.alarm.at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MobileSettings() {
  const state = useAppState();
  const store = useNotoStore();
  return (
    <div className="p-4 pb-20 overflow-y-auto h-full space-y-5">
      <h2>تنظیمات</h2>
      <div>
        <p className="text-[13px] mb-2">تم ظاهری</p>
        <div className="flex gap-2">
          <button onClick={() => { store.setTheme("light"); document.documentElement.classList.remove("dark"); }}
            className={`flex-1 py-2 rounded-xl text-[13px] ${state.settings.theme === "light" ? "bg-primary text-primary-foreground" : "bg-surface-2"}`}>روشن</button>
          <button onClick={() => { store.setTheme("dark"); document.documentElement.classList.add("dark"); }}
            className={`flex-1 py-2 rounded-xl text-[13px] ${state.settings.theme === "dark" ? "bg-primary text-primary-foreground" : "bg-surface-2"}`}>تاریک</button>
        </div>
      </div>
      <div>
        <p className="text-[13px] mb-2">مدیریت برچسب‌ها</p>
        <TagManager mode="manage" />
      </div>
      <div className="text-[12px] text-muted-foreground bg-surface-2 p-3 rounded-xl">
        <p><strong>NOTO</strong> — دفترچه و چک‌لیست</p>
        <p>تعداد آیتم‌ها: {state.checklist.length} | یادداشت‌ها: {state.notes.length}</p>
      </div>
    </div>
  );
}

type ExpandedView =
  | { type: "none" }
  | { type: "note"; id: string }
  | { type: "checklist"; id: string };

export function AppShell() {
  const state = useAppState();
  const store = useNotoStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [expandedView, setExpandedView] = useState<ExpandedView>({ type: "none" });
  const [mobileTab, setMobileTab] = useState<MobileTab>("checklist");
  const [isMobile, setIsMobile] = useState(false);
  const [dividerPos, setDividerPos] = useState(state.settings.panelLayout.splitRatio);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Apply theme on mount
  useEffect(() => {
    if (state.settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in inputs (except specific combos)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "k" || e.key === "K") {
          e.preventDefault();
          setSearchQuery((prev) => (prev ? "" : " "));
          // Toggle search in TopBar
        }
        if (e.key === "z" && !e.shiftKey) {
          if (!isInput) {
            e.preventDefault();
            store.undo();
            toast("بازگردانی شد", { duration: 2000 });
          }
        }
        if (e.key === "n" && !e.shiftKey && !isInput) {
          e.preventDefault();
          const note = store.addNote();
          setExpandedView({ type: "note", id: note.id });
        }
        if (e.key === "N" && e.shiftKey && !isInput) {
          e.preventDefault();
          // Focus on checklist add input
          const input = document.querySelector('[placeholder="آیتم جدید..."]') as HTMLInputElement;
          if (input) input.focus();
        }
        if (e.key === "/") {
          e.preventDefault();
          // Shortcuts help - handled in TopBar
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [store]);

  // Alarm checker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const allItems = [
        ...state.checklist.map((c) => ({ ...c, _type: "checklist" as const })),
        ...state.notes.map((n) => ({ ...n, title: n.title || "یادداشت", _type: "note" as const })),
      ];

      allItems.forEach((item) => {
        if (!item.alarm || item.alarm.status !== "scheduled") return;
        const at = new Date(item.alarm.at);
        if (at <= now) {
          // Fire alarm
          store.setAlarm(item._type, item.id, { ...item.alarm, status: "fired", firedAt: now.toISOString() });

          // Try notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("NOTO یادآور", {
              body: item.title,
              icon: "/favicon.ico",
            });
          }

          // Toast fallback
          toast(
            `یادآور: ${item.title}`,
            {
              duration: 15000,
              action: {
                label: "تعویق ۵ دقیقه",
                onClick: () => store.snoozeAlarm(item._type, item.id, 5),
              },
            }
          );
        }
      });
    }, 10000); // Check every 10s

    return () => clearInterval(interval);
  }, [state, store]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      // We'll ask when user first sets an alarm (handled elsewhere)
    }
  }, []);

  const handleExpandNote = useCallback((id: string) => {
    setExpandedView({ type: "note", id });
  }, []);

  const handleExpandChecklist = useCallback((id: string) => {
    setExpandedView({ type: "checklist", id });
  }, []);

  const handleBack = useCallback(() => {
    setExpandedView({ type: "none" });
  }, []);

  const handleDashboardNavigate = useCallback((type: "note" | "checklist", id: string) => {
    setShowDashboard(false);
    setExpandedView({ type, id });
  }, []);

  // Divider drag
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // RTL: right edge is start
      const fromRight = rect.right - e.clientX;
      const pct = Math.min(80, Math.max(20, (fromRight / rect.width) * 100));
      setDividerPos(pct);
    };

    const onUp = () => {
      isDraggingRef.current = false;
      store.setPanelLayout({ splitRatio: dividerPos });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [dividerPos, store]);

  // Count active alarms for badge
  const alarmCount = [...state.checklist, ...state.notes].filter(
    (item) => item.alarm && (item.alarm.status === "scheduled" || item.alarm.status === "fired")
  ).length;

  const collapsed = state.settings.panelLayout.collapsed;

  // If expanded view is open
  if (expandedView.type !== "none") {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className="h-full flex flex-col" dir="rtl">
          <AnimatePresence mode="wait">
            {expandedView.type === "note" ? (
              <NoteEditorPage key={expandedView.id} noteId={expandedView.id} onBack={handleBack} />
            ) : (
              <ChecklistExpandPage key={expandedView.id} itemId={expandedView.id} onBack={handleBack} />
            )}
          </AnimatePresence>
        </div>
      </DndProvider>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className="h-full flex flex-col" dir="rtl">
          <TopBar
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            onToggleSettings={() => setMobileTab("settings")}
            onToggleTodayDashboard={() => setShowDashboard(!showDashboard)}
          />

          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {mobileTab === "checklist" && (
                <motion.div
                  key="checklist"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <ChecklistPanel searchQuery={searchQuery} onExpand={handleExpandChecklist} />
                </motion.div>
              )}
              {mobileTab === "notes" && (
                <motion.div
                  key="notes"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <NotesPanel searchQuery={searchQuery} onExpand={handleExpandNote} />
                </motion.div>
              )}
              {mobileTab === "reminders" && (
                <motion.div
                  key="reminders"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <MobileReminders
                    onNavigate={handleDashboardNavigate}
                  />
                </motion.div>
              )}
              {mobileTab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <MobileSettings />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <BottomNav active={mobileTab} onChange={setMobileTab} alarmCount={alarmCount} />
        </div>
      </DndProvider>
    );
  }

  // Desktop layout
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col" dir="rtl">
        <TopBar
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onToggleSettings={() => setShowSettings(!showSettings)}
          onToggleTodayDashboard={() => setShowDashboard(!showDashboard)}
        />

        <div className="flex-1 flex overflow-hidden relative" ref={containerRef}>
          {/* Right panel: Checklist */}
          {collapsed !== "right" && (
            <div
              className="h-full overflow-hidden bg-background border-l border-divider"
              style={{
                width: collapsed === "left" ? "100%" : `${dividerPos}%`,
                transition: isDraggingRef.current ? "none" : "width 0.2s ease",
              }}
            >
              <ChecklistPanel searchQuery={searchQuery} onExpand={handleExpandChecklist} />
            </div>
          )}

          {/* Divider */}
          {collapsed === "none" && (
            <div
              className="w-1 hover:w-1.5 bg-divider hover:bg-primary/20 cursor-col-resize transition-all shrink-0 relative group"
              onMouseDown={handleDividerMouseDown}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-muted-foreground/20 group-hover:bg-primary/40 transition-colors" />
            </div>
          )}

          {/* Left panel: Notes */}
          {collapsed !== "left" && (
            <div
              className="h-full overflow-hidden bg-background"
              style={{
                width: collapsed === "right" ? "100%" : `${100 - dividerPos}%`,
                transition: isDraggingRef.current ? "none" : "width 0.2s ease",
              }}
            >
              <NotesPanel searchQuery={searchQuery} onExpand={handleExpandNote} />
            </div>
          )}
        </div>

        {/* Dashboard overlay */}
        <AnimatePresence>
          {showDashboard && (
            <TodayDashboard
              onClose={() => setShowDashboard(false)}
              onNavigate={handleDashboardNavigate}
            />
          )}
        </AnimatePresence>

        {/* Settings modal */}
        <AnimatePresence>
          {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        </AnimatePresence>
      </div>
    </DndProvider>
  );
}