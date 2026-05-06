"use client";

import { useTranslations } from "next-intl";
import { GoogleYoutubeWorkspacePanel } from "@/components/admin/google-youtube-workspace-panel";

export default function AdminYoutubePage() {
  const t = useTranslations("admin.channels");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">{t("youtubeTitle")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t("youtubeDescription")}</p>
      </div>
      <GoogleYoutubeWorkspacePanel />
    </div>
  );
}
