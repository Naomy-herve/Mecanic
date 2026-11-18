import type { MetadataRoute } from "next";

const productionUrl = "https://kia-piece-naomy-herve.vercel.app";

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === "production";

  if (!isProduction) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/compte/profil", "/equipe"],
    },
    sitemap: productionUrl + "/sitemap.xml",
  };
}
