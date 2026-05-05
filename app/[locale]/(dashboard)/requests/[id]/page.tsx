"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getVideoRequestDetail, stopVideoRequest, retryVideoRequestWithChanges } from "@/lib/api";
import type { VideoRequestDetail } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function formatDate(input?: string | null) {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function shortText(input: string, max = 160) {
  if (!input) return "-";
  return input.length > max ? `${input.slice(0, max)}...` : input;
}

function segmentDurationSeconds(timing: VideoRequestDetail["segments"][number]["timing"]): number | null {
  if (!timing) return null;
  if (typeof timing.duration === "number" && Number.isFinite(timing.duration) && timing.duration >= 0) {
    return timing.duration;
  }
  const span = timing.end - timing.start;
  return Number.isFinite(span) && span >= 0 ? span : null;
}

const LLM_MODEL_ENTRIES = [
  { value: "gpt-5-4", label: "GPT-5-4" },
  { value: "gpt-5-2", label: "GPT-5-2" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "gemini-3-flash", label: "Gemini 3 Flash" },
  { value: "gemini-3-pro", label: "Gemini 3 Pro" },
  { value: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

const CONTENT_TYPE_ENTRIES = [
  { value: "mixed", label: "Mixed" },
  { value: "all_image", label: "All Image" },
  { value: "all_video", label: "All Video" },
  { value: "motion_graphic", label: "Motion Graphic" },
];

const IMAGE_MODEL_ENTRIES = [
  { value: "z-image", label: "Z-Image" },
  { value: "nano-banana-pro", label: "Nano Banana Pro" },
  { value: "google/nano-banana", label: "Google Nano Banana" },
  { value: "flux-2/pro-text-to-image", label: "Flux 2 Pro" },
  { value: "flux-2/flex-text-to-image", label: "Flux 2 Flex" },
  { value: "grok-imagine/text-to-image", label: "Grok Imagine" },
  { value: "gpt-image/1.5-text-to-image", label: "GPT Image 1.5" },
];

const VIDEO_MODEL_ENTRIES = [
  { value: "kling-v1.6", label: "Kling v1.6" },
  { value: "kling-v2.1-master", label: "Kling v2.1 Master" },
  { value: "kling-v2.1", label: "Kling v2.1" },
  { value: "bytedance/v1-lite-text-to-video", label: "Bytedance Lite" },
  { value: "wan/2-6-text-to-video", label: "WAN 2.6" },
  { value: "grok-imagine/image-to-video", label: "Grok Imagine I2V" },
];

export default function RequestDetailPage() {
  const t = useTranslations("requestDetail");
  const tCommon = useTranslations("common");
  const params = useParams<{ id: string }>();
  const requestId = params?.id || "";

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["video-request-detail", requestId],
    queryFn: () => getVideoRequestDetail(requestId),
    enabled: !!requestId,
    refetchInterval: 5000,
  });
  const { mutate: stopRequest, isPending: isStopping } = useMutation({
    mutationFn: () => stopVideoRequest(requestId),
    onSuccess: () => refetch(),
  });

  const [retryOpen, setRetryOpen] = useState(false);
  const [retryLlmModel, setRetryLlmModel] = useState("");
  const [retryContentType, setRetryContentType] = useState("");
  const [retryImageModel, setRetryImageModel] = useState("");
  const [retryVideoModel, setRetryVideoModel] = useState("");

  const { mutate: retryWithChanges, isPending: isRetrying } = useMutation({
    mutationFn: () =>
      retryVideoRequestWithChanges(requestId, {
        llmModel: retryLlmModel || undefined,
        contentType: retryContentType || undefined,
        imageModel: retryImageModel || undefined,
        videoModel: retryVideoModel || undefined,
      }),
    onSuccess: () => {
      setRetryOpen(false);
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/requests" className="text-sm text-zinc-400 hover:underline">
          {t("backToRequests")}
        </Link>
        <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-6 text-zinc-400">
          {t("notFound")}
        </div>
      </div>
    );
  }

  const req = data.request;
  const resultHref = req.finalUrl || req.resultUrl || data.artifacts.finalUrls[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/requests" className="text-sm text-zinc-400 hover:underline">
            {t("backToRequests")}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-100">{t("title")}</h1>
          <p className="mt-1 text-xs text-zinc-500">{req.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              req.status === "failed"
                ? "failed"
                : req.status === "completed"
                  ? "completed"
                  : req.status === "cancelled"
                    ? "secondary"
                    : req.status === "pending"
                      ? "pending"
                      : "processing"
            }
          >
            {req.status}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={isStopping || !["pending", "processing"].includes(req.status)}
            onClick={() => {
              const ok = window.confirm(tCommon("confirmStopRequest"));
              if (!ok) return;
              stopRequest();
            }}
          >
            {isStopping ? t("stopping") : t("stop")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? t("refreshing") : t("refresh")}
          </Button>
          {req.status === "failed" && (
            <Button variant="default" size="sm" onClick={() => {
              setRetryLlmModel(req.llmModel || "");
              setRetryContentType(req.contentType || "");
              setRetryImageModel(req.imageModel || "");
              setRetryVideoModel(req.videoModel || "");
              setRetryOpen(true);
            }}>
              {t("retry")}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-zinc-100">{t("generationProgress")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, data.progress.percent))}%` }}
            />
          </div>
          <div className="text-zinc-300">
            {t("progressLine", {
              percent: data.progress.percent,
              done: data.progress.doneCount,
              total: data.progress.totalCount,
            })}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.progress.stages.map((stage) => (
              <div
                key={stage.key}
                className={`rounded-md border px-3 py-2 ${stage.done ? "border-emerald-700 bg-emerald-950/20 text-emerald-300" : "border-zinc-800 bg-zinc-900/40 text-zinc-400"}`}
              >
                {stage.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-zinc-100">{t("overview")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-300">
          <div>
            {t("created")}: {formatDate(req.createdAt)}
          </div>
          <div>
            {t("updated")}: {formatDate(req.updatedAt)}
          </div>
          <div>
            {t("llm")}: {req.llmModel || "-"}
          </div>
          <div>
            {t("contentProfile", {
              content: req.contentType || "-",
              profile: req.profileId || "-",
            })}
          </div>
          <div>
            {t("imageVideoModels", {
              image: req.imageModel || "-",
              video: req.videoModel || "-",
            })}
          </div>
          {req.errorMessage && (
            <div className="text-red-400">
              {t("errorPrefix")}: {req.errorMessage}
            </div>
          )}
          {resultHref && (
            <a href={resultHref} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
              {t("openFinalVideo")}
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-zinc-100">{t("artifacts")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <div className="mb-1 text-zinc-400">{t("audio")}</div>
            {data.artifacts.audioUrls.length ? (
              data.artifacts.audioUrls.map((u) => (
                <div key={u}>
                  <audio controls src={u} className="w-full" />
                </div>
              ))
            ) : (
              <div className="text-zinc-500">{t("noAudioYet")}</div>
            )}
          </div>
          <div>
            <div className="mb-1 text-zinc-400">{t("subtitleTranscriptMeta")}</div>
            <div className="flex flex-wrap gap-3">
              {[...data.artifacts.subtitleUrls, ...data.artifacts.transcriptUrls, ...data.artifacts.metaUrls].map((u) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="text-zinc-300 hover:underline">
                  {u.split("/").slice(-2).join("/")}
                </a>
              ))}
              {data.artifacts.subtitleUrls.length + data.artifacts.transcriptUrls.length + data.artifacts.metaUrls.length === 0 && (
                <span className="text-zinc-500">{t("noFilesYet")}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-zinc-100">{t("segments")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.segments.map((seg) => (
            <div key={seg.index} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{t("segmentBadge", { n: seg.index + 1 })}</Badge>
                <span className="text-xs text-zinc-400">
                  {seg.mediaType || "-"}
                  {(() => {
                    const dur = segmentDurationSeconds(seg.timing);
                    if (!seg.timing || dur === null) {
                      return t("timingPending");
                    }
                    return t("timingRange", {
                      start: seg.timing.start.toFixed(2),
                      end: seg.timing.end.toFixed(2),
                      duration: dur.toFixed(2),
                    });
                  })()}
                </span>
              </div>
              <div className="text-sm text-zinc-200">{shortText(seg.text)}</div>
              {seg.prompt && (
                <div className="mt-1 text-xs text-zinc-500">
                  {t("promptLabel")}: {shortText(seg.prompt, 220)}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-3">
                {seg.imageUrls.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u}
                      alt={t("segmentBadge", { n: seg.index + 1 })}
                      className="h-24 rounded border border-zinc-700 object-cover"
                    />
                  </a>
                ))}
                {(() => {
                  const merged = seg.mergedVideoUrls?.length ? seg.mergedVideoUrls : [];
                  const chunks = seg.generatedChunkVideoUrls?.length ? seg.generatedChunkVideoUrls : [];
                  const videoSrc =
                    seg.finalSegmentUrl ||
                    (merged.length ? merged[merged.length - 1] : undefined) ||
                    (chunks.length ? chunks[0] : undefined);

                  if (!videoSrc) return null;
                  return (
                    <div className="flex flex-col gap-2">
                      <a
                        href={videoSrc}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-zinc-400 hover:underline"
                      >
                        {t("openSegmentVideo")}
                      </a>
                      <video
                        controls
                        src={videoSrc}
                        className="h-24 rounded border border-zinc-700"
                      />
                    </div>
                  );
                })()}
                {!seg.imageUrls.length && !seg.finalSegmentUrl && (
                  <span className="text-xs text-zinc-500">{t("noGeneratedMedia")}</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={retryOpen} onOpenChange={setRetryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("retryWithChanges")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("llmModel")}</Label>
              <Select
                value={retryLlmModel}
                onChange={(e) => setRetryLlmModel(e.target.value)}
              >
                <option value="">{t("keepCurrent")}</option>
                {LLM_MODEL_ENTRIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("contentType")}</Label>
              <Select
                value={retryContentType}
                onChange={(e) => setRetryContentType(e.target.value)}
              >
                <option value="">{t("keepCurrent")}</option>
                {CONTENT_TYPE_ENTRIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            {retryContentType !== "motion_graphic" && (
              <>
                <div className="space-y-2">
                  <Label>{t("imageModel")}</Label>
                  <Select
                    value={retryImageModel}
                    onChange={(e) => setRetryImageModel(e.target.value)}
                  >
                    <option value="">{t("keepCurrent")}</option>
                    {IMAGE_MODEL_ENTRIES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("videoModel")}</Label>
                  <Select
                    value={retryVideoModel}
                    onChange={(e) => setRetryVideoModel(e.target.value)}
                  >
                    <option value="">{t("keepCurrent")}</option>
                    {VIDEO_MODEL_ENTRIES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRetryOpen(false)} disabled={isRetrying}>
                {tCommon("cancel")}
              </Button>
              <Button size="sm" onClick={() => retryWithChanges()} disabled={isRetrying}>
                {isRetrying ? t("retrying") : t("retry")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
