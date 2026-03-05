import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();
const nextConfig: NextConfig = {
  // Use frontend dir as root so Next.js does not get confused by parent lockfile
  outputFileTracingRoot: path.join(__dirname),
};

export default withNextIntl(nextConfig);
