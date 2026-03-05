"use client";

import { useMemo } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLoginSchema, type ValidationT } from "@/lib/validations";
import type { z } from "zod";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const tToast = useTranslations("auth.toast");
  const tValidation = useTranslations("validation");
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  const loginSchema = useMemo(
    () => getLoginSchema(tValidation as unknown as ValidationT),
    [tValidation]
  );
  type LoginInput = z.infer<typeof loginSchema>;

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (isAuthenticated) {
    router.replace("/requests");
    return null;
  }

  async function onSubmit(data: LoginInput) {
    try {
      await login(data.email, data.password);
      toast.success(tToast("loginSuccess"));
      router.replace("/requests");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tToast("loginFailed"));
    }
  }

  return (
    <>
      <h1 className="mb-6 text-xl font-semibold text-zinc-100">{t("title")}</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-400">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-red-400">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-amber-500 hover:underline">
          {t("registerLink")}
        </Link>
      </p>
    </>
  );
}
