import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CoursePlan, PlanStatus } from "@/types/plan";

interface PlanStore {
  plan: CoursePlan | null;
  status: PlanStatus;
  setPlan: (plan: CoursePlan) => void;
  setStatus: (status: PlanStatus) => void;
  reset: () => void;
}

export const usePlanStore = create<PlanStore>()(
  persist(
    (set) => ({
      plan: null,
      status: "pending",
      setPlan: (plan) => set({ plan }),
      setStatus: (status) => set({ status }),
      reset: () => set({ plan: null, status: "pending" }),
    }),
    { name: "aicourseload-plan" }
  )
);
