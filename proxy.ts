import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

/**
 * CVE-2025-29927 mitigation: strip x-middleware-subrequest header from incoming
 * requests so it cannot be used to bypass middleware.
 * @see https://nextjs.org/blog/cve-2025-29927
 */
const CVE_HEADER = "x-middleware-subrequest";

const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  let req: NextRequest = request;
  if (request.headers.has(CVE_HEADER)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete(CVE_HEADER);
    req = new NextRequest(request.url, { headers: requestHeaders });
  }
  return handleI18nRouting(req);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
