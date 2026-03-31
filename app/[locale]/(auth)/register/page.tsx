"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const t = useTranslations("auth.invitation");

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold text-zinc-100">{t("title")}</h1>
      <p className="text-sm text-zinc-400">{t("body")}</p>
      <Link
        href="/login"
        className="inline-block text-amber-500 hover:underline"
      >
        {t("backToLogin")}
      </Link>
    </div>
  );
}
