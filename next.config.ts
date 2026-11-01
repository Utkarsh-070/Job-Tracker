import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/((?!auth/extension).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        source: "/auth/extension",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors " +
              ((process.env.FIREBASE_EXTENSION_IDS || "")
                .split(",")
                .map((id) => id.trim())
                .filter((id) => /^[a-p]{32}$/.test(id))
                .map((id) => "chrome-extension://" + id)
                .join(" ") || "'none'"),
          },
        ],
      },
    ];
  },
};
export default nextConfig;
