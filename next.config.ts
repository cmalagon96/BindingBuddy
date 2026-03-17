import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WSL2 file-watcher fix: the inotify API is unreliable across the Windows
  // filesystem boundary (/mnt/c/...). Enabling polling prevents the
  // "Unable to add filesystem: illegal path" dev-server warning and ensures
  // hot-reload works correctly when the project lives on the Windows drive.
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        poll: 1000,       // check for changes every second
        aggregateTimeout: 300,
      };
    }
    return config;
  },

  // MED-5: HTTP security headers
  async headers() {
    return [
      {
        // Baseline security headers applied to all routes
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
        ],
      },
      {
        // Stricter CSP for the Payload admin panel
        source: "/admin(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Gravatar is added here (admin-only) because Payload loads user
              // avatars from gravatar.com. The public-facing site does not
              // have this header block and is not affected.
              "img-src 'self' data: blob: https://www.gravatar.com",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withPayload(nextConfig);
