import { useOutletContext } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoursePlan, Topic, TopicContent } from "@/types/plan";

type Ctx = { plan: CoursePlan; topic: Topic; content: TopicContent };

export default function TopicReadingsPage() {
  const { content } = useOutletContext<Ctx>();

  return (
    <div className="space-y-3 animate-fade-in-up animation-fill-both">
      {content.readings.map((r, i) => (
        <a
          key={r.reading_id}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "group flex items-start gap-4 rounded-xl border border-border bg-card p-5",
            "transition-all duration-200",
            "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm",
            "animate-fade-in-up animation-fill-both"
          )}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug text-foreground group-hover:underline group-hover:underline-offset-2">
              {r.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.summary}</p>
            <p className="mt-2 truncate font-mono text-xs text-muted-foreground/50">{r.url}</p>
          </div>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
        </a>
      ))}
    </div>
  );
}
