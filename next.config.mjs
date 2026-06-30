/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Speech SDK 是純 Node 套件，標記為 server external 避免被打包進前端
    serverComponentsExternalPackages: ['microsoft-cognitiveservices-speech-sdk'],
  },
};

export default nextConfig;
