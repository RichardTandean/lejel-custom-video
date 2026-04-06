"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  createVideoRequest,
  getKieCredits,
  listProfiles,
  listYouTubeConnections,
  segmentScriptViaLlm,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type LlmModel =
  | "gpt-5-4"
  | "gpt-5-2"
  | "claude-sonnet-4-6"
  | "gemini-3-flash"
  | "gemini-3-pro"
  | "gemini-3.1-pro"
  | "gemini-2.5-flash";

type ImageModel =
  | "z-image"
  | "nano-banana-pro"
  | "google/nano-banana"
  | "flux-2/pro-text-to-image"
  | "flux-2/flex-text-to-image"
  | "grok-imagine/text-to-image"
  | "gpt-image/1.5-text-to-image";

type VideoModel =
  | "kling-v1.6"
  | "kling-v2.1-master"
  | "kling-v2.1"
  | "bytedance/v1-lite-text-to-video"
  | "wan/2-6-text-to-video"
  | "grok-imagine/image-to-video";

const LLM_MODEL_ENTRIES: { value: LlmModel; labelKey: string }[] = [
  { value: "gpt-5-4", labelKey: "gpt54" },
  { value: "gpt-5-2", labelKey: "gpt52" },
  { value: "claude-sonnet-4-6", labelKey: "claudeSonnet46" },
  { value: "gemini-3-flash", labelKey: "gemini3Flash" },
  { value: "gemini-3-pro", labelKey: "gemini3Pro" },
  { value: "gemini-3.1-pro", labelKey: "gemini31Pro" },
  { value: "gemini-2.5-flash", labelKey: "gemini25Flash" },
];

const IMAGE_MODEL_ENTRIES = [
  { value: "z-image" as const, labelKey: "zImage" },
  { value: "nano-banana-pro" as const, labelKey: "nanoBananaPro" },
  { value: "google/nano-banana" as const, labelKey: "googleNanoBanana" },
  { value: "flux-2/pro-text-to-image" as const, labelKey: "flux2Pro" },
  { value: "flux-2/flex-text-to-image" as const, labelKey: "flux2Flex" },
  { value: "grok-imagine/text-to-image" as const, labelKey: "grokImagineTti" },
  { value: "gpt-image/1.5-text-to-image" as const, labelKey: "gptImage15" },
];

const VIDEO_MODEL_ENTRIES = [
  { value: "kling-v1.6" as const, labelKey: "klingV16" },
  { value: "kling-v2.1-master" as const, labelKey: "klingV21Master" },
  { value: "kling-v2.1" as const, labelKey: "klingV21" },
  { value: "bytedance/v1-lite-text-to-video" as const, labelKey: "bytedanceV1Lite" },
  { value: "wan/2-6-text-to-video" as const, labelKey: "wan26" },
  { value: "grok-imagine/image-to-video" as const, labelKey: "grokImagineItv" },
];

export default function NewVideoPage() {
  const t = useTranslations("generateVideo");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [fullScript, setFullScript] = useState("");
  const [segments, setSegments] = useState<string[]>([]);
  const [model, setModel] = useState<LlmModel>("gpt-5-4");
  const [contentType, setContentType] = useState<"all_image" | "all_video" | "mixed">(
    "mixed",
  );
  const [profileId, setProfileId] = useState("");
  const [imageModel, setImageModel] = useState<ImageModel>("z-image");
  const [videoModel, setVideoModel] = useState<VideoModel>("kling-v2.1");
  const [uploadMode, setUploadMode] = useState<"none" | "direct" | "pending_approval">(
    "none",
  );
  const [youtubeConnectionId, setYoutubeConnectionId] = useState("");
  const [segmenting, setSegmenting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [topHeadlineText, setTopHeadlineText] = useState("");
  const [bottomHeadlineText, setBottomHeadlineText] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["video-profiles"],
    queryFn: listProfiles,
  });
  const { data: youtubeConnections = [] } = useQuery({
    queryKey: ["youtube-connections"],
    queryFn: listYouTubeConnections,
    enabled: uploadMode !== "none",
  });

  const {
    data: kieCredits,
    isLoading: kieCreditsLoading,
    isError: kieCreditsError,
  } = useQuery({
    queryKey: ["kie-credits"],
    queryFn: getKieCredits,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const kieCreditsOk =
    kieCredits != null && (kieCredits.code === 200 || kieCredits.code === 0);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.profileId === profileId),
    [profiles, profileId],
  );

  useEffect(() => {
    setTopHeadlineText("");
    setBottomHeadlineText("");
  }, [profileId]);

  const canSubmit = useMemo(() => {
    if (segments.length === 0) return false;
    if (!profileId) return false;
    if (uploadMode !== "none" && !youtubeConnectionId) return false;
    return true;
  }, [segments.length, profileId, uploadMode, youtubeConnectionId]);

  const headlineShow = useMemo(() => {
    if (!selectedProfile) return { showTop: false, showBottom: false };
    return {
      showTop: selectedProfile.headline.top.enabled,
      showBottom: selectedProfile.headline.bottom.enabled,
    };
  }, [selectedProfile]);

  const headlineSection = useMemo(() => {
    if (!headlineShow.showTop && !headlineShow.showBottom) return null;
    return (
      <div className="col-span-full space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
        <div className="text-xs font-medium text-zinc-400">{t("headlinesSection")}</div>
        {headlineShow.showTop && (
          <div className="space-y-2">
            <Label htmlFor="top-headline">{t("topHeadline")}</Label>
            <Textarea
              id="top-headline"
              className="min-h-[72px] resize-y"
              value={topHeadlineText}
              onChange={(e) => setTopHeadlineText(e.target.value)}
              placeholder={t("topHeadlinePlaceholder")}
            />
          </div>
        )}
        {headlineShow.showBottom && (
          <div className="space-y-2">
            <Label htmlFor="bottom-headline">{t("bottomHeadline")}</Label>
            <Textarea
              id="bottom-headline"
              className="min-h-[72px] resize-y"
              value={bottomHeadlineText}
              onChange={(e) => setBottomHeadlineText(e.target.value)}
              placeholder={t("bottomHeadlinePlaceholder", {
                name: selectedProfile?.name ?? "—",
              })}
            />
          </div>
        )}
      </div>
    );
  }, [
    headlineShow.showTop,
    headlineShow.showBottom,
    topHeadlineText,
    bottomHeadlineText,
    selectedProfile?.name,
    t,
  ]);

  async function handleGenerateScript() {
    if (!fullScript.trim()) {
      toast.error(t("toastInputScriptFirst"));
      return;
    }
    setSegmenting(true);
    try {
      const { segments: result } = await segmentScriptViaLlm({
        fullScript: fullScript.trim(),
        model,
      });
      if (result.length === 0) {
        toast.error(t("toastNoSegments"));
        return;
      }
      setSegments(result);
      toast.success(t("toastSegmentSuccess"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("toastSegmentFailed"));
    } finally {
      setSegmenting(false);
    }
  }

  function addSegmentAfter(index: number) {
    setSegments((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, "");
      return next;
    });
  }

  async function handleGenerateVideo() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const trimmedSegments = segments.map((s) => s.trim()).filter(Boolean);
      await createVideoRequest({
        fullScript: fullScript.trim() || trimmedSegments.join("\n\n"),
        segmentedScripts: trimmedSegments,
        model,
        contentType,
        profileId,
        imageModel,
        videoModel,
        youtubeUploadMode:
          uploadMode === "none"
            ? "none"
            : uploadMode === "direct"
              ? "direct"
              : "pending_approval",
        connectionId: uploadMode === "none" ? undefined : youtubeConnectionId,
        ...(topHeadlineText.trim() ? { topHeadlineText: topHeadlineText.trim() } : {}),
        ...(bottomHeadlineText.trim() ? { bottomHeadlineText: bottomHeadlineText.trim() } : {}),
      });
      toast.success(t("toastRequestCreated"));
      router.push("/requests");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastRequestFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("description")}</p>
        </div>
        <div
          className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-sm"
          aria-live="polite"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("kieCredits")}
          </div>
          {kieCreditsLoading ? (
            <div className="mt-1 text-zinc-400">{tCommon("loading")}</div>
          ) : kieCreditsError ? (
            <div className="mt-1 text-red-400">{tCommon("unavailable")}</div>
          ) : kieCreditsOk ? (
            <div className="mt-1 text-2xl font-semibold tabular-nums text-amber-400">
              {kieCredits!.data}
            </div>
          ) : (
            <div className="mt-1 text-amber-200/90" title={kieCredits?.msg}>
              {kieCredits?.msg ?? tCommon("unknown")}
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6 text-sm text-zinc-300">
          {segments.length === 0 ? (
            <>
              <div className="space-y-2">
                <Label>{t("fullScript")}</Label>
                <textarea
                  className="min-h-[220px] w-full rounded-md border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-200"
                  value={fullScript}
                  onChange={(e) => setFullScript(e.target.value)}
                  placeholder={t("fullScriptPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("llmModel")}</Label>
                <Select value={model} onChange={(e) => setModel(e.target.value as LlmModel)}>
                  {LLM_MODEL_ENTRIES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`models.llm.${opt.labelKey}`)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button onClick={handleGenerateScript} disabled={segmenting || !fullScript.trim()}>
                {segmenting ? t("generating") : t("generateScript")}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t("segmentedOutput")}</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSegments([]);
                    }}
                  >
                    {t("back")}
                  </Button>
                </div>
                <div className="space-y-3">
                  {segments.map((segment, idx) => (
                    <div key={`segment-${idx}`} className="space-y-2 rounded-lg border border-zinc-800 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-zinc-500">{t("segmentN", { n: idx + 1 })}</div>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-red-300"
                          onClick={() => {
                            setSegments((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          aria-label={t("deleteSegmentAria", { n: idx + 1 })}
                        >
                          X
                        </button>
                      </div>
                      <Input
                        value={segment}
                        onChange={(e) => {
                          const next = [...segments];
                          next[idx] = e.target.value;
                          setSegments(next);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addSegmentAfter(idx)}
                      >
                        {t("addSegmentUnder")}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("llm")}</Label>
                  <Select value={model} onChange={(e) => setModel(e.target.value as LlmModel)}>
                    {LLM_MODEL_ENTRIES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(`models.llm.${opt.labelKey}`)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("contentType")}</Label>
                  <Select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as "all_image" | "all_video" | "mixed")}
                  >
                    <option value="all_image">{t("contentAllImage")}</option>
                    <option value="all_video">{t("contentAllVideo")}</option>
                    <option value="mixed">{t("contentMixed")}</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("imageAiModel")}</Label>
                  <Select
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value as ImageModel)}
                  >
                    {IMAGE_MODEL_ENTRIES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(`models.image.${opt.labelKey}`)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("videoAiModel")}</Label>
                  <Select
                    value={videoModel}
                    onChange={(e) => setVideoModel(e.target.value as VideoModel)}
                  >
                    {VIDEO_MODEL_ENTRIES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(`models.video.${opt.labelKey}`)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("videoProfile")}</Label>
                  <Select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                    <option value="">{t("selectProfile")}</option>
                    {profiles.map((p) => (
                      <option key={p.profileId} value={p.profileId}>
                        {p.name} ({p.profileId})
                      </option>
                    ))}
                  </Select>
                </div>

                {headlineSection}

                <div className="space-y-2">
                  <Label>{t("uploadOrGenerate")}</Label>
                  <Select
                    value={uploadMode}
                    onChange={(e) =>
                      setUploadMode(e.target.value as "none" | "direct" | "pending_approval")
                    }
                  >
                    <option value="none">{t("uploadNone")}</option>
                    <option value="direct">{t("uploadDirect")}</option>
                    <option value="pending_approval">{t("uploadPendingApproval")}</option>
                  </Select>
                </div>
              </div>

              {uploadMode !== "none" && (
                <div className="space-y-2">
                  <Label>{t("youtubeChannelLabel")}</Label>
                  <Select
                    value={youtubeConnectionId}
                    onChange={(e) => setYoutubeConnectionId(e.target.value)}
                  >
                    <option value="">{t("selectYoutubeChannel")}</option>
                    {youtubeConnections.map((conn) => (
                      <option key={conn.id} value={conn.id}>
                        {conn.label}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <Button onClick={handleGenerateVideo} disabled={!canSubmit || submitting}>
                {submitting ? t("submitting") : t("generateVideoCta")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
