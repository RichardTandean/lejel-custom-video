"use client";

import { useRouter } from "@/i18n/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  getPendingYoutubeApprovals,
  approveYoutubeUpload,
  rejectYoutubeUpload,
} from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useLocale } from "next-intl";

function truncate(s: string, len: number) {
  if (s.length <= len) return s;
  return s.slice(0, len) + "…";
}

export default function AdminPendingUploadPage() {
  const t = useTranslations("admin.pendingUpload");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["pending-youtube-approvals"],
    queryFn: getPendingYoutubeApprovals,
    enabled: isAdmin ?? false,
  });

  const approveMutation = useMutation({
    mutationFn: approveYoutubeUpload,
    onSuccess: (_, id) => {
      toast.success(t("toastApproveSuccess"));
      queryClient.invalidateQueries({ queryKey: ["pending-youtube-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["video-requests"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectYoutubeUpload,
    onSuccess: () => {
      toast.success(t("toastRejectSuccess"));
      queryClient.invalidateQueries({ queryKey: ["pending-youtube-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["video-requests"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    },
  });

  if (user && !isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>
        <Card>
          <CardContent className="py-8 text-center text-zinc-500">
            {t("accessDenied")}
          </CardContent>
        </Card>
        <Button variant="outline" onClick={() => router.push("/requests")}>
          {t("backToRequests")}
        </Button>
      </div>
    );
  }

  const dateLocale = locale === "ko" ? "ko-KR" : locale === "id" ? "id-ID" : "en-US";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-zinc-500">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <li key={r.id}>
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium text-zinc-200">
                        {truncate(r.fullScript || tCommon("empty"), 80)}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {t("createdBy")}:{" "}
                        {r.createdBy?.name ?? r.createdBy?.email ?? "—"}
                      </p>
                      {r.completedAt && (
                        <p className="text-xs text-zinc-500">
                          {t("completedAt")}:{" "}
                          {new Date(r.completedAt).toLocaleString(dateLocale)}
                        </p>
                      )}
                      {r.resultUrl && (
                        <a
                          href={r.resultUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-amber-500 hover:underline"
                        >
                          {t("preview")}
                        </a>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(r.id)}
                        disabled={
                          approveMutation.isPending ||
                          rejectMutation.isPending
                        }
                      >
                        {t("approve")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        onClick={() => rejectMutation.mutate(r.id)}
                        disabled={
                          approveMutation.isPending ||
                          rejectMutation.isPending
                        }
                      >
                        {t("reject")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
