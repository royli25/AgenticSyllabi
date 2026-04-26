import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, LayoutGrid, Loader2 } from "lucide-react";
import { groupTopicsIntoUnits } from "@/lib/planUnits";
import { usePlanShellStore } from "@/store/usePlanShellStore";
import { cn } from "@/lib/utils";
import type { Topic } from "@/types/plan";
import { Button } from "@/components/ui/button";

function ChapterRow({
  topic,
  chapterNumber,
  isActive,
  onOpen,
}: {
  topic: Topic;
  chapterNumber: number;
  isActive: boolean;
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
          "flex w-full items-stretch gap-0 text-left text-sm transition-colors",
          !isComplete && "cursor-not-allowed text-muted-foreground/70",
          isComplete && !isActive && "text-foreground hover:bg-muted/60"
        )}
      >
        {/* Straight vertical tab — no rounding (avoids curved border with rounded row) */}
        <span
          className={cn(
            "w-[3px] shrink-0 self-stretch rounded-none",
            isActive && isComplete ? "bg-foreground" : "bg-transparent"
          )}
          aria-hidden
        />
        <span
          className={cn(
            "flex min-w-0 flex-1 items-start gap-2.5 py-2 pl-2 pr-2.5",
            isActive && isComplete && "bg-muted/90"
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
        </span>
      </button>
    </li>
  );
}

type PlanUnitsSidebarProps = {
  plan: { course_title: string; topics: Topic[] };
  activeTopicId?: string;
};

export function PlanUnitsSidebar({ plan, activeTopicId }: PlanUnitsSidebarProps) {
  const navigate = useNavigate();
  const collapsed = usePlanShellStore((s) => s.sidebarCollapsed);
  const toggle = usePlanShellStore((s) => s.toggleSidebar);

  const units = useMemo(() => groupTopicsIntoUnits(plan.topics), [plan.topics]);

  if (collapsed) {
    return (
      <aside
        className={cn(
          "flex max-h-14 w-full min-h-0 shrink-0 flex-col overflow-hidden border-b border-border bg-muted/25",
          "md:sticky md:top-14 md:max-h-[calc(100dvh-3.5rem)] md:w-12 md:shrink-0 md:border-b-0 md:border-r"
        )}
        aria-label="Course structure collapsed"
      >
        <div className="flex items-center justify-center gap-1 border-b border-border py-1.5 md:h-full md:min-h-0 md:flex-1 md:flex-col md:justify-start md:gap-2 md:border-0 md:py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={toggle}
            aria-expanded="false"
            aria-label="Expand course structure"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground"
            onClick={() => navigate("/student/plan")}
            title="Course overview"
            aria-label="Course overview"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex max-h-[min(22rem,45vh)] w-full min-h-0 shrink-0 flex-col overflow-hidden border-b border-border bg-muted/25",
        "md:sticky md:top-14 md:max-h-[calc(100dvh-3.5rem)] md:w-72 md:border-b-0 md:border-r"
      )}
      aria-label="Course units and chapters"
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-1 py-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={toggle}
          aria-expanded="true"
          aria-label="Collapse course structure"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1 py-2 pr-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Course structure
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
            {plan.course_title}
          </p>
        </div>
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
                    isActive={topic.topic_id === activeTopicId}
                    onOpen={() => navigate(`/student/plan/topic/${topic.topic_id}`)}
                  />
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
