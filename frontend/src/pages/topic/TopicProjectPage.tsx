import { useOutletContext } from "react-router-dom";
import { Clock, CheckSquare2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoursePlan, Topic, TopicContent } from "@/types/plan";

type Ctx = { plan: CoursePlan; topic: Topic; content: TopicContent };

export default function TopicProjectPage() {
  const { content } = useOutletContext<Ctx>();
  const { project } = content;

  return (
    <div className="space-y-8 animate-fade-in-up animation-fill-both">
      <div>
        <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">{project.title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
      </div>

      <div className="flex w-fit items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Estimated ~{project.estimated_hours} hour{project.estimated_hours !== 1 ? "s" : ""}
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-foreground">Deliverables</h3>
        <ul className="space-y-3">
          {project.deliverables.map((d, i) => (
            <li
              key={i}
              className={cn("flex items-start gap-3 text-sm text-muted-foreground", "animate-fade-in-up animation-fill-both")}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CheckSquare2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-foreground" />
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
