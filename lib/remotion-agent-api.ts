import { request } from "./api";
import type { LlmModel } from "./api";
export type { LlmModel };

export type AgentStatus =
  | "idle"
  | "thinking"
  | "generating"
  | "validating"
  | "rendering"
  | "error";

export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
  action?: "think" | "generate" | "revise" | "render" | "error";
  tsxSource?: string;
  renderUrl?: string;
};

export type AgentSessionResponse = {
  sessionId: string;
  status: AgentStatus;
  error: string | null;
  canvas: { width: number; height: number };
  model: LlmModel;
  fps: number;
  durationInFrames: number;
  currentTsx: string | null;
  lastRenderUrl: string | null;
  messages: AgentMessage[];
  createdAt: number;
  updatedAt: number;
};

export type AgentStartResponse = {
  sessionId: string;
  canvas: { width: number; height: number };
  model: LlmModel;
  fps: number;
  durationInFrames: number;
};

/** Create a new agent session. */
export async function startAgentSession(input?: {
  canvas?: { width: number; height: number };
  model?: LlmModel;
  fps?: number;
  durationInFrames?: number;
}): Promise<AgentStartResponse> {
  return request<AgentStartResponse>("/api/remotion/agent/start", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input ?? {}),
  });
}

/** Send a message to the agent. Returns immediately — poll the session for updates. */
export async function sendAgentMessage(
  sessionId: string,
  content: string,
): Promise<{ sessionId: string; status: string; message: string }> {
  return request(`/api/remotion/agent/${encodeURIComponent(sessionId)}/message`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ content }),
  });
}

/** Get current session state. */
export async function getAgentSession(
  sessionId: string,
): Promise<AgentSessionResponse> {
  return request<AgentSessionResponse>(
    `/api/remotion/agent/${encodeURIComponent(sessionId)}`,
    { method: "GET", auth: true },
  );
}
