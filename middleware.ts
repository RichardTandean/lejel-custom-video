import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CVE-2025-29927 mitigation: strip x-middleware-subrequest header from incoming
 * requests so it cannot be used to bypass middleware. Upgrade to Next.js 15.2.3+
 * (or patched 14.x/13.x/12.x) for the full fix.
 * @see https://nextjs.org/blog/cve-2025-29927
 */
const CVE_HEADER = "x-middleware-subrequest";

export function middleware(request: NextRequest) {
  const hasBypassHeader = request.headers.has(CVE_HEADER);

  if (hasBypassHeader) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete(CVE_HEADER);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
