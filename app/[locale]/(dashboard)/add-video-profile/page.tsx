"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/auth-context";
import {
  createProfile,
  updateProfile,
  listFonts,
  listProfiles,
  renderProfilePreview,
} from "@/lib/api";
import {
  RATIOS,
  RESOLUTIONS,
  resolveDimensions,
  type Ratio,
  type Resolution,
} from "@/lib/profile-dimensions";
import type { TextStyleConfig, SubtitleConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AlignmentSelector } from "@/components/alignment-selector";
import { LayoutPreviewDiagram } from "@/components/layout-preview-diagram";

function defaultTextStyle(): TextStyleConfig {
  return {
    enabled: false,
    font: "Noto Sans CJK KR",
    fontSize: 48,
    fontColor: "#FFFFFF",
    highlightColor: "#FF0000",
    outlineColor: "#000000",
    outlineWidth: 5,
    background: false,
    backColor: "#000000",
    alignment: 2,
    yOffset: 0,
    xOffset: 0,
    bold: false,
    italic: false,
  };
}

function defaultSubtitle(): SubtitleConfig {
  return { ...defaultTextStyle(), enabled: true, socialMediaStyle: false };
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <div
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-amber-500" : "bg-zinc-700"}`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </div>
      <span className="text-sm text-zinc-300">{label}</span>
    </label>
  );
}

function DimensionSection({
  title,
  description,
  ratio,
  resolution,
  xOffset,
  yOffset,
  onRatioChange,
  onResolutionChange,
  onXOffsetChange,
  onYOffsetChange,
}: {
  title: string;
  description?: string;
  ratio: Ratio;
  resolution: Resolution;
  xOffset?: number;
  yOffset?: number;
  onRatioChange: (v: Ratio) => void;
  onResolutionChange: (v: Resolution) => void;
  onXOffsetChange?: (v: number) => void;
  onYOffsetChange?: (v: number) => void;
}) {
  const te = useTranslations("videoProfiles.editor");
  const dims = resolveDimensions(ratio, resolution);
  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardContent className="space-y-4 pt-6">
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        {description && (
          <p className="text-sm text-zinc-500">{description}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">{te("ratio")}</Label>
            <Select
              value={ratio}
              onChange={(e) => onRatioChange(e.target.value as Ratio)}
            >
              {RATIOS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">{te("resolution")}</Label>
            <Select
              value={resolution}
              onChange={(e) => onResolutionChange(e.target.value as Resolution)}
            >
              {RESOLUTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">{te("dimensions")}</Label>
            <div className="flex h-10 items-center rounded-md border border-zinc-700 bg-zinc-950/40 px-3 text-sm text-zinc-300">
              {te("dimensionPixels", { width: dims.width, height: dims.height })}
            </div>
          </div>
        </div>
        {onXOffsetChange && onYOffsetChange && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">{te("xOffset", { px: xOffset ?? 0 })}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={-2000}
                  max={2000}
                  step={1}
                  value={xOffset ?? 0}
                  onChange={(e) => onXOffsetChange(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <Input
                  type="number"
                  min={-5000}
                  max={5000}
                  value={xOffset ?? 0}
                  onChange={(e) => onXOffsetChange(Number(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">{te("yOffset", { px: yOffset ?? 0 })}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={-2000}
                  max={2000}
                  step={1}
                  value={yOffset ?? 0}
                  onChange={(e) => onYOffsetChange(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <Input
                  type="number"
                  min={-5000}
                  max={5000}
                  value={yOffset ?? 0}
                  onChange={(e) => onYOffsetChange(Number(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TextStyleSection({
  title,
  style,
  onChange,
  fonts,
  showSocialMedia,
}: {
  title: string;
  style: TextStyleConfig & { socialMediaStyle?: boolean };
  onChange: (s: TextStyleConfig & { socialMediaStyle?: boolean }) => void;
  fonts: string[];
  showSocialMedia?: boolean;
}) {
  const te = useTranslations("videoProfiles.editor");
  const set = <K extends keyof typeof style>(key: K, val: (typeof style)[K]) =>
    onChange({ ...style, [key]: val });

  if (!style.enabled) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
            <Toggle label={te("enabled")} checked={false} onChange={(v) => set("enabled", v)} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <Toggle label={te("enabled")} checked={true} onChange={(v) => set("enabled", v)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {showSocialMedia && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Toggle
                label={te("socialMediaStyle")}
                checked={!!style.socialMediaStyle}
                onChange={(v) => set("socialMediaStyle", v)}
              />
            </div>
          )}

          <Toggle
            label={te("background")}
            checked={style.background}
            onChange={(v) => set("background", v)}
          />

          <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
            <Toggle label={te("bold")} checked={style.bold} onChange={(v) => set("bold", v)} />
            <Toggle label={te("italic")} checked={style.italic} onChange={(v) => set("italic", v)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">{te("font")}</Label>
            <Select value={style.font} onChange={(e) => set("font", e.target.value)}>
              {fonts.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
              {!fonts.includes(style.font) && (
                <option value={style.font}>{style.font}</option>
              )}
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">{te("fontSize")}</Label>
            <Input
              type="number"
              min={1}
              max={999}
              value={style.fontSize}
              onChange={(e) => set("fontSize", Number(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">{te("fontColor")}</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={style.fontColor}
                onChange={(e) => set("fontColor", e.target.value.toUpperCase())}
                className="h-10 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent"
              />
              <Input
                value={style.fontColor}
                onChange={(e) => set("fontColor", e.target.value.toUpperCase())}
                className="flex-1"
                maxLength={7}
              />
            </div>
          </div>

          {(showSocialMedia && style.socialMediaStyle) && (
            <div className="space-y-1">
              <Label className="text-xs text-zinc-500">{te("highlightColor")}</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={style.highlightColor}
                  onChange={(e) => set("highlightColor", e.target.value.toUpperCase())}
                  className="h-10 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent"
                />
                <Input
                  value={style.highlightColor}
                  onChange={(e) => set("highlightColor", e.target.value.toUpperCase())}
                  className="flex-1"
                  maxLength={7}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">{te("outlineColor")}</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={style.outlineColor}
                onChange={(e) => set("outlineColor", e.target.value.toUpperCase())}
                className="h-10 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent"
              />
              <Input
                value={style.outlineColor}
                onChange={(e) => set("outlineColor", e.target.value.toUpperCase())}
                className="flex-1"
                maxLength={7}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">{te("outlineWidth")}</Label>
            <Input
              type="number"
              min={0}
              max={50}
              value={style.outlineWidth}
              onChange={(e) => set("outlineWidth", Number(e.target.value))}
            />
          </div>

          {style.background && (
            <div className="space-y-1">
              <Label className="text-xs text-zinc-500">{te("backColor")}</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={style.backColor}
                  onChange={(e) => set("backColor", e.target.value.toUpperCase())}
                  className="h-10 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent"
                />
                <Input
                  value={style.backColor}
                  onChange={(e) => set("backColor", e.target.value.toUpperCase())}
                  className="flex-1"
                  maxLength={7}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">{te("alignment")}</Label>
            <AlignmentSelector
              value={style.alignment}
              onChange={(v) => set("alignment", v)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs text-zinc-500">{te("xOffset", { px: style.xOffset })}</Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={-2000}
                max={2000}
                step={1}
                value={style.xOffset}
                onChange={(e) => set("xOffset", Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <Input
                type="number"
                min={-5000}
                max={5000}
                value={style.xOffset}
                onChange={(e) => set("xOffset", Number(e.target.value) || 0)}
                className="w-24"
              />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label className="text-xs text-zinc-500">{te("yOffset", { px: style.yOffset })}</Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={-2000}
                max={2000}
                step={1}
                value={style.yOffset}
                onChange={(e) => set("yOffset", Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <Input
                type="number"
                min={-5000}
                max={5000}
                value={style.yOffset}
                onChange={(e) => set("yOffset", Number(e.target.value) || 0)}
                className="w-24"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AddVideoProfilePage() {
  const t = useTranslations("videoProfiles");
  const tc = useTranslations("common");
  const router = useRouter();
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const editId = searchParams.get("profileId");
  const isEdit = !!editId;

  const [profileId, setProfileId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [canvasRatio, setCanvasRatio] = useState<Ratio>("16:9");
  const [canvasResolution, setCanvasResolution] = useState<Resolution>("1080p");
  const [contentRatio, setContentRatio] = useState<Ratio>("16:9");
  const [contentResolution, setContentResolution] = useState<Resolution>("1080p");
  const [contentXOffset, setContentXOffset] = useState(0);
  const [contentYOffset, setContentYOffset] = useState(0);
  const [subtitle, setSubtitle] = useState<SubtitleConfig>(defaultSubtitle());
  const [topHeadline, setTopHeadline] = useState<TextStyleConfig>({
    ...defaultTextStyle(),
    enabled: true,
    fontSize: 120,
    alignment: 8,
  });
  const [bottomHeadline, setBottomHeadline] = useState<TextStyleConfig>({
    ...defaultTextStyle(),
    enabled: true,
    fontSize: 100,
    alignment: 2,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const { data: fonts = [] } = useQuery({
    queryKey: ["fonts"],
    queryFn: listFonts,
  });

  const { data: profiles } = useQuery({
    queryKey: ["video-profiles"],
    queryFn: listProfiles,
    enabled: isEdit,
  });

  useEffect(() => {
    if (!isEdit || !profiles) return;
    const p = profiles.find((pr) => pr.profileId === editId);
    if (!p) return;
    setProfileId(p.profileId);
    setName(p.name);
    setDescription(p.description);
    setCanvasRatio(p.canvas.ratio);
    setCanvasResolution(p.canvas.resolution);
    setContentRatio(p.content.ratio);
    setContentResolution(p.content.resolution);
    setContentXOffset(p.content.xOffset ?? 0);
    setContentYOffset(p.content.yOffset ?? 0);
    setSubtitle(p.subtitle);
    setTopHeadline(p.headline.top);
    setBottomHeadline(p.headline.bottom);
  }, [isEdit, editId, profiles]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        profileId,
        name,
        description,
        canvas: { ratio: canvasRatio, resolution: canvasResolution },
        content: {
          ratio: contentRatio,
          resolution: contentResolution,
          xOffset: contentXOffset,
          yOffset: contentYOffset,
        },
        subtitle,
        headline: { top: topHeadline, bottom: bottomHeadline },
      };
      if (isEdit) {
        const { profileId: _id, ...rest } = payload;
        return updateProfile(editId!, rest);
      }
      return createProfile(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? t("toastProfileUpdated") : t("toastProfileCreated"));
      router.push("/video-profiles");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toastProfileError"));
    },
  });

  async function handleRenderPreview() {
    setPreviewLoading(true);
    try {
      const { imageDataUrl } = await renderProfilePreview({
        canvas: { ratio: canvasRatio, resolution: canvasResolution },
        content: {
          ratio: contentRatio,
          resolution: contentResolution,
          xOffset: contentXOffset,
          yOffset: contentYOffset,
        },
        subtitle,
        headline: { top: topHeadline, bottom: bottomHeadline },
      });
      setPreviewImage(imageDataUrl);
      setPreviewOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastPreviewRenderError"));
    } finally {
      setPreviewLoading(false);
    }
  }

  if (!isAdmin) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardContent className="pt-6 text-sm text-zinc-400">
          {t("adminOnlyManageProfiles")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">
        {isEdit ? t("editProfile") : t("addProfile")}
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left column — form */}
        <div className="flex-1 space-y-6">
          {/* Profile Info */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardContent className="space-y-4 pt-6">
              <h2 className="text-lg font-semibold text-zinc-100">{t("profileInfo")}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-500">{t("profileIdLabel")}</Label>
                  <Input
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    placeholder={t("profileIdInputPlaceholder")}
                    disabled={isEdit}
                    maxLength={128}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-500">{t("nameLabel")}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("nameInputPlaceholder")}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-500">{t("descriptionLabel")}</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionInputPlaceholder")}
                />
              </div>
            </CardContent>
          </Card>

          <DimensionSection
            title={t("canvasTitle")}
            description={t("canvasDescription")}
            ratio={canvasRatio}
            resolution={canvasResolution}
            onRatioChange={setCanvasRatio}
            onResolutionChange={setCanvasResolution}
          />

          <DimensionSection
            title={t("contentTitle")}
            description={t("contentDescription")}
            ratio={contentRatio}
            resolution={contentResolution}
            xOffset={contentXOffset}
            yOffset={contentYOffset}
            onRatioChange={setContentRatio}
            onResolutionChange={setContentResolution}
            onXOffsetChange={setContentXOffset}
            onYOffsetChange={setContentYOffset}
          />

          <TextStyleSection
            title={t("subtitleTitle")}
            style={subtitle}
            onChange={(s) => setSubtitle(s as SubtitleConfig)}
            fonts={fonts}
            showSocialMedia
          />

          <TextStyleSection
            title={t("headlineTopTitle")}
            style={topHeadline}
            onChange={setTopHeadline}
            fonts={fonts}
          />

          <TextStyleSection
            title={t("headlineBottomTitle")}
            style={bottomHeadline}
            onChange={setBottomHeadline}
            fonts={fonts}
          />

          <div className="flex items-center gap-3">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !profileId || !name}
              className="min-w-[140px]"
            >
              {saveMutation.isPending
                ? t("saving")
                : isEdit
                  ? t("updateButton")
                  : t("createButton")}
            </Button>
            <Button
              variant="outline"
              className="border-zinc-700"
              onClick={() => router.push("/video-profiles")}
            >
              {t("cancelButton")}
            </Button>
          </div>
        </div>

        {/* Right column — sticky live preview */}
        <div className="w-full lg:w-[340px]">
          <div className="lg:sticky lg:top-6">
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="flex flex-col items-center gap-4 pt-6">
                <h2 className="text-sm font-semibold text-zinc-300">
                  {t("livePreview")}
                </h2>
                <LayoutPreviewDiagram
                  canvasRatio={canvasRatio}
                  canvasResolution={canvasResolution}
                  contentRatio={contentRatio}
                  contentResolution={contentResolution}
                  contentXOffset={contentXOffset}
                  contentYOffset={contentYOffset}
                  subtitle={subtitle}
                  headlineTop={topHeadline}
                  headlineBottom={bottomHeadline}
                />
                <Button
                  variant="secondary"
                  onClick={handleRenderPreview}
                  disabled={previewLoading}
                  className="w-full"
                >
                  {previewLoading ? t("renderingPreview") : t("showPreviewButton")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6">
          <div className="h-[95vh] w-[98vw] rounded-xl border border-zinc-700 bg-zinc-950 p-4 sm:h-[92vh] sm:w-[92vw]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">{t("previewFfmpegTitle")}</h3>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                {tc("close")}
              </Button>
            </div>
            <div className="flex h-[calc(100%-3rem)] items-center justify-center rounded border border-zinc-800 bg-zinc-900 p-2">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={t("previewImageAlt")}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <p className="p-6 text-sm text-zinc-400">{t("previewNoImageYet")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
