import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

const youtubePrivacyStatusEnum = z.enum(["public", "private", "unlisted"]);

/** Schema untuk 1 input per segment — payload API tetap sama */
export const createVideoRequestSchema = z.object({
  segments: z.array(z.string()),
  youtubeConnectionId: z.string().optional(),
  youtubePrivacyStatus: youtubePrivacyStatusEnum.optional().default("private"),
}).refine((data) => data.segments.some((s) => s.trim().length > 0), {
  message: "Minimal satu segment wajib diisi",
  path: ["segments"],
}).transform((data) => {
  const segmentedScripts = data.segments.map((s) => s.trim()).filter(Boolean);
  const fullScript = segmentedScripts.join(" ");
  const connectionId = data.youtubeConnectionId?.trim() || undefined;
  const youtubePrivacyStatus =
    connectionId && data.youtubePrivacyStatus
      ? (data.youtubePrivacyStatus as "public" | "private" | "unlisted")
      : undefined;
  return {
    fullScript,
    segmentedScripts,
    connectionId,
    youtubePrivacyStatus,
  };
});

/** Legacy: schema dengan fullScript + segmentedScriptsText (untuk backward compat) */
export const createVideoRequestSchemaLegacy = z.object({
  fullScript: z.string().min(1, "Full script wajib diisi"),
  segmentedScriptsText: z.string().optional(),
  youtubeConnectionId: z.string().optional(),
}).transform((data) => {
  let segmentedScripts: string[] = [];
  const trimmed = (data.segmentedScriptsText ?? "").trim();
  if (trimmed) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        segmentedScripts = parsed.filter((x): x is string => typeof x === "string");
      } else if (typeof parsed === "string") {
        segmentedScripts = [parsed];
      }
    } catch {
      segmentedScripts = trimmed.split("\n").map((s) => s.trim()).filter(Boolean);
    }
  }
  if (segmentedScripts.length === 0) {
    segmentedScripts = [data.fullScript.trim()];
  }
  return {
    fullScript: data.fullScript.trim(),
    segmentedScripts,
    youtubeConnectionId: data.youtubeConnectionId || undefined,
  };
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
/** Form values (before transform) for create video request */
export type CreateVideoRequestFormInput = z.input<typeof createVideoRequestSchema>;
/** API body (after transform) for create video request */
export type CreateVideoRequestInput = z.output<typeof createVideoRequestSchema>;
