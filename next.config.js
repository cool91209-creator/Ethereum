const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy configuration: rewrites route frontend API calls to the backend
  // Replace NEXT_PUBLIC_API_BASE_URL with your real backend URL when ready
  async rewrites() {
    const apiBase = process.env.BACKEND_API_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
