import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CourseLayout } from "@/components/layout/CourseLayout";
import LandingPage from "@/pages/LandingPage";
import ProfessorUpload from "@/pages/ProfessorUpload";
import StudentOnboarding from "@/pages/StudentOnboarding";
import PlanView from "@/pages/PlanView";
import TopicPageLayout from "@/pages/topic/TopicPageLayout";
import TopicExplainerPage from "@/pages/topic/TopicExplainerPage";
import TopicReadingsPage from "@/pages/topic/TopicReadingsPage";
import TopicProjectPage from "@/pages/topic/TopicProjectPage";

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
        <main className="flex w-full min-h-0 flex-1 flex-col">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/professor/upload" element={<ProfessorUpload />} />
            <Route path="/student/onboarding" element={<StudentOnboarding />} />
            <Route element={<CourseLayout />}>
              <Route path="/student/plan" element={<PlanView />} />
              <Route path="/student/plan/topic/:topicId" element={<TopicPageLayout />}>
                <Route index element={<TopicExplainerPage />} />
                <Route path="readings" element={<TopicReadingsPage />} />
                <Route path="project" element={<TopicProjectPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
