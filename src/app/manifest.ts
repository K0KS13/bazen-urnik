import type { MetadataRoute } from "next";

/**
 * Omogoča »Dodaj na domači zaslon«: aplikacija se odpre brez naslovne vrstice
 * brskalnika in izgleda kot navadna aplikacija na telefonu.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bazen Bar & BBQ — urnik in ure",
    short_name: "Bazen",
    description: "Urnik izmen in evidenca delovnega časa za Bazen Bar & BBQ.",
    lang: "sl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
