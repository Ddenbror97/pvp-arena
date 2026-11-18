import { createFileRoute } from "@tanstack/react-router";
import { FpsLobbyPage } from "@/components/fps/FpsLobbyPage";
import { fpsLobbyHead } from "@/lib/seo/fps-lobby";

export const Route = createFileRoute("/fps-duel")({
  head: () => fpsLobbyHead(false),
  component: FpsLobbyPage,
});
