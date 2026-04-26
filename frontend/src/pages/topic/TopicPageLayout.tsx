import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { usePlanStore } from "@/store/usePlanStore";
import { PlanCourseShell } from "@/components/plan/PlanCourseShell";

/**
 * /student/plan/topic/:topicId and nested readings | project. Index = Explainer.
 */
export default function TopicPageLayout() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const plan = usePlanStore((s) => s.plan);

  const topic = plan?.topics.find((t) => t.topic_id === topicId);

  if (!plan) {
    return (
      <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">No plan loaded.</p>
        <button
          type="button"
          className="mt-2 text-sm font-medium text-foreground underline"
          onClick={() => navigate("/student/plan")}
        >
          Open course
        </button>
      </div>
    );
  }

  if (!topic || !topic.content) {
    return (
      <PlanCourseShell plan={plan} activeTopicId={topicId}>
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <p className="text-sm font-medium text-foreground">Topic not found.</p>
        </div>
      </PlanCourseShell>
    );
  }

  return (
    <PlanCourseShell plan={plan} activeTopicId={topicId}>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full min-w-0 max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Link
            to="/student/plan"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Course overview
          </Link>

          <div className="mb-8 animate-slide-up animation-fill-both">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground capitalize">
              {plan.student_interest}
            </p>
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">{topic.title}</h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {topic.interest_angle}
            </p>
          </div>

          <Outlet context={{ plan, topic, content: topic.content }} />
        </div>
      </div>
    </PlanCourseShell>
  );
}
