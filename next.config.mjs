/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Pour un export statique (hébergement mutualisé type Hostinger) : STATIC_EXPORT=1 npm run build
  ...(process.env.STATIC_EXPORT ? { output: "export", images: { unoptimized: true } } : {}),
};
export default nextConfig;
