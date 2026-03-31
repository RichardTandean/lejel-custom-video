export type Role = "user" | "admin";
export type YoutubeUploadMode = "none" | "pending_approval" | "direct";
export type VideoRequestStatus =
  | "draft"
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "pending_youtube_approval";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export type GoogleClient = {
  id: string;
  label: string;
  enabled: boolean;
  createdAt?: string;
};

export type YouTubeConnection = {
  id: string;
  label: string;
  connected: boolean;
  expiresAt?: string | null;
  createdAt?: string;
  googleClientEnabled?: boolean;
};

export type DimensionConfig = {
  ratio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  resolution: "720p" | "1080p";
};

export type ContentConfig = DimensionConfig & {
  xOffset: number;
  yOffset: number;
};

export type TextStyleConfig = {
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
  yOffset: number;
  xOffset: number;
  bold: boolean;
  italic: boolean;
};

export type SubtitleConfig = TextStyleConfig & {
  socialMediaStyle: boolean;
};

export type HeadlineConfig = {
  top: TextStyleConfig;
  bottom: TextStyleConfig;
};

export type VideoProfile = {
  profileId: string;
  name: string;
  description: string;
  canvas: DimensionConfig;
  content: ContentConfig;
  subtitle: SubtitleConfig;
  headline: HeadlineConfig;
};

export type VideoRequest = {
  id: string;
  fullScript: string;
  segmentedScripts: string[];
  llmModel?:
    | "gpt-5-4"
    | "gpt-5-2"
    | "claude-sonnet-4-6"
    | "gemini-3-flash"
    | "gemini-3-pro"
    | "gemini-3.1-pro"
    | "gemini-2.5-flash";
  imageModel?: string;
  videoModel?: string;
  contentType?: "all_image" | "all_video" | "mixed";
  profileId?: string;
  status: VideoRequestStatus;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string | null;
  completedAt?: string | null;
  resultUrl?: string;
  finalUrl?: string;
  debugMetaUrl?: string;
  errorMessage?: string;
  connectionId?: string;
  youtubeUploadMode?: YoutubeUploadMode;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  youtubeApprovalRejectedAt?: string;
  user?: Pick<User, "id" | "name" | "email">;
  createdBy?: Pick<User, "id" | "name" | "email">;
};

export type PendingYoutubeApproval = VideoRequest;

export type VideoRequestDetail = {
  request: VideoRequest;
  progress: {
    status: VideoRequestStatus;
    percent: number;
    doneCount: number;
    totalCount: number;
    stages: Array<{
      key: string;
      label: string;
      done: boolean;
    }>;
  };
  artifacts: {
    audioUrls: string[];
    transcriptUrls: string[];
    subtitleUrls: string[];
    segmentVideoUrls: string[];
    finalUrls: string[];
    metaUrls: string[];
  };
  segments: Array<{
    index: number;
    text: string;
    timing: {
      index: number;
      text: string;
      start: number;
      end: number;
      duration: number;
    } | null;
    mediaType: "image" | "video" | null;
    prompt: string | null;
    imageModel: string | null;
    videoModel: string | null;
    imageUrls: string[];
    generatedChunkVideoUrls: string[];
    mergedVideoUrls: string[];
    finalSegmentUrl: string | null;
  }>;
};
