import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { getPlanStatus, getPlan } from "@/api/plan";
import { useSessionStore } from "@/store/useSessionStore";
import { usePlanStore } from "@/store/usePlanStore";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { PlanStatus, Topic } from "@/types/plan";

const TOPICS_PER_UNIT = 5;

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

function groupTopicsIntoUnits(topics: Topic[]) {
  const units: { title: string; topics: Topic[]; startIndex: number }[] = [];
  for (let i = 0; i < topics.length; i += TOPICS_PER_UNIT) {
    const chunk = topics.slice(i, i + TOPICS_PER_UNIT);
    const unitNumber = units.length + 1;
    units.push({
      title: `Unit ${unitNumber}`,
      topics: chunk,
      startIndex: i,
    });
  }
  return units;
}

function LoadingScreen({ status }: { status: PlanStatus }) {
  return (
    <div className="app-page">
      <div className="flex w-full flex-1 flex-col items-center justify-center px-6 py-10">
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
    </div>
  );
}

function ChapterRow({
  topic,
  chapterNumber,
  onOpen,
}: {
  topic: Topic;
  chapterNumber: number;
  onOpen: () => void;
}) {
  const isComplete = topic.status === "complete";
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        disabled={!isComplete}
        className={cn(
          "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm",
          "transition-colors",
          isComplete
            ? "text-foreground hover:bg-muted/80"
            : "cursor-not-allowed text-muted-foreground/70"
        )}
      >
        <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {String(chapterNumber).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1 leading-snug">{topic.title}</span>
        <span className="mt-0.5 shrink-0" aria-hidden>
          {isComplete ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} />
          ) : (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </span>
      </button>
    </li>
  );
}

export default function PlanView() {
  const navigate = useNavigate();
  const { sessionId } = useSessionStore();
  const { plan, status, setPlan, setStatus } = usePlanStore();

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
  }, [statusData]);

  useEffect(() => {
    if (status === "complete" && sessionId && !plan) {
      getPlan(sessionId).then(setPlan);
    }
  }, [status]);

  useEffect(() => {
    if (!sessionId) navigate("/");
  }, [sessionId]);

  const units = useMemo(() => (plan ? groupTopicsIntoUnits(plan.topics) : []), [plan]);

  if (status !== "complete" || !plan) {
    return <LoadingScreen status={status} />;
  }

  const completedCount = plan.topics.filter((t) => t.status === "complete").length;
  const total = plan.topics.length;

  return (
    <div className="app-page">
      <div className="flex w-full min-h-0 flex-1 flex-col md:flex-row">
        {/* Left: units & chapters (syllabus nav) — Neon-style narrow rail */}
        <aside
          className="flex max-h-[min(22rem,45vh)] w-full min-h-0 shrink-0 flex-col overflow-hidden border-b border-border bg-muted/25 md:sticky md:top-0 md:max-h-dvh md:w-72 md:border-b-0 md:border-r"
          aria-label="Course units and chapters"
        >
          <div className="shrink-0 border-b border-border px-4 py-3.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Course structure
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {plan.course_title}
            </p>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
            {units.map((unit) => (
              <div key={unit.title} className="px-2 pb-3 last:pb-2">
                <h3 className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {unit.title}
                </h3>
                <ul className="space-y-0.5">
                  {unit.topics.map((topic, j) => {
                    const n = unit.startIndex + j + 1;
                    return (
                      <ChapterRow
                        key={topic.topic_id}
                        topic={topic}
                        chapterNumber={n}
                        onOpen={() => navigate(`/student/plan/topic/${topic.topic_id}`)}
                      />
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Right: class landing & intro */}
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
      </div>
    </div>
  );
}
