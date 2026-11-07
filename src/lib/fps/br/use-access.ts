import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { canPlayBattleRoyale } from "./access";

export function useBrAccess() {
  const { ready, userId } = useAuth();
  return useQuery({
    queryKey: ["br-admin-access", userId],
    queryFn: () => canPlayBattleRoyale(supabase, userId),
    enabled: ready && !!userId,
    // UI eligibility only; admission and Worker authorization always read the live role.
    staleTime: 30_000,
    retry: false,
  });
}
