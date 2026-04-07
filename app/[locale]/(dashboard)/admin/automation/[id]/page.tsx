"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import {
  getAutomationChannel,
  listAdminUsers,
  listAutomationRuns,
  listProfiles,
  listYouTubeConnections,
  regenerateAutomationWebhookSecret,
  updateAutomationChannel,
} from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type {
  AutomationChannel,
  AutomationRun,
  AutomationRunStatus,
  VideoProfile,
} from "@/types";

type LlmModel =
  | "gpt-5-4"
  | "gpt-5-2"
  | "claude-sonnet-4-6"
  | "gemini-3-flash"
  | "gemini-3-pro"
  | "gemini-3.1-pro"
  | "gemini-2.5-flash";

type ImageModel =
  | "z-image"
  | "nano-banana-pro"
  | "google/nano-banana"
  | "flux-2/pro-text-to-image"
  | "flux-2/flex-text-to-image"
  | "grok-imagine/text-to-image"
  | "gpt-image/1.5-text-to-image";

type VideoModel =
  | "kling-v1.6"
  | "kling-v2.1-master"
  | "kling-v2.1"
  | "bytedance/v1-lite-text-to-video"
  | "wan/2-6-text-to-video"
  | "grok-imagine/image-to-video";

function formatDate(input: string | null | undefined, locale: string) {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  const loc = locale === "ko" ? "ko-KR" : locale === "id" ? "id-ID" : "en-US";
  return date.toLocaleString(loc);
}

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(label);
  } catch {
    toast.error("Copy failed");
  }
}

const TERMINAL: AutomationRunStatus[] = ["completed", "failed"];

export default function AdminAutomationDetailPage() {
  const t = useTranslations("admin.automation");
  const locale = useLocale();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [secretReveal, setSecretReveal] = useState<string | null>(null);

  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["automation-channel", id],
    queryFn: () => getAutomationChannel(id),
    enabled: !!id && (isAdmin ?? false),
  });

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ["automation-runs", id],
    queryFn: () => listAutomationRuns(id, 1, 50),
    enabled: !!id && (isAdmin ?? false),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const active = items.some((r) => !TERMINAL.includes(r.status));
      return active ? 4000 : false;
    },
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["youtube-connections"],
    queryFn: listYouTubeConnections,
    enabled: isAdmin ?? false,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["video-profiles"],
    queryFn: listProfiles,
    enabled: isAdmin ?? false,
  });

  const { data: adminUsers = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: listAdminUsers,
    enabled: isAdmin ?? false,
  });

  const [form, setForm] = useState({
    name: "",
    connectionId: "",
    ownerUserId: "",
    profileId: "",
    contentType: "" as "" | "all_image" | "all_video" | "mixed",
    imageModel: "z-image" as ImageModel,
    videoModel: "kling-v2.1" as VideoModel,
    llmModel: "gpt-5-4" as LlmModel,
    scriptSegmentationPrompt: "",
    articleToScriptEnabled: false,
    articleToScriptPrompt: "",
    youtubePrivacyStatus: "private" as "public" | "private" | "unlisted",
    youtubeMetadataMode: "static" as "static" | "llm",
    youtubeTitlePrompt: "",
    youtubeDescriptionPrompt: "",
    youtubeTagsPrompt: "",
    youtubeMetadataPrompt: "",
    automationTopHeadlineEnabled: false,
    automationTopHeadlinePrompt: "",
    automationBottomHeadlineEnabled: false,
    automationBottomHeadlinePrompt: "",
    youtubeDescriptionCta: "",
    youtubeTagPrefixes: "",
    youtubeTags: "",
    youtubeDescriptionTemplate: "",
    enabled: true,
  });

  useEffect(() => {
    if (!channel) return;
    setForm({
      name: channel.name,
      connectionId: channel.connectionId,
      ownerUserId: channel.ownerUserId,
      profileId: channel.profileId ?? "",
      contentType: channel.contentType ?? "",
      imageModel: (channel.imageModel as ImageModel) || "z-image",
      videoModel: (channel.videoModel as VideoModel) || "kling-v2.1",
      llmModel: (channel.llmModel as LlmModel) || "gpt-5-4",
      scriptSegmentationPrompt: channel.scriptSegmentationPrompt ?? "",
      articleToScriptEnabled: channel.articleToScriptEnabled === true,
      articleToScriptPrompt: channel.articleToScriptPrompt ?? "",
      youtubePrivacyStatus: channel.youtubePrivacyStatus,
      youtubeMetadataMode: channel.youtubeMetadataMode === "llm" ? "llm" : "static",
      youtubeTitlePrompt: channel.youtubeTitlePrompt ?? "",
      youtubeDescriptionPrompt: channel.youtubeDescriptionPrompt ?? "",
      youtubeTagsPrompt: channel.youtubeTagsPrompt ?? "",
      youtubeMetadataPrompt: channel.youtubeMetadataPrompt ?? "",
      automationTopHeadlineEnabled: channel.automationTopHeadlineEnabled === true,
      automationTopHeadlinePrompt: channel.automationTopHeadlinePrompt ?? "",
      automationBottomHeadlineEnabled: channel.automationBottomHeadlineEnabled === true,
      automationBottomHeadlinePrompt: channel.automationBottomHeadlinePrompt ?? "",
      youtubeDescriptionCta: channel.youtubeDescriptionCta ?? "",
      youtubeTagPrefixes: (channel.youtubeTagPrefixes ?? []).join(", "),
      youtubeTags: (channel.youtubeTags ?? []).join(", "),
      youtubeDescriptionTemplate: channel.youtubeDescriptionTemplate ?? "",
      enabled: channel.enabled,
    });
  }, [channel]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const tags = form.youtubeTags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const prefixes = form.youtubeTagPrefixes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return updateAutomationChannel(id, {
        name: form.name.trim(),
        connectionId: form.connectionId,
        ownerUserId: form.ownerUserId,
        profileId: form.profileId || null,
        contentType: form.contentType || null,
        imageModel: form.imageModel,
        videoModel: form.videoModel,
        llmModel: form.llmModel,
        scriptSegmentationPrompt: form.scriptSegmentationPrompt.trim() || null,
        articleToScriptEnabled: form.articleToScriptEnabled,
        articleToScriptPrompt: form.articleToScriptPrompt.trim() || null,
        youtubePrivacyStatus: form.youtubePrivacyStatus,
        youtubeMetadataMode: form.youtubeMetadataMode,
        youtubeTitlePrompt: form.youtubeTitlePrompt.trim() || null,
        youtubeDescriptionPrompt: form.youtubeDescriptionPrompt.trim() || null,
        youtubeTagsPrompt: form.youtubeTagsPrompt.trim() || null,
        youtubeMetadataPrompt: form.youtubeMetadataPrompt.trim() || null,
        automationTopHeadlineEnabled: form.automationTopHeadlineEnabled,
        automationTopHeadlinePrompt: form.automationTopHeadlinePrompt.trim() || null,
        automationBottomHeadlineEnabled: form.automationBottomHeadlineEnabled,
        automationBottomHeadlinePrompt: form.automationBottomHeadlinePrompt.trim() || null,
        youtubeDescriptionCta: form.youtubeDescriptionCta.trim() || null,
        youtubeTagPrefixes: prefixes.length ? prefixes : null,
        youtubeTags: tags.length ? tags : null,
        youtubeDescriptionTemplate: form.youtubeDescriptionTemplate.trim() || null,
        enabled: form.enabled,
      });
    },
    onSuccess: () => {
      toast.success(t("toastSaved"));
      queryClient.invalidateQueries({ queryKey: ["automation-channel", id] });
      queryClient.invalidateQueries({ queryKey: ["automation-channels"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    },
  });

  const selectedProfile = useMemo((): VideoProfile | undefined => {
    if (!form.profileId) return undefined;
    return profiles.find((p) => p.profileId === form.profileId);
  }, [profiles, form.profileId]);

  const showTopHeadlinePrompts = selectedProfile?.headline.top.enabled === true;
  const showBottomHeadlinePrompts = selectedProfile?.headline.bottom.enabled === true;

  const enableMutation = useMutation({
    mutationFn: () => updateAutomationChannel(id, { enabled: true }),
    onSuccess: () => {
      toast.success(t("toastEnabled"));
      queryClient.invalidateQueries({ queryKey: ["automation-channel", id] });
      queryClient.invalidateQueries({ queryKey: ["automation-channels"] });
      setForm((f) => ({ ...f, enabled: true }));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    },
  });

  const regenMutation = useMutation({
    mutationFn: () => regenerateAutomationWebhookSecret(id),
    onSuccess: (res) => {
      setSecretReveal(res.webhookSecret);
      queryClient.invalidateQueries({ queryKey: ["automation-channel", id] });
      queryClient.invalidateQueries({ queryKey: ["automation-channels"] });
      toast.success(t("toastRegenerated"));
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
        <Link href="/new" className={cn(buttonVariants({ variant: "outline" }))}>
          {t("backHome")}
        </Link>
      </div>
    );
  }

  if (!id || channelLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-amber-500" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="space-y-4">
        <p className="text-zinc-500">{t("notFound")}</p>
        <Link href="/admin/automation" className={cn(buttonVariants({ variant: "outline" }))}>
          {t("backList")}
        </Link>
      </div>
    );
  }

  const runs = runsData?.items ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">{channel.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("detailSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/automation"
            className={cn(buttonVariants({ variant: "outline" }), "border-zinc-700")}
          >
            {t("backList")}
          </Link>
          <Button
            variant="outline"
            className="border-zinc-700"
            disabled={regenMutation.isPending}
            onClick={() => regenMutation.mutate()}
          >
            {t("regenerateSecret")}
          </Button>
        </div>
      </div>

      {!channel.enabled && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-100/95">{t("disabledBanner")}</p>
          <Button
            size="sm"
            className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-500"
            disabled={enableMutation.isPending}
            onClick={() => enableMutation.mutate()}
          >
            {t("enable")}
          </Button>
        </div>
      )}

      <Dialog open={!!secretReveal} onOpenChange={(o) => !o && setSecretReveal(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("secretTitle")}</DialogTitle>
          </DialogHeader>
          {secretReveal && (
            <div className="space-y-4 text-sm text-zinc-300">
              <p className="text-zinc-500">{t("secretBody")}</p>
              <div className="space-y-1">
                <Label className="text-zinc-400">{t("webhookSecret")}</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={secretReveal}
                    className="border-zinc-700 bg-zinc-900 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 border-zinc-700"
                    onClick={() => copyText(t("copiedSecret"), secretReveal)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="border-zinc-800 bg-zinc-950/40">
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label className="text-zinc-400">{t("webhookUrl")}</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={channel.webhookUrl}
                className="border-zinc-700 bg-zinc-900 font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 border-zinc-700"
                onClick={() => copyText(t("copiedUrl"), channel.webhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {channel.webhookSecretPrefix && (
              <p className="text-xs text-zinc-500">
                {t("secretPrefixHint", { prefix: channel.webhookSecretPrefix })}
              </p>
            )}
            <p className="text-xs text-zinc-500">{t("secretHeaderHint")}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-name">{t("fieldName")}</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="border-zinc-700 bg-zinc-900"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("fieldConnection")}</Label>
              <Select
                value={form.connectionId}
                onChange={(e) => setForm((f) => ({ ...f, connectionId: e.target.value }))}
                className="border-zinc-700 bg-zinc-900"
              >
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || c.id.slice(0, 8)}
                    {!c.connected ? ` (${t("notConnected")})` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("fieldOwner")}</Label>
              <Select
                value={form.ownerUserId}
                onChange={(e) => setForm((f) => ({ ...f, ownerUserId: e.target.value }))}
                className="border-zinc-700 bg-zinc-900"
              >
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("fieldProfile")}</Label>
              <Select
                value={form.profileId}
                onChange={(e) => setForm((f) => ({ ...f, profileId: e.target.value }))}
                className="border-zinc-700 bg-zinc-900"
              >
                <option value="">{t("selectProfile")}</option>
                {profiles.map((p) => (
                  <option key={p.profileId} value={p.profileId}>
                    {p.name} ({p.canvas.ratio})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("fieldContentType")}</Label>
              <Select
                value={form.contentType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    contentType: e.target.value as typeof form.contentType,
                  }))
                }
                className="border-zinc-700 bg-zinc-900"
              >
                <option value="">{t("optionDefault")}</option>
                <option value="all_image">{t("contentAllImage")}</option>
                <option value="all_video">{t("contentAllVideo")}</option>
                <option value="mixed">{t("contentMixed")}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("fieldPrivacy")}</Label>
              <Select
                value={form.youtubePrivacyStatus}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    youtubePrivacyStatus: e.target.value as typeof form.youtubePrivacyStatus,
                  }))
                }
                className="border-zinc-700 bg-zinc-900"
              >
                <option value="private">{t("privacyPrivate")}</option>
                <option value="unlisted">{t("privacyUnlisted")}</option>
                <option value="public">{t("privacyPublic")}</option>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("fieldEnabled")}</Label>
              <Select
                value={form.enabled ? "yes" : "no"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, enabled: e.target.value === "yes" }))
                }
                className="border-zinc-700 bg-zinc-900"
              >
                <option value="yes">{t("enabled")}</option>
                <option value="no">{t("disabled")}</option>
              </Select>
              <p className="text-xs text-zinc-500">{t("fieldEnabledHint")}</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("fieldLlm")}</Label>
              <Select
                value={form.llmModel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, llmModel: e.target.value as LlmModel }))
                }
                className="border-zinc-700 bg-zinc-900"
              >
                <option value="gpt-5-4">GPT-5.4</option>
                <option value="gpt-5-2">GPT-5.2</option>
                <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                <option value="gemini-3-flash">Gemini 3 Flash</option>
                <option value="gemini-3-pro">Gemini 3 Pro</option>
                <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              </Select>
            </div>
            <div className="space-y-3 border-t border-zinc-800 pt-4 sm:col-span-2">
              <h3 className="text-sm font-medium text-zinc-200">{t("stepTitle1")}</h3>
              <p className="text-xs text-zinc-500">{t("stepDesc1")}</p>
              <div className="space-y-2">
                <Label>{t("fieldArticleToScript")}</Label>
                <Select
                  value={form.articleToScriptEnabled ? "yes" : "no"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      articleToScriptEnabled: e.target.value === "yes",
                    }))
                  }
                  className="border-zinc-700 bg-zinc-900"
                >
                  <option value="no">{t("disabled")}</option>
                  <option value="yes">{t("enabled")}</option>
                </Select>
                <p className="text-xs text-zinc-500">{t("articleToScriptHint")}</p>
                {form.articleToScriptEnabled ? (
                  <div className="space-y-2 pt-1">
                    <Label htmlFor="edit-article-prompt">
                      {t("fieldArticleToScriptPrompt")}
                    </Label>
                    <Textarea
                      id="edit-article-prompt"
                      value={form.articleToScriptPrompt}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, articleToScriptPrompt: e.target.value }))
                      }
                      className="min-h-[80px] resize-y border-zinc-700 bg-zinc-900 text-sm"
                      placeholder={t("articleToScriptPromptPlaceholder")}
                    />
                    <p className="text-xs text-zinc-500">{t("articleToScriptPromptHint")}</p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-3 border-t border-zinc-800 pt-4 sm:col-span-2">
              <h3 className="text-sm font-medium text-zinc-200">{t("stepTitle2")}</h3>
              <p className="text-xs text-zinc-500">{t("stepDesc2")}</p>
              <div className="space-y-2">
                <Label htmlFor="edit-seg-prompt">{t("fieldSegmentationPrompt")}</Label>
                <Textarea
                  id="edit-seg-prompt"
                  value={form.scriptSegmentationPrompt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scriptSegmentationPrompt: e.target.value }))
                  }
                  className="min-h-[80px] resize-y border-zinc-700 bg-zinc-900 text-sm"
                  placeholder={t("segmentationPromptPlaceholder")}
                />
                <p className="text-xs text-zinc-500">{t("segmentationPromptHint")}</p>
              </div>
            </div>
            {(showTopHeadlinePrompts || showBottomHeadlinePrompts) && (
              <div className="space-y-3 border-t border-zinc-800 pt-4 sm:col-span-2">
                <h3 className="text-sm font-medium text-zinc-200">{t("stepTitle3")}</h3>
                <p className="text-xs text-zinc-500">{t("stepDesc3")}</p>
                {showTopHeadlinePrompts ? (
                  <div className="space-y-2">
                    <Label>{t("fieldAutomationTopHeadline")}</Label>
                    <Select
                      value={form.automationTopHeadlineEnabled ? "yes" : "no"}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          automationTopHeadlineEnabled: e.target.value === "yes",
                        }))
                      }
                      className="border-zinc-700 bg-zinc-900"
                    >
                      <option value="no">{t("disabled")}</option>
                      <option value="yes">{t("enabled")}</option>
                    </Select>
                    <p className="text-xs text-zinc-500">{t("automationTopHeadlineHint")}</p>
                    {form.automationTopHeadlineEnabled ? (
                      <div className="space-y-2 pt-1">
                        <Label htmlFor="edit-top-hl-prompt">
                          {t("fieldAutomationTopHeadlinePrompt")}
                        </Label>
                        <Textarea
                          id="edit-top-hl-prompt"
                          value={form.automationTopHeadlinePrompt}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              automationTopHeadlinePrompt: e.target.value,
                            }))
                          }
                          className="min-h-[72px] resize-y border-zinc-700 bg-zinc-900 text-sm"
                          placeholder={t("automationTopHeadlinePlaceholder")}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {showBottomHeadlinePrompts ? (
                  <div className="space-y-2 pt-2">
                    <Label>{t("fieldAutomationBottomHeadline")}</Label>
                    <Select
                      value={form.automationBottomHeadlineEnabled ? "yes" : "no"}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          automationBottomHeadlineEnabled: e.target.value === "yes",
                        }))
                      }
                      className="border-zinc-700 bg-zinc-900"
                    >
                      <option value="no">{t("disabled")}</option>
                      <option value="yes">{t("enabled")}</option>
                    </Select>
                    <p className="text-xs text-zinc-500">{t("automationBottomHeadlineHint")}</p>
                    {form.automationBottomHeadlineEnabled ? (
                      <div className="space-y-2 pt-1">
                        <Label htmlFor="edit-bot-hl-prompt">
                          {t("fieldAutomationBottomHeadlinePrompt")}
                        </Label>
                        <Textarea
                          id="edit-bot-hl-prompt"
                          value={form.automationBottomHeadlinePrompt}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              automationBottomHeadlinePrompt: e.target.value,
                            }))
                          }
                          className="min-h-[72px] resize-y border-zinc-700 bg-zinc-900 text-sm"
                          placeholder={t("automationBottomHeadlinePlaceholder")}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
            {!form.profileId ? (
              <p className="text-xs text-zinc-600 sm:col-span-2">{t("headlinePromptsNeedProfile")}</p>
            ) : null}
            <div className="space-y-2">
              <Label>{t("fieldImageModel")}</Label>
              <Select
                value={form.imageModel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageModel: e.target.value as ImageModel }))
                }
                className="border-zinc-700 bg-zinc-900"
              >
                <option value="z-image">z-image</option>
                <option value="nano-banana-pro">nano-banana-pro</option>
                <option value="google/nano-banana">google/nano-banana</option>
                <option value="flux-2/pro-text-to-image">flux-2/pro-text-to-image</option>
                <option value="flux-2/flex-text-to-image">flux-2/flex-text-to-image</option>
                <option value="grok-imagine/text-to-image">grok-imagine/text-to-image</option>
                <option value="gpt-image/1.5-text-to-image">gpt-image/1.5-text-to-image</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("fieldVideoModel")}</Label>
              <Select
                value={form.videoModel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, videoModel: e.target.value as VideoModel }))
                }
                className="border-zinc-700 bg-zinc-900"
              >
                <option value="kling-v1.6">kling-v1.6</option>
                <option value="kling-v2.1-master">kling-v2.1-master</option>
                <option value="kling-v2.1">kling-v2.1</option>
                <option value="bytedance/v1-lite-text-to-video">
                  bytedance/v1-lite-text-to-video
                </option>
                <option value="wan/2-6-text-to-video">wan/2-6-text-to-video</option>
                <option value="grok-imagine/image-to-video">grok-imagine/image-to-video</option>
              </Select>
            </div>
            <div className="space-y-3 border-t border-zinc-800 pt-4 sm:col-span-2">
              <h3 className="text-sm font-medium text-zinc-200">{t("stepTitle4")}</h3>
              <p className="text-xs text-zinc-500">{t("stepDesc4")}</p>
              <div className="space-y-2">
                <Label>{t("fieldMetadataMode")}</Label>
                <Select
                  value={form.youtubeMetadataMode}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      youtubeMetadataMode: e.target.value as "static" | "llm",
                    }))
                  }
                  className="border-zinc-700 bg-zinc-900"
                >
                  <option value="static">{t("metadataStatic")}</option>
                  <option value="llm">{t("metadataLlm")}</option>
                </Select>
                <p className="text-xs text-zinc-500">{t("metadataModeHint")}</p>
              </div>
            </div>
            {form.youtubeMetadataMode === "static" ? (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-tags">{t("fieldTags")}</Label>
                  <Input
                    id="edit-tags"
                    value={form.youtubeTags}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, youtubeTags: e.target.value }))
                    }
                    className="border-zinc-700 bg-zinc-900"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-desc">{t("fieldDescTemplate")}</Label>
                  <Textarea
                    id="edit-desc"
                    value={form.youtubeDescriptionTemplate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        youtubeDescriptionTemplate: e.target.value,
                      }))
                    }
                    className="min-h-[72px] resize-y border-zinc-700 bg-zinc-900"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-metadata-unified">{t("fieldYoutubeMetadataPrompt")}</Label>
                  <Textarea
                    id="edit-metadata-unified"
                    value={form.youtubeMetadataPrompt}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, youtubeMetadataPrompt: e.target.value }))
                    }
                    className="min-h-[88px] resize-y border-zinc-700 bg-zinc-900 text-sm"
                    placeholder={t("youtubeMetadataPromptPlaceholder")}
                  />
                  <p className="text-xs text-zinc-500">{t("youtubeMetadataPromptHint")}</p>
                </div>
                <details className="sm:col-span-2 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-400">
                  <summary className="cursor-pointer text-zinc-300 select-none">
                    {t("metadataAdvancedLegacy")}
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-prompt-title">{t("fieldTitlePrompt")}</Label>
                      <Textarea
                        id="edit-prompt-title"
                        value={form.youtubeTitlePrompt}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, youtubeTitlePrompt: e.target.value }))
                        }
                        className="min-h-[64px] resize-y border-zinc-700 bg-zinc-900 text-sm"
                        placeholder={t("titlePromptPlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-prompt-desc">{t("fieldDescPrompt")}</Label>
                      <Textarea
                        id="edit-prompt-desc"
                        value={form.youtubeDescriptionPrompt}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            youtubeDescriptionPrompt: e.target.value,
                          }))
                        }
                        className="min-h-[72px] resize-y border-zinc-700 bg-zinc-900 text-sm"
                        placeholder={t("descPromptPlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-prompt-tags">{t("fieldTagsPrompt")}</Label>
                      <Textarea
                        id="edit-prompt-tags"
                        value={form.youtubeTagsPrompt}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, youtubeTagsPrompt: e.target.value }))
                        }
                        className="min-h-[64px] resize-y border-zinc-700 bg-zinc-900 text-sm"
                        placeholder={t("tagsPromptPlaceholder")}
                      />
                    </div>
                  </div>
                </details>
              </>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-cta">{t("fieldCta")}</Label>
              <Textarea
                id="edit-cta"
                value={form.youtubeDescriptionCta}
                onChange={(e) =>
                  setForm((f) => ({ ...f, youtubeDescriptionCta: e.target.value }))
                }
                className="min-h-[56px] resize-y border-zinc-700 bg-zinc-900 text-sm"
                placeholder={t("ctaPlaceholder")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-prefixes">{t("fieldTagPrefixes")}</Label>
              <Input
                id="edit-prefixes"
                value={form.youtubeTagPrefixes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, youtubeTagPrefixes: e.target.value }))
                }
                placeholder={t("tagPrefixesPlaceholder")}
                className="border-zinc-700 bg-zinc-900"
              />
            </div>
          </div>

          <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? <Spinner className="h-4 w-4" /> : t("save")}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-medium text-zinc-200">{t("runsTitle")}</h2>
        <Card className="border-zinc-800 bg-zinc-950/40">
          <CardContent className="p-0">
            {runsLoading ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-6 w-6 text-amber-500" />
              </div>
            ) : runs.length === 0 ? (
              <div className="py-10 text-center text-sm text-zinc-500">{t("runsEmpty")}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">{t("runStatus")}</TableHead>
                    <TableHead className="text-zinc-400">{t("runCreated")}</TableHead>
                    <TableHead className="text-zinc-400">{t("runTitle")}</TableHead>
                    <TableHead className="text-zinc-400">{t("runRequest")}</TableHead>
                    <TableHead className="text-zinc-400">{t("runYoutube")}</TableHead>
                    <TableHead className="text-zinc-400">{t("runError")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r: AutomationRun) => (
                    <TableRow key={r.id} className="border-zinc-800">
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-normal",
                            r.status === "completed" && "bg-emerald-500/15 text-emerald-400",
                            r.status === "failed" && "bg-rose-500/15 text-rose-400"
                          )}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {formatDate(r.createdAt, locale)}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-zinc-300">
                        {r.inputTitle || "—"}
                      </TableCell>
                      <TableCell>
                        {r.videoRequestId ? (
                          <Link
                            href={`/requests/${r.videoRequestId}`}
                            className="inline-flex items-center gap-1 text-amber-500 hover:underline"
                          >
                            {r.videoRequestId.slice(0, 8)}…
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {r.youtubeUrl ? (
                          <a
                            href={r.youtubeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-amber-500 hover:underline"
                          >
                            {t("youtubeOpen")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-rose-400/90 text-xs">
                        {r.errorMessage || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
