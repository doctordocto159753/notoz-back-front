export type TagDef = {
  id: string;
  title: string;
  colorKey?: string;
};

export type Alarm = {
  id: string;
  at: string; // ISO datetime
  repeat?: "none" | "daily" | "weekly";
  snoozeMinutes?: number;
  firedAt?: string;
  status: "scheduled" | "fired" | "dismissed" | "missed";
};

export type ChecklistItem = {
  id: string;
  title: string;
  descriptionHtml: string;
  checked: boolean;
  pinned: boolean;
  archived: boolean;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  alarm?: Alarm;
};

export type NoteBlock = {
  id: string;
  title: string;
  html: string;
  contentJson?: any; // Tiptap JSON
  pinned: boolean;
  archived: boolean;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  alarm?: Alarm;
};

export type PanelLayout = {
  splitRatio: number;
  collapsed: "none" | "left" | "right";
};

export type Settings = {
  theme: "light" | "dark";
  usePersianDigits: boolean;
  panelLayout: PanelLayout;
};

export type AppState = {
  schemaVersion: 2;
  settings: Settings;
  checklist: ChecklistItem[];
  notes: NoteBlock[];
  tags: TagDef[];
};

export type UndoEntry = {
  type: string;
  description: string;
  data: any;
  timestamp: number;
};
