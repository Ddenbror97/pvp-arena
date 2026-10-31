import { createServerFn } from "@tanstack/react-start";
export const getFpsSeoSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { loadFpsSeoSnapshot } = await import("./seo-snapshot.server");
    return await loadFpsSeoSnapshot();
  } catch {
    return null;
  }
});
