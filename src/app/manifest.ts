import type { MetadataRoute } from "next";
import { PROJECT_NAME } from "@/lib/project-name";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: PROJECT_NAME,
    short_name: PROJECT_NAME,
    description: `Portal de socios, inversionistas y embajadores de ${PROJECT_NAME}.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#031522",
    theme_color: "#031522",
    categories: ["business", "finance"],
    lang: "es",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
