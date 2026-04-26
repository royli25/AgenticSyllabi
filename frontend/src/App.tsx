import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import ProfessorUpload from "@/pages/ProfessorUpload";
import StudentOnboarding from "@/pages/StudentOnboarding";
import PlanView from "@/pages/PlanView";
import TopicDetail from "@/pages/TopicDetail";

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-dvh w-full bg-background text-foreground">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/professor/upload" element={<ProfessorUpload />} />
        <Route path="/student/onboarding" element={<StudentOnboarding />} />
        <Route path="/student/plan" element={<PlanView />} />
        <Route path="/student/plan/topic/:topicId" element={<TopicDetail />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </div>
    </BrowserRouter>
  );
}
