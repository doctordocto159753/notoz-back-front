import React, {
  createContext,
  useContext,
  useRef,
  useSyncExternalStore,
  useEffect,
} from "react";
import type {
  AppState,
  ChecklistItem,
  NoteBlock,
  TagDef,
  Alarm,
  UndoEntry,
  Settings,
} from "./types";

const STORAGE_KEY = "noto-app-state";
const AUTH_STORAGE_KEY = "noto-auth";
const UNDO_MAX = 50;

const rawBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

const API_BASE_URL = (rawBase && rawBase.trim().length > 0
  ? rawBase.trim()
  : import.meta.env.DEV
    ? "http://localhost:8080"
    : window.location.origin
).replace(/\/+$/, "");

type AuthState = {
  username: string;
  password: string;
  accessToken: string;
};

function now(): string {
  return new Date().toISOString();
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

function uuidv4(): string {
  // Prefer native crypto.randomUUID
  if (typeof crypto !== "undefined" && "randomUUID" in crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // RFC4122 v4 polyfill
  const rnds = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(rnds);
  } else {
    for (let i = 0; i < rnds.length; i++) rnds[i] = Math.floor(Math.random() * 256);
  }

  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  const hex = Array.from(rnds)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20)}`;
}

function genId(): string {
  return uuidv4();
}

const defaultState: AppState = {
  schemaVersion: 2,
  settings: {
    theme: "light",
    usePersianDigits: false,
    panelLayout: { splitRatio: 50, collapsed: "none" },
  },
  checklist: [],
  notes: [],
  tags: [],
};

function ensureUuidState(input: AppState): AppState {
  const map = new Map<string, string>();

  const fix = (id: string | undefined | null): string | undefined => {
    if (!id) return undefined;
    if (isUuid(id)) return id;
    if (!map.has(id)) map.set(id, uuidv4());
    return map.get(id);
  };

  const tags = (input.tags ?? []).map((t) => ({
    ...t,
    id: fix(t.id)!,
  }));

  const checklist = (input.checklist ?? []).map((c) => ({
    ...c,
    id: fix(c.id)!,
    tags: (c.tags ?? []).map((tid) => fix(tid)!).filter(Boolean),
    alarm: c.alarm
      ? {
          ...c.alarm,
          id: fix(c.alarm.id) || c.alarm.id,
        }
      : c.alarm,
  }));

  const notes = (input.notes ?? []).map((n) => ({
    ...n,
    id: fix(n.id)!,
    tags: (n.tags ?? []).map((tid) => fix(tid)!).filter(Boolean),
    alarm: n.alarm
      ? {
          ...n.alarm,
          id: fix(n.alarm.id) || n.alarm.id,
        }
      : n.alarm,
  }));

  return {
    ...defaultState,
    ...input,
    tags,
    checklist,
    notes,
    settings: {
      ...defaultState.settings,
      ...(input.settings ?? {}),
      panelLayout: {
        ...defaultState.settings.panelLayout,
        ...(input.settings?.panelLayout ?? {}),
      },
    },
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    const fixed = ensureUuidState({ ...defaultState, ...parsed });
    // If we repaired any IDs, persist silently.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixed));
    return fixed;
  } catch {
    return { ...defaultState };
  }
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e: any) {
    if (e?.name === "QuotaExceededError") {
      throw new Error("QUOTA_EXCEEDED");
    }
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type Listener = () => void;

class NotoStore {
  private state: AppState;
  private listeners = new Set<Listener>();
  private undoStack: UndoEntry[] = [];
  private redoStack: UndoEntry[] = [];

  private initialized = false;
  private syncingEnabled = true;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private auth: AuthState | null = null;

  constructor() {
    this.state = loadState();
  }

  // --- Bootstrap: invisible auth + optional pull from server
  async init() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      await this.ensureAuth();
      await this.initialSync();
    } catch {
      // Backend might be down; app remains fully local.
    }
  }

  private readAuth(): AuthState | null {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.username && parsed?.password && parsed?.accessToken) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  private writeAuth(auth: AuthState) {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // ignore
    }
  }

  private async ensureAuth() {
    const existing = this.readAuth();
    if (existing?.accessToken) {
      this.auth = existing;
      // Best-effort token check
      const ok = await this.apiFetch("/api/v1/me", { method: "GET" }, existing).then(
        () => true,
        () => false
      );
      if (ok) return;
    }

    const creds = existing ?? {
      username: `noto_${uuidv4().slice(0, 8)}`,
      password: uuidv4().replace(/-/g, ""),
      accessToken: "",
    };

    const login = async () => {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: creds.username, password: creds.password }),
      });
      if (!res.ok) throw new Error("LOGIN_FAILED");
      const data = await res.json();
      creds.accessToken = data.accessToken;
      this.auth = creds;
      this.writeAuth(creds);
    };

    const register = async () => {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: creds.username, password: creds.password }),
      });
      if (!res.ok) throw new Error("REGISTER_FAILED");
    };

    // Try: login -> register -> login
    try {
      await login();
      return;
    } catch {
      // continue
    }

    try {
      await register();
    } catch {
      // If register failed (e.g. conflict), we'll still try login.
    }

    await login();
  }

  private async apiFetch(path: string, init: RequestInit, authOverride?: AuthState) {
    const auth = authOverride ?? this.auth;
    const headers = new Headers(init.headers || {});
    headers.set("Accept", "application/json");
    if (auth?.accessToken) headers.set("Authorization", `Bearer ${auth.accessToken}`);

    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status}:${text || res.statusText}`);
    }

    if (res.status === 204) return null;
    return res.json();
  }

  private localHasData(s: AppState) {
    return (
      (s.checklist?.length ?? 0) > 0 || (s.notes?.length ?? 0) > 0 || (s.tags?.length ?? 0) > 0
    );
  }

  private async initialSync() {
    // If user already has local data, we keep it as the source of truth and push.
    // If local is empty, we try pulling from server.
    const localHas = this.localHasData(this.state);

    let remote: any | null = null;
    try {
      remote = await this.apiFetch("/api/v1/export", { method: "GET" });
    } catch {
      return;
    }

    const remoteState = remote?.state;
    const remoteHas =
      remoteState &&
      ((remoteState.checklist?.length ?? 0) > 0 ||
        (remoteState.notes?.length ?? 0) > 0 ||
        (remoteState.tags?.length ?? 0) > 0);

    if (!localHas && remoteHas) {
      // Pull into local
      const pulled = this.mapRemoteToLocal(remoteState);
      this.replaceState(pulled);
      return;
    }

    if (localHas && !remoteHas) {
      // Push local
      this.scheduleSync(true);
      return;
    }

    if (localHas && remoteHas) {
      // Prefer local to avoid surprising UI changes.
      this.scheduleSync(true);
    }
  }

  private mapRemoteToLocal(remoteState: any): AppState {
    const splitRatio = Number(remoteState?.settings?.panelLayout?.splitRatio ?? 0.5);
    const localSplit = clamp(splitRatio, 0.2, 0.8) * 100;

    const checklist = (remoteState?.checklist ?? []).map((c: any, i: number) => ({
      id: c.id,
      title: c.title ?? "",
      descriptionHtml: c.descriptionHtml ?? "",
      checked: !!c.checked,
      pinned: !!c.pinned,
      archived: !!c.archived,
      tags: c.tags ?? [],
      order: typeof c.order === "number" ? c.order : i,
      createdAt: now(),
      updatedAt: now(),
      alarm: c.alarm ?? undefined,
    }));

    const notes = (remoteState?.notes ?? []).map((n: any, i: number) => ({
      id: n.id,
      title: n.title ?? "",
      html: n.html ?? "",
      contentJson: n.contentJson ?? null,
      pinned: !!n.pinned,
      archived: !!n.archived,
      tags: n.tags ?? [],
      order: typeof n.order === "number" ? n.order : i,
      createdAt: now(),
      updatedAt: now(),
      alarm: n.alarm ?? undefined,
    }));

    const tags = (remoteState?.tags ?? []).map((t: any) => ({
      id: t.id,
      title: t.title ?? "",
      colorKey: t.colorKey ?? undefined,
    }));

    const next: AppState = {
      schemaVersion: 2,
      settings: {
        theme: remoteState?.settings?.theme === "dark" ? "dark" : "light",
        usePersianDigits: !!remoteState?.settings?.usePersianDigits,
        panelLayout: {
          splitRatio: localSplit,
          collapsed: remoteState?.settings?.panelLayout?.collapsed ?? "none",
        },
      },
      checklist,
      notes,
      tags,
    };

    return ensureUuidState(next);
  }

  private mapLocalToRemote(state: AppState) {
    const splitRatio = clamp((state.settings.panelLayout.splitRatio ?? 50) / 100, 0.2, 0.8);

    return {
      schemaVersion: 2 as const,
      settings: {
        theme: state.settings.theme,
        usePersianDigits: state.settings.usePersianDigits,
        panelLayout: {
          splitRatio,
          collapsed: state.settings.panelLayout.collapsed,
        },
      },
      tags: (state.tags ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        colorKey: t.colorKey ?? null,
      })),
      checklist: (state.checklist ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        descriptionHtml: c.descriptionHtml ?? "",
        checked: !!c.checked,
        pinned: !!c.pinned,
        archived: !!c.archived,
        tags: c.tags ?? [],
        order: c.order ?? 0,
        alarm: c.alarm ?? null,
      })),
      notes: (state.notes ?? []).map((n) => ({
        id: n.id,
        title: n.title ?? "",
        html: n.html ?? "",
        contentJson: n.contentJson ?? null,
        pinned: !!n.pinned,
        archived: !!n.archived,
        tags: n.tags ?? [],
        order: n.order ?? 0,
        alarm: n.alarm ?? null,
      })),
    };
  }

  private scheduleSync(immediate = false) {
    if (!this.syncingEnabled) return;
    if (!this.initialized) return;

    if (this.syncTimer) clearTimeout(this.syncTimer);

    const run = async () => {
      try {
        await this.ensureAuth();
        const state = this.mapLocalToRemote(this.state);
        await this.apiFetch("/api/v1/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "replace", state }),
        });
      } catch {
        // Ignore sync errors; local storage remains primary.
      }
    };

    if (immediate) {
      void run();
      return;
    }

    this.syncTimer = setTimeout(() => void run(), 1000);
  }

  private replaceState(next: AppState) {
    // Avoid triggering a sync storm while replacing.
    this.syncingEnabled = false;
    this.state = ensureUuidState(next);
    saveState(this.state);
    this.undoStack = [];
    this.redoStack = [];
    this.emit();
    this.syncingEnabled = true;
    // Push pulled data back too (keeps remote normalized)
    this.scheduleSync(true);
  }

  // --- Store basics
  getState = (): AppState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.listeners.forEach((l) => l());
  }

  private update(partial: Partial<AppState>) {
    this.state = ensureUuidState({ ...this.state, ...partial });
    saveState(this.state);
    this.emit();
    this.scheduleSync(false);
  }

  private pushUndo(entry: UndoEntry) {
    this.undoStack.push(entry);
    if (this.undoStack.length > UNDO_MAX) this.undoStack.shift();
    this.redoStack = [];
  }

  // Settings
  setTheme(theme: "light" | "dark") {
    this.update({
      settings: { ...this.state.settings, theme },
    });
  }

  setPanelLayout(layout: Partial<AppState["settings"]["panelLayout"]>) {
    this.update({
      settings: {
        ...this.state.settings,
        panelLayout: { ...this.state.settings.panelLayout, ...layout },
      },
    });
  }

  updateSettings(partial: Partial<Settings>) {
    this.update({
      settings: { ...this.state.settings, ...partial },
    });
  }

  // Checklist
  addChecklistItem(title: string, descriptionHtml: string = ""): ChecklistItem {
    const maxOrder = this.state.checklist.reduce((m, c) => Math.max(m, c.order), -1);
    const item: ChecklistItem = {
      id: genId(),
      title,
      descriptionHtml,
      checked: false,
      pinned: false,
      archived: false,
      tags: [],
      order: maxOrder + 1,
      createdAt: now(),
      updatedAt: now(),
    };
    this.update({ checklist: [item, ...this.state.checklist] });
    this.pushUndo({
      type: "add-checklist",
      description: "افزودن آیتم",
      data: item,
      timestamp: Date.now(),
    });
    return item;
  }

  updateChecklistItem(id: string, partial: Partial<ChecklistItem>) {
    const old = this.state.checklist.find((c) => c.id === id);
    if (!old) return;
    this.pushUndo({
      type: "update-checklist",
      description: "ویرایش آیتم",
      data: { ...old },
      timestamp: Date.now(),
    });
    this.update({
      checklist: this.state.checklist.map((c) =>
        c.id === id ? { ...c, ...partial, updatedAt: now() } : c
      ),
    });
  }

  toggleChecklistItem(id: string) {
    const item = this.state.checklist.find((c) => c.id === id);
    if (!item) return;
    this.pushUndo({
      type: "toggle-checklist",
      description: "تغییر وضعیت",
      data: { ...item },
      timestamp: Date.now(),
    });
    const nextChecked = !item.checked;

    // Rule: when checked, push to end and make inactive
    let updatedList = this.state.checklist.map((c) =>
      c.id === id ? { ...c, checked: nextChecked, updatedAt: now() } : c
    );

    if (nextChecked) {
      const maxOrder = updatedList.reduce((m, c) => Math.max(m, c.order), -1);
      updatedList = updatedList.map((c) =>
        c.id === id ? { ...c, order: maxOrder + 1 } : c
      );
    }

    this.update({ checklist: updatedList });
  }

  deleteChecklistItem(id: string): ChecklistItem | undefined {
    const item = this.state.checklist.find((c) => c.id === id);
    if (!item) return undefined;
    this.pushUndo({
      type: "delete-checklist",
      description: "حذف آیتم",
      data: { ...item },
      timestamp: Date.now(),
    });
    this.update({ checklist: this.state.checklist.filter((c) => c.id !== id) });
    return item;
  }

  restoreChecklistItem(item: ChecklistItem) {
    const exists = this.state.checklist.find((c) => c.id === item.id);
    if (exists) return;
    this.update({ checklist: [...this.state.checklist, item] });
  }

  pinChecklistItem(id: string) {
    const item = this.state.checklist.find((c) => c.id === id);
    if (!item) return;
    this.pushUndo({
      type: "pin-checklist",
      description: "پین آیتم",
      data: { ...item },
      timestamp: Date.now(),
    });
    this.update({
      checklist: this.state.checklist.map((c) =>
        c.id === id ? { ...c, pinned: !c.pinned, updatedAt: now() } : c
      ),
    });
  }

  reorderChecklist(items: ChecklistItem[]) {
    // Keep order stable based on current visual order
    this.update({ checklist: items.map((it, i) => ({ ...it, order: i })) });
  }

  // Notes
  addNote(): NoteBlock {
    const maxOrder = this.state.notes.reduce((m, n) => Math.max(m, n.order), -1);
    const note: NoteBlock = {
      id: genId(),
      title: "",
      html: "",
      contentJson: null,
      pinned: false,
      archived: false,
      tags: [],
      order: maxOrder + 1,
      createdAt: now(),
      updatedAt: now(),
    };
    this.update({ notes: [note, ...this.state.notes] });
    this.pushUndo({
      type: "add-note",
      description: "یادداشت جدید",
      data: note,
      timestamp: Date.now(),
    });
    return note;
  }

  updateNote(id: string, partial: Partial<NoteBlock>) {
    this.update({
      notes: this.state.notes.map((n) =>
        n.id === id ? { ...n, ...partial, updatedAt: now() } : n
      ),
    });
  }

  deleteNote(id: string): NoteBlock | undefined {
    const note = this.state.notes.find((n) => n.id === id);
    if (!note) return undefined;
    this.pushUndo({
      type: "delete-note",
      description: "حذف یادداشت",
      data: { ...note },
      timestamp: Date.now(),
    });
    this.update({ notes: this.state.notes.filter((n) => n.id !== id) });
    return note;
  }

  restoreNote(note: NoteBlock) {
    const exists = this.state.notes.find((n) => n.id === note.id);
    if (exists) return;
    this.update({ notes: [...this.state.notes, note] });
  }

  pinNote(id: string) {
    const note = this.state.notes.find((n) => n.id === id);
    if (!note) return;
    this.update({
      notes: this.state.notes.map((n) =>
        n.id === id ? { ...n, pinned: !n.pinned, updatedAt: now() } : n
      ),
    });
  }

  reorderNotes(items: NoteBlock[]) {
    this.update({ notes: items.map((it, i) => ({ ...it, order: i })) });
  }

  // Tags
  addTag(title: string, colorKey?: string): TagDef {
    const tag: TagDef = { id: genId(), title, colorKey };
    this.update({ tags: [...this.state.tags, tag] });
    return tag;
  }

  updateTag(id: string, partial: Partial<TagDef>) {
    this.update({
      tags: this.state.tags.map((t) => (t.id === id ? { ...t, ...partial } : t)),
    });
  }

  deleteTag(id: string) {
    this.update({
      tags: this.state.tags.filter((t) => t.id !== id),
      checklist: this.state.checklist.map((c) => ({
        ...c,
        tags: c.tags.filter((t) => t !== id),
      })),
      notes: this.state.notes.map((n) => ({
        ...n,
        tags: n.tags.filter((t) => t !== id),
      })),
    });
  }

  toggleTagOnItem(itemId: string, tagId: string, type: "checklist" | "note") {
    if (type === "checklist") {
      this.update({
        checklist: this.state.checklist.map((c) => {
          if (c.id !== itemId) return c;
          const has = c.tags.includes(tagId);
          return {
            ...c,
            tags: has ? c.tags.filter((t) => t !== tagId) : [...c.tags, tagId],
          };
        }),
      });
    } else {
      this.update({
        notes: this.state.notes.map((n) => {
          if (n.id !== itemId) return n;
          const has = n.tags.includes(tagId);
          return {
            ...n,
            tags: has ? n.tags.filter((t) => t !== tagId) : [...n.tags, tagId],
          };
        }),
      });
    }
  }

  // Alarm
  setAlarm(entityType: "checklist" | "note", entityId: string, alarm: Alarm | undefined) {
    if (entityType === "checklist") {
      this.update({
        checklist: this.state.checklist.map((c) =>
          c.id === entityId ? { ...c, alarm, updatedAt: now() } : c
        ),
      });
    } else {
      this.update({
        notes: this.state.notes.map((n) =>
          n.id === entityId ? { ...n, alarm, updatedAt: now() } : n
        ),
      });
    }
  }

  snoozeAlarm(entityType: "checklist" | "note", entityId: string, minutes: number) {
    const items = entityType === "checklist" ? this.state.checklist : this.state.notes;
    const item = items.find((i) => i.id === entityId);
    if (!item?.alarm) return;
    const newAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    this.setAlarm(entityType, entityId, {
      ...item.alarm,
      at: newAt,
      status: "scheduled",
      snoozeMinutes: minutes,
    });
  }

  dismissAlarm(entityType: "checklist" | "note", entityId: string) {
    const items = entityType === "checklist" ? this.state.checklist : this.state.notes;
    const item = items.find((i) => i.id === entityId);
    if (!item?.alarm) return;

    if (item.alarm.repeat && item.alarm.repeat !== "none") {
      const currentAt = new Date(item.alarm.at);
      const nextAt = new Date(currentAt);
      if (item.alarm.repeat === "daily") nextAt.setDate(nextAt.getDate() + 1);
      if (item.alarm.repeat === "weekly") nextAt.setDate(nextAt.getDate() + 7);
      this.setAlarm(entityType, entityId, {
        ...item.alarm,
        at: nextAt.toISOString(),
        status: "scheduled",
        firedAt: now(),
      });
    } else {
      this.setAlarm(entityType, entityId, {
        ...item.alarm,
        status: "dismissed",
        firedAt: now(),
      });
    }
  }

  // Undo/Redo
  getUndoStack() {
    return this.undoStack;
  }
  getRedoStack() {
    return this.redoStack;
  }

  undo() {
    const entry = this.undoStack.pop();
    if (!entry) return;

    // Save current state for redo
    const currentStateSnapshot = JSON.parse(JSON.stringify(this.state));
    this.redoStack.push({ ...entry, data: currentStateSnapshot });

    switch (entry.type) {
      case "delete-checklist":
        this.restoreChecklistItem(entry.data);
        break;
      case "delete-note":
        this.restoreNote(entry.data);
        break;
      case "add-checklist":
        this.update({ checklist: this.state.checklist.filter((c) => c.id !== entry.data.id) });
        break;
      case "add-note":
        this.update({ notes: this.state.notes.filter((n) => n.id !== entry.data.id) });
        break;
      case "update-checklist":
      case "toggle-checklist":
      case "pin-checklist":
        this.update({
          checklist: this.state.checklist.map((c) => (c.id === entry.data.id ? entry.data : c)),
        });
        break;
      default:
        break;
    }
    this.emit();
  }

  // Export / Import (local)
  exportData(): string {
    return JSON.stringify(
      {
        ...this.state,
        exportedAt: now(),
      },
      null,
      2
    );
  }

  importData(json: string): { success: boolean; error?: string } {
    try {
      const data = JSON.parse(json);
      if (!data.schemaVersion) return { success: false, error: "فایل نامعتبر است" };
      this.state = ensureUuidState({ ...defaultState, ...data });
      saveState(this.state);
      this.emit();
      this.scheduleSync(true);
      return { success: true };
    } catch {
      return { success: false, error: "خطا در خواندن فایل" };
    }
  }
}

const storeInstance = new NotoStore();

const StoreContext = createContext<NotoStore>(storeInstance);

export function NotoProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef(storeInstance);

  useEffect(() => {
    void storeRef.current.init();
  }, []);

  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
}

export function useNotoStore() {
  return useContext(StoreContext);
}

export function useAppState(): AppState {
  const store = useNotoStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export { genId };
