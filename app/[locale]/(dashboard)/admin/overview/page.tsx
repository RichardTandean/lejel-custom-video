"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getPendingYoutubeApprovals,
  listRecentActiveUsers,
  listVideoRequests,
  listYouTubeConnections,
} from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
function formatDate(input: string | null | undefined, locale: string) {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  const loc = locale === "ko" ? "ko-KR" : locale === "id" ? "id-ID" : "en-US";
  return date.toLocaleString(loc);
}

function statusBadgeVariant(
  status: string
): "pending" | "processing" | "completed" | "failed" | "secondary" {
  if (status === "pending") return "pending";
  if (status === "processing") return "processing";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  return "secondary";
}

export default function AdminOverviewPage() {
  const t = useTranslations("admin.overview");
  const locale = useLocale();
  const { user, isAdmin } = useAuth();

  const recentUsers = useQuery({
    queryKey: ["admin-recent-users", 5],
    queryFn: () => listRecentActiveUsers(5),
    enabled: isAdmin ?? false,
  });

  const pendingYoutube = useQuery({
    queryKey: ["pending-youtube-approvals"],
    queryFn: getPendingYoutubeApprovals,
    enabled: isAdmin ?? false,
  });

  const allRequests = useQuery({
    queryKey: ["video-requests", "all"],
    queryFn: () => listVideoRequests(undefined),
    enabled: isAdmin ?? false,
  });

  const connections = useQuery({
    queryKey: ["youtube-connections"],
    queryFn: listYouTubeConnections,
    enabled: isAdmin ?? false,
  });

  const recentRequests = (allRequests.data ?? []).slice(0, 10);

  if (user && !isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>
        <Card>
          <CardContent className="py-8 text-center text-zinc-500">
            {t("accessDenied")}
          </CardContent>
        </Card>
        <Link href="/new" className={cn(buttonVariants({ variant: "outline" }))}>
          {t("backHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t("description")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h2 className="text-sm font-medium text-zinc-200">{t("recentActivityTitle")}</h2>
            <Link
              href="/admin/users"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 text-amber-500")}
            >
              {t("manageUsers")}
            </Link>
          </CardHeader>
          <CardContent>
            {recentUsers.isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (recentUsers.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-zinc-500">{t("emptyUsers")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">{t("name")}</TableHead>
                    <TableHead className="text-zinc-400">{t("lastActivity")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsers.data!.map((u) => (
                    <TableRow key={u.id} className="border-zinc-800">
                      <TableCell className="text-zinc-200">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-zinc-500">{u.email}</div>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {formatDate(u.lastActivityAt, locale)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h2 className="text-sm font-medium text-zinc-200">{t("pendingYoutubeTitle")}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingYoutube.isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <>
                <p className="text-3xl font-semibold text-zinc-100">
                  {pendingYoutube.data?.length ?? 0}
                </p>
                <p className="text-sm text-zinc-500">{t("pendingYoutubeHint")}</p>
                {(pendingYoutube.data?.length ?? 0) > 0 ? (
                  <Link
                    href="/admin/pending-upload"
                    className={cn(buttonVariants(), "w-full sm:w-auto inline-flex")}
                  >
                    {t("reviewApprovals")}
                  </Link>
                ) : (
                  <p className="text-sm text-zinc-600">{t("noPendingYoutube")}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-2">
          <h2 className="text-sm font-medium text-zinc-200">{t("recentRequestsTitle")}</h2>
          <Link
            href="/requests"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-zinc-700"
            )}
          >
            {t("seeAllRequests")}
          </Link>
        </CardHeader>
        <CardContent>
          {allRequests.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : recentRequests.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("emptyRequests")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">{t("status")}</TableHead>
                  <TableHead className="text-zinc-400">{t("created")}</TableHead>
                  <TableHead className="text-zinc-400">{t("creator")}</TableHead>
                  <TableHead className="w-[100px] text-zinc-400" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRequests.map((r) => {
                  const creator = r.createdBy ?? r.user;
                  return (
                    <TableRow key={r.id} className="border-zinc-800">
                      <TableCell>
                        <Badge variant={statusBadgeVariant(r.status)}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {formatDate(r.createdAt, locale)}
                      </TableCell>
                      <TableCell className="text-zinc-300 text-sm">
                        {creator?.name ?? creator?.email ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/requests/${r.id}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "text-amber-500"
                          )}
                        >
                          {t("view")}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h2 className="text-sm font-medium text-zinc-200">{t("channelsTitle")}</h2>
          <Link
            href="/admin/channels"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 text-amber-500"
            )}
          >
            {t("manageChannels")}
          </Link>
        </CardHeader>
        <CardContent>
          {connections.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (connections.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-zinc-500">{t("emptyChannels")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">{t("channelLabel")}</TableHead>
                  <TableHead className="text-zinc-400">{t("connected")}</TableHead>
                  <TableHead className="text-zinc-400">{t("expires")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.data!.map((c) => (
                  <TableRow key={c.id} className="border-zinc-800">
                    <TableCell className="text-zinc-200">{c.label}</TableCell>
                    <TableCell>
                      <Badge variant={c.connected ? "completed" : "secondary"}>
                        {c.connected ? t("yes") : t("no")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {formatDate(c.expiresAt ?? null, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
