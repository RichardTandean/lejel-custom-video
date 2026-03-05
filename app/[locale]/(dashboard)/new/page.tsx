"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { createVideoRequest, getYouTubeConnections } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { getCreateVideoRequestSchema, type ValidationT } from "@/lib/validations";
import { Plus, Trash2 } from "lucide-react";

export default function NewRequestPage() {
  const t = useTranslations("newRequest");
  const tValidation = useTranslations("validation");
  const router = useRouter();
  const [segments, setSegments] = useState<string[]>([""]);
  const [segmentError, setSegmentError] = useState<string | null>(null);

  const form = useForm<{
    youtubeConnectionId: string;
    youtubePrivacyStatus: "public" | "private" | "unlisted";
  }>({
    defaultValues: {
      youtubeConnectionId: "",
      youtubePrivacyStatus: "private",
    },
  });

  const selectedConnectionId = form.watch("youtubeConnectionId");

  const createVideoRequestSchema = useMemo(
    () => getCreateVideoRequestSchema(tValidation as unknown as ValidationT),
    [tValidation]
  );

  const { data: channels = [] } = useQuery({
    queryKey: ["youtube-connections"],
    queryFn: getYouTubeConnections,
  });

  const createMutation = useMutation({
    mutationFn: createVideoRequest,
    onSuccess: (data) => {
      toast.success(t("toastSuccess"));
      router.push(`/requests/${data.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    },
  });

  function addSegment() {
    setSegments((s) => [...s, ""]);
    setSegmentError(null);
  }

  function removeSegment(index: number) {
    if (segments.length <= 1) return;
    setSegments((s) => {
      const next = s.filter((_, i) => i !== index);
      const hasEmpty = next.some((seg) => seg.trim() === "");
      if (!hasEmpty) next.push("");
      return next;
    });
    setSegmentError(null);
  }

  function updateSegment(index: number, value: string) {
    setSegments((s) => {
      const next = [...s];
      next[index] = value;
      const hasEmpty = next.some((seg) => seg.trim() === "");
      if (!hasEmpty) next.push("");
      return next;
    });
    setSegmentError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSegmentError(null);
    const result = createVideoRequestSchema.safeParse({
      segments,
      youtubeConnectionId: form.getValues("youtubeConnectionId"),
      youtubePrivacyStatus: form.getValues("youtubePrivacyStatus"),
    });
    if (!result.success) {
      setSegmentError(tValidation("minOneSegment"));
      return;
    }
    createMutation.mutate(result.data);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t("segmentLabel")}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSegment}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              {t("addSegment")}
            </Button>
          </div>
          {segments.map((value, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-zinc-500">
                  {t("segmentN", { n: index + 1 })}
                </Label>
                <Textarea
                  rows={3}
                  placeholder={t("segmentPlaceholder", { n: index + 1 })}
                  value={value}
                  onChange={(e) => updateSegment(index, e.target.value)}
                  className="resize-none"
                />
              </div>
              <div className="flex flex-col justify-end pb-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSegment(index)}
                  disabled={segments.length <= 1}
                  className="text-zinc-400 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {segmentError && (
            <p className="text-sm text-red-400">{segmentError}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>{t("uploadToChannel")}</Label>
          <Select {...form.register("youtubeConnectionId")}>
            <option value="">{t("noUpload")}</option>
            {channels
              .filter((c) => c.connected)
              .map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.label}
                </option>
              ))}
          </Select>
        </div>
        {selectedConnectionId && (
          <div className="space-y-2">
            <Label>{t("visibility")}</Label>
            <Select {...form.register("youtubePrivacyStatus")}>
              <option value="private">{t("visibilityPrivate")}</option>
              <option value="unlisted">{t("visibilityUnlisted")}</option>
              <option value="public">{t("visibilityPublic")}</option>
            </Select>
          </div>
        )}
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? t("submitting") : t("submit")}
        </Button>
      </form>
    </div>
  );
}
