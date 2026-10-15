import { useId } from "react";
import { WALLET_LABEL, type WalletKind } from "@/lib/web3/metamask";

/** Brand marks for the two wallets this app can open. Decorative; the button name is the label. */
export function WalletMark({ kind, className }: { kind: WalletKind; className?: string }) {
  if (kind === "metamask") {
    return (
      <svg viewBox="0 0 35 33" className={className} aria-hidden="true">
        <path d="m32.9582 1-13.1341 9.7183 2.4424-5.72731z" fill="#e17726" />
        <path d="m2.66296 1 13.01714 9.809-2.3254-5.81802z" fill="#e27625" />
        <path d="m28.2295 23.5335-3.4947 5.3386 7.4829 2.0603 2.1436-7.2823z" fill="#e27625" />
        <path d="m1.27281 23.6501 2.13055 7.2823 7.46994-2.0603-3.48166-5.3386z" fill="#e27625" />
        <path d="m10.4706 14.5149-2.0786 3.1358 7.405.3369-.2469-7.969z" fill="#e27625" />
        <path d="m25.1505 14.5149-5.1575-4.58704-.1688 8.05974 7.4049-.3369z" fill="#e27625" />
        <path d="m10.8733 28.8721 4.4819-2.1639-3.8583-3.0062z" fill="#e27625" />
        <path d="m20.2659 26.7082 4.4689 2.1639-.6105-5.1701z" fill="#e27625" />
        <path d="m24.7348 28.8721-4.469-2.1639.3638 2.9025-.039 1.231z" fill="#d5bfb2" />
        <path d="m10.8732 28.8721 4.1572 1.9696-.026-1.231.3508-2.9025z" fill="#d5bfb2" />
        <path d="m15.1084 21.7842-3.7155-1.0884 2.6243-1.2051z" fill="#233447" />
        <path d="m20.5126 21.7842 1.0913-2.2935 2.6372 1.2051z" fill="#233447" />
        <path d="m10.8733 28.8721.6495-5.3386-4.13117.1167z" fill="#cc6228" />
        <path d="m24.0982 23.5335.6366 5.3386 3.4946-5.2219z" fill="#cc6228" />
        <path
          d="m27.2291 17.6507-7.405.3369.6885 3.7966 1.0913-2.2935 2.6372 1.2051z"
          fill="#cc6228"
        />
        <path
          d="m11.3929 20.6958 2.6242-1.2051 1.0913 2.2935.6885-3.7966-7.40495-.3369z"
          fill="#cc6228"
        />
        <path d="m8.392 17.6507 3.1049 6.0513-.1039-3.0062z" fill="#e27525" />
        <path d="m24.2412 20.6958-.1169 3.0062 3.1049-6.0513z" fill="#e27525" />
        <path d="m15.797 17.9876-.6886 3.7967.8704 4.4833.1949-5.9087z" fill="#e27525" />
        <path d="m19.8242 17.9876-.3638 2.3584.1819 5.9216.8704-4.4833z" fill="#e27525" />
        <path
          d="m20.5127 21.7842-.8704 4.4834.6236.4406 3.8584-3.0062.1169-3.0062z"
          fill="#f5841f"
        />
        <path
          d="m11.3929 20.6958.104 3.0062 3.8583 3.0062.6236-.4406-.8704-4.4834z"
          fill="#f5841f"
        />
        <path
          d="m20.5906 30.8417.039-1.231-.3378-.2851h-4.9626l-.3248.2851.026 1.231-4.1572-1.9696 1.4551 1.1921 2.9489 2.0344h5.0536l2.962-2.0344 1.442-1.1921z"
          fill="#c0ac9d"
        />
        <path
          d="m20.2659 26.7082-.6236-.4406h-3.6635l-.6236.4406-.3508 2.9025.3248-.2851h4.9626l.3378.2851z"
          fill="#161616"
        />
        <path
          d="m33.5168 11.3532 1.1043-5.36447-1.6629-4.98873-12.6923 9.3944 4.8846 4.1205 6.8983 2.0085 1.52-1.7752-.6626-.4795 1.0523-.9588-.8054-.622 1.0523-.8034z"
          fill="#763e1a"
        />
        <path
          d="m1 5.98873 1.11724 5.36447-.71451.5313 1.06527.8034-.80545.622 1.05228.9588-.66255.4795 1.51997 1.7752 6.89835-2.0085 4.8846-4.1205-12.69233-9.3944z"
          fill="#763e1a"
        />
        <path
          d="m32.0489 16.5234-6.8983-2.0085 2.0786 3.1358-3.1049 6.0513 4.1052-.0519h6.1318z"
          fill="#f5841f"
        />
        <path
          d="m10.4705 14.5149-6.89828 2.0085-2.29944 7.1267h6.11883l4.10519.0519-3.10487-6.0513z"
          fill="#f5841f"
        />
        <path
          d="m19.8241 17.9876.4417-7.5932 2.0007-5.4034h-8.9119l2.0006 5.4034.4417 7.5932.1689 2.3842.013 5.8958h3.6635l.013-5.8958z"
          fill="#f5841f"
        />
      </svg>
    );
  }
  return <CoinbaseMark className={className} />;
}

/** Coinbase's circular C: blue on the left, cyan on the right, gap facing right. */
function CoinbaseMark({ className }: { className?: string | undefined }) {
  const gradientId = `coinbase-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0052FF" />
          <stop offset="100%" stopColor="#5BE0FF" />
        </linearGradient>
      </defs>
      <circle
        cx="16"
        cy="16"
        r="8.4"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray="33.8 19"
        transform="rotate(65 16 16)"
      />
    </svg>
  );
}

export function WalletChoices({
  busy,
  active,
  installed,
  testId,
  note,
  onChoose,
  isLocked,
}: {
  busy: boolean;
  active: WalletKind | null;
  installed: ReadonlySet<WalletKind>;
  testId: (kind: WalletKind) => string;
  note?: (kind: WalletKind) => string | null;
  onChoose: (kind: WalletKind) => void;
  /** When set, only that wallet is locked. The other wallet stays clickable. */
  isLocked?: (kind: WalletKind) => boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Choose a wallet">
      {(["metamask", "coinbase"] as const).map((kind) => {
        const opening = (busy && active === kind) || isLocked?.(kind) === true;
        const detected = installed.has(kind);
        const hint =
          note?.(kind) ??
          (detected ? "Detected" : kind === "metamask" ? "Extension or app" : "Extension");
        return (
          <button
            key={kind}
            type="button"
            data-testid={testId(kind)}
            disabled={isLocked ? isLocked(kind) : busy && active === kind}
            onClick={() => onChoose(kind)}
            title={WALLET_LABEL[kind]}
            className="flex h-10 min-w-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2 text-left transition-colors hover:border-primary/50 hover:bg-secondary/40 disabled:opacity-60"
          >
            <WalletMark kind={kind} className="h-5 w-5 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold leading-tight">
                {opening ? "Opening…" : WALLET_LABEL[kind]}
              </span>
              <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                {hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
