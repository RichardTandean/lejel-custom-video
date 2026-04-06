"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { changePassword } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { GoogleYoutubeWorkspacePanel } from "@/components/admin/google-youtube-workspace-panel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { isAdmin } = useAuth();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }
    setPasswordSubmitting(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success(t("passwordChanged"));
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("passwordError"));
    } finally {
      setPasswordSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">{t("title")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t("description")}</p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h2 className="text-lg font-medium text-zinc-200">{t("passwordSectionTitle")}</h2>
            <p className="text-sm text-zinc-500">{t("passwordSectionDescription")}</p>
          </div>
          <form onSubmit={handlePassword} className="flex max-w-md flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPw">{t("currentPassword")}</Label>
              <Input
                id="currentPw"
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPw">{t("newPassword")}</Label>
              <Input
                id="newPw"
                type="password"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPw">{t("confirmPassword")}</Label>
              <Input
                id="confirmPw"
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
              />
            </div>
            <Button type="submit" disabled={passwordSubmitting}>
              {passwordSubmitting ? t("changingPassword") : t("changePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {!isAdmin && (
        <Card>
          <CardContent className="py-6 text-sm text-zinc-500">
            {t("adminOnlyGoogleDescription")}
          </CardContent>
        </Card>
      )}

      {isAdmin && <GoogleYoutubeWorkspacePanel />}
    </div>
  );
}
