import { useState } from "react";
import { Bell, X, Clock, Repeat } from "lucide-react";
import type { Alarm } from "./types";

export function AlarmPicker({
  alarm,
  onSet,
  onRemove,
}: {
  alarm?: Alarm;
  onSet: (alarm: Alarm) => void;
  onRemove: () => void;
}) {
  const now = new Date();
  const defaultDate = alarm ? new Date(alarm.at) : new Date(now.getTime() + 3600000);

  const [date, setDate] = useState(formatDateForInput(defaultDate));
  const [time, setTime] = useState(formatTimeForInput(defaultDate));
  const [repeat, setRepeat] = useState<"none" | "daily" | "weekly">(alarm?.repeat || "none");

  const handleSet = () => {
    const dt = new Date(`${date}T${time}`);
    if (isNaN(dt.getTime())) return;
    const id = alarm?.id || crypto.randomUUID();
    onSet({
      id,
      at: dt.toISOString(),
      repeat,
      status: "scheduled",
    });
  };

  const hasAlarm = alarm && alarm.status !== "dismissed";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[13px]">
        <Bell className="w-4 h-4 text-warning" />
        <span>یادآور</span>
        {hasAlarm && (
          <span className="text-[11px] text-muted-foreground mr-auto">
            {new Date(alarm.at).toLocaleDateString("fa-IR")} - {new Date(alarm.at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <label className="text-[11px] text-muted-foreground">تاریخ:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 px-2 rounded-lg bg-surface-2 border-none outline-none text-[12px]"
          />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-[11px] text-muted-foreground">ساعت:</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-8 px-2 rounded-lg bg-surface-2 border-none outline-none text-[12px]"
          />
        </div>
        <div className="flex items-center gap-1">
          <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as any)}
            className="h-8 px-2 rounded-lg bg-surface-2 border-none outline-none text-[12px]"
          >
            <option value="none">بدون تکرار</option>
            <option value="daily">روزانه</option>
            <option value="weekly">هفتگی</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSet}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] hover:opacity-90 transition-opacity"
        >
          {hasAlarm ? "به‌روزرسانی" : "تنظیم یادآور"}
        </button>
        {hasAlarm && (
          <button
            onClick={onRemove}
            className="px-3 py-1.5 rounded-lg bg-surface-2 text-[12px] hover:bg-surface-3 transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            حذف
          </button>
        )}
      </div>
    </div>
  );
}

function formatDateForInput(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatTimeForInput(d: Date): string {
  return d.toTimeString().slice(0, 5);
}
