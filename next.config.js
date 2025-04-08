/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'a.espncdn.com',
      'b.espncdn.com',
      'cdn.nba.com',
      'www.mlbstatic.com',
      'img.mlbstatic.com',
      'securea.mlb.com',
      'secureb.mlb.com',
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3005'],
    },
  },
}

module.exports = nextConfig 