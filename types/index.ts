// User & Auth
export interface User {
  id: string;
  email: string;
  name: string;
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
  | "failed";

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
  createdBy?: { id: string; name: string; email: string } | null;
}

// Create request body (backend: fullScript, segmentedScripts, connectionId?)
export interface CreateVideoRequestInput {
  fullScript: string;
  segmentedScripts: string[];
  connectionId?: string | null;
}

// YouTube connection (legacy, from /api/youtube-connections)
export interface YouTubeConnection {
  id: string;
  channelId: string;
  channelTitle: string;
  createdAt: string;
}

// YouTube OAuth connection (from /api/oauth/youtube/connections)
export interface YouTubeOAuthConnection {
  id: string;
  label: string;
  connected: boolean;
  expiresAt?: string;
  createdAt: string;
}
