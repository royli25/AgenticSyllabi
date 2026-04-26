import { useNavigate } from "react-router-dom";
import { Upload, School, X } from "lucide-react";
import { useClassHistoryStore, type ClassRole, type PastClass } from "@/store/useClassHistoryStore";
import { useSessionStore } from "@/store/useSessionStore";
import { usePlanStore } from "@/store/usePlanStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatUpdatedAt(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function roleLabel(role: ClassRole) {
  return role === "professor" ? "Professor" : "Student";
}

export default function LandingPage() {
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const resetPlan = usePlanStore((s) => s.reset);
  const classes = useClassHistoryStore((s) => s.classes);
  const removeClass = useClassHistoryStore((s) => s.removeClass);

  function openClass(c: PastClass) {
    resetPlan();
    setSession(c.sessionId, c.courseId, c.courseTitle, c.requiredTopics, c.hasSyllabus);
    navigate("/student/plan");
  }

  return (
    <div className="app-page">
      <div className="dashboard-content flex w-full flex-1 flex-col py-10 lg:py-12">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-10 animate-slide-up animation-fill-both">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/40" />
              AI-powered learning
            </div>
            <h1 className="mb-3 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              Your course,
              <br />
              <span className="text-muted-foreground">reimagined.</span>
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Personalized to what you actually care about. Not one size fits all.
            </p>
          </div>

          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate("/professor/upload")}
              className={cn(
                "flex w-full min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border",
                "bg-foreground text-background shadow-sm transition-all duration-200",
                "hover:-translate-y-0.5 hover:shadow-md",
                "animate-fade-in-up animation-fill-both animate-delay-100"
              )}
            >
              <Upload className="h-6 w-6" aria-hidden />
              <span className="text-base font-semibold sm:text-lg">Upload syllabus</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/student/onboarding")}
              className={cn(
                "flex w-full min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border",
                "bg-card text-foreground shadow-sm transition-all duration-200",
                "hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-md",
                "animate-fade-in-up animation-fill-both animate-delay-200"
              )}
            >
              <School className="h-6 w-6" aria-hidden />
              <span className="text-base font-semibold sm:text-lg">Join class</span>
            </button>
          </div>

          <div className="animate-fade-in animation-fill-both animate-delay-300">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Your classes</h2>
            <div className="overflow-x-auto rounded-xl border-2 border-border bg-card shadow-sm">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/50 text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Course</th>
                    <th className="px-4 py-3 font-medium">Session code</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Last opened</th>
                    <th className="w-1 px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No classes yet. Upload a syllabus or join with a code &mdash; they will appear
                        here on this device.
                      </td>
                    </tr>
                  ) : (
                    classes.map((c) => (
                      <tr key={c.sessionId} className="border-b border-border last:border-0">
                        <td className="max-w-[10rem] truncate px-4 py-3 font-medium text-foreground sm:max-w-xs">
                          {c.courseTitle || "Untitled course"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground/90 sm:text-sm">
                          {c.sessionId}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{roleLabel(c.role)}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {formatUpdatedAt(c.updatedAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button size="sm" variant="default" onClick={() => openClass(c)}>
                              Open
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              aria-label="Remove from list"
                              onClick={() => removeClass(c.sessionId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            AICourseLoad &mdash; Built for learners who care.
          </p>
        </div>
      </div>
    </div>
  );
}
