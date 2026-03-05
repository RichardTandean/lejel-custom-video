"use client";

import { useCallback, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getVideoRequest } from "@/lib/api";
import type { VideoRequestStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useLocale } from "next-intl";

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
  const t = useTranslations("requests");
  const tCommon = useTranslations("common");
  const locale = useLocale();

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
      const interval = setInterval(refetchOnce, POLL_INTERVAL);
      return () => clearInterval(interval);
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
  const dateLocale = locale === "ko" ? "ko-KR" : locale === "id" ? "id-ID" : "en-US";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/requests" className="text-sm text-amber-500 hover:underline">
          {t("backToList")}
        </Link>
        {isProcessing && (
          <span className="text-sm text-amber-400">
            {t("polling", { seconds: POLL_INTERVAL / 1000 })}
          </span>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-2 gap-y-1 pb-2">
          <span className="text-sm text-zinc-500">{t("status")}:</span>
          <Badge variant={STATUS_BADGE_VARIANT[request.status]} className="text-sm py-1">
            {t(request.status)}
          </Badge>
          {request.createdBy && (
            <span className="text-sm text-zinc-500">
              {t("createdBy")}: {request.createdBy.name ?? request.createdBy.email}
            </span>
          )}
          {request.createdAt && (
            <span className="text-sm text-zinc-500">
              {new Date(request.createdAt).toLocaleString(dateLocale)}
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-400">
              {t("fullScript")}
            </h3>
            <pre className="whitespace-pre-wrap rounded bg-zinc-950 p-3 text-sm text-zinc-300">
              {request.fullScript || tCommon("empty")}
            </pre>
          </div>
          {request.segmentedScripts?.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-400">
                {t("segment")}
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
                {t("linkVideo")}
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
                {t("youtubeShorts")}
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
              <h3 className="mb-2 text-sm font-medium text-red-400">{t("error")}</h3>
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
