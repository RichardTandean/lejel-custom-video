"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

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
      toast.success("Login berhasil");
      router.replace("/requests");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login gagal");
    }
  }

  return (
    <>
      <h1 className="mb-6 text-xl font-semibold text-zinc-100">Masuk</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="nama@email.com"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-400">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
          {form.formState.isSubmitting ? "Memproses..." : "Masuk"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        Belum punya akun?{" "}
        <Link href="/register" className="text-amber-500 hover:underline">
          Daftar
        </Link>
      </p>
    </>
  );
}
