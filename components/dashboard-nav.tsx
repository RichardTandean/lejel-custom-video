"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/auth-context";
import {
  FileText,
  LayoutDashboard,
  History,
  Settings,
  Video,
  Upload,
  LogOut,
  CheckCircle,
  SlidersHorizontal,
  Users,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";

const userNavItems = [
  { href: "/new", key: "dashboard", icon: LayoutDashboard },
  { href: "/requests", key: "videoHistory", icon: History },
  { href: "/upload", key: "uploadVideo", icon: Upload },
  { href: "/settings", key: "settings", icon: Settings },
];

const adminNavItems = [
  { href: "/admin/overview", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/users", key: "userManagement", icon: Users },
  { href: "/admin/channels", key: "channelManagement", icon: Link2 },
  { href: "/new", key: "generateVideo", icon: Video },
  { href: "/requests", key: "videoHistory", icon: History },
  { href: "/video-profiles", key: "videoProfile", icon: SlidersHorizontal },
  { href: "/upload", key: "uploadVideo", icon: Upload },
  { href: "/admin/pending-upload", key: "videoApproval", icon: CheckCircle },
  { href: "/settings", key: "settings", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dashboard.nav");
  const { user, logout, isAdmin } = useAuth();
  const navItems = isAdmin ? adminNavItems : userNavItems;
  const homeHref = isAdmin ? "/admin/overview" : "/new";

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={homeHref}
            className="flex items-center gap-2 text-sm font-medium text-zinc-100"
          >
            <FileText className="h-4 w-4 text-amber-500" />
            {t("appName")}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title={t("logout")}
            className="h-8 w-8 text-zinc-400"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          <Label className="text-xs text-zinc-500">{t("language")}</Label>
          <Select
            value={locale}
            onChange={(e) =>
              router.replace(pathname, { locale: e.target.value as (typeof routing.locales)[number] })
            }
            className="h-9 text-sm"
          >
            {routing.locales.map((loc) => (
              <option key={loc} value={loc}>
                {t(`locale.${loc}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navItems.map(({ href, key, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "whitespace-nowrap",
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
        </div>
      </header>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto">
        <div className="border-b border-zinc-800 px-4 py-4">
          <Link
            href={homeHref}
            className="flex items-center gap-2 font-medium text-zinc-100"
          >
            <FileText className="h-5 w-5 text-amber-500" />
            {t("appName")}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(({ href, key, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  pathname === href || pathname.startsWith(href + "/")
                    ? "bg-zinc-800 text-amber-400 hover:bg-zinc-800 hover:text-amber-400"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {t(key)}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="space-y-3 border-t border-zinc-800 p-4">
          <div className="space-y-2">
            <Label htmlFor="sidebar-locale" className="text-xs text-zinc-500">
              {t("language")}
            </Label>
            <Select
              id="sidebar-locale"
              value={locale}
              onChange={(e) =>
                router.replace(pathname, { locale: e.target.value as (typeof routing.locales)[number] })
              }
            >
              {routing.locales.map((loc) => (
                <option key={loc} value={loc}>
                  {t(`locale.${loc}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm text-zinc-500">
              {user?.name ?? user?.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title={t("logout")}
              className="h-8 w-8 text-zinc-400"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
