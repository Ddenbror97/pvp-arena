import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchFpsQueueStatus } from "./api";

/** Only the site-wide owner enables polling; other consumers observe the same cache. */
export function useFpsQueue(enabled = false) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["fps-queue", userId],
    queryFn: fetchFpsQueueStatus,
    enabled: enabled && !!userId,
    refetchInterval: (q) => {
      const cash = q.state.data?.cash;
      return cash?.status === "WAITING" || cash?.ready_deadline ? 2000 : 30000;
    },
    refetchIntervalInBackground: true,
    staleTime: 1000,
    retry: 1,
  });
}
