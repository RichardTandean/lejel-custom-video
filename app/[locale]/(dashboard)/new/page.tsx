"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import {
  createVideoRequest,
  listProfiles,
  listYouTubeConnections,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type LlmModel =
  | "gpt-5-4"
  | "gpt-5-2"
  | "claude-sonnet-4-6"
  | "gemini-3-flash"
  | "gemini-3-pro"
  | "gemini-3.1-pro"
  | "gemini-2.5-flash";

const LLM_OPTIONS: { value: LlmModel; label: string }[] = [
  { value: "gpt-5-4", label: "GPT 5.4" },
  { value: "gpt-5-2", label: "GPT 5.2" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "gemini-3-flash", label: "Gemini 3 Flash" },
  { value: "gemini-3-pro", label: "Gemini 3 Pro" },
  { value: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

const IMAGE_MODEL_OPTIONS = [{ value: "z-image", label: "Z-Image" }] as const;

const VIDEO_MODEL_OPTIONS = [
  { value: "kling-v1.6", label: "Kling v1.6" },
  { value: "kling-v2.1-master", label: "Kling v2.1 Master" },
  { value: "kling-v2.1", label: "Kling v2.1" },
] as const;

function fallbackSegmentScript(script: string): string[] {
  return script
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function NewVideoPage() {
  const router = useRouter();
  const [fullScript, setFullScript] = useState("");
  const [segments, setSegments] = useState<string[]>([]);
  const [model, setModel] = useState<LlmModel>("gpt-5-4");
  const [contentType, setContentType] = useState<"all_image" | "all_video" | "mixed">(
    "mixed",
  );
  const [profileId, setProfileId] = useState("");
  const [imageModel, setImageModel] = useState<string>("z-image");
  const [videoModel, setVideoModel] = useState<string>("kling-v2.1");
  const [uploadMode, setUploadMode] = useState<"none" | "direct" | "pending_approval">(
    "none",
  );
  const [youtubeConnectionId, setYoutubeConnectionId] = useState("");
  const [segmenting, setSegmenting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["video-profiles"],
    queryFn: listProfiles,
  });
  const { data: youtubeConnections = [] } = useQuery({
    queryKey: ["youtube-connections"],
    queryFn: listYouTubeConnections,
    enabled: uploadMode !== "none",
  });

  const canSubmit = useMemo(() => {
    if (segments.length === 0) return false;
    if (!profileId) return false;
    if (uploadMode !== "none" && !youtubeConnectionId) return false;
    return true;
  }, [segments.length, profileId, uploadMode, youtubeConnectionId]);

  async function handleGenerateScript() {
    if (!fullScript.trim()) {
      toast.error("Please input full script first");
      return;
    }
    setSegmenting(true);
    try {
      const result = fallbackSegmentScript(fullScript);
      if (result.length === 0) {
        toast.error("Failed to generate segmented script");
        return;
      }
      setSegments(result);
      toast.success("Segmented script generated");
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

  async function handleGenerateVideo() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createVideoRequest({
        fullScript,
        segmentedScripts: segments.map((s) => s.trim()).filter(Boolean),
        model,
        contentType,
        profileId,
        imageModel,
        videoModel,
        youtubeUploadMode:
          uploadMode === "none"
            ? "none"
            : uploadMode === "direct"
              ? "direct"
              : "pending_approval",
        connectionId: uploadMode === "none" ? undefined : youtubeConnectionId,
      });
      toast.success("Video generation request created");
      router.push("/requests");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create video request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Generate Video</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create segmented script, configure generation options, and submit video generation.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6 text-sm text-zinc-300">
          {segments.length === 0 ? (
            <>
              <div className="space-y-2">
                <Label>Full Script</Label>
                <textarea
                  className="min-h-[220px] w-full rounded-md border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-200"
                  value={fullScript}
                  onChange={(e) => setFullScript(e.target.value)}
                  placeholder="Input full script here..."
                />
              </div>
              <div className="space-y-2">
                <Label>LLM Model</Label>
                <Select value={model} onChange={(e) => setModel(e.target.value as LlmModel)}>
                  {LLM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button onClick={handleGenerateScript} disabled={segmenting || !fullScript.trim()}>
                {segmenting ? "Generating..." : "Generate Script"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Segmented Script Output</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSegments([]);
                    }}
                  >
                    Back
                  </Button>
                </div>
                <div className="space-y-3">
                  {segments.map((segment, idx) => (
                    <div key={`segment-${idx}`} className="space-y-2 rounded-lg border border-zinc-800 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-zinc-500">Segment {idx + 1}</div>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-red-300"
                          onClick={() => {
                            setSegments((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          aria-label={`Delete segment ${idx + 1}`}
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
                        Add Segment Under
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>LLM</Label>
                  <Select value={model} onChange={(e) => setModel(e.target.value as LlmModel)}>
                    {LLM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as "all_image" | "all_video" | "mixed")}
                  >
                    <option value="all_image">All image</option>
                    <option value="all_video">All video</option>
                    <option value="mixed">Both (AI decide)</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Image AI Model</Label>
                  <Select value={imageModel} onChange={(e) => setImageModel(e.target.value)}>
                    {IMAGE_MODEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Video AI Model</Label>
                  <Select value={videoModel} onChange={(e) => setVideoModel(e.target.value)}>
                    {VIDEO_MODEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Video Profile</Label>
                  <Select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                    <option value="">Select profile</option>
                    {profiles.map((p) => (
                      <option key={p.profileId} value={p.profileId}>
                        {p.name} ({p.profileId})
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Upload or Generate</Label>
                  <Select
                    value={uploadMode}
                    onChange={(e) =>
                      setUploadMode(e.target.value as "none" | "direct" | "pending_approval")
                    }
                  >
                    <option value="none">Generate only</option>
                    <option value="direct">Upload to youtube directly</option>
                    <option value="pending_approval">Upload to youtube by approval</option>
                  </Select>
                </div>
              </div>

              {uploadMode !== "none" && (
                <div className="space-y-2">
                  <Label>*Youtube Channel</Label>
                  <Select
                    value={youtubeConnectionId}
                    onChange={(e) => setYoutubeConnectionId(e.target.value)}
                  >
                    <option value="">Select youtube channel</option>
                    {youtubeConnections.map((conn) => (
                      <option key={conn.id} value={conn.id}>
                        {conn.label}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <Button onClick={handleGenerateVideo} disabled={!canSubmit || submitting}>
                {submitting ? "Submitting..." : "Generate Video"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
