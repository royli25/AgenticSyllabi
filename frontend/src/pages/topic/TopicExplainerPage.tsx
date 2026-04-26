import { useOutletContext } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { CoursePlan, Topic, TopicContent } from "@/types/plan";
type Ctx = { plan: CoursePlan; topic: Topic; content: TopicContent };

export default function TopicExplainerPage() {
  const { content } = useOutletContext<Ctx>();

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none animate-fade-in-up animation-fill-both",
        "prose-headings:font-semibold prose-headings:text-foreground prose-headings:tracking-tight",
        "prose-p:text-muted-foreground prose-p:leading-relaxed",
        "prose-a:text-foreground prose-a:underline prose-a:underline-offset-2",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono",
        "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl",
        "prose-blockquote:border-l-border prose-blockquote:text-muted-foreground",
        "prose-hr:border-border",
        "prose-li:text-muted-foreground"
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.explainer}</ReactMarkdown>
    </div>
  );
}
