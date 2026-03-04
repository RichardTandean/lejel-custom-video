"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { FileText, List, Settings, Video, Upload, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/requests", label: "Daftar Request", icon: List },
  { href: "/new", label: "Buat Video", icon: Video },
  { href: "/upload", label: "Upload YouTube", icon: Upload },
  { href: "/settings", label: "Channel YouTube", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/requests"
          className="flex items-center gap-2 font-medium text-zinc-100"
        >
          <FileText className="h-5 w-5 text-amber-500" />
          Script to Video
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
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
                {label}
              </Button>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {user?.name ?? user?.email}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Keluar"
            className="text-zinc-400"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
