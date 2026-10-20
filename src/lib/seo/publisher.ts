import { OG_IMAGE_URL, OG_SITE_URL } from "@/lib/og";

export const CORRECTIONS_EMAIL = "contact@pvpspinarena.com";

/** Who publishes the guides. No person is named, because these pages are site explainers. */
export function publisherNode() {
  return {
    "@type": "Organization" as const,
    "@id": `${OG_SITE_URL}/#organization`,
    name: "PVPspinArena",
    url: OG_SITE_URL,
    logo: { "@type": "ImageObject" as const, url: OG_IMAGE_URL },
    email: CORRECTIONS_EMAIL,
  };
}
