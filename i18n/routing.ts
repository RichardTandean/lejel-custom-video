import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ko", "id"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});
