"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/context/auth-context";
import { GoogleYoutubeWorkspacePanel } from "@/components/admin/google-youtube-workspace-panel";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AdminChannelsPage() {
  const t = useTranslations("admin.channels");
  const { user, isAdmin } = useAuth();

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("description")}</p>
        </div>
        <Link
          href="/admin/overview"
          className={cn(buttonVariants({ variant: "outline" }), "border-zinc-700 shrink-0")}
        >
          {t("backOverview")}
        </Link>
      </div>

      <GoogleYoutubeWorkspacePanel />
    </div>
  );
}
