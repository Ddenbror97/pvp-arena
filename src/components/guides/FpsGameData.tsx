import type { FpsSeoSnapshot } from "@/lib/fps/seo-snapshot";
import { HIT_DAMAGE, applyVestDamage, recoveryProfile } from "@/lib/fps/combat";
import { duelMoney } from "@/lib/fps/quote";

export function FpsGameData({ view }: { view: FpsSeoSnapshot | null }) {
  return (
    <section
      id="fps-activity"
      className="my-8 min-h-64 rounded-2xl border border-border bg-card p-5 sm:p-6"
      aria-labelledby="fps-activity-title"
    >
      <h2 id="fps-activity-title" className="font-display text-2xl">
        Recent settled PvPStrike matches
      </h2>
      {!view ? (
        <p className="mt-3 text-muted-foreground">
          Match data is temporarily unavailable. No estimated results are shown.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            Latest {view.matches} public cash matches completed by score within 30 days, capped at
            100. Private rooms, practice, forfeits and refunds are excluded. This is a sample, not
            total platform activity.
          </p>
          <p className="mt-2 text-sm">
            Combined entry in this sample: <strong>{duelMoney(Number(view.potCents))}</strong>.
            Current fee: <strong>{view.config.feeBps / 100}% of the combined pot</strong>.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Data as of{" "}
            <time dateTime={view.generatedAt}>
              {new Date(view.generatedAt).toISOString().replace("T", " ").slice(0, 19)} UTC
            </time>
            . Cached for five minutes; older data may be retained for up to one hour during an
            outage. These are our browser-game results, not CS2 statistics.
          </p>
          {view.recent.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm tabular-nums">
                <caption className="sr-only">
                  Most recent eight eligible settlements; amounts in USD account units.
                </caption>
                <thead>
                  <tr>
                    {["Completed (UTC)", "Score A–B", "Each entry", "Fee", "Winner credited"].map(
                      (t) => (
                        <th key={t} className="p-2">
                          {t}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {view.recent.map((r, i) => (
                    <tr key={`${r.completedAt}:${i}`} className="border-t border-border">
                      <td className="p-2">
                        <time dateTime={r.completedAt}>
                          {new Date(r.completedAt).toISOString().replace("T", " ").slice(0, 16)}
                        </time>
                      </td>
                      <td className="p-2">
                        {r.scoreA}–{r.scoreB} (BO{r.bestOf})
                      </td>
                      <td className="p-2">{duelMoney(r.stake)}</td>
                      <td className="p-2">{duelMoney(r.fee)}</td>
                      <td className="p-2">{duelMoney(r.payout)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4">
              No eligible public cash matches in this window yet. We do not substitute practice
              results.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Winner credit includes the winner's original entry. It is not net profit or a completed
            blockchain withdrawal. No player identities are included.
          </p>
        </>
      )}
    </section>
  );
}

export function FpsMechanicsData() {
  const zones = ["head", "chest", "stomach", "legs"] as const;
  return (
    <section
      id="fps-mechanics"
      className="my-8 rounded-2xl border border-border p-5"
      aria-labelledby="fps-mechanics-title"
    >
      <h2 id="fps-mechanics-title" className="font-display text-2xl">
        PvPStrike's actual rifle tuning
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Generated from the current game's damage and recoil functions. These are PvPStrike values,
        not Valve's CS2 weapon statistics. Assumes 100 health and a fresh vest; no damage through
        cover.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-2">Hit area</th>
              <th className="p-2">Unarmored damage</th>
              <th className="p-2">Fresh-vest damage</th>
              <th className="p-2">Hits at that damage to reach 100</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => {
              const damage = applyVestDamage(
                { armor: 100 } as Parameters<typeof applyVestDamage>[0],
                "rifle",
                zone,
              );
              return (
                <tr key={zone} className="border-t border-border">
                  <th className="p-2 capitalize">{zone}</th>
                  <td className="p-2">{HIT_DAMAGE.rifle[zone]}</td>
                  <td className="p-2">{damage}</td>
                  <td className="p-2">{Math.ceil(100 / damage)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm">
        Recoil sequence reset after a three-shot burst: {Math.round(recoveryProfile(3).resetMs)} ms.
        After a long spray: {Math.round(recoveryProfile(15).resetMs)} ms. Releasing fire does not
        immediately erase recoil; both the Police M4A1-S and Terrorist AK-47 remain automatic when
        held and use the same damage values.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Mixed hit locations and depleted armor change the result. Use the winner recap to compare
        hits and damage, not a promised win rate.
      </p>
    </section>
  );
}
