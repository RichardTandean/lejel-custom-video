"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getVideoRequests } from "@/lib/api";
import type { VideoRequestStatus } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
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

function truncate(s: string, len: number) {
  if (s.length <= len) return s;
  return s.slice(0, len) + "…";
}

export default function RequestsListPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["video-requests", statusFilter],
    queryFn: () =>
      getVideoRequests(statusFilter ? { status: statusFilter } : undefined),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-100">Daftar Request</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-400">Status:</label>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-[140px]"
          >
            <option value="">Semua</option>
            {(Object.keys(STATUS_LABELS) as VideoRequestStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-zinc-500">
              Belum ada request.{" "}
              <Link href="/new">
                <Button variant="link" className="p-0 h-auto text-amber-500">
                  Buat video
                </Button>
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Script</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat oleh</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/requests/${r.id}`}
                      className="block max-w-md font-medium text-amber-400 hover:underline"
                    >
                      {truncate(r.fullScript || "(kosong)", 60)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[r.status]}>
                      {STATUS_LABELS[r.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {r.createdBy?.name ?? r.createdBy?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
