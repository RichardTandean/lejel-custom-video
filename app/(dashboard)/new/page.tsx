"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createVideoRequest, getYouTubeConnections } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { createVideoRequestSchema } from "@/lib/validations";
import { Plus, Trash2 } from "lucide-react";

export default function NewRequestPage() {
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

  const { data: channels = [] } = useQuery({
    queryKey: ["youtube-connections"],
    queryFn: getYouTubeConnections,
  });

  const createMutation = useMutation({
    mutationFn: createVideoRequest,
    onSuccess: (data) => {
      toast.success("Request dibuat");
      router.push(`/requests/${data.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal membuat request");
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
      setSegmentError("Minimal satu segment wajib diisi");
      return;
    }
    createMutation.mutate(result.data);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Buat Video</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Segment (1 input per segment)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSegment}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Tambah segment
            </Button>
          </div>
          {segments.map((value, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-zinc-500">
                  Segment {index + 1}
                </Label>
                <Textarea
                  rows={3}
                  placeholder={`Isi segment ${index + 1}...`}
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
          <Label>Upload ke channel (opsional)</Label>
          <Select {...form.register("youtubeConnectionId")}>
            <option value="">Tidak upload / hanya generate</option>
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
            <Label>Visibility di YouTube</Label>
            <Select {...form.register("youtubePrivacyStatus")}>
              <option value="private">Private – hanya lu</option>
              <option value="unlisted">Unlisted – yang punya link bisa lihat</option>
              <option value="public">Public – semua orang bisa lihat</option>
            </Select>
          </div>
        )}
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Membuat..." : "Generate video"}
        </Button>
      </form>
    </div>
  );
}
