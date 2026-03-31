"use client";

import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function AuthLocaleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dashboard.nav");

  return (
    <div className="w-40 space-y-1">
      <Label htmlFor="auth-locale" className="text-xs text-zinc-500">
        {t("language")}
      </Label>
      <Select
        id="auth-locale"
        value={locale}
        onChange={(e) =>
          router.replace(pathname, {
            locale: e.target.value as (typeof routing.locales)[number],
          })
        }
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {t(`locale.${loc}`)}
          </option>
        ))}
      </Select>
    </div>
  );
}
