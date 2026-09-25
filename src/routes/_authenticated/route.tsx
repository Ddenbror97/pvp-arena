import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Local session read (no network round trip) — this gate is UX only; every
  // data read/write is still authorised server-side by RLS and auth middleware.
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
