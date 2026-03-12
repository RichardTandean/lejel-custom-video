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
import { getCreateVideoRequestSchemaFromFullScript, type ValidationT } from "@/lib/validations";
import { useAuth } from "@/context/auth-context";

export default function NewRequestPage() {
  const t = useTranslations("newRequest");
  const tValidation = useTranslations("validation");
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [script, setScript] = useState("");
  const [scriptError, setScriptError] = useState<string | null>(null);

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
    () => getCreateVideoRequestSchemaFromFullScript(tValidation as unknown as ValidationT),
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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setScriptError(null);
    const result = createVideoRequestSchema.safeParse({
      fullScript: script,
      youtubeConnectionId: form.getValues("youtubeConnectionId"),
      youtubePrivacyStatus: form.getValues("youtubePrivacyStatus"),
    });
    if (!result.success) {
      setScriptError(tValidation("scriptRequired"));
      return;
    }
    createMutation.mutate(result.data);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>{t("scriptLabel")}</Label>
          <Textarea
            rows={12}
            placeholder={t("scriptPlaceholder")}
            value={script}
            onChange={(e) => {
              setScript(e.target.value);
              setScriptError(null);
            }}
            className="resize-y min-h-[200px]"
          />
          {scriptError && (
            <p className="text-sm text-red-400">{scriptError}</p>
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
                  {isAdmin && conn.googleClientEnabled === false
                    ? " (Disabled client)"
                    : ""}
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
