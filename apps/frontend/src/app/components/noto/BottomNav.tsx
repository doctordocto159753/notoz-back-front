import { ListChecks, FileText, Bell, Settings } from "lucide-react";
import { motion } from "motion/react";

export type MobileTab = "checklist" | "notes" | "reminders" | "settings";

export function BottomNav({
  active,
  onChange,
  alarmCount,
}: {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
  alarmCount: number;
}) {
  const tabs: { id: MobileTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "checklist", label: "چک‌لیست", icon: <ListChecks className="w-5 h-5" /> },
    { id: "notes", label: "یادداشت", icon: <FileText className="w-5 h-5" /> },
    { id: "reminders", label: "یادآور", icon: <Bell className="w-5 h-5" />, badge: alarmCount },
    { id: "settings", label: "تنظیمات", icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-divider px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors relative min-w-[56px]
              ${active === tab.id ? "text-primary" : "text-muted-foreground"}`}
          >
            {active === tab.id && (
              <motion.div
                layoutId="bottomNavIndicator"
                className="absolute -top-0.5 w-8 h-0.5 rounded-full bg-primary"
                transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              />
            )}
            <div className="relative">
              {tab.icon}
              {(tab.badge ?? 0) > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
