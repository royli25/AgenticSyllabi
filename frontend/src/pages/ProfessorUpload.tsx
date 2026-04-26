import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Check, Loader2, Copy, ArrowLeft } from "lucide-react";
import { uploadSyllabus } from "@/api/courses";
import { useSessionStore } from "@/store/useSessionStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ProfessorUpload() {
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ courseId: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxFiles: 1,
  });

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await uploadSyllabus(file);
      setSession(data.session_id, data.course_id, data.course_title, data.required_topics);
      setResult({ courseId: data.course_id, code: data.session_id });
    } catch {
      setError("Failed to process syllabus. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="app-page">
      <div className="flex w-full flex-1 flex-col justify-center px-6 py-10 sm:px-10">
      <div className="mx-auto w-full max-w-lg animate-slide-up animation-fill-both">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-10 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        {!result ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                Upload Syllabus
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your students will receive a personalized version of this course based on their interests.
              </p>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                "relative cursor-pointer rounded-2xl border-2 border-dashed border-border p-12 text-center",
                "transition-all duration-200",
                isDragActive
                  ? "border-foreground/40 bg-muted scale-[1.01]"
                  : file
                  ? "border-foreground/20 bg-muted/50"
                  : "border-border hover:border-foreground/20 hover:bg-muted/30"
              )}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="animate-scale-in animation-fill-both">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-foreground text-background mb-4">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="font-medium text-foreground text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024).toFixed(0)} KB &mdash; click to change
                  </p>
                </div>
              ) : (
                <div>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted border border-border mb-4">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-foreground font-medium mb-1">
                    {isDragActive ? "Drop it here" : "Drag & drop your syllabus"}
                  </p>
                  <p className="text-xs text-muted-foreground">PDF or .txt &mdash; up to 10 MB</p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-destructive text-sm mt-3 animate-fade-in">{error}</p>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || loading}
              className="mt-5 w-full h-11"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing syllabus...
                </>
              ) : (
                "Parse Syllabus"
              )}
            </Button>
          </>
        ) : (
          <div className="animate-bounce-in animation-fill-both">
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-foreground text-background mb-6">
                <Check className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Syllabus Ready</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Share this session code with your students
              </p>

              {/* Code display */}
              <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3 mb-6">
                <code className="flex-1 font-mono text-sm text-foreground tracking-widest text-center">
                  {result.code}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 p-1.5 rounded-md hover:bg-border transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-foreground" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>

              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Back to home
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
