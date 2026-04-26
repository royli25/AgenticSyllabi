import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ExternalLink, Clock, CheckSquare2 } from "lucide-react";
import { usePlanStore } from "@/store/usePlanStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function TopicDetail() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const plan = usePlanStore((s) => s.plan);

  const topic = plan?.topics.find((t) => t.topic_id === topicId);

  if (!topic || !topic.content) {
    return (
      <div className="app-page">
        <div className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm font-medium text-foreground">Topic not found.</p>
        </div>
      </div>
    );
  }

  const { content } = topic;

  return (
    <div className="app-page">
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:px-10 sm:py-10">
      {/* Back */}
      <button
        onClick={() => navigate("/student/plan")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-10 transition-colors group animate-fade-in"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back to plan
      </button>

      {/* Topic header */}
      <div className="mb-8 animate-slide-up animation-fill-both">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3 capitalize">
          {plan?.student_interest}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
          {topic.title}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
          {topic.interest_angle}
        </p>
      </div>

      {/* Tabs */}
      <div className="animate-fade-in-up animation-fill-both animate-delay-100">
        <Tabs defaultValue="explainer">
          <TabsList className="mb-6">
            <TabsTrigger value="explainer">Explainer</TabsTrigger>
            <TabsTrigger value="readings">
              Readings
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {content.readings.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="project">Project</TabsTrigger>
          </TabsList>

          <TabsContent value="explainer">
            <div
              className={cn(
                "prose prose-sm max-w-none",
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
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content.explainer}
              </ReactMarkdown>
            </div>
          </TabsContent>

          <TabsContent value="readings">
            <div className="space-y-3">
              {content.readings.map((r, i) => (
                <a
                  key={r.reading_id}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group flex items-start gap-4 p-5 rounded-xl border border-border bg-card",
                    "hover:border-foreground/20 hover:shadow-sm hover:-translate-y-0.5",
                    "transition-all duration-200",
                    "animate-fade-in-up animation-fill-both"
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm leading-snug group-hover:underline underline-offset-2">
                      {r.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {r.summary}
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-2 truncate font-mono">
                      {r.url}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0 mt-0.5 transition-colors" />
                </a>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="project">
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2 tracking-tight">
                  {content.project.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {content.project.description}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-3 rounded-lg bg-muted border border-border w-fit">
                <Clock className="w-3.5 h-3.5" />
                Estimated ~{content.project.estimated_hours} hour{content.project.estimated_hours !== 1 ? "s" : ""}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Deliverables</h3>
                <ul className="space-y-3">
                  {content.project.deliverables.map((d, i) => (
                    <li
                      key={i}
                      className={cn(
                        "flex items-start gap-3 text-sm text-muted-foreground",
                        "animate-fade-in-up animation-fill-both"
                      )}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <CheckSquare2 className="w-4 h-4 text-foreground flex-shrink-0 mt-0.5" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </div>
  );
}
