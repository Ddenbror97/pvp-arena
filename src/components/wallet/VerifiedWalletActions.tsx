import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { prepareCryptoDeposit } from "@/lib/crypto/crypto.functions";
import { formatUsd, parseUsdToCents } from "@/lib/jackpot/math";
import {
  clearKind,
  clickKind,
  CONNECT_UI_TIMEOUT_MS,
  finishKind,
  idleConnectUi,
  startKind,
  timeoutKind,
  walletButtonLocked,
  type ConnectUi,
} from "@/lib/web3/connect-attempt";
import { WALLET_CONFIG } from "@/lib/web3/config";
import {
  WalletError,
  serverCodeToError,
  walletMessage,
  type WalletErrorCode,
} from "@/lib/web3/errors";
import { shortAddress } from "@/lib/web3/message";
import {
  discoverInstalledWallets,
  getWalletSession,
  recallWalletKind,
  rememberWalletKind,
  resetWalletSession,
  WALLET_LABEL,
  type WalletKind,
  type WalletSession,
} from "@/lib/web3/metamask";
import { requestWalletChallenge, verifyWalletSignature } from "@/lib/web3/wallet.functions";
import { matchingVerifiedAddress } from "@/lib/web3/verified-wallet";
import { userWalletsQuery } from "@/components/wallet/WalletCard";
import { WalletChoices, WalletMark } from "@/components/wallet/WalletBrand";

/**
 * Deposit and withdraw can still be done by copying an address.
 * These actions open the verified MetaMask or Coinbase account when the player has one.
 */
/** Synchronous send lock. The second click in the same turn loses. */
export function claimSendLock(lock: { current: boolean }): boolean {
  if (lock.current) return false;
  lock.current = true;
  return true;
}

export function VerifiedWalletActions({
  purpose,
  chainId,
  asset,
  minCents,
  activeAddress,
  onAddress,
  payments = true,
}: {
  purpose: "deposit" | "withdraw";
  chainId: number;
  asset: string | null;
  minCents: number;
  activeAddress?: string;
  onAddress?: (address: string) => void;
  /** Bitcoin has its own address. The logo buttons stay; send and cashout stay on ETH and USDC. */
  payments?: boolean;
}) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const wallets = useQuery({
    ...userWalletsQuery(userId ?? ""),
    enabled: !!userId,
  });
  const prepare = useServerFn(prepareCryptoDeposit);
  const challengeFn = useServerFn(requestWalletChallenge);
  const verifyFn = useServerFn(verifyWalletSignature);
  const sessions = useRef<Partial<Record<WalletKind, WalletSession>>>({});
  const unsubs = useRef<Partial<Record<WalletKind, Array<() => void>>>>({});
  const shownKind = useRef<WalletKind | null>(null);
  const uiRef = useRef<ConnectUi>(idleConnectUi());
  const filledByWallet = useRef<string | null>(null);
  const sendLock = useRef(false);
  const onAddressRef = useRef(onAddress);
  const activeRef = useRef(activeAddress);
  onAddressRef.current = onAddress;
  activeRef.current = activeAddress;
  const [kind, setKind] = useState<WalletKind | null>(null);
  const [installed, setInstalled] = useState<Set<WalletKind>>(new Set());
  const [connected, setConnected] = useState<string | null>(null);
  const [chain, setChain] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const seededDepositAmount = useRef(false);
  const [ui, setUi] = useState<ConnectUi>(idleConnectUi);
  const [busy, setBusy] = useState<"send" | "verify" | "reset" | null>(null);
  const [err, setErr] = useState<WalletErrorCode | null>(null);
  const [focus, setFocus] = useState<WalletKind | null>(null);

  const verified = (wallets.data ?? []).filter((row) => row.is_verified);
  const label = WALLET_LABEL[kind ?? "metamask"];
  const matched = connected
    ? matchingVerifiedAddress(
        connected,
        verified.map((row) => row.normalized_address),
      )
    : null;
  const wrongNetwork = !!connected && !!chain && chain !== WALLET_CONFIG.requiredChainId;
  const walletChainId = Number.parseInt(WALLET_CONFIG.requiredChainId, 16);
  const cents = parseUsdToCents(amount);

  useEffect(() => {
    if (purpose !== "deposit" || !asset || !payments) return;
    if (seededDepositAmount.current) return;
    seededDepositAmount.current = true;
    const def = Math.max(minCents, 1000);
    setAmount(String(def / 100));
  }, [purpose, asset, payments, minCents]);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const found = await discoverInstalledWallets(window);
      if (cancel) return;
      setInstalled(found);
      for (const installedKind of ["metamask", "coinbase"] as const) {
        if (!found.has(installedKind)) continue;
        try {
          const session = await getWalletSession(installedKind);
          if (cancel) return;
          sessions.current[installedKind] = session;
          const existing = await session.checkConnection();
          if (cancel || !existing) continue;
          watch(installedKind, session);
          apply(installedKind, existing.address, existing.chainId);
          return;
        } catch {
          // A missing provider must not block the other wallet.
        }
      }
    })();
    return () => {
      cancel = true;
      for (const stops of Object.values(unsubs.current)) stops?.forEach((stop) => stop());
      unsubs.current = {};
    };
  }, []);

  function patchUi(
    nextKind: WalletKind,
    reduce: (current: ConnectUi[WalletKind]) => ConnectUi[WalletKind],
  ) {
    const next = { ...uiRef.current, [nextKind]: reduce(uiRef.current[nextKind]) };
    uiRef.current = next;
    setUi(next);
  }

  function publishAddress(address: string) {
    filledByWallet.current = address;
    onAddressRef.current?.(address);
  }

  function dropFilledAddress() {
    const filled = filledByWallet.current;
    if (!filled || activeRef.current?.toLowerCase() !== filled.toLowerCase()) return;
    filledByWallet.current = null;
    onAddressRef.current?.("");
  }

  function watch(nextKind: WalletKind, session: WalletSession) {
    unsubs.current[nextKind]?.forEach((stop) => stop());
    shownKind.current = nextKind;
    unsubs.current[nextKind] = [
      session.onAccountsChanged((accounts) => {
        if (shownKind.current !== nextKind) return;
        const next = accounts[0] ?? null;
        if (!next) {
          setConnected(null);
          setChain(null);
          dropFilledAddress();
          patchUi(nextKind, clearKind);
          setErr((current) => (current === "CONNECT_PENDING" ? null : current));
          return;
        }
        void session.chainId().then((chainIdHex) => {
          if (shownKind.current !== nextKind) return;
          apply(nextKind, next, chainIdHex);
        });
      }),
      session.onChainChanged((chainIdHex) => {
        if (shownKind.current !== nextKind) return;
        setChain(chainIdHex.toLowerCase());
      }),
      session.onConnect((chainIdHex) => {
        if (shownKind.current !== nextKind) return;
        setChain(chainIdHex.toLowerCase());
      }),
      session.onDisconnect(() => {
        if (shownKind.current !== nextKind) return;
        setConnected(null);
        setChain(null);
        dropFilledAddress();
        patchUi(nextKind, clearKind);
        setErr((current) => (current === "CONNECT_PENDING" ? null : current));
      }),
    ];
  }

  useEffect(() => {
    if (!connected || !kind) return;
    const known = verified.map((row) => row.normalized_address);
    if (wallets.isLoading && known.length === 0) return;
    const hit = matchingVerifiedAddress(connected, known);
    if (!hit) {
      setErr((current) => (current === "PICKER_UNAVAILABLE" ? current : "ADDRESS_MISMATCH"));
      return;
    }
    rememberWalletKind(connected, kind);
    const row = verified.find((item) => item.normalized_address === hit);
    const next = row?.address ?? connected;
    if (payments && activeRef.current?.toLowerCase() !== next.toLowerCase()) publishAddress(next);
    setErr((current) => (current === "ADDRESS_MISMATCH" ? null : current));
  }, [connected, kind, payments, wallets.data, wallets.isLoading]);

  function apply(nextKind: WalletKind, address: string, chainIdHex: string) {
    setKind(nextKind);
    setConnected(address);
    setChain(chainIdHex.toLowerCase());
    const known = verified.map((row) => row.normalized_address);
    if (wallets.isLoading && known.length === 0) {
      setErr(null);
      return;
    }
    const hit = matchingVerifiedAddress(address, known);
    if (hit) {
      rememberWalletKind(address, nextKind);
      const row = verified.find((item) => item.normalized_address === hit);
      if (payments) publishAddress(row?.address ?? address);
      setErr(null);
      return;
    }
    dropFilledAddress();
    setErr("ADDRESS_MISMATCH");
  }

  useEffect(() => {
    const pendingKind = focus ?? kind;
    if (!pendingKind || ui[pendingKind].phase !== "prompt") return;
    const session = sessions.current[pendingKind];
    if (!session) return;
    let stopped = false;
    const check = async () => {
      const found = await session.checkConnection().catch(() => null);
      if (!stopped && found) {
        apply(pendingKind, found.address, found.chainId);
        patchUi(pendingKind, (current) => finishKind(current, current.attempt, null));
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 2_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [ui, focus, kind]);

  function activeSession() {
    return (kind && sessions.current[kind]) || null;
  }

  async function runConnect(next: WalletKind, session: WalletSession, mode: "open" | "switch") {
    const started = startKind(uiRef.current[next]);
    if (started.ignored) return;
    patchUi(next, () => started.next);
    setKind(next);
    setFocus(next);
    setErr(null);
    const attempt = started.attempt;
    const timer = window.setTimeout(() => {
      const timed = timeoutKind(uiRef.current[next], attempt);
      if (timed === uiRef.current[next]) return;
      patchUi(next, () => timed);
      setErr("CONNECT_PENDING");
      setFocus(next);
    }, CONNECT_UI_TIMEOUT_MS);
    try {
      watch(next, session);
      const result = mode === "switch" ? await session.chooseAccount() : await session.connect();
      if (uiRef.current[next].attempt !== attempt) return;
      if (shownKind.current !== next) {
        patchUi(next, (current) => finishKind(current, attempt, null));
        return;
      }
      if ("picker" in result && result.picker === "unavailable") {
        apply(next, result.address, result.chainId);
        patchUi(next, (current) => finishKind(current, attempt, "PICKER_UNAVAILABLE"));
        setErr("PICKER_UNAVAILABLE");
        return;
      }
      if (result.chainId !== WALLET_CONFIG.requiredChainId) {
        await session.switchToRequiredNetwork().catch(() => {});
      }
      const chainIdHex = await session.chainId();
      if (uiRef.current[next].attempt !== attempt || shownKind.current !== next) {
        if (uiRef.current[next].attempt === attempt) {
          patchUi(next, (current) => finishKind(current, attempt, null));
        }
        return;
      }
      apply(next, result.address, chainIdHex);
      patchUi(next, (current) => finishKind(current, attempt, null));
    } catch (error) {
      if (uiRef.current[next].attempt !== attempt) return;
      const code = error instanceof WalletError ? error.code : "GENERIC";
      if (code !== "CONNECT_PENDING") resetWalletSession(next);
      patchUi(next, (current) => finishKind(current, attempt, code));
      if (shownKind.current !== next) return;
      setErr(code);
      toast.error(walletMessage(code, WALLET_LABEL[next]));
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function connect(next: WalletKind, mode: "open" | "switch" = "open") {
    let session: WalletSession;
    try {
      session = await getWalletSession(next);
    } catch (error) {
      const code = error instanceof WalletError ? error.code : "GENERIC";
      setKind(next);
      setFocus(next);
      setErr(code);
      toast.error(walletMessage(code, WALLET_LABEL[next]));
      return;
    }
    sessions.current[next] = session;
    const decision = clickKind(uiRef.current[next], session.hasPendingRequest());
    if (decision === "ignore") return;
    if (decision === "recover") {
      const found = await session.checkConnection().catch(() => null);
      setFocus(next);
      if (found) {
        watch(next, session);
        apply(next, found.address, found.chainId);
        patchUi(next, (current) => finishKind(current, current.attempt, null));
        return;
      }
      patchUi(next, (current) => ({ ...current, phase: "prompt", error: "CONNECT_PENDING" }));
      setErr("CONNECT_PENDING");
      return;
    }
    await runConnect(next, session, mode);
  }

  async function resetStuck(next: WalletKind) {
    if (busy === "reset") return;
    const session = sessions.current[next];
    setBusy("reset");
    setFocus(next);
    try {
      await session?.resetConnection();
      resetWalletSession(next);
      delete sessions.current[next];
      if (shownKind.current === next) {
        setConnected(null);
        setChain(null);
        dropFilledAddress();
      }
      patchUi(next, clearKind);
      setErr(null);
      toast.success(`${WALLET_LABEL[next]} connection reset. Choose it again.`);
    } catch (error) {
      const code = error instanceof WalletError ? error.code : "GENERIC";
      patchUi(next, (current) => finishKind(current, current.attempt, code));
      setErr(code);
      toast.error(walletMessage(code, WALLET_LABEL[next]));
    } finally {
      setBusy(null);
    }
  }

  async function verify() {
    const session = activeSession();
    if (!session || !connected || !kind || busy) return;
    setBusy("verify");
    setErr(null);
    try {
      const chainIdHex = await session.chainId();
      setChain(chainIdHex.toLowerCase());
      if (chainIdHex.toLowerCase() !== WALLET_CONFIG.requiredChainId) {
        throw new WalletError("UNSUPPORTED_NETWORK");
      }
      const challenge = await challengeFn({ data: { address: connected } });
      if (!challenge.ok) throw new WalletError(serverCodeToError(challenge.code));
      const signature = await session.sign(challenge.message, connected);
      const result = await verifyFn({ data: { challengeId: challenge.challengeId, signature } });
      if (!result.ok) throw new WalletError(serverCodeToError(result.code));
      rememberWalletKind(connected, kind);
      toast.success("Wallet linked. You can send and cash out from this address.");
      if (userId) void qc.invalidateQueries({ queryKey: ["user-wallets", userId] });
    } catch (error) {
      const code = error instanceof WalletError ? error.code : "GENERIC";
      setErr(code);
      toast.error(walletMessage(code, label));
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (sendLock.current || busy) return;
    const session = activeSession();
    if (!session || !connected || !matched || !asset || wrongNetwork) return;
    if (chainId !== walletChainId) {
      toast.error(`In-wallet send is only on ${WALLET_CONFIG.requiredChainName}.`);
      return;
    }
    if (cents == null || cents < minCents) {
      toast.error(`Minimum deposit is ${formatUsd(minCents)}.`);
      return;
    }
    if (!claimSendLock(sendLock)) return;
    setBusy("send");
    setErr(null);
    try {
      const prepared = await prepare({ data: { asset, usdCents: cents, chainId } });
      if (!prepared.ok) {
        toast.error(prepared.error);
        return;
      }
      const allowed = prepared.verifiedAddresses?.length
        ? prepared.verifiedAddresses
        : prepared.verifiedAddress
          ? [prepared.verifiedAddress]
          : [];
      if (!matchingVerifiedAddress(connected, allowed)) {
        setErr("ADDRESS_MISMATCH");
        return;
      }
      const destination = prepared.instruction.treasury;
      if (!/^0x[0-9a-fA-F]{40}$/.test(destination)) {
        toast.error("Your deposit address is not ready yet.");
        return;
      }
      await session.sendTestDeposit(
        { ...prepared.instruction, treasury: destination as `0x${string}` },
        connected,
      );
      toast.success(
        `Transaction submitted from ${label}. Your balance updates after the network confirms it.`,
      );
      setAmount("");
    } catch (error) {
      const code = error instanceof WalletError ? error.code : "GENERIC";
      setErr(code);
      toast.error(walletMessage(code, label));
    } finally {
      sendLock.current = false;
      setBusy(null);
    }
  }

  return (
    <div className="mt-2 space-y-1.5" data-testid="verified-wallet-actions">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Pay from a linked wallet
      </p>
      {verified.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Verified wallets">
          {verified.map((row) => {
            const remembered = recallWalletKind(row.address);
            const selected =
              !!activeAddress && activeAddress.toLowerCase() === row.normalized_address;
            return (
              <Button
                key={row.normalized_address}
                type="button"
                size="sm"
                variant={selected ? "default" : "secondary"}
                className="gap-1.5"
                aria-pressed={selected}
                disabled={busy !== null}
                onClick={() => {
                  if (payments) onAddress?.(row.address);
                  if (!remembered) return;
                  const differentAccount =
                    kind === remembered &&
                    !!connected &&
                    connected.toLowerCase() !== row.normalized_address;
                  void connect(remembered, differentAccount ? "switch" : "open");
                }}
              >
                {remembered ? <WalletMark kind={remembered} className="h-4 w-4" /> : null}
                {remembered ? WALLET_LABEL[remembered] : "Verified"} {shortAddress(row.address)}
              </Button>
            );
          })}
        </div>
      )}
      <WalletChoices
        busy={false}
        active={kind}
        installed={installed}
        testId={(item) => `use-${item}`}
        isLocked={(item) => walletButtonLocked(ui[item])}
        note={(item) =>
          ui[item].phase === "prompt"
            ? "Prompt open"
            : kind === item && connected
              ? "Switch account"
              : null
        }
        onChoose={(item) => void connect(item, kind === item && connected ? "switch" : "open")}
      />
      {payments && connected && matched && purpose === "deposit" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {label} · {shortAddress(connected)}
          </p>
          {wrongNetwork ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy !== null}
              onClick={() =>
                activeSession()
                  ?.switchToRequiredNetwork()
                  .then(() => activeSession()?.chainId())
                  .then((next) => {
                    if (next) setChain(next);
                  })
                  .catch((error: unknown) => {
                    const code = error instanceof WalletError ? error.code : "GENERIC";
                    setErr(code);
                    toast.error(walletMessage(code, label));
                  })
              }
            >
              Switch {label} to {WALLET_CONFIG.requiredChainName}
            </Button>
          ) : (
            <>
              <label htmlFor="wallet-send-amount" className="sr-only">
                Amount to send in USD
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">
                  $
                </span>
                <Input
                  id="wallet-send-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  className="h-9 pl-7 font-mono"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <Button
                type="button"
                className="h-9 w-full"
                disabled={
                  busy !== null ||
                  !asset ||
                  chainId !== walletChainId ||
                  cents == null ||
                  cents < minCents
                }
                onClick={() => void send()}
              >
                {busy === "send" ? "Check your wallet..." : `Send ${asset ?? ""} with ${label}`}
              </Button>
            </>
          )}
        </div>
      )}
      {payments && connected && matched && purpose === "withdraw" && (
        <p className="text-xs text-muted-foreground">
          Cashout address set from {label} · {shortAddress(connected)}
        </p>
      )}
      {err && (
        <p role="alert" className="text-xs text-destructive">
          {err === "ADDRESS_MISMATCH"
            ? `${shortAddress(connected ?? "")} is not linked to this account yet.`
            : walletMessage(err, label)}
        </p>
      )}
      {(err === "CONNECT_PENDING" || (focus != null && ui[focus].phase === "prompt")) && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={walletButtonLocked(ui[focus ?? kind ?? "metamask"])}
            onClick={() => void connect(focus ?? kind ?? "metamask")}
          >
            Retry connection
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy === "reset"}
            onClick={() => void resetStuck(focus ?? kind ?? "metamask")}
          >
            Reset {WALLET_LABEL[focus ?? kind ?? "metamask"]} connection
          </Button>
        </div>
      )}
      {connected &&
        !matched &&
        err === "ADDRESS_MISMATCH" &&
        (wrongNetwork ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy !== null}
            onClick={() =>
              activeSession()
                ?.switchToRequiredNetwork()
                .then(() => activeSession()?.chainId())
                .then((next) => {
                  if (next) setChain(next.toLowerCase());
                })
                .catch((error: unknown) => {
                  const code = error instanceof WalletError ? error.code : "GENERIC";
                  setErr(code);
                  toast.error(walletMessage(code, label));
                })
            }
          >
            Switch {label} to {WALLET_CONFIG.requiredChainName}
          </Button>
        ) : (
          <div className="space-y-1">
            <Button
              type="button"
              size="sm"
              className="h-9"
              disabled={busy !== null}
              onClick={() => void verify()}
            >
              {busy === "verify" ? `Check ${label}...` : `Sign with ${label} to link it`}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              A message signature only. No transaction and no gas.
            </p>
          </div>
        ))}
      {verified.length === 0 && !wallets.isLoading && !connected && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Sign a message to link MetaMask or Coinbase. You can still copy the deposit address.
        </p>
      )}
    </div>
  );
}
