// User & Auth
export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

// Video request status
export type VideoRequestStatus =
  | "draft"
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "pending_youtube_approval";

export type YoutubeUploadMode = "none" | "pending_approval" | "direct";

export interface VideoRequest {
  id: string;
  fullScript: string;
  segmentedScripts: string[];
  status: VideoRequestStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  completedAt?: string | null;
  resultUrl?: string | null;
  errorMessage?: string | null;
  youtubeVideoId?: string | null;
  connectionId?: string | null;
  youtubeUploadMode?: YoutubeUploadMode;
  youtubeApprovalRejectedAt?: string | null;
  createdBy?: { id: string; name: string; email: string } | null;
}

// Create request body (backend: fullScript, segmentedScripts, youtubeUploadMode?, connectionId?, youtubePrivacyStatus?)
export interface CreateVideoRequestInput {
  fullScript: string;
  segmentedScripts: string[];
  youtubeUploadMode?: YoutubeUploadMode;
  connectionId?: string | null;
  youtubePrivacyStatus?: "public" | "private" | "unlisted";
}

// YouTube connection (legacy, from /api/youtube-connections)
export interface YouTubeConnection {
  id: string;
  channelId: string;
  channelTitle: string;
  createdAt: string;
}

// Google client (credentials only, from /api/oauth/google-clients)
export interface GoogleClient {
  id: string;
  label: string;
  enabled: boolean;
  createdAt: string;
}

// YouTube OAuth connection (from /api/oauth/youtube/connections)
export interface YouTubeOAuthConnection {
  id: string;
  label: string;
  connected: boolean;
  googleClientEnabled?: boolean;
  expiresAt?: string;
  createdAt: string;
}
