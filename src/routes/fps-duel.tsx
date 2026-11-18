import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old bookmarks and cached clients go to the sole FPS lobby URL. */
export const Route = createFileRoute("/fps-duel")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: true, hash: true, statusCode: 301, replace: true });
  },
});
