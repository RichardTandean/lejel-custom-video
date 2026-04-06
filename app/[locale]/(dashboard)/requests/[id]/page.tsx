"use client";

import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getVideoRequestDetail, stopVideoRequest } from "@/lib/api";
import type { VideoRequestDetail } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

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
    </div>
  );
}
