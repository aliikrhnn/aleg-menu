const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    // App Router is default in Next 14, no flag needed
    instrumentationHook: true, // Sentry için gerekli
  },
};

// Sentry sadece DSN tanımlıysa devreye girsin (dev'de gereksiz)
const sentryEnabled = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

module.exports = sentryEnabled
  ? withSentryConfig(
      nextConfig,
      {
        // Source map upload — production'da hatalardaki kod satırı gözüksün
        silent: true,                 // build log'unda sessiz
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN, // sadece source map upload için
      },
      {
        // Sentry runtime config
        widenClientFileUpload: true,  // browser kodunda da source map
        hideSourceMaps: true,         // source mapları publik yapma
        disableLogger: true,
        // /monitoring rotası: ad-blocker'lar Sentry'i bloklar, bu rotayla bypass
        tunnelRoute: '/monitoring',
      }
    )
  : nextConfig;
