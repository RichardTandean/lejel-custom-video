"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listYouTubeConnections, uploadToYouTube } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function UploadPage() {
  const [form, setForm] = useState({
    videoUrl: "",
    title: "",
    connectionId: "",
    description: "",
    privacyStatus: "private" as "public" | "private" | "unlisted",
    tags: "",
  });
  const [uploading, setUploading] = useState(false);

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["youtube-connections"],
    queryFn: listYouTubeConnections,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.videoUrl || !form.title) {
      toast.error("Isi Video URL dan Title");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadToYouTube({
        videoUrl: form.videoUrl,
        title: form.title,
        connectionId: form.connectionId || undefined,
        description: form.description || undefined,
        privacyStatus: form.privacyStatus,
        tags: form.tags
          ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
      });
      toast.success("Video berhasil diunggah");
      setForm((f) => ({ ...f, videoUrl: "", title: "", description: "", tags: "" }));
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-100">
        Upload ke YouTube
      </h1>
      <p className="text-sm text-zinc-500">
        Unggah video dari URL ke YouTube. Pastikan connection sudah dibuat dan
        terhubung di Settings.
      </p>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL *</Label>
              <Input
                id="videoUrl"
                type="url"
                placeholder="https://lejel-backend.../media/xxx.mp4"
                value={form.videoUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, videoUrl: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Video Title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="connectionId">Connection (opsional)</Label>
              <Select
                id="connectionId"
                value={form.connectionId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, connectionId: e.target.value }))
                }
              >
                <option value="">Gunakan connection pertama</option>
                {connections
                  .filter((c) => c.connected)
                  .map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.label}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Deskripsi video..."
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacyStatus">Privacy</Label>
              <Select
                id="privacyStatus"
                value={form.privacyStatus}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    privacyStatus: e.target.value as "public" | "private" | "unlisted",
                  }))
                }
              >
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="tag1, tag2, tag3"
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
              />
            </div>
            <Button type="submit" disabled={uploading || isLoading}>
              {uploading ? "Mengunggah..." : "Upload ke YouTube"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
