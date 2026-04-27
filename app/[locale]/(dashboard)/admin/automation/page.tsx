"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  createAutomationChannel,
  deleteAutomationChannel,
  getAutomationDashboardStats,
  listAdminUsers,
  listAutomationChannels,
  listProfiles,
  listYouTubeConnections,
  updateAutomationChannel,
} from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Copy, Hash, ListChecks, Percent, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { AutomationChannel, VideoProfile } from "@/types";

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

function formatYyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localDayStart(isoDay: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay.trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
}

function localDayEnd(isoDay: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay.trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
}

type DatePreset = "last7d" | "today" | "yesterday" | "custom";

function initialCustomDayRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 6, 0, 0, 0, 0);
  return { from: formatYyyyMmDd(from), to: formatYyyyMmDd(to) };
}

function statsRangeForPreset(
  preset: DatePreset,
  customFromDay: string,
  customToDay: string
): { from: string; to: string } | null {
  const now = new Date();
  if (preset === "last7d") {
    const to = now;
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (preset === "today") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (preset === "yesterday") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  const a = localDayStart(customFromDay);
  const b = localDayEnd(customToDay);
  if (!a || !b) return null;
  if (a.getTime() > b.getTime()) return null;
  return { from: a.toISOString(), to: b.toISOString() };
}

export default function AdminAutomationListPage() {
  const t = useTranslations("admin.automation");
  const locale = useLocale();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [secretReveal, setSecretReveal] = useState<{
    channel: AutomationChannel;
    webhookSecret: string;
  } | null>(null);

  const [datePreset, setDatePreset] = useState<DatePreset>("last7d");
  const [committedCustom, setCommittedCustom] = useState(() => initialCustomDayRange());
  const [draftCustom, setDraftCustom] = useState(() => initialCustomDayRange());

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
  });

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["automation-channels"],
    queryFn: listAutomationChannels,
    enabled: isAdmin ?? false,
  });

  const statsRange = useMemo(
    () => statsRangeForPreset(datePreset, committedCustom.from, committedCustom.to),
    [datePreset, committedCustom.from, committedCustom.to]
  );

  const statsQuery = useQuery({
    queryKey: ["automation-stats", statsRange?.from, statsRange?.to],
    queryFn: () => getAutomationDashboardStats(statsRange!.from, statsRange!.to),
    enabled: Boolean(isAdmin && statsRange),
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["youtube-connections"],
    queryFn: listYouTubeConnections,
    enabled: isAdmin ?? false,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["video-profiles"],
    queryFn: listProfiles,
    enabled: isAdmin && createOpen,
  });

  const { data: adminUsers = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: listAdminUsers,
    enabled: isAdmin ?? false,
  });

  const createMutation = useMutation({
    mutationFn: createAutomationChannel,
    onSuccess: (res) => {
      toast.success(t("toastCreated"));
      queryClient.invalidateQueries({ queryKey: ["automation-channels"] });
      queryClient.invalidateQueries({ queryKey: ["automation-stats"] });
      setCreateOpen(false);
      setSecretReveal({ channel: res.channel, webhookSecret: res.webhookSecret });
      setForm({
        name: "",
        connectionId: "",
        ownerUserId: user?.id ?? "",
        profileId: "",
        contentType: "",
        imageModel: "z-image",
        videoModel: "kling-v2.1",
        llmModel: "gpt-5-4",
        scriptSegmentationPrompt: "",
        articleToScriptEnabled: false,
        articleToScriptPrompt: "",
        youtubePrivacyStatus: "private",
        youtubeMetadataMode: "static",
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
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAutomationChannel,
    onSuccess: () => {
      toast.success(t("toastDisabled"));
      queryClient.invalidateQueries({ queryKey: ["automation-channels"] });
      queryClient.invalidateQueries({ queryKey: ["automation-stats"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    },
  });

  const enableMutation = useMutation({
    mutationFn: (channelId: string) => updateAutomationChannel(channelId, { enabled: true }),
    onSuccess: () => {
      toast.success(t("toastEnabled"));
      queryClient.invalidateQueries({ queryKey: ["automation-channels"] });
      queryClient.invalidateQueries({ queryKey: ["automation-stats"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    },
  });

  const sorted = useMemo(
    () => [...channels].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [channels]
  );

  const connectionLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of connections) {
      m.set(c.id, c.label || c.id.slice(0, 8));
    }
    return m;
  }, [connections]);

  const userEmail = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of adminUsers) {
      m.set(u.id, u.email);
    }
    return m;
  }, [adminUsers]);

  const selectedProfile = useMemo((): VideoProfile | undefined => {
    if (!form.profileId) return undefined;
    return profiles.find((p) => p.profileId === form.profileId);
  }, [profiles, form.profileId]);

  const showTopHeadlinePrompts = selectedProfile?.headline.top.enabled === true;
  const showBottomHeadlinePrompts = selectedProfile?.headline.bottom.enabled === true;

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

  function submitCreate() {
    if (!form.name.trim()) {
      toast.error(t("validationName"));
      return;
    }
    if (!form.connectionId) {
      toast.error(t("validationConnection"));
      return;
    }
    if (!form.ownerUserId) {
      toast.error(t("validationOwner"));
      return;
    }
    if (!form.profileId) {
      toast.error(t("validationProfile"));
      return;
    }
    const tags = form.youtubeTags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const prefixes = form.youtubeTagPrefixes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    createMutation.mutate({
      name: form.name.trim(),
      connectionId: form.connectionId,
      ownerUserId: form.ownerUserId,
      profileId: form.profileId,
      contentType: form.contentType || undefined,
      imageModel: form.imageModel,
      videoModel: form.videoModel,
      llmModel: form.llmModel,
      scriptSegmentationPrompt: form.scriptSegmentationPrompt.trim() || undefined,
      articleToScriptEnabled: form.articleToScriptEnabled,
      articleToScriptPrompt: form.articleToScriptPrompt.trim() || undefined,
      youtubePrivacyStatus: form.youtubePrivacyStatus,
      youtubeMetadataMode: form.youtubeMetadataMode,
      youtubeTitlePrompt: form.youtubeTitlePrompt.trim() || undefined,
      youtubeDescriptionPrompt: form.youtubeDescriptionPrompt.trim() || undefined,
      youtubeTagsPrompt: form.youtubeTagsPrompt.trim() || undefined,
      youtubeMetadataPrompt: form.youtubeMetadataPrompt.trim() || undefined,
      automationTopHeadlineEnabled: form.automationTopHeadlineEnabled,
      automationTopHeadlinePrompt: form.automationTopHeadlinePrompt.trim() || undefined,
      automationBottomHeadlineEnabled: form.automationBottomHeadlineEnabled,
      automationBottomHeadlinePrompt: form.automationBottomHeadlinePrompt.trim() || undefined,
      youtubeDescriptionCta: form.youtubeDescriptionCta.trim() || undefined,
      youtubeTagPrefixes: prefixes.length ? prefixes : undefined,
      youtubeTags: tags.length ? tags : undefined,
      youtubeDescriptionTemplate: form.youtubeDescriptionTemplate.trim() || undefined,
    });
  }

  function setPreset(p: DatePreset) {
    if (p === "custom") {
      setDraftCustom(committedCustom);
    }
    setDatePreset(p);
  }

  function submitCustomRange() {
    const a = localDayStart(draftCustom.from);
    const b = localDayEnd(draftCustom.to);
    if (!a || !b) {
      toast.error(t("validationCustomDates"));
      return;
    }
    if (a.getTime() > b.getTime()) {
      toast.error(t("validationCustomOrder"));
      return;
    }
    setCommittedCustom({
      from: draftCustom.from.trim(),
      to: draftCustom.to.trim(),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("description")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/overview"
            className={cn(buttonVariants({ variant: "outline" }), "border-zinc-700 shrink-0")}
          >
            {t("backOverview")}
          </Link>
          <Dialog
            open={createOpen}
            onOpenChange={(o) => {
              setCreateOpen(o);
              if (o && user?.id && !form.ownerUserId) {
                setForm((f) => ({ ...f, ownerUserId: user.id }));
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                {t("newChannel")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto border-zinc-800 bg-zinc-950 sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("createTitle")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="auto-name">{t("fieldName")}</Label>
                  <Input
                    id="auto-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="border-zinc-700 bg-zinc-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("fieldConnection")}</Label>
                  <Select
                    value={form.connectionId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, connectionId: e.target.value }))
                    }
                    className="border-zinc-700 bg-zinc-900"
                  >
                    <option value="">{t("selectConnection")}</option>
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ownerUserId: e.target.value }))
                    }
                    className="border-zinc-700 bg-zinc-900"
                  >
                    <option value="">{t("selectOwner")}</option>
                    {adminUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("fieldProfile")}</Label>
                  <Select
                    value={form.profileId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, profileId: e.target.value }))
                    }
                    className="border-zinc-700 bg-zinc-900"
                  >
                    <option value="">{t("selectProfile")}</option>
                    {profiles.map((p) => (
                      <option key={p.profileId} value={p.profileId}>
                        {p.name} ({p.canvas.ratio})
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-zinc-500">{t("profileShortsHint")}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
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
                </div>
                <div className="space-y-2">
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
                <div className="space-y-3 border-t border-zinc-800 pt-4">
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
                        <Label htmlFor="auto-article-prompt">
                          {t("fieldArticleToScriptPrompt")}
                        </Label>
                        <Textarea
                          id="auto-article-prompt"
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
                <div className="space-y-3 border-t border-zinc-800 pt-4">
                  <h3 className="text-sm font-medium text-zinc-200">{t("stepTitle2")}</h3>
                  <p className="text-xs text-zinc-500">{t("stepDesc2")}</p>
                  <div className="space-y-2">
                    <Label htmlFor="auto-seg-prompt">{t("fieldSegmentationPrompt")}</Label>
                    <Textarea
                      id="auto-seg-prompt"
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
                  <div className="space-y-3 border-t border-zinc-800 pt-4">
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
                            <Label htmlFor="auto-top-hl-prompt">
                              {t("fieldAutomationTopHeadlinePrompt")}
                            </Label>
                            <Textarea
                              id="auto-top-hl-prompt"
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
                            <Label htmlFor="auto-bot-hl-prompt">
                              {t("fieldAutomationBottomHeadlinePrompt")}
                            </Label>
                            <Textarea
                              id="auto-bot-hl-prompt"
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
                  <p className="text-xs text-zinc-600">{t("headlinePromptsNeedProfile")}</p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("fieldImageModel")}</Label>
                    <Select
                      value={form.imageModel}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          imageModel: e.target.value as ImageModel,
                        }))
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
                        setForm((f) => ({
                          ...f,
                          videoModel: e.target.value as VideoModel,
                        }))
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
                      <option value="grok-imagine/image-to-video">
                        grok-imagine/image-to-video
                      </option>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3 border-t border-zinc-800 pt-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="auto-tags">{t("fieldTags")}</Label>
                      <Input
                        id="auto-tags"
                        value={form.youtubeTags}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, youtubeTags: e.target.value }))
                        }
                        placeholder={t("tagsPlaceholder")}
                        className="border-zinc-700 bg-zinc-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="auto-desc">{t("fieldDescTemplate")}</Label>
                      <Textarea
                        id="auto-desc"
                        value={form.youtubeDescriptionTemplate}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            youtubeDescriptionTemplate: e.target.value,
                          }))
                        }
                        className="min-h-[72px] resize-y border-zinc-700 bg-zinc-900"
                        placeholder={t("descPlaceholder")}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="auto-metadata-unified">{t("fieldYoutubeMetadataPrompt")}</Label>
                      <Textarea
                        id="auto-metadata-unified"
                        value={form.youtubeMetadataPrompt}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, youtubeMetadataPrompt: e.target.value }))
                        }
                        className="min-h-[88px] resize-y border-zinc-700 bg-zinc-900 text-sm"
                        placeholder={t("youtubeMetadataPromptPlaceholder")}
                      />
                      <p className="text-xs text-zinc-500">{t("youtubeMetadataPromptHint")}</p>
                    </div>
                    <details className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-400">
                      <summary className="cursor-pointer text-zinc-300 select-none">
                        {t("metadataAdvancedLegacy")}
                      </summary>
                      <div className="mt-3 space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="auto-prompt-title">{t("fieldTitlePrompt")}</Label>
                          <Textarea
                            id="auto-prompt-title"
                            value={form.youtubeTitlePrompt}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, youtubeTitlePrompt: e.target.value }))
                            }
                            className="min-h-[64px] resize-y border-zinc-700 bg-zinc-900 text-sm"
                            placeholder={t("titlePromptPlaceholder")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="auto-prompt-desc">{t("fieldDescPrompt")}</Label>
                          <Textarea
                            id="auto-prompt-desc"
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
                          <Label htmlFor="auto-prompt-tags">{t("fieldTagsPrompt")}</Label>
                          <Textarea
                            id="auto-prompt-tags"
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
                <div className="space-y-2">
                  <Label htmlFor="auto-cta">{t("fieldCta")}</Label>
                  <Textarea
                    id="auto-cta"
                    value={form.youtubeDescriptionCta}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, youtubeDescriptionCta: e.target.value }))
                    }
                    className="min-h-[56px] resize-y border-zinc-700 bg-zinc-900 text-sm"
                    placeholder={t("ctaPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auto-prefixes">{t("fieldTagPrefixes")}</Label>
                  <Input
                    id="auto-prefixes"
                    value={form.youtubeTagPrefixes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, youtubeTagPrefixes: e.target.value }))
                    }
                    placeholder={t("tagPrefixesPlaceholder")}
                    className="border-zinc-700 bg-zinc-900"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={createMutation.isPending}
                  onClick={submitCreate}
                >
                  {createMutation.isPending ? <Spinner className="h-4 w-4" /> : t("createSubmit")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="space-y-1 pb-4">
          <h2 className="text-lg font-semibold text-zinc-100">{t("dashboardTitle")}</h2>
          <p className="text-sm text-zinc-500">{t("dashboardDescription")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t("rangeLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={datePreset === "last7d" ? "default" : "outline"}
                  className={
                    datePreset === "last7d"
                      ? ""
                      : "border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800"
                  }
                  onClick={() => setPreset("last7d")}
                >
                  {t("filterLast7Days")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={datePreset === "today" ? "default" : "outline"}
                  className={
                    datePreset === "today"
                      ? ""
                      : "border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800"
                  }
                  onClick={() => setPreset("today")}
                >
                  {t("filterToday")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={datePreset === "yesterday" ? "default" : "outline"}
                  className={
                    datePreset === "yesterday"
                      ? ""
                      : "border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800"
                  }
                  onClick={() => setPreset("yesterday")}
                >
                  {t("filterYesterday")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={datePreset === "custom" ? "default" : "outline"}
                  className={
                    datePreset === "custom"
                      ? ""
                      : "border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800"
                  }
                  onClick={() => setPreset("custom")}
                >
                  {t("filterCustom")}
                </Button>
              </div>
            </div>
            {datePreset === "custom" ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-500">{t("customFrom")}</Label>
                  <Input
                    type="date"
                    value={draftCustom.from}
                    onChange={(e) =>
                      setDraftCustom((d) => ({ ...d, from: e.target.value }))
                    }
                    className="border-zinc-700 bg-zinc-950 w-full sm:w-auto"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-500">{t("customTo")}</Label>
                  <Input
                    type="date"
                    value={draftCustom.to}
                    onChange={(e) =>
                      setDraftCustom((d) => ({ ...d, to: e.target.value }))
                    }
                    className="border-zinc-700 bg-zinc-950 w-full sm:w-auto"
                  />
                </div>
                <Button type="button" variant="secondary" className="shrink-0" onClick={submitCustomRange}>
                  {t("applyCustomRange")}
                </Button>
              </div>
            ) : null}
          </div>
          {statsRange ? (
            <p className="text-xs text-zinc-500">
              {formatDate(statsRange.from, locale)} — {formatDate(statsRange.to, locale)}
            </p>
          ) : null}
          {!statsRange && datePreset === "custom" ? (
            <p className="text-xs text-rose-400">{t("validationCustomDates")}</p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-zinc-800 bg-zinc-950/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <span className="text-sm font-medium text-zinc-200">{t("statTotalChannels")}</span>
                <Hash className="h-4 w-4 text-amber-500/90" aria-hidden />
              </CardHeader>
              <CardContent>
                {statsQuery.isLoading ? (
                  <div className="flex h-9 items-center">
                    <Spinner className="h-5 w-5 text-amber-500" />
                  </div>
                ) : statsQuery.isError ? (
                  <p className="text-sm text-rose-400">—</p>
                ) : (
                  <p className="text-2xl font-semibold tabular-nums text-zinc-100">
                    {statsQuery.data?.totalChannels ?? 0}
                  </p>
                )}
                <p className="mt-1 text-xs text-zinc-500">{t("statTotalChannelsHint")}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-950/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <span className="text-sm font-medium text-zinc-200">{t("statTotalRuns")}</span>
                <ListChecks className="h-4 w-4 text-sky-400/90" aria-hidden />
              </CardHeader>
              <CardContent>
                {statsQuery.isLoading ? (
                  <div className="flex h-9 items-center">
                    <Spinner className="h-5 w-5 text-amber-500" />
                  </div>
                ) : statsQuery.isError ? (
                  <p className="text-sm text-rose-400">—</p>
                ) : (
                  <p className="text-2xl font-semibold tabular-nums text-zinc-100">
                    {statsQuery.data?.totalRuns ?? 0}
                  </p>
                )}
                <p className="mt-1 text-xs text-zinc-500">{t("statTotalRunsHint")}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-950/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <span className="text-sm font-medium text-zinc-200">{t("statFailedRuns")}</span>
                <XCircle className="h-4 w-4 text-rose-400/90" aria-hidden />
              </CardHeader>
              <CardContent>
                {statsQuery.isLoading ? (
                  <div className="flex h-9 items-center">
                    <Spinner className="h-5 w-5 text-amber-500" />
                  </div>
                ) : statsQuery.isError ? (
                  <p className="text-sm text-rose-400">—</p>
                ) : (
                  <p className="text-2xl font-semibold tabular-nums text-zinc-100">
                    {statsQuery.data?.failedRuns ?? 0}
                  </p>
                )}
                <p className="mt-1 text-xs text-zinc-500">{t("statFailedRunsHint")}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-950/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <span className="text-sm font-medium text-zinc-200">{t("statFailureRate")}</span>
                <Percent className="h-4 w-4 text-violet-400/90" aria-hidden />
              </CardHeader>
              <CardContent>
                {statsQuery.isLoading ? (
                  <div className="flex h-9 items-center">
                    <Spinner className="h-5 w-5 text-amber-500" />
                  </div>
                ) : statsQuery.isError ? (
                  <p className="text-sm text-rose-400">—</p>
                ) : (
                  <p className="text-2xl font-semibold tabular-nums text-zinc-100">
                    {statsQuery.data && statsQuery.data.totalRuns > 0
                      ? `${(statsQuery.data.failureRate * 100).toFixed(1)}%`
                      : "0%"}
                  </p>
                )}
                <p className="mt-1 text-xs text-zinc-500">{t("statFailureRateHint")}</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!secretReveal} onOpenChange={(o) => !o && setSecretReveal(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("secretTitle")}</DialogTitle>
          </DialogHeader>
          {secretReveal && (
            <div className="space-y-4 text-sm text-zinc-300">
              <p className="text-zinc-500">{t("secretBody")}</p>
              <div className="space-y-1">
                <Label className="text-zinc-400">{t("webhookUrl")}</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={secretReveal.channel.webhookUrl}
                    className="border-zinc-700 bg-zinc-900 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 border-zinc-700"
                    onClick={() => copyText(t("copiedUrl"), secretReveal.channel.webhookUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400">{t("webhookSecret")}</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={secretReveal.webhookSecret}
                    className="border-zinc-700 bg-zinc-900 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 border-zinc-700"
                    onClick={() => copyText(t("copiedSecret"), secretReveal.webhookSecret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-amber-500/90">{t("secretHeaderHint")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="border-zinc-800 bg-zinc-950/40">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-8 w-8 text-amber-500" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">{t("empty")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">{t("colName")}</TableHead>
                  <TableHead className="text-zinc-400">{t("colStatus")}</TableHead>
                  <TableHead className="text-zinc-400">{t("colConnection")}</TableHead>
                  <TableHead className="text-zinc-400">{t("colOwner")}</TableHead>
                  <TableHead className="text-zinc-400">{t("colCreated")}</TableHead>
                  <TableHead className="text-right text-zinc-400">{t("colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((ch) => (
                  <TableRow key={ch.id} className="border-zinc-800">
                    <TableCell className="font-medium text-zinc-200">{ch.name}</TableCell>
                    <TableCell>
                      {ch.enabled ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400">{t("enabled")}</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                          {t("disabled")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {connectionLabel.get(ch.connectionId) ?? ch.connectionId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-zinc-400">
                      {userEmail.get(ch.ownerUserId) ?? ch.ownerUserId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {formatDate(ch.createdAt, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/automation/${ch.id}`}
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        >
                          {t("open")}
                        </Link>
                        {ch.enabled ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-400 hover:text-rose-300"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (confirm(t("disableConfirm"))) {
                                deleteMutation.mutate(ch.id);
                              }
                            }}
                          >
                            {t("disable")}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-400 hover:text-emerald-300"
                            disabled={enableMutation.isPending}
                            onClick={() => enableMutation.mutate(ch.id)}
                          >
                            {t("enable")}
                          </Button>
                        )}
                      </div>
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
