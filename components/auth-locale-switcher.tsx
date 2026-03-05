"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const localeLabels: Record<string, string> = {
  en: "EN",
  ko: "KO",
  id: "ID",
};

export function AuthLocaleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  return (
    <div className="flex justify-end gap-1 rounded-md border border-zinc-700 bg-zinc-900/50 p-0.5">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => router.replace(pathname, { locale: loc })}
          className={cn(
            "rounded px-2 py-1 text-xs font-medium transition-colors",
            locale === loc
              ? "bg-amber-500/20 text-amber-400"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {localeLabels[loc] ?? loc}
        </button>
      ))}
    </div>
  );
}
