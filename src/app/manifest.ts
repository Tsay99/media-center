import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Медиа Центр",
    short_name: "Медиа Центр",
    description: "Рабочая панель контент-плана и публикаций",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#0e1d35",
    theme_color: "#0e1d35",
    icons: [
      { src: "/media-center-app-icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/media-center-app-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
