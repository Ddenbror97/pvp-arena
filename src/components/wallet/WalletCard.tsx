import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, ShieldCheck, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { WALLET_CONFIG } from "@/lib/web3/config";
import {
  WALLET_MESSAGES,
  WalletError,
  serverCodeToError,
  type WalletErrorCode,
} from "@/lib/web3/errors";
import { shortAddress } from "@/lib/web3/message";
import { getWalletSession, resetWalletSession, type WalletSession } from "@/lib/web3/metamask";
import {
  recordWalletEvent,
  requestWalletChallenge,
  verifyWalletSignature,
} from "@/lib/web3/wallet.functions";

export function WalletCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const wallets = useQuery({
    queryKey: ["user-wallets", userId],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_wallets")
        .select("address, normalized_address, is_verified, is_primary, verified_at")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
  });
  const [session, setSession] = useState<WalletSession | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"connect" | "verify" | null>(null);
  const [err, setErr] = useState<WalletErrorCode | null>(null);
  const challengeFn = useServerFn(requestWalletChallenge);
  const verifyFn = useServerFn(verifyWalletSignature);
  const eventFn = useServerFn(recordWalletEvent);
  const unsubs = useRef<(() => void)[]>([]);
  const connectInFlight = useRef(false);

  useEffect(() => () => unsubs.current.forEach((u) => u()), []);

  const verifiedPrimary =
    wallets.data?.find((w) => w.is_verified && w.is_primary) ??
    wallets.data?.find((w) => w.is_verified);
  const connectedRecord = address
    ? wallets.data?.find((w) => w.normalized_address === address.toLowerCase())
    : undefined;
  const connectedVerified = !!connectedRecord?.is_verified;
  const wrongNetwork = !!address && !!chainId && chainId !== WALLET_CONFIG.requiredChainId;

  const fail = (e: unknown, phase: "connect" | "sign") => {
    const code = e instanceof WalletError ? e.code : phase === "sign" ? "SIGN_REJECTED" : "GENERIC";
    setErr(code);
    toast.error(WALLET_MESSAGES[code]);
    // Record the safe code server-side so failures are diagnosable after the fact.
    if (phase === "connect")
      void eventFn({ data: { event: "WALLET_CONNECT_FAILED", address: null, reason: code } }).catch(
        () => {},
      );
  };

  async function connect() {
    if (connectInFlight.current) return;
    connectInFlight.current = true;
    setErr(null);
    setBusy("connect");
    void eventFn({ data: { event: "WALLET_CONNECTION_STARTED", address: null } }).catch(() => {});
    try {
      const s = await getWalletSession();
      const r = await s.connect();
      unsubs.current.forEach((u) => u());
      unsubs.current = [
        s.onAccountsChanged((a) => {
          setAddress(a[0] ?? null);
          if (!a[0]) setSession(null);
        }),
        s.onChainChanged((c) => {
          setChainId(c);
          if (c === WALLET_CONFIG.requiredChainId) setErr((e) => (e === "UNSUPPORTED_NETWORK" ? null : e));
        }),
        s.onDisconnect(() => {
          setAddress(null);
          setSession(null);
        }),
      ];
      setSession(s);
      setAddress(r.address);
      setChainId(r.chainId);
      if (r.chainId !== WALLET_CONFIG.requiredChainId) setErr("UNSUPPORTED_NETWORK");
      await eventFn({ data: { event: "WALLET_CONNECTED", address: r.address } }).catch(() => {});
      qc.invalidateQueries({ queryKey: ["user-wallets", userId] });
    } catch (e) {
      resetWalletSession();
      fail(e, "connect");
    } finally {
      connectInFlight.current = false;
      setBusy(null);
    }
  }

  async function verify() {
    if (!session || !address) return;
    setErr(null);
    setBusy("verify");
    try {
      const c = await session.chainId();
      setChainId(c);
      if (c !== WALLET_CONFIG.requiredChainId) throw new WalletError("UNSUPPORTED_NETWORK");
      const ch = await challengeFn({ data: { address } });
      if (!ch.ok) throw new WalletError(serverCodeToError(ch.code));
      const signature = await session.sign(ch.message, address);
      const v = await verifyFn({ data: { challengeId: ch.challengeId, signature } });
      if (!v.ok) throw new WalletError(serverCodeToError(v.code));
      toast.success("Wallet verified.");
    } catch (e) {
      fail(e instanceof WalletError ? e : new WalletError("GENERIC"), "sign");
    } finally {
      setBusy(null);
      qc.invalidateQueries({ queryKey: ["user-wallets", userId] });
    }
  }

  async function switchNetwork() {
    if (!session) return;
    try {
      await session.switchToRequiredNetwork();
      const c = await session.chainId();
      setChainId(c);
      if (c === WALLET_CONFIG.requiredChainId) setErr(null);
    } catch (e) {
      fail(e, "connect");
    }
  }

  async function disconnect() {
    const a = address;
    await session?.disconnect();
    unsubs.current.forEach((u) => u());
    unsubs.current = [];
    setSession(null);
    setAddress(null);
    setChainId(null);
    setErr(null);
    void eventFn({ data: { event: "WALLET_DISCONNECTED", address: a } }).catch(() => {});
  }

  const copy = (a: string) =>
    navigator.clipboard?.writeText(a).then(
      () => toast("Address copied"),
      () => {},
    );

  const AddressLine = ({ a }: { a: string }) => (
    <div className="flex items-center gap-2">
      <span className="tabular text-lg" data-testid="wallet-address">
        {shortAddress(a)}
      </span>
      <button
        onClick={() => copy(a)}
        aria-label="Copy address"
        className="text-muted-foreground hover:text-foreground"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-5" aria-label="Wallet">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm uppercase tracking-widest">Wallet</h2>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
          Identity only · no payments
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {address && connectedVerified ? (
          <>
            <div
              className="flex items-center gap-1.5 text-sm text-primary"
              data-testid="wallet-status"
            >
              <ShieldCheck className="h-4 w-4" /> ● Verified
            </div>
            <AddressLine a={connectedRecord!.address} />
            <Button variant="secondary" onClick={disconnect}>
              Disconnect
            </Button>
          </>
        ) : address ? (
          <>
            <AddressLine a={address} />
            <div className="text-sm text-rival" data-testid="wallet-status">
              Verification required
            </div>
            {verifiedPrimary && verifiedPrimary.normalized_address !== address.toLowerCase() && (
              <p className="text-xs text-muted-foreground">
                Your verified wallet is {shortAddress(verifiedPrimary.address)}. This new address
                stays unverified until you sign.
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={verify} disabled={busy !== null || wrongNetwork}>
                {busy === "verify" ? "Check MetaMask..." : "Verify wallet"}
              </Button>
              <Button variant="ghost" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              You'll sign a text message. No transaction, no gas, no approvals.
            </p>
          </>
        ) : (
          <>
            {verifiedPrimary ? (
              <>
                <div
                  className="flex items-center gap-1.5 text-sm text-primary"
                  data-testid="wallet-status"
                >
                  <ShieldCheck className="h-4 w-4" /> ● Verified
                </div>
                <AddressLine a={verifiedPrimary.address} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Connect your MetaMask wallet</p>
            )}
            <Button onClick={connect} disabled={busy !== null}>
              {busy === "connect" ? "Opening MetaMask..." : "Connect MetaMask"}
            </Button>
          </>
        )}
        {err && !(err === "UNSUPPORTED_NETWORK" && connectedVerified) && (
          <p role="alert" className="text-sm text-destructive" data-testid="wallet-error">
            {WALLET_MESSAGES[err]}
          </p>
        )}
        {wrongNetwork && connectedVerified && (
          <p className="text-xs text-muted-foreground" data-testid="wallet-network-hint">
            MetaMask is on a different network. Your wallet is still verified. Switch MetaMask to{" "}
            {WALLET_CONFIG.requiredChainName} before sending test deposits.
          </p>
        )}
        {wrongNetwork && !connectedVerified && err !== "UNSUPPORTED_NETWORK" && (
          <p role="alert" className="text-sm text-destructive">
            {WALLET_MESSAGES.UNSUPPORTED_NETWORK}
          </p>
        )}
        {wrongNetwork && session && (
          <Button variant="secondary" size="sm" onClick={switchNetwork} disabled={busy !== null}>
            Switch to {WALLET_CONFIG.requiredChainName}
          </Button>
        )}
      </div>
    </section>
  );
}
