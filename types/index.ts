export type Role = "user" | "admin";
export type YoutubeUploadMode = "none" | "pending_approval" | "direct";
export type VideoRequestStatus =
  | "draft"
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "pending_youtube_approval";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

/** Admin user list: lastActivityAt = latest of lastLogin and latest video request update (server-defined). */
export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
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

/** Sample/default copy for previews and prefilling headline fields on “new video”. */
export type ProfileSampleTexts = {
  topHeadline?: string;
  bottomHeadline?: string;
  /** Layout/preview only; rendered subtitles follow the spoken script. */
  subtitle?: string;
};

export type VideoProfile = {
  profileId: string;
  name: string;
  description: string;
  canvas: DimensionConfig;
  content: ContentConfig;
  subtitle: SubtitleConfig;
  headline: HeadlineConfig;
  sampleTexts?: ProfileSampleTexts;
};

/** Resolved placement returned by the API (after optional LLM auto-match). */
export type UserSegmentMediaItem = {
  segmentIndex: number;
  objectKey: string;
  mediaKind: "image" | "video";
  assetLabel?: string;
};

/** Payload when creating a request: describe the asset; omit segmentIndex for LLM placement. */
export type UserSegmentMediaInput = {
  objectKey: string;
  mediaKind: "image" | "video";
  assetLabel: string;
  segmentIndex?: number;
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
  contentType?: "all_image" | "all_video" | "mixed" | "motion_graphic";
  profileId?: string;
  /** User override for burn-in top headline when profile enables it */
  topHeadlineText?: string;
  /** User override for burn-in bottom headline when profile enables it */
  bottomHeadlineText?: string;
  userSegmentMedia?: UserSegmentMediaItem[];
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

export type AutomationRunStatus =
  | "received"
  | "segmenting"
  | "queued"
  | "processing"
  | "uploading"
  | "completed"
  | "failed";

export type AutomationChannel = {
  id: string;
  name: string;
  webhookSlug: string;
  webhookSecretPrefix?: string;
  webhookUrl: string;
  connectionId: string;
  ownerUserId: string;
  profileId?: string;
  contentType?: "all_image" | "all_video" | "mixed";
  imageModel?: string;
  videoModel?: string;
  llmModel?: string;
  /** Extra LLM instructions when splitting webhook script into segments. */
  scriptSegmentationPrompt?: string;
  /** When true, webhook runs an LLM pass to turn raw title+body into spoken fullScript before segmentation. */
  articleToScriptEnabled?: boolean;
  /** Extra instructions for the article→spoken-script LLM (optional; server defaults if empty). */
  articleToScriptPrompt?: string;
  youtubePrivacyStatus: "public" | "private" | "unlisted";
  youtubeTags?: string[];
  youtubeDescriptionTemplate?: string;
  youtubeMetadataMode?: "static" | "llm";
  youtubeTitlePrompt?: string;
  youtubeDescriptionPrompt?: string;
  youtubeTagsPrompt?: string;
  /** Single LLM instructions for title+description+tags when metadata mode is LLM (overrides split prompts when set). */
  youtubeMetadataPrompt?: string;
  automationTopHeadlineEnabled?: boolean;
  automationTopHeadlinePrompt?: string;
  automationBottomHeadlineEnabled?: boolean;
  automationBottomHeadlinePrompt?: string;
  youtubeDescriptionCta?: string;
  youtubeTagPrefixes?: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AutomationRun = {
  id: string;
  channelId: string;
  videoRequestId: string | null;
  status: AutomationRunStatus;
  inputTitle: string | null;
  inputBody: string;
  youtubeUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Remotion ───────────────────────────────────────────────────────────────

export type RemotionUserAssetPayload = {
  objectKey: string;
  label: string;
  kind: "image" | "video";
};

export type RemotionTemplate = {
  id: string;
  name: string;
  description: string | null;
  generationPrompt: string | null;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultInputProps: Record<string, unknown> | null;
  remotionAssetRefs?: RemotionUserAssetPayload[] | null;
  lastOutputUrl: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only present when fetching a single template */
  tsxSource?: string;
};

export type RemotionGenerateResult = {
  ok: boolean;
  tsxSource: string;
  outputUrl: string;
  outputPath: string;
  prompt: string;
  model: string;
  inputProps?: Record<string, string>;
};

export type RemotionRenderResult = {
  ok: boolean;
  outputUrl: string;
  outputPath: string;
  mode: string;
};
