import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionStore {
  sessionId: string | null;
  courseId: string | null;
  courseTitle: string | null;
  requiredTopics: string[];
  interestDomain: string | null;
  interestConfirmed: boolean;
  setSession: (sessionId: string, courseId: string, courseTitle: string, topics: string[]) => void;
  setInterest: (domain: string, confirmed: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      sessionId: null,
      courseId: null,
      courseTitle: null,
      requiredTopics: [],
      interestDomain: null,
      interestConfirmed: false,
      setSession: (sessionId, courseId, courseTitle, requiredTopics) =>
        set({ sessionId, courseId, courseTitle, requiredTopics }),
      setInterest: (interestDomain, interestConfirmed) =>
        set({ interestDomain, interestConfirmed }),
      reset: () =>
        set({
          sessionId: null,
          courseId: null,
          courseTitle: null,
          requiredTopics: [],
          interestDomain: null,
          interestConfirmed: false,
        }),
    }),
    { name: "aicourseload-session" }
  )
);
