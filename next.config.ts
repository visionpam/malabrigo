import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Vercel genera su propio paquete de funciones. El modo standalone se
  // conserva únicamente para despliegues autogestionados, como Docker.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
