"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/auth-context";
import { FileText, List, Settings, Video, Upload, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";

const navIcons = [
  { href: "/requests", key: "requests", icon: List },
  { href: "/new", key: "newVideo", icon: Video },
  { href: "/upload", key: "upload", icon: Upload },
  { href: "/settings", key: "settings", icon: Settings },
];

const localeLabels: Record<string, string> = {
  en: "EN",
  ko: "KO",
  id: "ID",
};

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dashboard.nav");
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/requests"
          className="flex items-center gap-2 font-medium text-zinc-100"
        >
          <FileText className="h-5 w-5 text-amber-500" />
          {t("appName")}
        </Link>
        <nav className="flex items-center gap-1">
          {navIcons.map(({ href, key, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  pathname === href || pathname.startsWith(href + "/")
                    ? "bg-zinc-800 text-amber-400 hover:bg-zinc-800 hover:text-amber-400"
                    : "text-zinc-400"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {t(key)}
              </Button>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900/50 p-0.5">
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
          <span className="text-sm text-zinc-500">
            {user?.name ?? user?.email}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title={t("logout")}
            className="text-zinc-400"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
