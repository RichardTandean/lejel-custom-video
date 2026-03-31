"use client";
import {
  resolveDimensions,
  type Ratio,
  type Resolution,
} from "@/lib/profile-dimensions";
import type { TextStyleConfig, SubtitleConfig } from "@/types";

interface LayoutPreviewProps {
  canvasRatio: Ratio;
  canvasResolution: Resolution;
  contentRatio: Ratio;
  contentResolution: Resolution;
  contentXOffset?: number;
  contentYOffset?: number;
  subtitle: SubtitleConfig;
  headlineTop: TextStyleConfig;
  headlineBottom: TextStyleConfig;
  className?: string;
  compact?: boolean;
}

const ALIGN_Y: Record<number, "top" | "middle" | "bottom"> = {
  1: "bottom",
  2: "bottom",
  3: "bottom",
  4: "middle",
  5: "middle",
  6: "middle",
  7: "top",
  8: "top",
  9: "top",
};

const ALIGN_X: Record<number, "left" | "center" | "right"> = {
  1: "left",
  2: "center",
  3: "right",
  4: "left",
  5: "center",
  6: "right",
  7: "left",
  8: "center",
  9: "right",
};

function yPct(alignment: number, offset: number, canvasH: number): number {
  const base = ALIGN_Y[alignment] ?? "bottom";
  const offsetPct = (offset / canvasH) * 100;
  if (base === "top") return 8 + offsetPct;
  if (base === "middle") return 50 + offsetPct;
  return 88 - offsetPct;
}

function xAlign(alignment: number): "left" | "center" | "right" {
  const x = ALIGN_X[alignment] ?? "center";
  return x;
}

function xPct(alignment: number, offset: number, canvasW: number): number {
  const anchor = xAlign(alignment);
  const offsetPct = (offset / canvasW) * 100;
  if (anchor === "left") return 8 + offsetPct;
  if (anchor === "right") return 92 + offsetPct;
  return 50 + offsetPct;
}

function TextIndicator({
  label,
  color,
  dashColor,
  y,
  x,
  alignment,
  compact,
}: {
  label: string;
  color: string;
  dashColor: string;
  y: number;
  x: number;
  alignment: number;
  compact?: boolean;
}) {
  const anchor = xAlign(alignment);
  const transform =
    anchor === "left"
      ? "translateY(-50%)"
      : anchor === "right"
        ? "translate(-100%, -50%)"
        : "translate(-50%, -50%)";

  return (
    <>
      <div
        className="absolute left-0 right-0 border-t border-dashed"
        style={{
          top: `${y}%`,
          borderColor: dashColor,
          opacity: 0.6,
        }}
      />
      <div
        className="absolute whitespace-nowrap rounded px-1.5 py-0.5 font-medium"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform,
          backgroundColor: color,
          fontSize: compact ? "7px" : "10px",
          lineHeight: compact ? "10px" : "14px",
          color: "#fff",
        }}
      >
        {label}
      </div>
    </>
  );
}

export function LayoutPreviewDiagram({
  canvasRatio,
  canvasResolution,
  contentRatio,
  contentResolution,
  contentXOffset = 0,
  contentYOffset = 0,
  subtitle,
  headlineTop,
  headlineBottom,
  className = "",
  compact = false,
}: LayoutPreviewProps) {
  const canvas = resolveDimensions(canvasRatio, canvasResolution);
  const content = resolveDimensions(contentRatio, contentResolution);

  const maxH = compact ? 200 : 380;
  const maxW = compact ? 160 : 300;

  const scaleH = maxH / canvas.height;
  const scaleW = maxW / canvas.width;
  const scale = Math.min(scaleH, scaleW);

  const displayW = Math.round(canvas.width * scale);
  const displayH = Math.round(canvas.height * scale);

  const contentScaleW = Math.min(content.width / canvas.width, 1);
  const contentScaleH = Math.min(content.height / canvas.height, 1);
  const contentW = contentScaleW * 100;
  const contentH = contentScaleH * 100;
  const contentLeft = (100 - contentW) / 2 + (contentXOffset / canvas.width) * 100;
  const contentTop = (100 - contentH) / 2 + (contentYOffset / canvas.height) * 100;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {!compact && (
        <p className="text-xs font-medium text-zinc-500">Layout preview</p>
      )}
      <div
        className="relative overflow-hidden rounded-md border border-zinc-600 bg-zinc-950"
        style={{ width: displayW, height: displayH }}
      >
        {/* Content area */}
        <div
          className="absolute overflow-hidden rounded-sm border-2 border-emerald-400/80 bg-emerald-500/25"
          style={{
            left: `${contentLeft}%`,
            top: `${contentTop}%`,
            width: `${contentW}%`,
            height: `${contentH}%`,
          }}
        />

        {/* Top headline */}
        {headlineTop.enabled && (
          <>
            {!compact && (
              <TextIndicator
                label="Top headline"
                color="rgba(96, 130, 182, 0.85)"
                dashColor="#6082b6"
                y={yPct(headlineTop.alignment, headlineTop.yOffset, canvas.height)}
                x={xPct(headlineTop.alignment, headlineTop.xOffset, canvas.width)}
                alignment={headlineTop.alignment}
                compact={compact}
              />
            )}
          </>
        )}

        {/* Subtitle */}
        {subtitle.enabled && (
          <>
            {!compact && (
              <TextIndicator
                label="Subtitle baseline"
                color="rgba(156, 120, 172, 0.85)"
                dashColor="#9c78ac"
                y={yPct(subtitle.alignment, subtitle.yOffset, canvas.height)}
                x={xPct(subtitle.alignment, subtitle.xOffset, canvas.width)}
                alignment={subtitle.alignment}
                compact={compact}
              />
            )}
          </>
        )}

        {/* Bottom headline */}
        {headlineBottom.enabled && (
          <>
            {!compact && (
              <TextIndicator
                label="Bottom headline"
                color="rgba(180, 140, 80, 0.85)"
                dashColor="#b48c50"
                y={yPct(
                  headlineBottom.alignment,
                  headlineBottom.yOffset,
                  canvas.height,
                )}
                x={xPct(
                  headlineBottom.alignment,
                  headlineBottom.xOffset,
                  canvas.width,
                )}
                alignment={headlineBottom.alignment}
                compact={compact}
              />
            )}
          </>
        )}

        {/* Dimension labels */}
        {!compact && (
          <>
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-zinc-500">
              {canvas.width}px
            </span>
            <span
              className="absolute -right-5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500"
              style={{ writingMode: "vertical-rl" }}
            >
              {canvas.height}px
            </span>
          </>
        )}
      </div>

      {!compact && (
        <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-sm border border-zinc-600 bg-zinc-950" />
            Canvas
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-sm border border-emerald-400/80 bg-emerald-700/30" />
            Content
          </span>
        </div>
      )}
    </div>
  );
}
