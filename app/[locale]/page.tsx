import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function LocaleHomePage({ params }: Props) {
  const { locale } = await params;
  const prefix = locale === "en" ? "" : `/${locale}`;
  redirect(`${prefix}/requests`);
}
