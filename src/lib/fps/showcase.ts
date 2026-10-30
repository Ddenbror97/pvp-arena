import showcase from "@/assets/fps/arena-showcase.webp";
export const STRIKE_SHOWCASE = showcase;

/** The same URL is used by document preload, navigation intent and the image. */
export function warmStrikeShowcase() {
  if (typeof document === "undefined" || document.querySelector("link[data-strike-showcase]"))
    return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = showcase;
  link.type = "image/webp";
  link.dataset["strikeShowcase"] = "";
  document.head.appendChild(link);
}
