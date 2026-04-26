import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { sendMessage } from "@/api/chat";
import { getSessionSummary } from "@/api/courses";
import { generatePlan } from "@/api/plan";
import { useChatStore } from "@/store/useChatStore";
import { useSessionStore } from "@/store/useSessionStore";
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
    setSession,
    setInterest,
    interestConfirmed,
    interestDomain,
    reset: resetSession,
  } = useSessionStore();
  const { setStatus, reset: resetPlan } = usePlanStore();

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
        setSession(session.session_id, session.course_id, session.course_title, session.required_topics);
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
      setSession(session.session_id, session.course_id, session.course_title, session.required_topics);
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

  if (sessionId && isJoining && !sessionReady) {
    return (
      <div className="app-page">
        <div className="flex w-full flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10">
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
        <div className="flex w-full flex-1 flex-col justify-center px-6 py-10 sm:px-10">
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
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b-2 border-border py-4 animate-fade-in">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Personalize Your Course</h1>
          <p className="text-xs text-muted-foreground">Chat with the AI to set your learning direction</p>
        </div>
        {interestConfirmed && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground capitalize">{interestDomain}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-6">
        {messages.map((msg, i) => (
          <Message key={i} role={msg.role} content={msg.content} index={i} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Interest confirmed banner */}
      {interestConfirmed && (
        <div className="mx-0 mb-3 flex shrink-0 items-center justify-between rounded-xl border-2 border-border bg-card p-4 shadow-sm animate-slide-up">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Interest confirmed</p>
            <p className="text-sm font-semibold text-foreground capitalize">{interestDomain}</p>
          </div>
          <Button onClick={handleGenerate} size="sm" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Build My Plan
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="flex shrink-0 gap-2 pb-6 pt-2">
        <Input
          className="flex-1 h-11"
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
          className="w-11 h-11 flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      </div>
    </div>
  );
}
