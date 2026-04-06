"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { deleteVideoRequest, listVideoRequests, stopVideoRequest } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import type { VideoRequestStatus } from "@/types";

function statusBadgeVariant(status: string): "pending" | "processing" | "completed" | "failed" | "secondary" {
  if (status === "pending") return "pending";
  if (status === "processing") return "processing";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "cancelled") return "secondary";
  return "secondary";
}

function shortText(input: string, max = 90) {
  if (!input) return "-";
  if (input.length <= max) return input;
  return `${input.slice(0, max)}...`;
}

function formatDate(input?: string | null) {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function RequestsPage() {
  const t = useTranslations("requests");
  const tCommon = useTranslations("common");
  const [status, setStatus] = useState<"all" | VideoRequestStatus>("all");

  const statusOptions: Array<{ value: "all" | VideoRequestStatus; label: string }> = [
    { value: "all", label: t("filterAll") },
    { value: "pending", label: t("statusPending") },
    { value: "processing", label: t("statusProcessing") },
    { value: "completed", label: t("statusCompleted") },
    { value: "failed", label: t("statusFailed") },
    { value: "cancelled", label: t("statusCancelled") },
    { value: "pending_youtube_approval", label: t("statusPendingYoutubeApproval") },
    { value: "draft", label: t("statusDraft") },
  ];

  const { data: requests = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["video-requests", status],
    queryFn: () => listVideoRequests(status === "all" ? undefined : status),
    refetchInterval: 5000,
  });

  const stats = useMemo(() => {
    const out: Record<string, number> = {};
    for (const req of requests) {
      out[req.status] = (out[req.status] || 0) + 1;
    }
    return out;
  }, [requests]);

  const { mutate: deleteRequest, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteVideoRequest(id),
    onSuccess: () => refetch(),
  });

  const { mutate: stopRequest, isPending: isStopping } = useMutation({
    mutationFn: (id: string) => stopVideoRequest(id),
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t("description")}</p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6 text-sm text-zinc-300">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-56">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as "all" | VideoRequestStatus)}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? tCommon("refreshing") : tCommon("refresh")}
            </Button>
          </div>

          {requests.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(stats).map(([k, v]) => (
                <Badge key={k} variant={statusBadgeVariant(k)}>
                  {k}: {v}
                </Badge>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-6 text-center text-zinc-500">
              {t("noRequests")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead>{t("colScript")}</TableHead>
                  <TableHead>{t("colModel")}</TableHead>
                  <TableHead>{t("colContent")}</TableHead>
                  <TableHead>{t("colProfile")}</TableHead>
                  <TableHead>{t("colCreated")}</TableHead>
                  <TableHead>{t("colUpdated")}</TableHead>
                  <TableHead>{t("colResult")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const resultHref = req.finalUrl || req.resultUrl;
                  return (
                    <TableRow key={req.id}>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(req.status)}>{req.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[340px]">
                        <div className="space-y-1">
                          <div className="font-medium text-zinc-100">{shortText(req.fullScript, 85)}</div>
                          <div className="text-xs text-zinc-500">{req.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>{req.llmModel || "-"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{req.contentType || "-"}</div>
                          <div className="text-xs text-zinc-500">
                            {t("contentModelsLine", {
                              image: req.imageModel || "-",
                              video: req.videoModel || "-",
                            })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{req.profileId || "-"}</TableCell>
                      <TableCell>{formatDate(req.createdAt)}</TableCell>
                      <TableCell>{formatDate(req.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {resultHref ? (
                            <a
                              href={resultHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-400 hover:underline"
                            >
                              {tCommon("open")}
                            </a>
                          ) : (
                            <span className="text-zinc-500">-</span>
                          )}
                          {req.debugMetaUrl && (
                            <a
                              href={req.debugMetaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-400 hover:underline"
                            >
                              {tCommon("debug")}
                            </a>
                          )}
                          <Link
                            href={`/requests/${req.id}`}
                            className="text-sky-400 hover:underline"
                          >
                            {tCommon("detail")}
                          </Link>
                          <button
                            type="button"
                            className="text-orange-400 hover:underline disabled:text-zinc-600"
                            disabled={isStopping || !["pending", "processing"].includes(req.status)}
                            onClick={() => {
                              const ok = window.confirm(tCommon("confirmStopRequest"));
                              if (!ok) return;
                              stopRequest(req.id);
                            }}
                          >
                            {tCommon("stop")}
                          </button>
                          <button
                            type="button"
                            className="text-red-400 hover:underline disabled:text-zinc-600"
                            disabled={isDeleting || isStopping}
                            onClick={() => {
                              const ok = window.confirm(tCommon("confirmDeleteRequest"));
                              if (!ok) return;
                              deleteRequest(req.id);
                            }}
                          >
                            {tCommon("delete")}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="text-xs text-zinc-500">{t("autoRefreshHint")}</div>
        </CardContent>
      </Card>
    </div>
  );
}
