/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // Явно указываем базовый URL для статических файлов
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  // Отключаем кэширование в development
  generateEtags: false,
};

module.exports = nextConfig;
