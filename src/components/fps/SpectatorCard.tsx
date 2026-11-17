import { Bot, Eye, Heart, Skull } from "lucide-react";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import type { ReactNode } from "react";
import "./spectator.css";

/** Only server-authorized spectator information is passed to this shared card. */
export function SpectatorCard({
  name,
  avatar,
  bot,
  hp,
  kills,
  weapon,
  weaponName,
  ammo,
  team,
  hint,
}: {
  name: string;
  avatar?: string | undefined;
  bot?: boolean | undefined;
  hp?: number | undefined;
  kills?: number | undefined;
  weapon?: ReactNode;
  weaponName?: string | undefined;
  ammo?: number | undefined;
  team?: string | undefined;
  hint?: string | undefined;
}) {
  return (
    <aside
      className={`fps-spectator${team ? ` team-${team}` : ""}`}
      aria-label={`Spectating ${name}`}
    >
      <div className="fps-spectator-label">
        <Eye size={12} /> Spectating{hint && <span>{hint}</span>}
      </div>
      <div className="fps-spectator-card">
        {bot ? (
          <span className="fps-spectator-avatar fps-spectator-bot">
            <Bot size={24} />
          </span>
        ) : (
          <PlayerAvatar src={avatar} name={name} className="fps-spectator-avatar" />
        )}
        <div className="fps-spectator-player">
          <strong title={name}>{name}</strong>
          <div>
            {hp !== undefined && (
              <span>
                <Heart size={11} /> {Math.max(0, Math.ceil(hp))}
              </span>
            )}
            {kills !== undefined && (
              <span>
                <Skull size={11} /> {kills}
              </span>
            )}
            {bot && <small>BOT</small>}
          </div>
        </div>
        {weapon && (
          <div className="fps-spectator-weapon">
            {weapon}
            <span>{weaponName}</span>
          </div>
        )}
        {ammo !== undefined && (
          <b className="fps-spectator-ammo" aria-label={`${ammo} rounds`}>
            {ammo}
            <small>AMMO</small>
          </b>
        )}
        {hp !== undefined && (
          <div
            className="fps-spectator-health"
            role="meter"
            aria-label={`${name} health`}
            aria-valuenow={Math.max(0, Math.min(100, hp))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${Math.max(0, Math.min(100, hp))}%` }} />
          </div>
        )}
      </div>
    </aside>
  );
}
