import type {
  AdminUser,
  AuthResponse,
  AutomationChannel,
  AutomationRun,
  GoogleClient,
  PendingYoutubeApproval,
  UserSegmentMediaInput,
  VideoRequest,
  VideoRequestDetail,
  User,
  VideoProfile,
  YouTubeConnection,
  RemotionTemplate,
  RemotionUserAssetPayload,
  RemotionGenerateResult,
  RemotionRenderResult,
} from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_LEJEL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

const API_KEY = process.env.NEXT_PUBLIC_LEJEL_API_KEY || "";

export const AUTH_TOKEN_KEY =
  process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY || "lejel_access_token";

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Older backends returned `/remotion/files/...` while the Nest route is `/api/remotion/files/...`.
 * Normalizes absolute or API-relative URLs so playback/download keep working.
 */
export function normalizeRemotionFileUrl(url: string): string {
  if (!url) return url;
  try {
    const base = API_URL.replace(/\/$/, "");
    const u = new URL(url, base);
    if (u.pathname.startsWith("/remotion/files/")) {
      u.pathname = `/api/remotion/files/${u.pathname.slice("/remotion/files/".length)}`;
    }
    return u.toString();
  } catch {
    return url;
  }
}

/** GET an MP4 from the authenticated Remotion file proxy; use for <video> / download (blob URL). */
export async function fetchRemotionMp4Blob(
  outputUrl: string,
  init?: RequestInit,
): Promise<Blob> {
  const target = normalizeRemotionFileUrl(outputUrl);
  const headers = new Headers(init?.headers);
  if (API_KEY && !headers.has("X-API-Key")) {
    headers.set("X-API-Key", API_KEY);
  }
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(target, {
    ...init,
    method: "GET",
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Failed to load video (HTTP ${response.status})`);
  }
  return response.blob();
}

async function request<T>(
  path: string,
  init: RequestInit & {
    auth?: boolean;
  } = {}
): Promise<T> {
  const headers = new Headers(init.headers || {});
  const authToken = init.auth ? getAuthToken() : null;

  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (API_KEY && !headers.has("X-API-Key")) {
    headers.set("X-API-Key", API_KEY);
  }
  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_URL.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  // Only DELETE is allowed to return 204 (e.g. OAuth google-clients). For POST/GET, 204
  // almost always means a misconfigured proxy or wrong API base URL — returning undefined
  // used to make mutations "succeed" with no data (silent broken Motion Graphics, etc.).
  if (response.status === 204) {
    const method = (init.method ?? "GET").toUpperCase();
    if (method === "DELETE") {
      return undefined as T;
    }
    throw new Error(
      `Unexpected empty response (HTTP 204) for ${method} ${path}. ` +
        "Confirm NEXT_PUBLIC_LEJEL_API_URL points at your Nest API and was set at **Docker build** time " +
        "(see Dockerfile build args). If you use a reverse proxy, ensure /api/* is forwarded to the backend.",
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "string"
        ? data
        : (data as { message?: string | string[] }).message;
    throw new Error(Array.isArray(message) ? message.join(", ") : message || "Request failed");
  }

  return data as T;
}

export async function login(email: string, password: string) {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  const res = await request<{ user: User }>("/api/auth/me", {
    method: "GET",
    auth: true,
  });
  return res.user;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  return request<{ ok: boolean }>("/api/auth/me/password", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function listAdminUsers() {
  return request<AdminUser[]>("/api/auth/admin/users", {
    method: "GET",
    auth: true,
  });
}

export async function listRecentActiveUsers(limit = 5) {
  const qs = `?limit=${encodeURIComponent(String(limit))}`;
  return request<AdminUser[]>(`/api/auth/admin/users/recent-activity${qs}`, {
    method: "GET",
    auth: true,
  });
}

export async function createAdminUser(input: {
  email: string;
  password: string;
  name: string;
  role?: "user" | "admin";
}) {
  return request<Pick<AdminUser, "id" | "email" | "name" | "role">>(
    "/api/auth/admin/users",
    {
      method: "POST",
      auth: true,
      body: JSON.stringify(input),
    }
  );
}

export async function deleteAdminUser(id: string) {
  return request<{ ok: boolean }>(`/api/auth/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function listGoogleClients() {
  return request<GoogleClient[]>("/api/oauth/google-clients", {
    method: "GET",
    auth: true,
  });
}

export async function createGoogleClient(input: {
  clientId: string;
  clientSecret: string;
  label?: string;
}) {
  return request<GoogleClient>("/api/oauth/google-clients", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function deleteGoogleClient(id: string) {
  return request<void>(`/api/oauth/google-clients/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function setGoogleClientEnabled(id: string, enabled: boolean) {
  return request<{ id: string; enabled: boolean }>(
    `/api/oauth/google-clients/${id}`,
    {
      method: "PATCH",
      auth: true,
      body: JSON.stringify({ enabled }),
    }
  );
}

export async function createYouTubeConnection(input: {
  googleClientId: string;
  label?: string;
}) {
  return request<{ id: string; label?: string; message?: string }>(
    "/api/oauth/youtube/connections",
    {
      method: "POST",
      auth: true,
      body: JSON.stringify(input),
    }
  );
}

export async function getGoogleAuthorizeUrl(
  connectionId: string,
  successRedirect: string
) {
  const params = new URLSearchParams({
    connectionId,
    success_redirect: successRedirect,
  });
  return request<{ url: string; callbackUrl?: string }>(
    `/api/oauth/google/authorize?${params.toString()}`,
    {
      method: "GET",
      auth: true,
    }
  );
}

export async function listYouTubeConnections() {
  return request<YouTubeConnection[]>("/api/oauth/youtube/connections", {
    method: "GET",
    auth: true,
  });
}

export async function disconnectYouTubeConnection(id: string) {
  return request<{ success: boolean }>(
    `/api/oauth/youtube/connections/${id}/disconnect`,
    {
      method: "POST",
      auth: true,
    }
  );
}

export async function listProfiles() {
  return request<VideoProfile[]>("/api/profiles", {
    method: "GET",
    auth: true,
  });
}

/** Kie.ai `/api/v1/chat/credit` shape proxied by backend. */
export type KieCreditsResponse = {
  code: number;
  msg: string;
  data: number;
};

export async function getKieCredits() {
  return request<KieCreditsResponse>("/api/kie-ai/credits", {
    method: "GET",
    auth: true,
  });
}

export type NewsExtractResponse = {
  title?: string;
  text: string;
};

export async function extractNewsArticle(url: string) {
  return request<NewsExtractResponse>("/api/news/extract", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ url }),
  });
}

export type R2PresignResponse = {
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  objectKey: string;
  expiresIn: number;
};

export async function presignR2Upload(
  contentType: string,
  scope?: "uploads" | "remotion",
) {
  return request<R2PresignResponse>("/api/media/r2/presign-upload", {
    method: "POST",
    auth: true,
    body: JSON.stringify(scope ? { contentType, scope } : { contentType }),
  });
}

export async function completeR2Upload(objectKey: string) {
  return request<{ objectKey: string; contentType?: string; contentLength: number }>(
    "/api/media/r2/complete",
    {
      method: "POST",
      auth: true,
      body: JSON.stringify({ objectKey }),
    },
  );
}

export async function segmentScriptViaLlm(input: {
  fullScript: string;
  /** `article_import`: server runs article→voiceover then segments. `manual` (default): segment user script only. */
  scriptSource?: "manual" | "article_import";
  /** Optional; used with article_import for articleToSpokenScript headline context. */
  articleTitle?: string;
  model?:
    | "gpt-5-4"
    | "gpt-5-2"
    | "claude-sonnet-4-6"
    | "gemini-3-flash"
    | "gemini-3-pro"
    | "gemini-3.1-pro"
    | "gemini-2.5-flash";
}) {
  return request<{ segments: string[]; fullScript: string }>("/api/llm/segment-script", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function createVideoRequest(input: {
  fullScript: string;
  segmentedScripts: string[];
  model:
    | "gpt-5-4"
    | "gpt-5-2"
    | "claude-sonnet-4-6"
    | "gemini-3-flash"
    | "gemini-3-pro"
    | "gemini-3.1-pro"
    | "gemini-2.5-flash";
  youtubeUploadMode?: "none" | "pending_approval" | "direct";
  connectionId?: string;
  contentType?: "all_image" | "all_video" | "mixed";
  profileId?: string;
  imageModel?:
    | "z-image"
    | "nano-banana-pro"
    | "google/nano-banana"
    | "flux-2/pro-text-to-image"
    | "flux-2/flex-text-to-image"
    | "grok-imagine/text-to-image"
    | "gpt-image/1.5-text-to-image";
  videoModel?:
    | "kling-v1.6"
    | "kling-v2.1-master"
    | "kling-v2.1"
    | "bytedance/v1-lite-text-to-video"
    | "wan/2-6-text-to-video"
    | "grok-imagine/image-to-video";
  topHeadlineText?: string;
  bottomHeadlineText?: string;
  userSegmentMedia?: UserSegmentMediaInput[];
}) {
  return request<{ id: string; status: string }>("/api/video-requests", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function listVideoRequests(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<VideoRequest[]>(`/api/video-requests${qs}`, {
    method: "GET",
    auth: true,
  });
}

export async function getVideoRequestDetail(id: string) {
  return request<VideoRequestDetail>(`/api/video-requests/${id}/detail`, {
    method: "GET",
    auth: true,
  });
}

export async function deleteVideoRequest(id: string) {
  return request<{ deleted: boolean; id: string }>(`/api/video-requests/${encodeURIComponent(id)}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function stopVideoRequest(id: string) {
  return request<{ id: string; status: string }>(`/api/video-requests/${encodeURIComponent(id)}/stop`, {
    method: "POST",
    auth: true,
  });
}

export async function createProfile(input: Omit<VideoProfile, "description"> & { description?: string }) {
  return request<VideoProfile>("/api/profiles", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function updateProfile(profileId: string, input: Partial<Omit<VideoProfile, "profileId">>) {
  return request<VideoProfile>(
    `/api/profiles/${encodeURIComponent(profileId)}`,
    {
      method: "PATCH",
      auth: true,
      body: JSON.stringify(input),
    }
  );
}

export async function deleteProfile(profileId: string) {
  return request<{ deleted: boolean; profileId: string }>(
    `/api/profiles/${encodeURIComponent(profileId)}`,
    {
      method: "DELETE",
      auth: true,
    }
  );
}

export async function listFonts() {
  return request<string[]>("/api/fonts", {
    method: "GET",
    auth: true,
  });
}

export async function renderProfilePreview(input: {
  canvas: { ratio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9"; resolution: "720p" | "1080p" };
  content: {
    ratio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
    resolution: "720p" | "1080p";
    xOffset: number;
    yOffset: number;
  };
  subtitle: {
    enabled: boolean;
    font: string;
    fontSize: number;
    fontColor: string;
    highlightColor: string;
    outlineColor: string;
    outlineWidth: number;
    background: boolean;
    backColor: string;
    alignment: number;
    xOffset: number;
    yOffset: number;
    bold: boolean;
    italic: boolean;
    socialMediaStyle: boolean;
  };
  headline: {
    top: {
      enabled: boolean;
      font: string;
      fontSize: number;
      fontColor: string;
      highlightColor: string;
      outlineColor: string;
      outlineWidth: number;
      background: boolean;
      backColor: string;
      alignment: number;
      xOffset: number;
      yOffset: number;
      bold: boolean;
      italic: boolean;
    };
    bottom: {
      enabled: boolean;
      font: string;
      fontSize: number;
      fontColor: string;
      highlightColor: string;
      outlineColor: string;
      outlineWidth: number;
      background: boolean;
      backColor: string;
      alignment: number;
      xOffset: number;
      yOffset: number;
      bold: boolean;
      italic: boolean;
    };
  };
  topHeadlineText?: string;
  subtitleText?: string;
  bottomHeadlineText?: string;
}) {
  return request<{ imageDataUrl: string }>("/api/profiles/preview/render", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function getPendingYoutubeApprovals() {
  return request<PendingYoutubeApproval[]>(
    "/api/video-requests/admin/pending-youtube",
    {
      method: "GET",
      auth: true,
    }
  );
}

export async function approveYoutubeUpload(id: string) {
  return request<{ ok: boolean; youtubeVideoId?: string; youtubeUrl?: string }>(
    `/api/video-requests/${id}/admin/approve-youtube`,
    {
      method: "POST",
      auth: true,
    }
  );
}

export async function rejectYoutubeUpload(id: string) {
  return request<{ ok: boolean }>(
    `/api/video-requests/${id}/admin/reject-youtube`,
    {
      method: "POST",
      auth: true,
    }
  );
}

export async function uploadToYouTube(input: {
  videoUrl: string;
  title: string;
  connectionId?: string;
  description?: string;
  privacyStatus?: "public" | "private" | "unlisted";
  tags?: string[];
}) {
  return request<{ videoId: string; url: string }>("/api/oauth/youtube/upload", {
    method: "POST",
    body: JSON.stringify(input),
    auth: true,
  });
}

export type AutomationDashboardStats = {
  totalChannels: number;
  totalRuns: number;
  failedRuns: number;
  /** 0–1 fraction of runs that ended in `failed` status within the range. */
  failureRate: number;
  from: string;
  to: string;
};

export async function listAutomationChannels() {
  return request<AutomationChannel[]>("/api/automation/channels", {
    method: "GET",
    auth: true,
  });
}

export async function getAutomationDashboardStats(fromIso: string, toIso: string) {
  const qs = new URLSearchParams({ from: fromIso, to: toIso });
  return request<AutomationDashboardStats>(`/api/automation/channels/stats?${qs.toString()}`, {
    method: "GET",
    auth: true,
  });
}

export async function getAutomationChannel(id: string) {
  return request<AutomationChannel>(`/api/automation/channels/${encodeURIComponent(id)}`, {
    method: "GET",
    auth: true,
  });
}

export async function createAutomationChannel(input: {
  name: string;
  connectionId: string;
  ownerUserId: string;
  profileId?: string;
  contentType?: "all_image" | "all_video" | "mixed";
  imageModel?: string;
  videoModel?: string;
  llmModel?: string;
  scriptSegmentationPrompt?: string;
  articleToScriptEnabled?: boolean;
  articleToScriptPrompt?: string;
  youtubePrivacyStatus?: "public" | "private" | "unlisted";
  youtubeTags?: string[];
  youtubeDescriptionTemplate?: string;
  youtubeMetadataMode?: "static" | "llm";
  youtubeTitlePrompt?: string;
  youtubeDescriptionPrompt?: string;
  youtubeTagsPrompt?: string;
  youtubeMetadataPrompt?: string;
  automationTopHeadlineEnabled?: boolean;
  automationTopHeadlinePrompt?: string;
  automationBottomHeadlineEnabled?: boolean;
  automationBottomHeadlinePrompt?: string;
  youtubeDescriptionCta?: string;
  youtubeTagPrefixes?: string[];
  enabled?: boolean;
}) {
  return request<{ channel: AutomationChannel; webhookSecret: string }>(
    "/api/automation/channels",
    {
      method: "POST",
      auth: true,
      body: JSON.stringify(input),
    }
  );
}

export async function updateAutomationChannel(
  id: string,
  input: Partial<{
    name: string;
    connectionId: string;
    ownerUserId: string;
    profileId: string | null;
    contentType: "all_image" | "all_video" | "mixed" | null;
    imageModel: string | null;
    videoModel: string | null;
    llmModel: string | null;
    scriptSegmentationPrompt: string | null;
    articleToScriptEnabled: boolean;
    articleToScriptPrompt: string | null;
    youtubePrivacyStatus: "public" | "private" | "unlisted";
    youtubeTags: string[] | null;
    youtubeDescriptionTemplate: string | null;
    youtubeMetadataMode: "static" | "llm";
    youtubeTitlePrompt: string | null;
    youtubeDescriptionPrompt: string | null;
    youtubeTagsPrompt: string | null;
    youtubeMetadataPrompt: string | null;
    automationTopHeadlineEnabled: boolean;
    automationTopHeadlinePrompt: string | null;
    automationBottomHeadlineEnabled: boolean;
    automationBottomHeadlinePrompt: string | null;
    youtubeDescriptionCta: string | null;
    youtubeTagPrefixes: string[] | null;
    enabled: boolean;
  }>
) {
  return request<AutomationChannel>(`/api/automation/channels/${encodeURIComponent(id)}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function deleteAutomationChannel(id: string) {
  return request<{ ok: boolean }>(`/api/automation/channels/${encodeURIComponent(id)}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function regenerateAutomationWebhookSecret(id: string) {
  return request<{ channel: AutomationChannel; webhookSecret: string }>(
    `/api/automation/channels/${encodeURIComponent(id)}/regenerate-secret`,
    {
      method: "POST",
      auth: true,
    }
  );
}

export async function listAutomationRuns(channelId: string, page = 1, limit = 20) {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return request<{ items: AutomationRun[]; total: number }>(
    `/api/automation/channels/${encodeURIComponent(channelId)}/runs?${qs.toString()}`,
    {
      method: "GET",
      auth: true,
    }
  );
}

// ─── Remotion ───────────────────────────────────────────────────────────────

export type LlmModel =
  | "gpt-5-4"
  | "gpt-5-2"
  | "claude-sonnet-4-6"
  | "gemini-3-flash"
  | "gemini-3-pro"
  | "gemini-3.1-pro"
  | "gemini-2.5-flash";

/** Generate TSX + immediately render it into an MP4. */
export async function generateRemotionVideo(input: {
  prompt: string;
  model?: LlmModel;
  durationInFrames?: number;
  fps?: number;
  width?: number;
  height?: number;
  userAssets?: RemotionUserAssetPayload[];
}) {
  return request<RemotionGenerateResult>("/api/remotion/generate", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

/** Generate TSX source only (no render). Review/edit in the UI, then call renderRemotionFromTsx. */
export async function generateRemotionTsx(input: {
  prompt: string;
  model?: LlmModel;
  /** Pixel canvas; should match the video profile / render settings. */
  width?: number;
  height?: number;
  userAssets?: RemotionUserAssetPayload[];
}) {
  return request<{
    ok: boolean;
    tsxSource: string;
    prompt: string;
    inputProps?: Record<string, string>;
  }>("/api/remotion/generate-tsx", { method: "POST", auth: true, body: JSON.stringify(input) });
}

/** LLM revises existing Remotion TSX from a natural-language instruction. */
export async function reviseRemotionTsx(input: {
  existingTsx: string;
  revisionPrompt: string;
  model?: LlmModel;
  width?: number;
  height?: number;
}) {
  return request<{ ok: boolean; tsxSource: string }>("/api/remotion/revise-tsx", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

/** Render edited TSX into an MP4 (no LLM). */
export async function renderRemotionFromTsx(input: {
  tsxSource: string;
  durationInFrames?: number;
  fps?: number;
  width?: number;
  height?: number;
  inputProps?: Record<string, unknown>;
}) {
  return request<RemotionRenderResult>("/api/remotion/render", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

/** Save a template to the DB. */
export async function saveRemotionTemplate(input: {
  name: string;
  description?: string;
  tsxSource: string;
  generationPrompt?: string;
  durationInFrames?: number;
  fps?: number;
  width?: number;
  height?: number;
  defaultInputProps?: Record<string, unknown>;
  remotionAssetRefs?: RemotionUserAssetPayload[];
}) {
  return request<{ ok: boolean; template: RemotionTemplate }>(
    "/api/remotion/templates",
    { method: "POST", auth: true, body: JSON.stringify(input) }
  );
}

/** List all saved templates. */
export async function listRemotionTemplates() {
  return request<{ ok: boolean; templates: RemotionTemplate[] }>(
    "/api/remotion/templates",
    { method: "GET", auth: true }
  );
}

/** Get a single template (includes tsxSource). */
export async function getRemotionTemplate(id: string) {
  return request<{ ok: boolean; template: RemotionTemplate }>(
    `/api/remotion/templates/${encodeURIComponent(id)}`,
    { method: "GET", auth: true }
  );
}

/** Delete a template. */
export async function deleteRemotionTemplate(id: string) {
  return request<{ ok: boolean }>(
    `/api/remotion/templates/${encodeURIComponent(id)}`,
    { method: "DELETE", auth: true }
  );
}

/** Render a saved template. */
export async function renderRemotionTemplate(
  id: string,
  input?: {
    inputProps?: Record<string, unknown>;
    outputFile?: string;
    durationInFrames?: number;
    fps?: number;
    width?: number;
    height?: number;
  }
) {
  return request<RemotionRenderResult>(
    `/api/remotion/templates/${encodeURIComponent(id)}/render`,
    { method: "POST", auth: true, body: JSON.stringify(input ?? {}) }
  );
}
