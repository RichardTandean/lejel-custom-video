"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Wand2,
  LayoutTemplate,
  Play,
  Trash2,
  Download,
  Save,
  Loader2,
  Film,
  Code2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  completeR2Upload,
  generateRemotionTsx,
  presignR2Upload,
  renderRemotionFromTsx,
  reviseRemotionTsx,
  saveRemotionTemplate,
  listRemotionTemplates,
  deleteRemotionTemplate,
  renderRemotionTemplate,
  fetchRemotionMp4Blob,
  type LlmModel,
} from "@/lib/api";
import type { RemotionTemplate } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "generate" | "templates";

const LLM_MODELS: { value: LlmModel; label: string }[] = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "gpt-5-4", label: "GPT-5-4" },
  { value: "gpt-5-2", label: "GPT-5-2" },
  { value: "gemini-3-flash", label: "Gemini 3 Flash" },
  { value: "gemini-3-pro", label: "Gemini 3 Pro" },
  { value: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

const DURATION_PRESETS_SEC = [
  { label: "3s", seconds: 3 },
  { label: "5s", seconds: 5 },
  { label: "7s", seconds: 7 },
  { label: "10s", seconds: 10 },
  { label: "15s", seconds: 15 },
  { label: "30s", seconds: 30 },
] as const;

const CANVAS_PRESETS = [
  { id: "1080x1920" as const, label: "1080 × 1920 (portrait)", width: 1080, height: 1920 },
  { id: "1920x1080" as const, label: "1920 × 1080 (landscape)", width: 1920, height: 1080 },
];

type RemotionAssetRow = {
  id: string;
  objectKey: string;
  label: string;
  kind: "image" | "video";
  fileName: string;
};

function fileToAllowedContentType(file: File): string | null {
  const t = (file.type || "").toLowerCase();
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/quicktime",
  ];
  if (allowed.includes(t)) return t;
  if (t === "video/x-m4v") return "video/mp4";
  return null;
}

function contentTypeToAssetKind(ct: string): "image" | "video" {
  return ct.startsWith("video/") ? "video" : "image";
}

function clampFps(n: number): number {
  return Number.isFinite(n) ? Math.min(60, Math.max(24, Math.round(n))) : 30;
}

/** Keep duration so frame count stays within 30–3600 for the given fps. */
function clampSecondsForFps(seconds: number, fpsVal: number): number {
  const f = clampFps(fpsVal);
  if (!Number.isFinite(seconds)) return 30 / f;
  const minS = 30 / f;
  const maxS = 3600 / f;
  return Math.min(maxS, Math.max(minS, seconds));
}

function totalFramesFromSeconds(seconds: number, fpsVal: number): number {
  const f = clampFps(fpsVal);
  const s = clampSecondsForFps(seconds, f);
  return Math.min(3600, Math.max(30, Math.round(s * f)));
}

/** Remotion file URLs require JWT; <video src> cannot send headers — fetch → blob URL. */
function useRemotionPlayableUrl(apiUrl: string | null) {
  const [playableUrl, setPlayableUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apiUrl) {
      setPlayableUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();
    setLoading(true);

    fetchRemotionMp4Blob(apiUrl, { signal: ac.signal })
      .then((blob) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        setPlayableUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      })
      .catch(() => {
        if (!cancelled && !ac.signal.aborted) {
          toast.error(
            "Could not load the MP4 — check you are logged in and NEXT_PUBLIC_LEJEL_API_URL matches the API.",
          );
          setPlayableUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      ac.abort();
      setPlayableUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [apiUrl]);

  return { playableUrl, loading };
}

// ─── Generate Tab ─────────────────────────────────────────────────────────────

function GenerateTab() {
  const t = useTranslations("remotionPage");
  const qc = useQueryClient();
  const assetInputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<LlmModel>("claude-sonnet-4-6");
  const [canvasPresetId, setCanvasPresetId] =
    useState<(typeof CANVAS_PRESETS)[number]["id"]>("1080x1920");
  const [durationSeconds, setDurationSeconds] = useState(7);
  const [fps, setFps] = useState(30);
  const [tsxSource, setTsxSource] = useState("");
  const [generationPromptUsed, setGenerationPromptUsed] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [assetRows, setAssetRows] = useState<RemotionAssetRow[]>([]);
  const [renderInputProps, setRenderInputProps] = useState<Record<string, string>>({});
  const [uploadBusy, setUploadBusy] = useState(false);
  const [revisionPrompt, setRevisionPrompt] = useState("");

  const { playableUrl, loading: playableLoading } = useRemotionPlayableUrl(outputUrl);

  const canvas = CANVAS_PRESETS.find((c) => c.id === canvasPresetId) ?? CANVAS_PRESETS[0];
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const previewAspectRatio = `${canvasWidth} / ${canvasHeight}`;

  const fpsSafe = clampFps(fps);
  const durationSecondsSafe = clampSecondsForFps(durationSeconds, fpsSafe);
  const durationInFrames = totalFramesFromSeconds(durationSeconds, fpsSafe);

  const setFpsAndClampDuration = (nextFps: number) => {
    const f = clampFps(nextFps);
    setFps(f);
    setDurationSeconds((prev) => clampSecondsForFps(prev, f));
  };

  useEffect(() => {
    if (assetRows.length === 0) setRenderInputProps({});
  }, [assetRows.length]);

  const userAssetsPayload = assetRows.map((r) => {
    const raw = (r.label.trim() || r.fileName || "Asset").slice(0, 200);
    const label = raw.length >= 2 ? raw : "Asset";
    return { objectKey: r.objectKey, label, kind: r.kind };
  });

  const handleAssetFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      setUploadBusy(true);
      try {
        for (let i = 0; i < list.length; i += 1) {
          const file = list[i];
          const ct = fileToAllowedContentType(file);
          if (!ct) {
            toast.error(t("toastInvalidFileType"));
            continue;
          }
          const presign = await presignR2Upload(ct, "remotion");
          const putHeaders = new Headers(presign.headers || {});
          const resPut = await fetch(presign.uploadUrl, {
            method: presign.method,
            headers: putHeaders,
            body: file,
          });
          if (!resPut.ok) {
            const errText = await resPut.text().catch(() => "");
            throw new Error(errText || `Upload HTTP ${resPut.status}`);
          }
          const done = await completeR2Upload(presign.objectKey);
          setAssetRows((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              objectKey: done.objectKey,
              label: "",
              kind: contentTypeToAssetKind(ct),
              fileName: file.name || done.objectKey,
            },
          ]);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("503") || msg.toLowerCase().includes("not configured")) {
          toast.error(t("toastR2Unavailable"));
        } else {
          toast.error(`${t("toastUploadFailed")}: ${msg}`);
        }
      } finally {
        setUploadBusy(false);
        if (assetInputRef.current) assetInputRef.current.value = "";
      }
    },
    [t],
  );

  const generateTsxMut = useMutation({
    mutationFn: () =>
      generateRemotionTsx({
        prompt,
        model,
        width: canvasWidth,
        height: canvasHeight,
        ...(userAssetsPayload.length ? { userAssets: userAssetsPayload } : {}),
      }),
    onSuccess: (data) => {
      setTsxSource(data.tsxSource);
      setGenerationPromptUsed(data.prompt);
      setOutputUrl(null);
      const nextProps = data.inputProps ?? {};
      setRenderInputProps(nextProps);
      toast.success(t("toastTsxReady"));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || t("toastTsxFailed"));
    },
  });

  const reviseTsxMut = useMutation({
    mutationFn: () =>
      reviseRemotionTsx({
        existingTsx: tsxSource,
        revisionPrompt: revisionPrompt.trim(),
        model,
        width: canvasWidth,
        height: canvasHeight,
      }),
    onSuccess: (data) => {
      setTsxSource(data.tsxSource);
      setRevisionPrompt("");
      setOutputUrl(null);
      toast.success(t("toastReviseSuccess"));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || t("toastReviseFailed"));
    },
  });

  const renderMut = useMutation({
    mutationFn: () =>
      renderRemotionFromTsx({
        tsxSource,
        durationInFrames,
        fps: fpsSafe,
        width: canvasWidth,
        height: canvasHeight,
        ...(Object.keys(renderInputProps).length > 0
          ? { inputProps: renderInputProps as Record<string, unknown> }
          : {}),
      }),
    onSuccess: (data) => {
      setOutputUrl(data.outputUrl);
      toast.success(t("toastRenderSuccess"));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || t("toastRenderFailed"));
    },
  });

  const handleSave = async () => {
    if (!tsxSource.trim() || !saveName.trim()) return;
    setIsSaving(true);
    try {
      await saveRemotionTemplate({
        name: saveName.trim(),
        description: saveDesc.trim() || undefined,
        tsxSource,
        generationPrompt: generationPromptUsed ?? undefined,
        durationInFrames,
        fps: fpsSafe,
        width: canvasWidth,
        height: canvasHeight,
        ...(Object.keys(renderInputProps).length > 0
          ? { defaultInputProps: renderInputProps as Record<string, unknown> }
          : {}),
        ...(userAssetsPayload.length ? { remotionAssetRefs: userAssetsPayload } : {}),
      });
      toast.success(t("toastTemplateSaved"));
      qc.invalidateQueries({ queryKey: ["remotion-templates"] });
      setSaveName("");
      setSaveDesc("");
    } catch {
      toast.error(t("toastTemplateSaveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="p-5 space-y-3">
          <div className="text-sm font-medium text-zinc-200">{t("assetsSection")}</div>
          <p className="text-xs text-zinc-500">{t("assetsHint")}</p>
          <input
            ref={assetInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,.mp4,.mov"
            className="hidden"
            multiple
            onChange={(e) => void handleAssetFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300"
            disabled={uploadBusy}
            onClick={() => assetInputRef.current?.click()}
          >
            {uploadBusy ? t("uploadingAssets") : t("addAsset")}
          </Button>
          {assetRows.length > 0 ? (
            <ul className="space-y-2">
              {assetRows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-950/50 p-3 sm:flex-row sm:items-end sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="truncate text-xs text-zinc-400">{row.fileName}</div>
                    <div className="text-[11px] text-zinc-500">
                      {row.kind === "image" ? t("kindImage") : t("kindVideo")}
                    </div>
                    <Input
                      className="h-8 border-zinc-700 bg-zinc-900 text-sm text-zinc-100"
                      placeholder={t("assetLabelPlaceholder")}
                      value={row.label}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssetRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, label: v } : r)),
                        );
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-zinc-500 hover:text-red-400"
                    onClick={() =>
                      setAssetRows((prev) => prev.filter((r) => r.id !== row.id))
                    }
                  >
                    {t("removeAsset")}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      {/* Prompt */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">{t("promptLabel")}</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("promptPlaceholder")}
              className="min-h-[140px] resize-y border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">{t("canvasSize")}</Label>
              <Select
                value={canvasPresetId}
                onChange={(e) =>
                  setCanvasPresetId(e.target.value as (typeof CANVAS_PRESETS)[number]["id"])
                }
                className="h-9 text-sm"
              >
                {CANVAS_PRESETS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">{t("model")}</Label>
              <Select
                value={model}
                onChange={(e) => setModel(e.target.value as LlmModel)}
                className="h-9 text-sm"
              >
                {LLM_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">{t("fpsLabel")}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={24}
                  max={60}
                  step={1}
                  value={fps}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    setFpsAndClampDuration(v);
                  }}
                  className="h-9 border-zinc-700 bg-zinc-800 font-mono text-sm text-zinc-100"
                />
                <div className="flex gap-1">
                  {([24, 30, 60] as const).map((v) => (
                    <Button
                      key={v}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 border-zinc-600 px-2 text-xs text-zinc-300"
                      onClick={() => setFpsAndClampDuration(v)}
                    >
                      {v}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">{t("durationLabel")}</Label>
              <Select
                value={
                  DURATION_PRESETS_SEC.some((p) => p.seconds === durationSeconds)
                    ? String(durationSeconds)
                    : "custom"
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "custom") return;
                  setDurationSeconds(clampSecondsForFps(Number(v), fpsSafe));
                }}
                className="h-9 text-sm"
              >
                {DURATION_PRESETS_SEC.map((p) => (
                  <option key={p.seconds} value={p.seconds}>
                    {p.label}
                  </option>
                ))}
                <option value="custom">Custom…</option>
              </Select>
              <Input
                type="number"
                min={30 / fpsSafe}
                max={3600 / fpsSafe}
                step={0.1}
                value={durationSeconds}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  setDurationSeconds(clampSecondsForFps(v, fpsSafe));
                }}
                className="h-9 border-zinc-700 bg-zinc-800 font-mono text-sm text-zinc-100"
              />
              <p className="text-[11px] text-zinc-500">
                Render length: <span className="font-mono text-zinc-300">{durationInFrames}</span>{" "}
                frames ({durationSecondsSafe.toFixed(2)}s × {fpsSafe} fps)
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => generateTsxMut.mutate()}
            disabled={!prompt.trim() || generateTsxMut.isPending}
            variant="outline"
            className="w-full border-amber-600/50 text-amber-400 hover:bg-amber-950/40 hover:text-amber-300"
          >
            {generateTsxMut.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("generatingTsx")}
              </>
            ) : (
              <>
                <Code2 className="mr-2 h-4 w-4" />
                {t("generateTsx")}
              </>
            )}
          </Button>

          {generateTsxMut.isPending && (
            <p className="text-center text-xs text-zinc-500">{t("generatingTsxHelp")}</p>
          )}
        </CardContent>
      </Card>

      {/* TSX editor — always visible so you can paste or edit after Generate TSX */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-amber-500" />
              <Label className="text-sm font-medium text-zinc-200">{t("compositionLabel")}</Label>
            </div>
            <p className="text-xs text-zinc-500">{t("compositionHint")}</p>
          </div>
          <Textarea
            value={tsxSource}
            onChange={(e) => setTsxSource(e.target.value)}
            spellCheck={false}
            placeholder={t("compositionPlaceholder")}
            className="min-h-[360px] resize-y border-zinc-700 bg-zinc-950 font-mono text-xs leading-relaxed text-zinc-200 placeholder:text-zinc-600"
          />

          {tsxSource.trim() ? (
            <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
              <Label className="text-xs text-zinc-400">{t("reviseTitle")}</Label>
              <Textarea
                value={revisionPrompt}
                onChange={(e) => setRevisionPrompt(e.target.value)}
                placeholder={t("revisePlaceholder")}
                className="min-h-[72px] resize-y border-zinc-700 bg-zinc-900 text-sm text-zinc-100"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-zinc-600 text-zinc-200"
                disabled={!revisionPrompt.trim() || reviseTsxMut.isPending}
                onClick={() => reviseTsxMut.mutate()}
              >
                {reviseTsxMut.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    {t("revising")}
                  </>
                ) : (
                  t("reviseCta")
                )}
              </Button>
            </div>
          ) : null}

          <Button
            type="button"
            onClick={() => renderMut.mutate()}
            disabled={!tsxSource.trim() || renderMut.isPending}
            className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400"
          >
            {renderMut.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("rendering")}
              </>
            ) : (
              <>
                <Film className="mr-2 h-4 w-4" />
                {t("renderCta")}
              </>
            )}
          </Button>

          {renderMut.isPending && (
            <p className="text-center text-xs text-zinc-500">{t("renderingHelp")}</p>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {outputUrl && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-zinc-200">{t("renderedVideo")}</span>
            </div>

            {playableLoading && (
              <div className="flex justify-center py-12 text-zinc-500">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            {!playableLoading && playableUrl && (
              <video
                src={playableUrl}
                controls
                className="mx-auto block w-full max-w-md rounded-lg border border-zinc-700"
                style={{ aspectRatio: previewAspectRatio }}
              />
            )}

            <div className="flex flex-wrap gap-2">
              <a
                href={playableUrl ?? "#"}
                download={playableUrl ? "motion-graphic.mp4" : undefined}
                target="_blank"
                rel="noreferrer"
                className={!playableUrl || playableLoading ? "pointer-events-none opacity-50" : ""}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:text-zinc-100"
                  disabled={!playableUrl || playableLoading}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download MP4
                </Button>
              </a>
            </div>

            {/* Save as template */}
            <div className="space-y-3 rounded-md border border-zinc-700 bg-zinc-800/60 p-4">
              <p className="text-xs font-medium text-zinc-400">{t("saveTemplateSection")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">{t("templateName")}</Label>
                  <Input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="e.g. Dark Industrial BG"
                    className="h-9 border-zinc-700 bg-zinc-700 text-zinc-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">{t("templateDescription")}</Label>
                  <Input
                    value={saveDesc}
                    onChange={(e) => setSaveDesc(e.target.value)}
                    placeholder="Short description…"
                    className="h-9 border-zinc-700 bg-zinc-700 text-zinc-100"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!saveName.trim() || isSaving}
                size="sm"
                className="bg-zinc-600 text-zinc-100 hover:bg-zinc-500"
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                {t("saveTemplate")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({
  tpl,
  onDelete,
}: {
  tpl: RemotionTemplate;
  onDelete: (id: string) => void;
}) {
  const [isRendering, setIsRendering] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(tpl.lastOutputUrl);
  const { playableUrl, loading: playableLoading } = useRemotionPlayableUrl(outputUrl);

  const handleRender = async () => {
    setIsRendering(true);
    try {
      const res = await renderRemotionTemplate(tpl.id);
      setOutputUrl(res.outputUrl);
      toast.success("Rendered successfully!");
    } catch {
      toast.error("Render failed");
    } finally {
      setIsRendering(false);
    }
  };

  const durSeconds = (tpl.durationInFrames / tpl.fps).toFixed(1);

  return (
    <Card className="border-zinc-800 bg-zinc-900 flex flex-col">
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        {/* Preview or placeholder */}
        <div
          className="relative rounded-md overflow-hidden bg-zinc-800 flex items-center justify-center w-full"
          style={{
            aspectRatio: `${tpl.width} / ${tpl.height}`,
            maxHeight: tpl.width >= tpl.height ? 140 : 220,
          }}
        >
          {outputUrl && playableLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          ) : outputUrl && playableUrl ? (
            <video src={playableUrl} controls className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-600">
              <Film className="h-8 w-8" />
              <span className="text-xs">Not yet rendered</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-zinc-100 truncate">{tpl.name}</p>
          {tpl.description && (
            <p className="text-xs text-zinc-400 line-clamp-2">{tpl.description}</p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock className="h-3 w-3" />
            {durSeconds}s · {tpl.fps}fps · {tpl.width}×{tpl.height}
          </div>
          {tpl.generationPrompt && (
            <p className="text-xs text-zinc-500 italic line-clamp-2">"{tpl.generationPrompt}"</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            onClick={handleRender}
            disabled={isRendering}
            className="flex-1 bg-amber-500 text-zinc-950 hover:bg-amber-400 text-xs"
          >
            {isRendering ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">{isRendering ? "Rendering…" : "Re-render"}</span>
          </Button>

          {outputUrl && (
            <a
              href={playableUrl ?? "#"}
              download={playableUrl ? `${tpl.name.replace(/[^\w.-]+/g, "_")}.mp4` : undefined}
              target="_blank"
              rel="noreferrer"
              className={!playableUrl || playableLoading ? "pointer-events-none opacity-50" : ""}
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!playableUrl || playableLoading}
                className="border-zinc-700 text-zinc-400 hover:text-zinc-100"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDelete(tpl.id)}
            className="border-zinc-700 text-zinc-500 hover:border-red-800 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Templates Tab ─────────────────────────────────────────────────────────────

function TemplatesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["remotion-templates"],
    queryFn: () => listRemotionTemplates(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRemotionTemplate(id),
    onSuccess: () => {
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["remotion-templates"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const templates = data?.templates ?? [];

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-700 py-20 text-center">
        <LayoutTemplate className="h-10 w-10 text-zinc-600" />
        <p className="text-sm text-zinc-400">No templates saved yet.</p>
        <p className="text-xs text-zinc-500">
          Render a motion graphic from the Generate tab and save it as a template to reuse it here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {templates.map((tpl) => (
        <TemplateCard
          key={tpl.id}
          tpl={tpl}
          onDelete={(id) => deleteMut.mutate(id)}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RemotionPage() {
  const [tab, setTab] = useState<Tab>("generate");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Motion Graphics</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Generate TSX from a prompt, review or fix the code in the editor, then render. Choose canvas
          size, duration in seconds, and fps — the app converts that to the exact frame count for the
          render. Save a template to reuse the same settings.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 w-fit">
        {(["generate", "templates"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t === "generate" ? (
              <Wand2 className="h-3.5 w-3.5" />
            ) : (
              <LayoutTemplate className="h-3.5 w-3.5" />
            )}
            {t === "generate" ? "Generate" : "Templates"}
          </button>
        ))}
      </div>

      {tab === "generate" ? <GenerateTab /> : <TemplatesTab />}
    </div>
  );
}
