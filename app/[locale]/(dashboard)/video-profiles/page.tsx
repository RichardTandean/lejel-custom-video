"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/context/auth-context";
import { listProfiles, deleteProfile } from "@/lib/api";
import { resolveDimensions, type Ratio, type Resolution } from "@/lib/profile-dimensions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { LayoutPreviewDiagram } from "@/components/layout-preview-diagram";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
      {children}
    </span>
  );
}

export default function VideoProfilesPage() {
  const t = useTranslations("videoProfiles");
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["video-profiles"],
    queryFn: listProfiles,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-profiles"] });
      toast.success(t("toastProfileDeleted"));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toastProfileDeleteError"));
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          {t("title")}
        </h1>
        {isAdmin && (
          <Link href="/add-video-profile">
            <Button>{t("addProfile")}</Button>
          </Link>
        )}
      </div>

      {profiles.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="pt-6 text-sm text-zinc-400">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((p) => {
            const canvasDims = resolveDimensions(
              p.canvas.ratio as Ratio,
              p.canvas.resolution as Resolution,
            );
            const contentDims = resolveDimensions(
              p.content.ratio as Ratio,
              p.content.resolution as Resolution,
            );

            return (
              <Card
                key={p.profileId}
                className="border-zinc-800 bg-zinc-900/40"
              >
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-100">
                        {p.name}
                      </h3>
                      <p className="text-xs text-zinc-500">{p.profileId}</p>
                    </div>
                    {isAdmin && (
                      <Link
                        href={`/add-video-profile?profileId=${encodeURIComponent(p.profileId)}`}
                      >
                        <Button variant="ghost" size="sm" className="text-xs">
                          {t("editButton")}
                        </Button>
                      </Link>
                    )}
                  </div>

                  {p.description && (
                    <p className="text-sm text-zinc-400">{p.description}</p>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge>
                          {t("badgeCanvas", {
                            ratio: p.canvas.ratio,
                            resolution: p.canvas.resolution,
                            width: canvasDims.width,
                            height: canvasDims.height,
                          })}
                        </Badge>
                        <Badge>
                          {t("badgeContent", {
                            ratio: p.content.ratio,
                            resolution: p.content.resolution,
                            width: contentDims.width,
                            height: contentDims.height,
                          })}
                        </Badge>
                      </div>

                      {(p.generation?.contentType || p.generation?.llmModel || (p.youtube?.uploadMode && p.youtube.uploadMode !== "none")) && (
                        <div className="flex flex-wrap gap-2">
                          {p.generation?.contentType && (
                            <Badge>
                              {p.generation.contentType === "slideshow" ? "Slideshow" : "Motion Graphic"}
                            </Badge>
                          )}
                          {p.generation?.llmModel && (
                            <Badge>{p.generation.llmModel}</Badge>
                          )}
                          {p.youtube?.uploadMode && p.youtube.uploadMode !== "none" && (
                            <Badge>{p.youtube.uploadMode}</Badge>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                        <span>
                          {t("profileSubLabel")}{" "}
                          {p.subtitle.enabled ? t("profileStateOn") : t("profileStateOff")}
                          {p.subtitle.enabled && p.subtitle.socialMediaStyle && ` ${t("profileSocialStyle")}`}
                        </span>
                        <span>|</span>
                        <span>
                          {t("profileTopLabel")}{" "}
                          {p.headline.top.enabled ? t("profileStateOn") : t("profileStateOff")}
                        </span>
                        <span>|</span>
                        <span>
                          {t("profileBottomLabel")}{" "}
                          {p.headline.bottom.enabled ? t("profileStateOn") : t("profileStateOff")}
                        </span>
                      </div>
                    </div>

                    <LayoutPreviewDiagram
                      canvasRatio={p.canvas.ratio as Ratio}
                      canvasResolution={p.canvas.resolution as Resolution}
                      contentRatio={p.content.ratio as Ratio}
                      contentResolution={p.content.resolution as Resolution}
                      contentXOffset={p.content.xOffset ?? 0}
                      contentYOffset={p.content.yOffset ?? 0}
                      subtitle={p.subtitle}
                      headlineTop={p.headline.top}
                      headlineBottom={p.headline.bottom}
                      compact
                    />
                  </div>

                  {isAdmin && (
                    <div className="flex justify-end pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-red-400 hover:text-red-300"
                        onClick={() => {
                          if (confirm(t("deleteProfileConfirm", { profileId: p.profileId }))) {
                            deleteMutation.mutate(p.profileId);
                          }
                        }}
                      >
                        {t("deleteButton")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
