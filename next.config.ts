import type { NextConfig } from "next";
import createPWA from "@ducanh2912/next-pwa";

const withPWA = createPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: false,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  },
  allowedDevOrigins: ["*.lhr.life", "localhost:3000"],
};

export default withPWA(nextConfig);
