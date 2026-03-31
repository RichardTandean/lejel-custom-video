"use client";

import { cn } from "@/lib/utils";

const GRID = [
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];

const LABELS: Record<number, string> = {
  7: "TL",
  8: "TC",
  9: "TR",
  4: "ML",
  5: "MC",
  6: "MR",
  1: "BL",
  2: "BC",
  3: "BR",
};

export function AlignmentSelector({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-grid grid-cols-3 gap-1", className)}>
      {GRID.flat().map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded text-xs font-medium transition-colors",
            n === value
              ? "bg-amber-500 text-zinc-950"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
          )}
        >
          {LABELS[n]}
        </button>
      ))}
    </div>
  );
}
