"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  createVideoRequest,
  extractNewsArticle,
  getKieCredits,
  listProfiles,
  segmentScriptViaLlm,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Pencil, Globe, ArrowLeft } from "lucide-react";

type CreationMode = "write" | "import";

export default function SlideshowNewPage() {
  const t = useTranslations("generateVideo");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [creationMode, setCreationMode] = useState<CreationMode | null>(null);
  const [fullScript, setFullScript] = useState("");
  const [segments, setSegments] = useState<string[]>([]);
  const [profileId, setProfileId] = useState("");
  const [segmenting, setSegmenting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [topHeadlineText, setTopHeadlineText] = useState("");
  const [bottomHeadlineText, setBottomHeadlineText] = useState("");
  const [newsUrl, setNewsUrl] = useState("");
  const [newsImporting, setNewsImporting] = useState(false);
  const [scriptSource, setScriptSource] = useState<"manual" | "article_import">("manual");
  const [importedArticleTitle, setImportedArticleTitle] = useState<string | null>(null);
  const [importedText, setImportedText] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["video-profiles"],
    queryFn: listProfiles,
  });

  const {
    data: kieCredits,
    isLoading: kieCreditsLoading,
    isError: kieCreditsError,
  } = useQuery({
    queryKey: ["kie-credits"],
    queryFn: getKieCredits,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const kieCreditsOk =
    kieCredits != null && (kieCredits.code === 200 || kieCredits.code === 0);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.profileId === profileId),
    [profiles, profileId],
  );

  useEffect(() => {
    const p = profiles.find((pr) => pr.profileId === profileId);
    if (!profileId) {
      setTopHeadlineText("");
      setBottomHeadlineText("");
      return;
    }
    setTopHeadlineText(p?.sampleTexts?.topHeadline ?? "");
    setBottomHeadlineText(p?.sampleTexts?.bottomHeadline ?? "");
  }, [profileId, profiles]);

  const canSubmit = useMemo(() => {
    if (segments.length === 0) return false;
    if (!profileId) return false;
    return true;
  }, [segments.length, profileId]);

  const headlineShow = useMemo(() => {
    if (!selectedProfile) return { showTop: false, showBottom: false };
    return {
      showTop: selectedProfile.headline.top.enabled,
      showBottom: selectedProfile.headline.bottom.enabled,
    };
  }, [selectedProfile]);

  function resetToChoice() {
    setCreationMode(null);
    setFullScript("");
    setSegments([]);
    setNewsUrl("");
    setImportedText("");
    setScriptSource("manual");
    setImportedArticleTitle(null);
  }

  async function handleGenerateScript() {
    if (!fullScript.trim()) {
      toast.error(t("toastInputScriptFirst"));
      return;
    }
    setSegmenting(true);
    try {
      const { segments: result, fullScript: normalizedFull } = await segmentScriptViaLlm({
        fullScript: fullScript.trim(),
        model: "gpt-5-4",
        scriptSource,
        ...(scriptSource === "article_import" && importedArticleTitle?.trim()
          ? { articleTitle: importedArticleTitle.trim() }
          : {}),
      });
      if (result.length === 0) {
        toast.error(t("toastNoSegments"));
        return;
      }
      if (normalizedFull?.trim() && normalizedFull.trim() !== fullScript.trim()) {
        setFullScript(normalizedFull.trim());
        toast.success(t("toastSegmentSuccessWithVoiceover"));
      } else {
        toast.success(t("toastSegmentSuccess"));
      }
      setSegments(result);
      setScriptSource("manual");
      setImportedArticleTitle(null);
      setImportedText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("toastSegmentFailed"));
    } finally {
      setSegmenting(false);
    }
  }

  function addSegmentAfter(index: number) {
    setSegments((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, "");
      return next;
    });
  }

  const handleImportNews = useCallback(async () => {
    const u = newsUrl.trim();
    if (!u) {
      toast.error(t("toastNewsUrlRequired"));
      return;
    }
    setNewsImporting(true);
    try {
      const res = await extractNewsArticle(u);
      const titlePart = res.title?.trim() ?? "";
      const body = titlePart ? `${titlePart}\n\n${res.text.trim()}` : res.text.trim();
      setFullScript(body);
      setImportedText(body);
      setScriptSource("article_import");
      setImportedArticleTitle(titlePart || null);
      toast.success(t("toastNewsImported"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("toastNewsImportFailed"));
    } finally {
      setNewsImporting(false);
    }
  }, [newsUrl, t]);

  async function handleGenerateVideo() {
    if (!canSubmit) return;
    const trimmedSegments = segments.map((s) => s.trim()).filter(Boolean);
    setSubmitting(true);
    try {
      await createVideoRequest({
        fullScript: fullScript.trim() || trimmedSegments.join("\n\n"),
        segmentedScripts: trimmedSegments,
        profileId,
        ...(topHeadlineText.trim() ? { topHeadlineText: topHeadlineText.trim() } : {}),
        ...(bottomHeadlineText.trim() ? { bottomHeadlineText: bottomHeadlineText.trim() } : {}),
      });
      toast.success(t("toastRequestCreated"));
      router.push("/requests");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastRequestFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">{t("slideshowTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("slideshowDescription")}</p>
        </div>
        <div
          className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-sm"
          aria-live="polite"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("kieCredits")}
          </div>
          {kieCreditsLoading ? (
            <div className="mt-1 text-zinc-400">{tCommon("loading")}</div>
          ) : kieCreditsError ? (
            <div className="mt-1 text-red-400">{tCommon("unavailable")}</div>
          ) : kieCreditsOk ? (
            <div className="mt-1 text-2xl font-semibold tabular-nums text-amber-400">
              {kieCredits!.data}
            </div>
          ) : (
            <div className="mt-1 text-amber-200/90" title={kieCredits?.msg}>
              {kieCredits?.msg ?? tCommon("unknown")}
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6 text-sm text-zinc-300">
          {segments.length === 0 ? (
            <>
              {creationMode === null ? (
                <>
                  <div className="text-center">
                    <h2 className="text-lg font-medium text-zinc-200">{t("pickModeTitle")}</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setCreationMode("write")}
                      className="group flex flex-col items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-8 text-left transition-all hover:border-amber-500/50 hover:bg-zinc-900/80"
                    >
                      <div className="rounded-full bg-zinc-800 p-4 transition-colors group-hover:bg-amber-500/10">
                        <Pencil className="h-8 w-8 text-zinc-400 transition-colors group-hover:text-amber-400" />
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-zinc-200">{t("writeScriptTitle")}</div>
                        <div className="mt-1 text-xs text-zinc-500">{t("writeScriptDesc")}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreationMode("import")}
                      className="group flex flex-col items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-8 text-left transition-all hover:border-amber-500/50 hover:bg-zinc-900/80"
                    >
                      <div className="rounded-full bg-zinc-800 p-4 transition-colors group-hover:bg-amber-500/10">
                        <Globe className="h-8 w-8 text-zinc-400 transition-colors group-hover:text-amber-400" />
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-zinc-200">{t("importArticleTitle")}</div>
                        <div className="mt-1 text-xs text-zinc-500">{t("importArticleDesc")}</div>
                      </div>
                    </button>
                  </div>
                </>
              ) : creationMode === "write" ? (
                <>
                  <button
                    type="button"
                    onClick={resetToChoice}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    {t("backToChoice")}
                  </button>
                  <div className="space-y-2">
                    <Label>{t("fullScript")}</Label>
                    <textarea
                      className="min-h-[220px] w-full rounded-md border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-200"
                      value={fullScript}
                      onChange={(e) => {
                        setFullScript(e.target.value);
                        setScriptSource("manual");
                        setImportedArticleTitle(null);
                      }}
                      placeholder={t("fullScriptPlaceholder")}
                    />
                  </div>
                  <Button onClick={handleGenerateScript} disabled={segmenting || !fullScript.trim()}>
                    {segmenting ? t("generating") : t("generateScript")}
                  </Button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={resetToChoice}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    {t("backToChoice")}
                  </button>
                  <div className="space-y-2">
                    <Label htmlFor="news-url">{t("newsUrlLabel")}</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        id="news-url"
                        type="url"
                        className="border-zinc-700 bg-zinc-950"
                        value={newsUrl}
                        onChange={(e) => setNewsUrl(e.target.value)}
                        placeholder={t("newsUrlPlaceholder")}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0 border-zinc-700"
                        disabled={newsImporting || !newsUrl.trim()}
                        onClick={() => void handleImportNews()}
                      >
                        {newsImporting ? t("importingArticle") : t("importArticle")}
                      </Button>
                    </div>
                  </div>
                  {importedText ? (
                    <div className="space-y-2 rounded-lg border border-emerald-800 bg-emerald-950/20 p-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-400">{t("articleImported")}</span>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto rounded border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-zinc-400 whitespace-pre-wrap">
                        {importedText}
                      </div>
                      <Button onClick={handleGenerateScript} disabled={segmenting}>
                        {segmenting ? t("generating") : t("generateScriptFromArticle")}
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t("segmentedOutput")}</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToChoice}
                  >
                    {t("back")}
                  </Button>
                </div>
                <div className="space-y-3">
                  {segments.map((segment, idx) => (
                    <div key={`segment-${idx}`} className="space-y-2 rounded-lg border border-zinc-800 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-zinc-500">{t("segmentN", { n: idx + 1 })}</div>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-red-300"
                          onClick={() => {
                            setSegments((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          aria-label={t("deleteSegmentAria", { n: idx + 1 })}
                        >
                          X
                        </button>
                      </div>
                      <Input
                        value={segment}
                        onChange={(e) => {
                          const next = [...segments];
                          next[idx] = e.target.value;
                          setSegments(next);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addSegmentAfter(idx)}
                      >
                        {t("addSegmentUnder")}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("videoProfile")}</Label>
                <Select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                  <option value="">{t("selectProfile")}</option>
                  {profiles
                    .filter((p) => !p.generation || p.generation.contentType === "slideshow")
                    .map((p) => (
                      <option key={p.profileId} value={p.profileId}>
                        {p.name}
                      </option>
                    ))}
                </Select>
                {selectedProfile?.generation && (
                  <div className="rounded-md border border-zinc-800 bg-zinc-950/30 p-3 text-xs text-zinc-400 space-y-1">
                    <div>
                      {selectedProfile.canvas.ratio} / {selectedProfile.canvas.resolution}
                      {selectedProfile.generation.imageModel && (
                        <> &middot; {selectedProfile.generation.imageModel}</>
                      )}
                      {selectedProfile.generation.videoModel && (
                        <> &middot; {selectedProfile.generation.videoModel}</>
                      )}
                    </div>
                    {selectedProfile.generation.llmModel && (
                      <div>LLM: {selectedProfile.generation.llmModel}</div>
                    )}
                  </div>
                )}
              </div>

              {headlineShow.showTop && (
                <div className="space-y-2">
                  <Label htmlFor="top-headline">{t("topHeadline")}</Label>
                  <Textarea
                    id="top-headline"
                    className="min-h-[72px] resize-y"
                    value={topHeadlineText}
                    onChange={(e) => setTopHeadlineText(e.target.value)}
                    placeholder={t("topHeadlinePlaceholder")}
                  />
                </div>
              )}
              {headlineShow.showBottom && (
                <div className="space-y-2">
                  <Label htmlFor="bottom-headline">{t("bottomHeadline")}</Label>
                  <Textarea
                    id="bottom-headline"
                    className="min-h-[72px] resize-y"
                    value={bottomHeadlineText}
                    onChange={(e) => setBottomHeadlineText(e.target.value)}
                    placeholder={t("bottomHeadlinePlaceholder", {
                      name: selectedProfile?.name ?? "—",
                    })}
                  />
                </div>
              )}

              <Button onClick={handleGenerateVideo} disabled={!canSubmit || submitting}>
                {submitting ? t("submitting") : t("generateVideoCta")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
