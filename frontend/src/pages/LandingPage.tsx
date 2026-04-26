import { useNavigate } from "react-router-dom";
import { GraduationCap, BookOpen, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

function RoleCard({
  icon: Icon,
  title,
  description,
  onClick,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  delay: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full text-left p-8 rounded-2xl border border-border bg-card",
        "hover:border-foreground/20 hover:shadow-lg hover:-translate-y-0.5",
        "transition-all duration-300 ease-out",
        "animate-fade-in-up animation-fill-both",
        delay
      )}
    >
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted group-hover:bg-foreground group-hover:text-background transition-all duration-300">
          <Icon className="w-5 h-5 text-muted-foreground group-hover:text-background transition-colors duration-300" />
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-300">
        <ArrowRight className="w-4 h-4 text-foreground" />
      </div>
    </button>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="app-page">
      <div className="flex w-full flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header */}
        <div className="mb-16 animate-slide-up animation-fill-both">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted text-xs text-muted-foreground mb-8">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-foreground/40" />
            AI-powered learning
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-foreground mb-4 leading-tight">
            Your course,<br />
            <span className="text-muted-foreground">reimagined.</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-sm leading-relaxed">
            Personalized to what you actually care about. Not one size fits all.
          </p>
        </div>

        {/* Role selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RoleCard
            icon={GraduationCap}
            title="I'm a Professor"
            description="Upload your syllabus and generate a session code for your students."
            onClick={() => navigate("/professor/upload")}
            delay="animate-delay-100"
          />
          <RoleCard
            icon={BookOpen}
            title="I'm a Student"
            description="Enter your session code and personalize the course to your interests."
            onClick={() => navigate("/student/onboarding")}
            delay="animate-delay-200"
          />
        </div>

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-muted-foreground animate-fade-in animate-delay-400 animation-fill-both">
          AICourseLoad &mdash; Built for learners who care.
        </p>
      </div>
      </div>
    </div>
  );
}
