import { useAppState, useNotoStore } from "./store";
import { motion } from "motion/react";
import { Bell, Clock, X, AlarmClock, Check, ChevronLeft } from "lucide-react";

export function TodayDashboard({ onClose, onNavigate }: { onClose: () => void; onNavigate: (type: "note" | "checklist", id: string) => void }) {
  const state = useAppState();
  const store = useNotoStore();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Collect all alarms
  type AlarmEntry = {
    type: "checklist" | "note";
    id: string;
    title: string;
    alarm: NonNullable<typeof state.checklist[0]["alarm"]>;
  };

  const alarms: AlarmEntry[] = [];

  state.checklist.forEach((c) => {
    if (c.alarm) {
      alarms.push({ type: "checklist", id: c.id, title: c.title, alarm: c.alarm });
    }
  });

  state.notes.forEach((n) => {
    if (n.alarm) {
      alarms.push({ type: "note", id: n.id, title: n.title || "بدون عنوان", alarm: n.alarm });
    }
  });

  const todayAlarms = alarms.filter((a) => {
    const at = new Date(a.alarm.at);
    return at >= today && at < tomorrow && a.alarm.status !== "dismissed";
  });

  const missedAlarms = alarms.filter((a) => {
    const at = new Date(a.alarm.at);
    return at < new Date() && a.alarm.status === "scheduled";
  });

  const upcomingAlarms = alarms.filter((a) => {
    const at = new Date(a.alarm.at);
    return at >= tomorrow && a.alarm.status === "scheduled";
  }).slice(0, 5);

  todayAlarms.sort((a, b) => new Date(a.alarm.at).getTime() - new Date(b.alarm.at).getTime());

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="absolute top-12 left-4 right-4 sm:left-auto sm:right-auto sm:w-[380px] bg-surface border border-divider rounded-2xl shadow-xl z-50 overflow-hidden"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <div className="p-4 border-b border-divider flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlarmClock className="w-5 h-5 text-primary" />
          <h3>یادآورهای امروز</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-2">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {/* Missed */}
        {missedAlarms.length > 0 && (
          <div className="p-3">
            <div className="text-[11px] text-danger mb-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              از دست رفته
            </div>
            {missedAlarms.map((a) => (
              <AlarmRow
                key={a.id}
                entry={a}
                variant="missed"
                onDismiss={() => store.dismissAlarm(a.type, a.id)}
                onSnooze={(m) => store.snoozeAlarm(a.type, a.id, m)}
                onNavigate={() => onNavigate(a.type, a.id)}
              />
            ))}
          </div>
        )}

        {/* Today */}
        <div className="p-3">
          <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            امروز
          </div>
          {todayAlarms.length === 0 ? (
            <p className="text-[12px] text-muted-foreground py-4 text-center">یادآوری برای امروز ندارید</p>
          ) : (
            todayAlarms.map((a) => (
              <AlarmRow
                key={a.id}
                entry={a}
                variant="today"
                onDismiss={() => store.dismissAlarm(a.type, a.id)}
                onSnooze={(m) => store.snoozeAlarm(a.type, a.id, m)}
                onNavigate={() => onNavigate(a.type, a.id)}
              />
            ))
          )}
        </div>

        {/* Upcoming */}
        {upcomingAlarms.length > 0 && (
          <div className="p-3 border-t border-divider">
            <div className="text-[11px] text-muted-foreground mb-2">آینده</div>
            {upcomingAlarms.map((a) => (
              <AlarmRow
                key={a.id}
                entry={a}
                variant="upcoming"
                onDismiss={() => store.dismissAlarm(a.type, a.id)}
                onSnooze={(m) => store.snoozeAlarm(a.type, a.id, m)}
                onNavigate={() => onNavigate(a.type, a.id)}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AlarmRow({
  entry,
  variant,
  onDismiss,
  onSnooze,
  onNavigate,
}: {
  entry: { type: string; id: string; title: string; alarm: any };
  variant: "missed" | "today" | "upcoming";
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
  onNavigate: () => void;
}) {
  const at = new Date(entry.alarm.at);
  const timeStr = at.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = at.toLocaleDateString("fa-IR", { month: "short", day: "numeric" });

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-xl mb-1 transition-colors cursor-pointer hover:bg-surface-2
        ${variant === "missed" ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}
      onClick={onNavigate}
    >
      <Bell className={`w-4 h-4 shrink-0 ${variant === "missed" ? "text-danger" : "text-warning"}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] truncate">{entry.title}</div>
        <div className="text-[11px] text-muted-foreground">
          {variant === "upcoming" ? dateStr + " " : ""}{timeStr}
          {entry.alarm.repeat !== "none" && (
            <span className="mr-1">({entry.alarm.repeat === "daily" ? "روزانه" : "هفتگی"})</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {(variant === "missed" || variant === "today") && (
          <>
            <button
              onClick={onDismiss}
              className="p-1 rounded-lg hover:bg-surface-3 text-muted-foreground"
              title="رد کردن"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <select
              onChange={(e) => { const v = parseInt(e.target.value); if (v) onSnooze(v); }}
              defaultValue=""
              className="h-6 px-1 rounded text-[10px] bg-surface-2 border-none outline-none"
            >
              <option value="" disabled>تعویق</option>
              <option value="5">۵ دقیقه</option>
              <option value="10">۱۰ دقیقه</option>
              <option value="30">۳۰ دقیقه</option>
            </select>
          </>
        )}
        <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}
