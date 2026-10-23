import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dark theme only", () => {
  it("has no light theme switch", () => {
    expect(existsSync(new URL("../src/lib/theme.ts", import.meta.url))).toBe(false);
    expect(existsSync(new URL("../src/components/ThemeToggle.tsx", import.meta.url))).toBe(false);
    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    const root = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
    expect(css).not.toContain('data-theme="light"');
    expect(css).not.toContain("theme-switching");
    expect(root).toContain('setAttribute("data-theme","dark")');
    expect(root).not.toContain("data-theme=light");
    expect(root).not.toContain("ensureTheme");
  });
});
