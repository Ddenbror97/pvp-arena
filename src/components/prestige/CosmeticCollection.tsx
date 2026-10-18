import { useRef, useState } from "react";
import { formatUsd } from "@/lib/jackpot/math";
import {
  claimReward,
  cosmeticRows,
  equipCosmetic,
  prestigeError,
  type PrestigeLevel,
  type PrestigeState,
} from "@/lib/prestige/api";
import { PlayerPrestigeIdentity } from "./PlayerPrestigeIdentity";
import { LootBoxOpening } from "./LootBoxOpening";
import { Lock } from "lucide-react";
import {
  accentOf,
  ArtStage,
  AvatarFrame,
  CrownAccessory,
  crownAspect,
  lootAccent,
  LootBoxArt,
  RARITY_COLOR,
  rarityOf,
} from "./frames";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markSeen, useSeenCosmetics } from "@/lib/prestige/wardrobe";

type Filter = "owned" | "frames" | "crowns" | "rewards" | "all";

const FILTERS: Filter[] = ["owned", "frames", "crowns", "rewards", "all"];

const USDC_ACCENT = "#34d399";

/** Cash milestones and loot boxes pay balance; frames and crowns are cosmetics. */
export function isBalanceReward(row: PrestigeLevel) {
  return row.reward_type === "usdc" || row.reward_type === "lootbox";
}

export function rewardAccent(row: PrestigeLevel) {
  if (row.reward_type === "usdc") return USDC_ACCENT;
  if (row.reward_type === "lootbox") return lootAccent(row.box);
  return accentOf(row.asset_key);
}

/** Stage glow strength. Loot boxes glow like epic art. */
export function rewardRarity(row: PrestigeLevel) {
  if (row.reward_type === "usdc") return "reward";
  if (row.reward_type === "lootbox") return "epic";
  return row.rarity ?? rarityOf(row.asset_key);
}

export function RewardKindLabel({ row, className }: { row: PrestigeLevel; className?: string }) {
  if (!isBalanceReward(row))
    return <RarityLabel rarity={row.rarity ?? rarityOf(row.asset_key)} className={className} />;
  const color = rewardAccent(row);
  return (
    <span className={cn("block", className)}>
      <span
        className="block text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ color }}
      >
        {row.reward_type === "lootbox" ? "Loot box" : "Cash reward"}
      </span>
      <span aria-hidden className="mt-1.5 block h-px w-6" style={{ background: color }} />
    </span>
  );
}

function owned(row: PrestigeLevel) {
  return row.unlocked && !isBalanceReward(row);
}

function matches(row: PrestigeLevel, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "owned") return owned(row);
  if (filter === "frames") return row.reward_type === "frame";
  if (filter === "crowns") return row.reward_type === "crown";
  return isBalanceReward(row);
}

export function CosmeticPreview({
  row,
  avatar,
  name,
  frame,
  crown,
  level,
  tier,
}: {
  row: PrestigeLevel;
  avatar?: string | null | undefined;
  name?: string | null | undefined;
  frame?: string | null | undefined;
  crown?: string | null | undefined;
  level: number;
  tier: string;
}) {
  const previewFrame = row.reward_type === "frame" ? row.asset_key : frame;
  const previewCrown = row.reward_type === "crown" ? row.asset_key : crown;
  return (
    <ArtStage
      accent={rewardAccent(row)}
      rarity={isBalanceReward(row) ? "rare" : rewardRarity(row)}
      className="h-44 w-full"
    >
      {isBalanceReward(row) ? (
        <CosmeticArt
          row={row}
          size={120}
          animated={row.reward_type === "lootbox" && row.unlocked && !row.claimed}
        />
      ) : (
        <PlayerPrestigeIdentity
          avatar={avatar}
          name={name}
          frame={previewFrame}
          crown={previewCrown}
          level={level}
          tier={tier}
          size={previewCrown ? 120 : 134}
        />
      )}
    </ArtStage>
  );
}

export function RewardUnlock({ row }: { row: PrestigeLevel }) {
  return (
    <p className="text-sm text-muted-foreground">
      {row.unlocked ? "Unlocked" : `Reach level ${row.level}`}
    </p>
  );
}

export function RewardClaim({
  row,
  pending,
  onClaim,
}: {
  row: PrestigeLevel;
  pending: boolean;
  onClaim: () => void;
}) {
  if (row.reward_type !== "usdc") return null;
  if (!row.unlocked)
    return (
      <Button type="button" disabled className="min-h-11">
        Locked
      </Button>
    );
  if (row.claimed)
    return (
      <Button type="button" disabled className="min-h-11">
        Claimed
      </Button>
    );
  return (
    <Button type="button" className="min-h-11" disabled={pending} onClick={onClaim}>
      {pending ? "Claiming…" : `Claim ${row.amount != null ? formatUsd(row.amount) : "reward"}`}
    </Button>
  );
}

export function CosmeticArt({
  row,
  size,
  animated,
}: {
  row: PrestigeLevel;
  size: number;
  animated?: boolean | undefined;
}) {
  if (row.reward_type === "crown") {
    return (
      <CrownAccessory
        assetKey={row.asset_key}
        animated={animated}
        style={{ width: size * 1.15, height: size * 1.15 * crownAspect(row.asset_key) }}
      />
    );
  }
  if (row.reward_type === "frame")
    return <AvatarFrame assetKey={row.asset_key} style={{ width: size, height: size }} />;
  if (row.reward_type === "lootbox")
    return <LootBoxArt box={row.box} width={size * 1.3} animated={animated} />;
  return (
    <span
      className="font-display tabular-nums"
      style={{
        fontSize: size * 0.3,
        color: USDC_ACCENT,
        textShadow: `0 0 ${size * 0.18}px color-mix(in oklab, ${USDC_ACCENT} 55%, transparent)`,
      }}
    >
      {row.amount != null ? formatUsd(row.amount) : "USDC"}
    </span>
  );
}

export function RarityLabel({
  rarity,
  className,
}: {
  rarity: string;
  className?: string | undefined;
}) {
  const color = RARITY_COLOR[rarity] ?? RARITY_COLOR["common"];
  return (
    <span className={cn("block", className)}>
      <span
        className="block text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ color }}
      >
        {rarity}
      </span>
      <span aria-hidden className="mt-1.5 block h-px w-6" style={{ background: color }} />
    </span>
  );
}

function cardStatus(row: PrestigeLevel, equipped: boolean) {
  if (!row.unlocked) return `Unlock at level ${row.level}`;
  if (equipped) return "Equipped";
  if (row.reward_type === "lootbox")
    return row.claimed
      ? `Won ${row.won != null ? formatUsd(row.won) : ""}`.trim()
      : "Ready to open";
  if (row.reward_type === "usdc") return row.claimed ? "Claimed" : "Ready to claim";
  return "Unlocked";
}

export function CosmeticCard({
  row,
  equipped,
  fresh,
  onOpen,
}: {
  row: PrestigeLevel;
  equipped: boolean;
  fresh?: boolean | undefined;
  onOpen: () => void;
}) {
  const rarity = rewardRarity(row);
  const accent = rewardAccent(row);
  const strong = rarity === "rare" || rarity === "epic" || rarity === "legendary";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex flex-col rounded-xl border bg-card p-2 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0",
        !strong && !equipped && "border-border hover:border-foreground/25",
      )}
      style={{
        borderColor: equipped
          ? "var(--primary)"
          : strong
            ? `color-mix(in oklab, ${accent} ${row.unlocked ? 45 : 25}%, transparent)`
            : undefined,
        boxShadow:
          equipped || (strong && row.unlocked)
            ? `0 0 28px -10px ${equipped ? "var(--primary)" : accent}`
            : undefined,
      }}
    >
      <ArtStage
        accent={accent}
        rarity={rarity}
        locked={!row.unlocked}
        className="aspect-[4/3] w-full"
      >
        <span
          className={cn(
            "flex items-center justify-center transition duration-300",
            !row.unlocked &&
              "opacity-60 saturate-[.55] group-hover:opacity-90 group-hover:saturate-100",
          )}
        >
          <CosmeticArt row={row} size={83} />
        </span>
        {!row.unlocked ? (
          <span
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white/80"
            aria-hidden
          >
            <Lock className="h-3 w-3" />
          </span>
        ) : equipped ? (
          <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground">
            Equipped
          </span>
        ) : fresh ? (
          <span className="animate-pulse-ring absolute right-2 top-2 rounded-full bg-[#3b82f6] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
            New
          </span>
        ) : null}
        {row.level === 0 ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/85">
            Daily chest
          </span>
        ) : null}
      </ArtStage>
      <div className="px-1 pb-0.5 pt-2">
        <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
        <RewardKindLabel row={row} />
        <p
          className={cn(
            "mt-2 text-[10px] font-semibold uppercase tracking-[0.14em]",
            row.unlocked ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {cardStatus(row, equipped)}
        </p>
      </div>
    </button>
  );
}

/** Level rows are keyed by level; daily chest drops (level 0) by cosmetic. */
function rowKey(row: PrestigeLevel) {
  return row.level === 0 ? `c:${row.cosmetic_id}` : `l:${row.level}`;
}

function findRow(state: PrestigeState, row: PrestigeLevel) {
  const key = rowKey(row);
  return cosmeticRows(state).find((r) => rowKey(r) === key) ?? null;
}

function rewardDescription(row: PrestigeLevel) {
  if (row.reward_type === "lootbox") return "";
  if (row.description) return row.description;
  if (row.reward_type === "usdc")
    return `A ${row.amount != null ? formatUsd(row.amount) : "USDC"} milestone reward. The amount is fixed.`;
  return "";
}

export function CosmeticCollection({
  state,
  avatar,
  name,
  frame,
  crown,
  onChange,
}: {
  state: PrestigeState;
  avatar?: string | null | undefined;
  name?: string | null | undefined;
  frame: string | null;
  crown: string | null;
  onChange: (next: PrestigeState) => void;
}) {
  const all = cosmeticRows(state);
  const unlocked = all.filter(owned).length;
  const cosmetics = all.filter((row) => !isBalanceReward(row)).length;
  const [filter, setFilter] = useState<Filter>(() => (unlocked > 0 ? "owned" : "all"));
  const [open, setOpen] = useState<PrestigeLevel | null>(null);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const unrevealed = useRef<PrestigeState | null>(null);
  const seen = useSeenCosmetics();
  const isNew = (row: PrestigeLevel) =>
    seen != null && row.level === 0 && !!row.cosmetic_id && !seen.has(row.cosmetic_id);
  const newCount = all.filter(isNew).length;
  const rows = all
    .filter((row) => matches(row, filter))
    .sort((a, b) => (filter === "owned" ? Number(isNew(b)) - Number(isNew(a)) : 0));

  async function run(kind: "equip" | "claim", row: PrestigeLevel) {
    const id = kind === "equip" ? row.cosmetic_id : row.reward_id;
    if (!id) return;
    setPending(true);
    setNote(null);
    try {
      const next = kind === "equip" ? await equipCosmetic(id) : await claimReward(id);
      onChange(next);
      setOpen(findRow(next, row));
    } catch (error) {
      setNote(prestigeError(error));
    } finally {
      setPending(false);
    }
  }

  /** The claimed state is held back until the reveal so nothing on screen spoils the prize. */
  async function openBox(row: PrestigeLevel): Promise<number | null> {
    if (!row.reward_id) return null;
    setNote(null);
    try {
      const next = await claimReward(row.reward_id);
      unrevealed.current = next;
      return next.levels.find((l) => l.level === row.level)?.won ?? null;
    } catch (error) {
      setNote(prestigeError(error));
      return null;
    }
  }

  function flushReveal(level: number | null) {
    const next = unrevealed.current;
    if (!next) return;
    unrevealed.current = null;
    onChange(next);
    if (level != null) setOpen(next.levels.find((l) => l.level === level) ?? null);
  }

  return (
    <section id="wardrobe" className="scroll-mt-24" aria-labelledby="your-collection">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="your-collection"
            className="flex items-center gap-2 font-display text-sm uppercase tracking-widest"
          >
            Wardrobe
            {newCount > 0 ? (
              <span className="rounded-full bg-[#3b82f6] px-2 py-0.5 text-[9px] font-bold tracking-widest text-white">
                {newCount} new
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {unlocked} / {cosmetics} cosmetics owned · tap one to preview and equip
          </p>
        </div>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Wardrobe">
          {FILTERS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
              className={cn(
                "min-h-9 rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {id}
            </button>
          ))}
        </div>
      </div>
      {state.signed_in && unlocked === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-6 text-center">
          <p className="font-display text-lg">Your wardrobe starts here</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Reach level 2 or win a frame or crown from the daily chest.
          </p>
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((row) => (
          <CosmeticCard
            key={rowKey(row)}
            row={row}
            equipped={
              row.cosmetic_id != null &&
              (row.cosmetic_id === state.equipped_frame || row.cosmetic_id === state.equipped_crown)
            }
            fresh={isNew(row)}
            onOpen={() => {
              setNote(null);
              markSeen(row.cosmetic_id);
              setOpen(row);
            }}
          />
        ))}
      </div>
      <Dialog
        open={!!open}
        onOpenChange={(v) => {
          if (!v) {
            flushReveal(null);
            setOpen(null);
          }
        }}
      >
        <DialogContent
          className="max-h-[90dvh] max-w-md overflow-y-auto"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {open ? (
            <div className="text-center">
              <DialogTitle className="font-display text-xl">{open.name}</DialogTitle>
              {open.reward_type === "usdc" ? null : (
                <div className="mt-2 flex justify-center">
                  <RewardKindLabel row={open} className="flex flex-col items-center" />
                </div>
              )}
              {open.reward_type === "lootbox" ? (
                <div className="mt-5 flex flex-col items-center gap-3">
                  <LootBoxOpening
                    key={open.level}
                    row={open}
                    onOpen={() => openBox(open)}
                    onRevealed={() => flushReveal(open.level)}
                  />
                  {note ? (
                    <p className="text-sm text-destructive" role="alert">
                      {note}
                    </p>
                  ) : null}
                  {rewardDescription(open) ? (
                    <p className="text-sm text-muted-foreground">{rewardDescription(open)}</p>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="mt-5 flex justify-center">
                    <CosmeticPreview
                      row={open}
                      avatar={avatar}
                      name={name}
                      frame={frame}
                      crown={crown}
                      level={state.level}
                      tier={state.tier}
                    />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{rewardDescription(open)}</p>
                  <div className="mt-5 flex flex-col items-center gap-2">
                    <RewardUnlock row={open} />
                    {isBalanceReward(open) ? (
                      <RewardClaim
                        row={open}
                        pending={pending}
                        onClaim={() => void run("claim", open)}
                      />
                    ) : open.unlocked ? (
                      <Button
                        type="button"
                        className="min-h-11"
                        disabled={pending}
                        onClick={() => void run("equip", open)}
                      >
                        {open.cosmetic_id === state.equipped_frame ||
                        open.cosmetic_id === state.equipped_crown
                          ? pending
                            ? "Unequipping…"
                            : "Unequip"
                          : pending
                            ? "Equipping…"
                            : `Equip ${open.reward_type}`}
                      </Button>
                    ) : (
                      <Button type="button" disabled className="min-h-11">
                        Locked
                      </Button>
                    )}
                    {note ? (
                      <p className="text-sm text-destructive" role="alert">
                        {note}
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
