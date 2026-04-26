import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ClassRole = "professor" | "student";

export interface PastClass {
  sessionId: string;
  courseId: string;
  courseTitle: string;
  requiredTopics: string[];
  hasSyllabus: boolean;
  role: ClassRole;
  updatedAt: number;
}

interface ClassHistoryState {
  classes: PastClass[];
  addOrUpdateClass: (entry: Omit<PastClass, "updatedAt">) => void;
  /** Bump `updatedAt` for an existing row (e.g. return visit) without changing role. */
  touchClass: (sessionId: string) => void;
  removeClass: (sessionId: string) => void;
}

function sortByUpdatedDesc(a: PastClass, b: PastClass) {
  return b.updatedAt - a.updatedAt;
}

export const useClassHistoryStore = create<ClassHistoryState>()(
  persist(
    (set) => ({
      classes: [],
      addOrUpdateClass: (entry) =>
        set((state) => {
          const now = Date.now();
          const others = state.classes.filter((c) => c.sessionId !== entry.sessionId);
          const next: PastClass = { ...entry, updatedAt: now };
          return { classes: [...others, next].sort(sortByUpdatedDesc) };
        }),
      touchClass: (sessionId) =>
        set((state) => {
          const has = state.classes.some((c) => c.sessionId === sessionId);
          if (!has) return state;
          const now = Date.now();
          return {
            classes: state.classes
              .map((c) => (c.sessionId === sessionId ? { ...c, updatedAt: now } : c))
              .sort(sortByUpdatedDesc),
          };
        }),
      removeClass: (sessionId) =>
        set((state) => ({
          classes: state.classes.filter((c) => c.sessionId !== sessionId),
        })),
    }),
    { name: "aicourseload-class-history" }
  )
);
