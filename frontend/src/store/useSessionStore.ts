import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionStore {
  sessionId: string | null;
  courseId: string | null;
  courseTitle: string | null;
  requiredTopics: string[];
  /** True when the professor upload included a storable file (PDF/txt) for the syllabus panel */
  hasSyllabus: boolean;
  interestDomain: string | null;
  interestConfirmed: boolean;
  setSession: (
    sessionId: string,
    courseId: string,
    courseTitle: string,
    topics: string[],
    hasSyllabus?: boolean
  ) => void;
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
      hasSyllabus: false,
      interestDomain: null,
      interestConfirmed: false,
      setSession: (sessionId, courseId, courseTitle, requiredTopics, hasSyllabus = false) =>
        set({
          sessionId,
          courseId,
          courseTitle,
          requiredTopics,
          hasSyllabus,
          interestDomain: null,
          interestConfirmed: false,
        }),
      setInterest: (interestDomain, interestConfirmed) =>
        set({ interestDomain, interestConfirmed }),
      reset: () =>
        set({
          sessionId: null,
          courseId: null,
          courseTitle: null,
          requiredTopics: [],
          hasSyllabus: false,
          interestDomain: null,
          interestConfirmed: false,
        }),
    }),
    { name: "aicourseload-session" }
  )
);
