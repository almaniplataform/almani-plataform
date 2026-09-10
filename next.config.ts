import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const productionHeaders = process.env.NODE_ENV === 'production'
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
      : []

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'Origin-Agent-Cluster', value: '?1' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
          ...productionHeaders,
        ],
      },
    ]
  },
};

export default nextConfig;
