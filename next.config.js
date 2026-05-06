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
    // App Router is default in Next 14
    instrumentationHook: true, // Sentry server için gerekli
  },
  // /hashira-test → public/hashira-test/index.html (statik sunum)
  async rewrites() {
    return [
      {
        source: '/hashira-test',
        destination: '/hashira-test/index.html',
      },
    ];
  },
};

// Sentry sadece DSN tanımlıysa devreye girsin (dev'de gereksiz)
const sentryEnabled = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

// Sentry v8: TEK obje argümanı (Webpack plugin + SDK options birleşmiş)
// v7'deki 3 argümanlı format artık desteklenmiyor.
module.exports = sentryEnabled
  ? withSentryConfig(nextConfig, {
      // Source map upload için (opsiyonel)
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // Build log'unda sessizlik (CI dışında log basma)
      silent: !process.env.CI,

      // Browser kodunda da source map upload
      widenClientFileUpload: true,

      // Source mapları publik yapma
      hideSourceMaps: true,

      // Sentry SDK'nın iç loglarını tree-shake et (bundle boyutu)
      disableLogger: true,

      // tunnelRoute KAPATILDI: Sentry istekleri doğrudan
      // ingest.sentry.io'ya gider. Ad-blocker olan kullanıcılarda
      // event kaybedebilir ama (1) kafe ortamında ad-blocker az,
      // (2) tunnel route subdomain middleware ile çakışıyordu,
      // (3) basit kurulum daha güvenilir.
    })
  : nextConfig;
