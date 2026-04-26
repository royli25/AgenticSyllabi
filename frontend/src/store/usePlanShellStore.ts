import { create } from "zustand";
import { persist } from "zustand/middleware";

/** UI state for the plan area: collapsible units rail (shared on /student/plan and topic pages). */
interface PlanShellStore {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
}

export const usePlanShellStore = create<PlanShellStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "aicourseload-plan-shell" }
  )
);
