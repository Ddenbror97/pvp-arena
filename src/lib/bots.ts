import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BotPublicConfig = { coinflip: boolean; poker: boolean };

/** Public flags only. Both stay false until an operator funds the bot bankroll. */
export function useBotConfig() {
  return useQuery({
    queryKey: ["bot-public-config"],
    queryFn: async (): Promise<BotPublicConfig> => {
      // bot_public_config is newer than the generated Database types.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("bot_public_config");
      if (error) throw error;
      const row = (data ?? {}) as Partial<BotPublicConfig>;
      return { coinflip: row.coinflip === true, poker: row.poker === true };
    },
    staleTime: 30_000,
    retry: false,
  });
}
