import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";

/** Match URLs stay at /pool/:id. The lobby is only /8-ball-pool, with no redirect. */
export const Route = createFileRoute("/pool")({
  beforeLoad: ({ location }) => {
    const path = location.pathname.replace(/\/$/, "") || "/";
    if (path === "/pool") throw notFound();
  },
  component: PoolMatchLayout,
});

function PoolMatchLayout() {
  return <Outlet />;
}
