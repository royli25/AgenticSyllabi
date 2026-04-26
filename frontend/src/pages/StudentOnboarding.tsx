import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Sparkles, ArrowLeft, Loader2, FileText, ExternalLink } from "lucide-react";
import { sendMessage } from "@/api/chat";
import { getSessionSummary } from "@/api/courses";
import { generatePlan } from "@/api/plan";
import { useChatStore } from "@/store/useChatStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useClassHistoryStore } from "@/store/useClassHistoryStore";
import { usePlanStore } from "@/store/usePlanStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INITIAL_ASSISTANT_MESSAGE =
  "Hey! I'm here to help personalize your course. What topic or field are you most passionate about outside of class?";

function getWelcomeMessage(interestConfirmed: boolean, interestDomain?: string) {
  if (interestConfirmed && interestDomain) {
    return `Welcome back. Your course is already tuned toward ${interestDomain}. You can build your plan now or keep chatting if you want to refine it.`;
  }
  return INITIAL_ASSISTANT_MESSAGE;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="flex items-end gap-2">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card">
          <span className="text-xs">✦</span>
        </div>
        <div className="rounded-2xl rounded-bl-sm border-2 border-border bg-muted px-4 py-3">
          <div className="flex gap-1 items-center h-4">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Message({ role, content, index }: { role: "user" | "assistant"; content: string; index: number }) {
  if (role === "user") {
    return (
      <div
        className="flex justify-end animate-fade-in-up animation-fill-both"
        style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
      >
        <div className="max-w-[min(100%,40rem)] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex justify-start gap-2 animate-fade-in-up animation-fill-both"
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
    >
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground/80">
        <span className="text-xs">✦</span>
      </div>
      <div className="max-w-[min(100%,40rem)] rounded-2xl rounded-bl-sm border-2 border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm">
        {content}
      </div>
    </div>
  );
}

export default function StudentOnboarding() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, addMessage, setLoading, reset: resetChat } = useChatStore();
  const {
    sessionId,
    courseId,
    courseTitle,
    requiredTopics,
    hasSyllabus,
    setSession,
    setInterest,
    interestConfirmed,
    interestDomain,
    reset: resetSession,
  } = useSessionStore();
  const { setStatus, reset: resetPlan } = usePlanStore();
  const addOrUpdateClass = useClassHistoryStore((s) => s.addOrUpdateClass);
  const touchClass = useClassHistoryStore((s) => s.touchClass);

  function recordStudentClass(
    session: {
      session_id: string;
      course_id: string;
      course_title: string;
      required_topics: string[];
      has_syllabus: boolean;
    }
  ) {
    addOrUpdateClass({
      sessionId: session.session_id,
      courseId: session.course_id,
      courseTitle: session.course_title,
      requiredTopics: session.required_topics,
      hasSyllabus: session.has_syllabus,
      role: "student",
    });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    async function restoreSession() {
      if (!sessionId) {
        setSessionReady(false);
        return;
      }

      setIsJoining(true);
      setJoinError(null);
      try {
        const session = await getSessionSummary(sessionId);
        setSession(
          session.session_id,
          session.course_id,
          session.course_title,
          session.required_topics,
          session.has_syllabus
        );
        touchClass(session.session_id);
        if (session.interest_confirmed && session.interest_domain) {
          setInterest(session.interest_domain, true);
        }
        setSessionReady(true);
        if (messages.length === 0) {
          addMessage({
            role: "assistant",
            content: getWelcomeMessage(session.interest_confirmed, session.interest_domain),
          });
        }
      } catch {
        resetChat();
        resetPlan();
        resetSession();
        setSessionReady(false);
      } finally {
        setIsJoining(false);
      }
    }

    void restoreSession();
  }, []);

  async function handleCodeSubmit() {
    if (!sessionCode.trim()) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      const session = await getSessionSummary(sessionCode.trim());
      resetChat();
      resetPlan();
      setSession(
        session.session_id,
        session.course_id,
        session.course_title,
        session.required_topics,
        session.has_syllabus
      );
      recordStudentClass(session);
      if (session.interest_confirmed && session.interest_domain) {
        setInterest(session.interest_domain, true);
      }
      setSessionReady(true);
      addMessage({
        role: "assistant",
        content: getWelcomeMessage(session.interest_confirmed, session.interest_domain),
      });
    } catch {
      setJoinError("We couldn't find that session code. Check it and try again.");
    } finally {
      setIsJoining(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || isLoading || !sessionId) return;
    const userMsg = input.trim();
    setInput("");
    addMessage({ role: "user", content: userMsg });
    setLoading(true);
    try {
      const res = await sendMessage(sessionId, userMsg);
      addMessage({ role: "assistant", content: res.reply });
      if (res.interest_confirmed && res.interest_domain) {
        setInterest(res.interest_domain, true);
      }
    } catch {
      addMessage({ role: "assistant", content: "Sorry, something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!sessionId || !courseId) return;
    setStatus("pending");
    await generatePlan(sessionId, courseId);
    navigate("/student/plan");
  }

  const syllabusFrameSrc = useMemo(
    () =>
      hasSyllabus && sessionId
        ? `/api/courses/session/${encodeURIComponent(sessionId)}/syllabus`
        : null,
    [hasSyllabus, sessionId]
  );

  /** Hints to Chrome/Edge PDF to hide toolbars and thumbnail pane (scrolling page only). */
  const syllabusEmbedSrc = useMemo(
    () =>
      syllabusFrameSrc
        ? `${syllabusFrameSrc}#toolbar=0&navpanes=0&view=FitH`
        : null,
    [syllabusFrameSrc]
  );

  if (sessionId && isJoining && !sessionReady) {
    return (
      <div className="app-page">
        <div className="dashboard-content flex w-full flex-1 flex-col items-center justify-center py-8 sm:py-10">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Restoring your session...
          </div>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="app-page">
        <div className="dashboard-content flex w-full flex-1 flex-col justify-center py-8 sm:py-10">
        <div className="mx-auto w-full max-w-md animate-slide-up animation-fill-both">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-10 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>

          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Join a Course</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            Enter the session code your professor shared with you.
          </p>

          <Input
            className="h-12 font-mono text-center tracking-widest text-base"
            placeholder="sess_xxxxxxxx"
            value={sessionCode}
            onChange={(e) => {
              setSessionCode(e.target.value);
              if (joinError) setJoinError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
            autoFocus
            disabled={isJoining}
          />
          {joinError && (
            <p className="mt-3 text-sm text-destructive animate-fade-in">{joinError}</p>
          )}
          <Button
            onClick={handleCodeSubmit}
            disabled={!sessionCode.trim() || isJoining}
            className="mt-3 w-full h-11"
            size="lg"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Session"
            )}
          </Button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="grid min-h-0 w-full flex-1 grid-cols-1 divide-y divide-border overflow-hidden bg-background lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {/* Left: syllabus (PDF or topic list) — full column, no card shell */}
          <aside className="flex min-h-0 flex-col max-lg:min-h-[40vh] bg-background lg:min-h-0">
            <div className="relative min-h-0 flex-1 bg-muted/20">
              {syllabusEmbedSrc ? (
                <>
                  <iframe
                    title="Course syllabus"
                    src={syllabusEmbedSrc}
                    className="block h-full w-full min-h-[50vh] border-0 lg:min-h-0"
                  />
                  {syllabusFrameSrc && (
                    <a
                      href={syllabusFrameSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/95 px-2 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </a>
                  )}
                </>
              ) : (
                <div className="h-full overflow-y-auto p-4 sm:px-6 sm:py-5 lg:pl-6 lg:pr-4">
                  <p className="mb-1 text-sm font-medium text-foreground">
                    {courseTitle || "Course topics"}
                  </p>
                  <p className="mb-3 text-sm text-muted-foreground">
                    No syllabus file for this session. Key topics from your course:
                  </p>
                  <ul className="space-y-2.5">
                    {requiredTopics.length > 0 ? (
                      requiredTopics.map((t) => (
                        <li
                          key={t}
                          className="flex gap-2.5 text-sm text-foreground"
                        >
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>{t}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-muted-foreground">No topics listed yet.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </aside>

          {/* Right: chat */}
          <div className="flex min-h-0 flex-col max-lg:min-h-[50vh] bg-background lg:min-h-0">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  {courseTitle || "Course"}
                </p>
                <h1 className="text-sm font-semibold text-foreground">Personalize your course</h1>
                <p className="text-xs text-muted-foreground">
                  Chat to tell the AI what you care about outside class
                </p>
              </div>
              {interestConfirmed && (
                <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground capitalize">{interestDomain}</span>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
              {messages.map((msg, i) => (
                <Message key={i} role={msg.role} content={msg.content} index={i} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {interestConfirmed && (
              <div className="mx-4 mb-2 flex shrink-0 items-center justify-between gap-2 rounded-lg border-2 border-border bg-muted/30 p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Interest</p>
                  <p className="text-sm font-semibold capitalize text-foreground">
                    {interestDomain}
                  </p>
                </div>
                <Button onClick={handleGenerate} size="sm" className="shrink-0 gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Build plan
                </Button>
              </div>
            )}

            <div className="flex shrink-0 gap-2 border-t border-border p-4 sm:px-6">
              <Input
                className="h-11 flex-1"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-11 w-11 shrink-0"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
