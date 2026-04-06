"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
} from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminUser } from "@/types";

function formatDate(input: string | null | undefined, locale: string) {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  const loc = locale === "ko" ? "ko-KR" : locale === "id" ? "id-ID" : "en-US";
  return date.toLocaleString(loc);
}

export default function AdminUsersPage() {
  const t = useTranslations("admin.users");
  const locale = useLocale();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "user" as "user" | "admin",
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: listAdminUsers,
    enabled: isAdmin ?? false,
  });

  const sorted = useMemo(() => {
    return [...users].sort((a, b) => {
      const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : -Infinity;
      const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : -Infinity;
      return tb - ta;
    });
  }, [users]);

  const adminCount = useMemo(
    () => sorted.filter((u) => u.role === "admin").length,
    [sorted]
  );

  const createMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      toast.success(t("toastUserCreated"));
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-recent-users"] });
      setAddOpen(false);
      setForm({ email: "", name: "", password: "", role: "user" });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      toast.success(t("toastUserDeleted"));
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-recent-users"] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    },
  });

  function deleteDisabledReason(u: AdminUser): string | null {
    if (!user) return t("tooltipCannotDeleteSelf");
    if (u.id === user.id) return t("tooltipCannotDeleteSelf");
    if (u.role === "admin" && adminCount <= 1) {
      return t("tooltipCannotDeleteLastAdmin");
    }
    return null;
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const email = form.email.trim();
    const name = form.name.trim();
    const password = form.password;
    if (!email || !name || password.length < 6) {
      toast.error(t("toastError"));
      return;
    }
    createMutation.mutate({
      email,
      name,
      password,
      role: form.role,
    });
  }

  if (user && !isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>
        <Card>
          <CardContent className="py-8 text-center text-zinc-500">
            {t("accessDenied")}
          </CardContent>
        </Card>
        <Link href="/new" className={cn(buttonVariants({ variant: "outline" }))}>
          {t("backHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("description")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button type="button">
                <Plus className="mr-2 h-4 w-4" />
                {t("addUser")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("addUserTitle")}</DialogTitle>
                <p className="text-sm text-zinc-500">{t("addUserDescription")}</p>
              </DialogHeader>
              <form onSubmit={submitCreate} className="mt-4 flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-user-email">{t("email")}</Label>
                  <Input
                    id="new-user-email"
                    type="email"
                    autoComplete="off"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-name">{t("name")}</Label>
                  <Input
                    id="new-user-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-password">{t("password")}</Label>
                  <Input
                    id="new-user-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    placeholder={t("passwordHint")}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-role">{t("role")}</Label>
                  <Select
                    id="new-user-role"
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        role: e.target.value as "user" | "admin",
                      }))
                    }
                  >
                    <option value="user">{t("roleUser")}</option>
                    <option value="admin">{t("roleAdmin")}</option>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddOpen(false)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? t("creating") : t("createUser")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Link
            href="/admin/overview"
            className={cn(buttonVariants({ variant: "outline" }), "border-zinc-700 shrink-0")}
          >
            {t("backOverview")}
          </Link>
        </div>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <p className="text-sm text-zinc-400">
              {deleteTarget
                ? t("deleteConfirmBody", { email: deleteTarget.email })
                : null}
            </p>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? t("deleting") : t("deleteConfirmAction")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardContent className="p-0 pt-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : sorted.length === 0 ? (
            <p className="px-4 pb-6 text-sm text-zinc-500">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">{t("email")}</TableHead>
                    <TableHead className="text-zinc-400">{t("name")}</TableHead>
                    <TableHead className="text-zinc-400">{t("role")}</TableHead>
                    <TableHead className="text-zinc-400">{t("createdAt")}</TableHead>
                    <TableHead className="text-zinc-400">{t("lastLogin")}</TableHead>
                    <TableHead className="text-zinc-400">{t("lastActivity")}</TableHead>
                    <TableHead className="text-zinc-400 w-[100px]">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((u) => {
                    const reason = deleteDisabledReason(u);
                    return (
                      <TableRow key={u.id} className="border-zinc-800">
                        <TableCell className="text-zinc-300">{u.email}</TableCell>
                        <TableCell className="text-zinc-200">{u.name}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "secondary" : "outline"}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm whitespace-nowrap">
                          {formatDate(u.createdAt, locale)}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm whitespace-nowrap">
                          {formatDate(u.lastLoginAt, locale)}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm whitespace-nowrap">
                          {formatDate(u.lastActivityAt, locale)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            disabled={!!reason || deleteMutation.isPending}
                            title={reason ?? t("deleteUser")}
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            <span className="hidden sm:inline">{t("deleteUser")}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
