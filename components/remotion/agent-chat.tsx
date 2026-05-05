"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Loader2,
  Play,
  Code2,
  Wand2,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  startAgentSession,
  sendAgentMessage,
  getAgentSession,
  type AgentSessionResponse,
  type AgentMessage,
  type LlmModel,
} from "@/lib/remotion-agent-api";
import { fetchRemotionMp4Blob } from "@/lib/api";

const LLM_MODELS: { value: LlmModel; label: string }[] = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "gpt-5-4", label: "GPT-5-4" },
  { value: "gpt-5-2", label: "GPT-5-2" },
  { value: "gemini-3-flash", label: "Gemini 3 Flash" },
  { value: "gemini-3-pro", label: "Gemini 3 Pro" },
  { value: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

const POLL_INTERVAL_MS = 2000;

// ─── Video Player (fetches MP3 via auth headers) ─────────────────────────────

function VideoPlayer({ renderUrl }: { renderUrl: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchRemotionMp4Blob(renderUrl)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [renderUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-zinc-800 py-12 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-zinc-800 py-8 text-xs text-zinc-500">
        Failed to load video
      </div>
    );
  }

  return (
    <video
      src={blobUrl}
      controls
      className="w-full max-w-xs rounded-lg border border-zinc-700"
    />
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: AgentMessage }) {
  const [showTsx, setShowTsx] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const handleCopy = useCallback(async () => {
    if (!msg.tsxSource) return;
    try {
      await navigator.clipboard.writeText(msg.tsxSource);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = msg.tsxSource;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [msg.tsxSource]);

  const actionIcon = (() => {
    if (msg.action === "error") return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
    if (msg.action === "generate" || msg.action === "revise") return <Code2 className="h-3.5 w-3.5 text-amber-400" />;
    if (msg.action === "render") return <Play className="h-3.5 w-3.5 text-green-400" />;
    return <Sparkles className="h-3.5 w-3.5 text-zinc-400" />;
  })();

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] space-y-2 rounded-xl px-4 py-3 ${
          isUser
            ? "bg-amber-500/20 text-zinc-100"
            : "bg-zinc-800/80 text-zinc-200"
        }`}
      >
        {/* Action badge */}
        {!isUser && msg.action && msg.action !== "think" && (
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            {actionIcon}
            <span className="capitalize">{msg.action}</span>
          </div>
        )}

        {/* Message text */}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>

        {/* Video preview */}
        {msg.renderUrl && (
          <div className="pt-1">
            <VideoPlayer renderUrl={msg.renderUrl} />
          </div>
        )}

        {/* TSX source toggle */}
        {msg.tsxSource && (
          <div className="pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTsx(!showTsx)}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Code2 className="h-3 w-3" />
                {showTsx ? "Hide source" : "Show source"}
              </button>
              {showTsx && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            {showTsx && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-zinc-950 p-2 text-[11px] text-zinc-300 leading-relaxed">
                {msg.tsxSource}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status Indicator ────────────────────────────────────────────────────────

function StatusIndicator({ status }: { status: string }) {
  if (status === "idle" || status === "error") return null;

  const labels: Record<string, string> = {
    thinking: "Thinking…",
    generating: "Writing code…",
    validating: "Checking code…",
    rendering: "Rendering video…",
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>{labels[status] ?? "Processing…"}</span>
    </div>
  );
}

// ─── Chat Component ──────────────────────────────────────────────────────────

type ChatProps = {
  /** Initial canvas size */
  canvas?: { width: number; height: number };
  /** Initial model */
  model?: LlmModel;
};

export function AgentChat({ canvas, model }: ChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<AgentSessionResponse | null>(null);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<LlmModel>(model ?? "claude-sonnet-4-6");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

  // Poll when session is processing
  useEffect(() => {
    if (!sessionId || !session || session.status === "idle" || session.status === "error") return;

    const interval = setInterval(async () => {
      try {
        const updated = await getAgentSession(sessionId);
        setSession(updated);
      } catch {
        // Polling failed — will retry on next interval
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [sessionId, session?.status]);

  // Start session
  const startMut = useMutation({
    mutationFn: () =>
      startAgentSession({ canvas, model: selectedModel }),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setSession({
        sessionId: data.sessionId,
        status: "idle",
        error: null,
        canvas: data.canvas,
        model: data.model,
        fps: data.fps,
        durationInFrames: data.durationInFrames,
        currentTsx: null,
        lastRenderUrl: null,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      inputRef.current?.focus();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || "Failed to start session");
    },
  });

  // Send message
  const sendMut = useMutation({
    mutationFn: async (content: string) => {
      if (!sessionId) throw new Error("No active session");
      // Optimistically add user message
      const userMsg: AgentMessage = { role: "user", content };
      setSession((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, userMsg],
              status: "thinking",
            }
          : prev,
      );
      setInput("");

      await sendAgentMessage(sessionId, content);

      // Initial poll to get the processing result
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const updated = await getAgentSession(sessionId);
      setSession(updated);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || "Failed to send message");
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || sendMut.isPending) return;
    sendMut.mutate(trimmed);
  }, [input, sendMut]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLoading = startMut.isPending;

  // ─── Rendering ────────────────────────────────────────────────────────────

  // No session yet — show start screen
  if (!sessionId || !session) {
    return (
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="rounded-full bg-amber-500/10 p-4">
            <MessageSquare className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">AI Motion Graphics Assistant</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Describe the motion graphic you want, then iterate with follow-up requests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as LlmModel)}
              className="h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200"
            >
              {LLM_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={() => startMut.mutate()}
              disabled={isLoading}
              className="bg-amber-500 text-zinc-950 hover:bg-amber-400"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Start Chat
            </Button>
          </div>

          <div className="mt-2 space-y-1 text-xs text-zinc-500">
            <p>Examples:</p>
            <p className="italic">&ldquo;Create a 10-second video about rising gold prices with a bar chart&rdquo;</p>
            <p className="italic">&ldquo;Make a scene about renewable energy with a fade transition&rdquo;</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active session — show chat
  return (
    <Card className="border-zinc-800 bg-zinc-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-zinc-200">AI Assistant</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
            {session.canvas.width}×{session.canvas.height}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setSessionId(null);
            setSession(null);
          }}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 max-h-[500px] min-h-[300px]">
        {session.messages.length === 0 && session.status === "idle" && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-zinc-500">
            <Sparkles className="mb-2 h-6 w-6" />
            <p>Describe the motion graphic you want to create.</p>
          </div>
        )}

        {session.messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        <StatusIndicator status={session.status} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-4">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              session.status !== "idle"
                ? "Wait for the current response…"
                : "Describe what you want…"
            }
            disabled={session.status !== "idle" || sendMut.isPending}
            rows={2}
            className="min-h-[44px] resize-none border-zinc-700 bg-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500"
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={
              !input.trim() || session.status !== "idle" || sendMut.isPending
            }
            size="icon"
            className="h-[44px] w-[44px] shrink-0 bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {sendMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-500">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </Card>
  );
}
