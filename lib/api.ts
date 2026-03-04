import type {
  AuthResponse,
  VideoRequest,
  YouTubeConnection,
  YouTubeOAuthConnection,
} from "@/types";

const getApiUrl = () => {
  const url =
    process.env.NEXT_PUBLIC_LEJEL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "";
  if (typeof window !== "undefined") return url;
  return url || "http://localhost:3001";
};

export function getBaseUrl(): string {
  return getApiUrl().replace(/\/$/, "");
}

/** Token storage key (from env or default). Used for localStorage. */
export const AUTH_TOKEN_KEY =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY) ||
  "lejel_access_token";

/** True kalau backend belum dikonfigurasi → pakai mock auth */
function isMockAuth(): boolean {
  return getBaseUrl() === "";
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/** Clear token (e.g. on 401). Call before redirect to login. */
export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

// Mock user untuk development tanpa backend (login: user123@gmail.com / password123)
const MOCK_USER: AuthResponse["user"] = {
  id: "mock-user-1",
  email: "user123@gmail.com",
  name: "User Mock",
  createdAt: new Date().toISOString(),
};
const MOCK_TOKEN = "mock-token";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const base = getBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) {
      clearAuthToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const body = err as { message?: string | string[]; statusCode?: number };
    const msg = Array.isArray(body.message)
      ? body.message.join(". ")
      : (body.message ?? "Request failed");
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// Auth
export async function login(email: string, password: string): Promise<AuthResponse> {
  if (isMockAuth()) {
    if (email === "user123@gmail.com" && password === "password123") {
      return { accessToken: MOCK_TOKEN, user: MOCK_USER };
    }
    throw new Error("Email atau password salah. (Mock: pakai user123@gmail.com / password123)");
  }
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  if (isMockAuth()) {
    if (email === "user123@gmail.com" && password === "password123") {
      return { accessToken: MOCK_TOKEN, user: { ...MOCK_USER, name: name || MOCK_USER.name } };
    }
    throw new Error("Mock mode: daftar dengan email user123@gmail.com & password password123.");
  }
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

/** Backend /api/auth/me returns { user: { id, email, name } } */
export async function getMe(): Promise<AuthResponse["user"]> {
  if (isMockAuth()) {
    if (getAuthToken() === MOCK_TOKEN) return MOCK_USER;
    throw new Error("Unauthorized");
  }
  const data = await apiFetch<{ user: AuthResponse["user"] }>("/api/auth/me");
  return data.user;
}

// Video requests — body persis: fullScript (string), segmentedScripts (string[], min 1). Tanpa field lain.
export async function createVideoRequest(body: {
  fullScript: string;
  segmentedScripts: string[];
  connectionId?: string | null;
  youtubePrivacyStatus?: "public" | "private" | "unlisted";
}): Promise<VideoRequest> {
  const fullScript =
    typeof body.fullScript === "string" ? body.fullScript : "";
  const segmentedScripts = Array.isArray(body.segmentedScripts)
    ? body.segmentedScripts.filter((s) => typeof s === "string")
    : [];
  if (segmentedScripts.length === 0) {
    throw new Error("segmentedScripts minimal 1 elemen string");
  }
  const payload: {
    fullScript: string;
    segmentedScripts: string[];
    connectionId?: string;
    youtubePrivacyStatus?: "public" | "private" | "unlisted";
  } = { fullScript, segmentedScripts };
  const connectionId =
    body.connectionId && String(body.connectionId).trim()
      ? String(body.connectionId).trim()
      : undefined;
  if (connectionId) {
    payload.connectionId = connectionId;
    payload.youtubePrivacyStatus =
      body.youtubePrivacyStatus ?? "private";
  }
  const url = `${getBaseUrl()}/api/video-requests`;
  console.log("[createVideoRequest] input body:", {
    fullScript: body.fullScript,
    segmentedScripts: body.segmentedScripts,
    connectionId: body.connectionId,
    youtubePrivacyStatus: body.youtubePrivacyStatus,
  });
  console.log("[createVideoRequest] payload dikirim:", payload);
  console.log("[createVideoRequest] URL:", url);
  return apiFetch<VideoRequest>("/api/video-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getVideoRequests(params?: {
  status?: string;
  userId?: string;
}): Promise<VideoRequest[]> {
  const q = new URLSearchParams(
    params as Record<string, string>
  ).toString();
  return apiFetch<VideoRequest[]>(`/api/video-requests${q ? `?${q}` : ""}`);
}

export async function getVideoRequest(id: string): Promise<VideoRequest> {
  return apiFetch<VideoRequest>(`/api/video-requests/${id}`);
}

export async function updateVideoRequest(
  id: string,
  body: { fullScript?: string; segmentedScripts?: string[] }
): Promise<VideoRequest> {
  return apiFetch<VideoRequest>(`/api/video-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// --- OAuth / YouTube API (X-API-Key auth) ---

function getLejelApiKey(): string {
  return process.env.NEXT_PUBLIC_LEJEL_API_KEY ?? "";
}

function oauthFetch<T>(
  path: string,
  options: RequestInit & { requireApiKey?: boolean } = {}
): Promise<T> {
  const { requireApiKey = true, ...init } = options;
  const base = getBaseUrl();
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const apiKey = getLejelApiKey();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (requireApiKey && apiKey) {
    (headers as Record<string, string>)["X-API-Key"] = apiKey;
  }
  return fetch(url, { ...init, headers }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error((err as { message?: string }).message ?? "Request failed");
    }
    return res.json() as Promise<T>;
  });
}

/** Create connection. Returns { id, label, message }. Backend: label optional. */
export async function createYouTubeConnection(body: {
  clientId: string;
  clientSecret: string;
  label?: string;
}): Promise<{ id: string; label: string; message?: string }> {
  if (isMockAuth()) {
    return { id: "mock-conn-1", label: body.label ?? "", message: "Mock" };
  }
  return oauthFetch<{ id: string; label: string; message?: string }>(
    "/api/oauth/youtube/connections",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

/** Get Google OAuth URL. successRedirect: full URL to redirect after OAuth. */
export async function getGoogleAuthorizeUrl(
  connectionId: string,
  successRedirect: string
): Promise<{ url: string; callbackUrl?: string }> {
  if (isMockAuth()) {
    return { url: "/settings?oauth=success&connectionId=mock" };
  }
  const encoded = encodeURIComponent(successRedirect);
  return oauthFetch<{ url: string; callbackUrl?: string }>(
    `/api/oauth/google/authorize?connectionId=${connectionId}&success_redirect=${encoded}`,
    { requireApiKey: false }
  );
}

/** List connections (no auth). */
export async function listYouTubeConnections(): Promise<
  YouTubeOAuthConnection[]
> {
  if (isMockAuth()) return [];
  return oauthFetch<YouTubeOAuthConnection[]>(
    "/api/oauth/youtube/connections",
    { requireApiKey: false }
  );
}

/** Disconnect a connection. */
export async function disconnectYouTubeConnection(id: string): Promise<void> {
  if (isMockAuth()) return;
  await oauthFetch(`/api/oauth/youtube/connections/${id}/disconnect`, {
    method: "POST",
  });
}

/** Upload video to YouTube. */
export async function uploadToYouTube(body: {
  videoUrl: string;
  title: string;
  connectionId?: string;
  description?: string;
  privacyStatus?: "public" | "private" | "unlisted";
  tags?: string[];
}): Promise<{ videoId: string; url: string }> {
  if (isMockAuth()) {
    return { videoId: "mock", url: "https://youtube.com/watch?v=mock" };
  }
  return oauthFetch<{ videoId: string; url: string }>(
    "/api/oauth/youtube/upload",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

// Legacy aliases for backward compatibility (New page uses connectionId)
export const getYouTubeConnections = listYouTubeConnections;
