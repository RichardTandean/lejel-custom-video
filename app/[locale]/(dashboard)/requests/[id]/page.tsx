"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getVideoRequestDetail } from "@/lib/api";
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

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const requestId = params?.id || "";

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["video-request-detail", requestId],
    queryFn: () => getVideoRequestDetail(requestId),
    enabled: !!requestId,
    refetchInterval: 5000,
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
        <Link href=".." className="text-sm text-zinc-400 hover:underline">
          Back to requests
        </Link>
        <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-6 text-zinc-400">
          Request detail not found.
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
          <Link href=".." className="text-sm text-zinc-400 hover:underline">
            Back to requests
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-100">Request Detail</h1>
          <p className="mt-1 text-xs text-zinc-500">{req.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={req.status === "failed" ? "failed" : req.status === "completed" ? "completed" : "processing"}>
            {req.status}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-zinc-100">Generation Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, data.progress.percent))}%` }}
            />
          </div>
          <div className="text-zinc-300">
            {data.progress.percent}% ({data.progress.doneCount}/{data.progress.totalCount} stages)
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
          <CardTitle className="text-zinc-100">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-300">
          <div>Created: {formatDate(req.createdAt)}</div>
          <div>Updated: {formatDate(req.updatedAt)}</div>
          <div>LLM: {req.llmModel || "-"}</div>
          <div>Content: {req.contentType || "-"} / Profile: {req.profileId || "-"}</div>
          <div>Image model: {req.imageModel || "-"} / Video model: {req.videoModel || "-"}</div>
          {req.errorMessage && <div className="text-red-400">Error: {req.errorMessage}</div>}
          {resultHref && (
            <a href={resultHref} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
              Open final video
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-zinc-100">Artifacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <div className="mb-1 text-zinc-400">Audio</div>
            {data.artifacts.audioUrls.length ? (
              data.artifacts.audioUrls.map((u) => (
                <div key={u}>
                  <audio controls src={u} className="w-full" />
                </div>
              ))
            ) : (
              <div className="text-zinc-500">No audio yet.</div>
            )}
          </div>
          <div>
            <div className="mb-1 text-zinc-400">Subtitle / Transcript / Meta</div>
            <div className="flex flex-wrap gap-3">
              {[...data.artifacts.subtitleUrls, ...data.artifacts.transcriptUrls, ...data.artifacts.metaUrls].map((u) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="text-zinc-300 hover:underline">
                  {u.split("/").slice(-2).join("/")}
                </a>
              ))}
              {data.artifacts.subtitleUrls.length + data.artifacts.transcriptUrls.length + data.artifacts.metaUrls.length === 0 && (
                <span className="text-zinc-500">No files yet.</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-zinc-100">Segments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.segments.map((seg) => (
            <div key={seg.index} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Segment {seg.index + 1}</Badge>
                <span className="text-xs text-zinc-400">
                  {seg.mediaType || "-"} / {seg.timing ? `${seg.timing.start.toFixed(2)}s - ${seg.timing.end.toFixed(2)}s` : "timing pending"}
                </span>
              </div>
              <div className="text-sm text-zinc-200">{shortText(seg.text)}</div>
              {seg.prompt && <div className="mt-1 text-xs text-zinc-500">Prompt: {shortText(seg.prompt, 220)}</div>}

              <div className="mt-3 flex flex-wrap gap-3">
                {seg.imageUrls.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={`segment-${seg.index + 1}`} className="h-24 rounded border border-zinc-700 object-cover" />
                  </a>
                ))}
                {seg.finalSegmentUrl && (
                  <video controls src={seg.finalSegmentUrl} className="h-24 rounded border border-zinc-700" />
                )}
                {!seg.imageUrls.length && !seg.finalSegmentUrl && (
                  <span className="text-xs text-zinc-500">No generated media yet.</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
