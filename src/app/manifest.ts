import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tally — Subscriptions",
    short_name: "Tally",
    description: "Self-hosted subscription tracker",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf7f1",
    theme_color: "#ff7a00",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
