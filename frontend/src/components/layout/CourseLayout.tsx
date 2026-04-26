import { useMemo } from "react";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useSessionStore } from "@/store/useSessionStore";
import { usePlanStore } from "@/store/usePlanStore";
import { cn } from "@/lib/utils";

function topicSectionFromPath(pathname: string, topicId: string): "explainer" | "readings" | "project" {
  if (!topicId) return "explainer";
  if (pathname.includes(`/topic/${topicId}/readings`)) return "readings";
  if (pathname.includes(`/topic/${topicId}/project`)) return "project";
  return "explainer";
}

/**
 * Neon-style shell for the student course area: top bar, breadcrumb, Home.
 * On a topic page, a section dropdown (Explainer / Readings / Project) appears in the bar.
 */
export function CourseLayout() {
  const { topicId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const courseTitleFromPlan = usePlanStore((s) => s.plan?.course_title);
  const plan = usePlanStore((s) => s.plan);
  const courseTitleSession = useSessionStore((s) => s.courseTitle);
  const projectName = courseTitleFromPlan ?? courseTitleSession ?? "Course";

  const topic = useMemo(
    () => (topicId && plan ? plan.topics.find((t) => t.topic_id === topicId) : undefined),
    [topicId, plan]
  );
  const section = topicId ? topicSectionFromPath(pathname, topicId) : null;
  const canPickSection = Boolean(topicId && topic?.content);

  return (
    <div className="flex min-h-dvh w-full min-h-0 flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b-2 border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div
          className={cn(
            "mx-auto flex w-full max-w-[100rem] items-center justify-between gap-2 px-4 py-2 sm:gap-3 sm:px-6 sm:py-0 sm:h-14 lg:px-8",
            "flex-col sm:flex-row"
          )}
        >
          <div className="flex w-full min-w-0 flex-1 items-center gap-1.5 self-start sm:gap-2 sm:self-auto">
            <Link
              to="/"
              className="shrink-0 text-sm font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
            >
              AICourseLoad
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" aria-hidden />
            <span
              className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground/90"
              title={projectName}
            >
              {projectName}
            </span>
          </div>
          <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto sm:justify-start">
            {canPickSection && topicId && (
              <select
                value={section ?? "explainer"}
                onChange={(e) => {
                  const v = e.target.value as "explainer" | "readings" | "project";
                  const base = `/student/plan/topic/${topicId}`;
                  navigate(v === "explainer" ? base : `${base}/${v}`);
                }}
                className="h-9 w-full min-w-0 max-w-full rounded-lg border-2 border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm sm:max-w-[14rem] sm:min-w-[12rem]"
                aria-label="Topic section"
              >
                <option value="explainer">Explainer</option>
                <option value="readings">Readings ({topic!.content.readings.length})</option>
                <option value="project">Project</option>
              </select>
            )}
            <Link
              to="/"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Home className="h-4 w-4" aria-hidden />
              Home
            </Link>
          </div>
        </div>
      </header>
      <div className="min-h-0 w-full flex-1">
        <Outlet />
      </div>
    </div>
  );
}
