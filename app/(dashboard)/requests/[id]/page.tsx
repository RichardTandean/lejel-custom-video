"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getVideoRequest } from "@/lib/api";
import type { VideoRequestStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const STATUS_LABELS: Record<VideoRequestStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  processing: "Processing",
  completed: "Selesai",
  failed: "Gagal",
};

const STATUS_BADGE_VARIANT: Record<
  VideoRequestStatus,
  "default" | "pending" | "processing" | "completed" | "failed"
> = {
  draft: "default",
  pending: "pending",
  processing: "processing",
  completed: "completed",
  failed: "failed",
};

const POLL_INTERVAL = 8000;

export default function RequestDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const {
    data: request,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["video-request", id],
    queryFn: () => getVideoRequest(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "pending" || status === "processing") return POLL_INTERVAL;
      return false;
    },
  });

  const refetchOnce = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (
      request?.status === "pending" ||
      request?.status === "processing"
    ) {
      const t = setInterval(refetchOnce, POLL_INTERVAL);
      return () => clearInterval(t);
    }
  }, [request?.status, refetchOnce]);

  if (isLoading || !request) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const isProcessing =
    request.status === "pending" || request.status === "processing";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/requests" className="text-sm text-amber-500 hover:underline">
          ← Daftar request
        </Link>
        {isProcessing && (
          <span className="text-sm text-amber-400">
            Memperbarui otomatis setiap {POLL_INTERVAL / 1000} detik
          </span>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-2 gap-y-1 pb-2">
          <span className="text-sm text-zinc-500">Status:</span>
          <Badge variant={STATUS_BADGE_VARIANT[request.status]} className="text-sm py-1">
            {STATUS_LABELS[request.status]}
          </Badge>
          {request.createdBy && (
            <span className="text-sm text-zinc-500">
              Dibuat oleh: {request.createdBy.name ?? request.createdBy.email}
            </span>
          )}
          {request.createdAt && (
            <span className="text-sm text-zinc-500">
              {new Date(request.createdAt).toLocaleString("id-ID")}
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-400">
              Full script
            </h3>
            <pre className="whitespace-pre-wrap rounded bg-zinc-950 p-3 text-sm text-zinc-300">
              {request.fullScript || "(kosong)"}
            </pre>
          </div>
          {request.segmentedScripts?.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-400">
                Segment
              </h3>
              <ul className="list-inside list-decimal space-y-1 text-sm text-zinc-300">
                {request.segmentedScripts.map((seg, i) => (
                  <li key={i}>{seg}</li>
                ))}
              </ul>
            </div>
          )}
          {request.resultUrl && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-400">
                Link video
              </h3>
              <a
                href={request.resultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-500 hover:underline"
              >
                {request.resultUrl}
              </a>
            </div>
          )}
          {request.youtubeVideoId && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-400">
                YouTube Shorts
              </h3>
              <a
                href={`https://youtube.com/shorts/${request.youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-500 hover:underline"
              >
                https://youtube.com/shorts/{request.youtubeVideoId}
              </a>
            </div>
          )}
          {request.status === "failed" && request.errorMessage && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-red-400">Error</h3>
              <p className="rounded bg-red-500/10 p-3 text-sm text-red-300">
                {request.errorMessage}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
