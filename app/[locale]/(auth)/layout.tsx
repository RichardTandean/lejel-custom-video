import { AuthLocaleSwitcher } from "@/components/auth-locale-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <AuthLocaleSwitcher />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
