import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const userWalletsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["user-wallets", userId],
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_wallets")
        .select("address, normalized_address, is_verified, is_primary, verified_at")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
  });
