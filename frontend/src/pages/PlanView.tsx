import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPlanStatus, getPlan } from "@/api/plan";
import { useSessionStore } from "@/store/useSessionStore";
import { usePlanStore } from "@/store/usePlanStore";
import { useClassHistoryStore } from "@/store/useClassHistoryStore";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PlanCourseShell } from "@/components/plan/PlanCourseShell";
import type { PlanStatus } from "@/types/plan";

const STATUS_LABELS: Record<PlanStatus, string> = {
  pending: "Starting up...",
  researching: "Researching your interest across the web...",
  planning: "Mapping course topics to your interest...",
  generating: "Writing personalized content for each topic...",
  complete: "Your plan is ready!",
  error: "Something went wrong.",
};

const STATUS_PROGRESS: Record<PlanStatus, number> = {
  pending: 5,
  researching: 30,
  planning: 55,
  generating: 80,
  complete: 100,
  error: 0,
};

function LoadingScreen({ status }: { status: PlanStatus }) {
  return (
    <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md animate-fade-in text-center">
        <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
          <span className="animate-pulse text-2xl">✦</span>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Building your course</h2>
        <p className="mb-10 text-sm leading-relaxed text-muted-foreground">
          {STATUS_LABELS[status]}
        </p>

        <div className="space-y-3">
          <Progress value={STATUS_PROGRESS[status]} className="h-1" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{STATUS_LABELS[status]}</span>
            <span>{STATUS_PROGRESS[status]}%</span>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/40"
              style={{ animationDelay: `${i * 300}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfessorNoPlanMessage({ onSyllabus }: { onSyllabus: () => void }) {
  return (
    <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-xl border-2 border-border bg-card p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Course home isn&apos;t available yet</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The full course dashboard (units and chapters) is created when a student finishes building
          the personalized plan for this class. You can still open your session code and syllabus
          from your instructor view.
        </p>
        <Button type="button" className="mt-5 w-full" onClick={onSyllabus}>
          Open syllabus &amp; session code
        </Button>
      </div>
    </div>
  );
}

export default function PlanView() {
  const navigate = useNavigate();
  const { sessionId } = useSessionStore();
  const { plan, status, setPlan, setStatus } = usePlanStore();
  const classListRole = useClassHistoryStore((s) =>
    sessionId ? s.classes.find((c) => c.sessionId === sessionId)?.role : undefined
  );

  const { data: statusData } = useQuery({
    queryKey: ["planStatus", sessionId],
    queryFn: () => getPlanStatus(sessionId!),
    enabled: !!sessionId && status !== "complete" && status !== "error",
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "complete" || s === "error" ? false : 2000;
    },
  });

  useEffect(() => {
    if (statusData) setStatus(statusData.status);
  }, [statusData, setStatus]);

  useEffect(() => {
    if (status === "complete" && sessionId && !plan) {
      getPlan(sessionId).then(setPlan);
    }
  }, [status, sessionId, plan, setPlan]);

  useEffect(() => {
    if (!sessionId) navigate("/");
  }, [sessionId, navigate]);

  if (status !== "complete" || !plan) {
    if (
      classListRole === "professor" &&
      statusData?.status === "pending" &&
      !plan
    ) {
      return (
        <ProfessorNoPlanMessage
          onSyllabus={() => navigate("/professor/upload", { state: { showSessionCode: true } })}
        />
      );
    }
    return <LoadingScreen status={status} />;
  }

  const completedCount = plan.topics.filter((t) => t.status === "complete").length;
  const total = plan.topics.length;

  return (
    <PlanCourseShell plan={plan} activeTopicId={undefined}>
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
          <div className="rounded-xl border-2 border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {plan.student_interest}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {plan.course_title}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {plan.domain_context}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {plan.interest_keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground"
                >
                  {kw}
                </span>
              ))}
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>
                  {completedCount} of {total} topics ready
                </span>
              </div>
              <div className="max-w-sm">
                <Progress value={total > 0 ? (completedCount / total) * 100 : 0} className="h-1.5" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </PlanCourseShell>
  );
}
