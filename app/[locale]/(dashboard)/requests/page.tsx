"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listVideoRequests } from "@/lib/api";
import Link from "next/link";
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

const STATUS_OPTIONS: Array<{ value: "all" | VideoRequestStatus; label: string }> = [
  { value: "all", label: "All status" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "pending_youtube_approval", label: "Pending youtube approval" },
  { value: "draft", label: "Draft" },
];

function statusBadgeVariant(status: string): "pending" | "processing" | "completed" | "failed" | "secondary" {
  if (status === "pending") return "pending";
  if (status === "processing") return "processing";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
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
  const [status, setStatus] = useState<"all" | VideoRequestStatus>("all");

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Requests</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track video generation jobs, status progression, and final outputs.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6 text-sm text-zinc-300">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-56">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as "all" | VideoRequestStatus)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Refreshing..." : "Refresh"}
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
              No requests found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Script</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Result</TableHead>
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
                            img: {req.imageModel || "-"} / vid: {req.videoModel || "-"}
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
                              Open
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
                              Debug
                            </a>
                          )}
                          <Link
                            href={`/requests/${req.id}`}
                            className="text-sky-400 hover:underline"
                          >
                            Detail
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="text-xs text-zinc-500">
            Auto refresh every 5 seconds for pending/processing jobs.
          </div>
          </CardContent>
      </Card>
    </div>
  );
}
