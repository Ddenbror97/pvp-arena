export const OG_SITE_URL = "https://pvpspinarena.com";
export const OG_IMAGE_URL = `${OG_SITE_URL}/og-cover.png`;

/** og:image / twitter:image meta entries for the PVPspinArena share cover. */
export function ogImageMeta() {
  return [
    { property: "og:image", content: OG_IMAGE_URL },
    { name: "twitter:image", content: OG_IMAGE_URL },
  ];
}
