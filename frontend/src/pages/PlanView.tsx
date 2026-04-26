import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, ArrowRight } from "lucide-react";
import { getPlanStatus, getPlan } from "@/api/plan";
import { useSessionStore } from "@/store/useSessionStore";
import { usePlanStore } from "@/store/usePlanStore";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
    <div className="app-page">
      <div className="flex w-full flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted border border-border mb-8">
          <span className="text-2xl animate-pulse">✦</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Building your course</h2>
        <p className="text-muted-foreground text-sm mb-10 leading-relaxed">
          {STATUS_LABELS[status]}
        </p>

        <div className="space-y-3">
          <Progress value={STATUS_PROGRESS[status]} className="h-1" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{STATUS_LABELS[status]}</span>
            <span>{STATUS_PROGRESS[status]}%</span>
          </div>
        </div>

        {/* Animated dots */}
        <div className="flex items-center justify-center gap-1.5 mt-10">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse"
              style={{ animationDelay: `${i * 300}ms` }}
            />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

function TopicCard({
  topic,
  index,
  onClick,
}: {
  topic: { topic_id: string; title: string; interest_angle: string; status: string; content?: { readings: unknown[]; project: { estimated_hours: number } } };
  index: number;
  onClick: () => void;
}) {
  const isComplete = topic.status === "complete";

  return (
    <button
      onClick={onClick}
      disabled={!isComplete}
      className={cn(
        "group relative w-full text-left rounded-xl border-2 border-border bg-card p-6",
        "hover:border-foreground/20 hover:shadow-md hover:-translate-y-0.5",
        "transition-all duration-300 ease-out",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:hover:border-border",
        "animate-fade-in-up animation-fill-both"
      )}
      style={{ animationDelay: `${Math.min(index * 60, 600)}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-mono text-muted-foreground/60">
          {String(index + 1).padStart(2, "0")}
        </span>
        {isComplete ? (
          <Badge variant="success">Ready</Badge>
        ) : (
          <Badge variant="pending" className="animate-pulse">
            Generating
          </Badge>
        )}
      </div>

      <h3 className="font-semibold text-foreground mb-2 leading-snug pr-4">{topic.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
        {topic.interest_angle}
      </p>

      {topic.content && (
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" />
            {topic.content.readings.length} readings
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            ~{topic.content.project.estimated_hours}h project
          </span>
        </div>
      )}

      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200">
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
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

  if (status !== "complete" || !plan) {
    return <LoadingScreen status={status} />;
  }

  const completedCount = plan.topics.filter((t) => t.status === "complete").length;

  return (
    <div className="app-page">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 sm:px-10 sm:py-10">
      {/* Header */}
      <div className="mb-10 animate-slide-up animation-fill-both">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
          {plan.student_interest}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
          {plan.course_title}
        </h1>
        <p className="text-muted-foreground leading-relaxed max-w-xl text-sm">
          {plan.domain_context}
        </p>

        <div className="flex flex-wrap gap-2 mt-5">
          {plan.interest_keywords.map((kw) => (
            <span
              key={kw}
              className="text-xs px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground"
            >
              {kw}
            </span>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{completedCount} of {plan.topics.length} topics ready</span>
          <div className="flex-1 max-w-32">
            <Progress value={(completedCount / plan.topics.length) * 100} />
          </div>
        </div>
      </div>

      {/* Topics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plan.topics.map((topic, i) => (
          <TopicCard
            key={topic.topic_id}
            topic={topic}
            index={i}
            onClick={() => navigate(`/student/plan/topic/${topic.topic_id}`)}
          />
        ))}
      </div>
      </div>
    </div>
  );
}
