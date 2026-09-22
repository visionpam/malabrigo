import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Deja margen para el multipart y permite validar imágenes grandes con un mensaje claro.
    serverActions: { bodySizeLimit: "24mb" },
  },
  // Vercel genera su propio paquete de funciones. El modo standalone se
  // conserva únicamente para despliegues autogestionados, como Docker.
  output: process.env.VERCEL ? undefined : "standalone",
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
