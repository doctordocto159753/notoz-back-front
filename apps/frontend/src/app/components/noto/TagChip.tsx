import { X } from "lucide-react";

const TAG_COLORS: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  default: "bg-accent-weak text-foreground/70",
};

export function TagChip({
  label,
  colorKey,
  selected,
  onRemove,
  onClick,
  size = "sm",
}: {
  label: string;
  colorKey?: string;
  selected?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  size?: "sm" | "md";
}) {
  const colors = TAG_COLORS[colorKey || "default"] || TAG_COLORS.default;
  const sizeClasses = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-[12px] px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md transition-all duration-120 ${colors} ${sizeClasses}
        ${selected ? "ring-2 ring-primary/30" : ""}
        ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}
      onClick={onClick}
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="hover:bg-black/10 rounded p-0.5 -mr-1"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

export function getTagColors() {
  return Object.keys(TAG_COLORS).filter((k) => k !== "default");
}
