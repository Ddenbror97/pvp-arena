import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight, Crosshair, Monitor, MousePointer2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { STRIKE_SHOWCASE } from "@/lib/fps/showcase";
import battleArtwork from "@/assets/fps/mode-battle-royale-v1.webp";
import duelArtwork from "@/assets/fps/mode-duel-v1.webp";
import bombArtwork from "@/assets/fps/mode-bomb-defusal-v1.webp";

const MODES = [
  {
    name: "1v1 Duel",
    tag: "Head to head",
    image: duelArtwork,
    text: "Best of 13. Learn the rounds, cash-entry terms and free practice.",
    to: "/fps-1v1",
  },
  {
    name: "5v5 Bomb Defusal",
    tag: "Team tactics",
    image: bombArtwork,
    text: "Plant, defend or defuse. Get to know the tactical team format.",
    to: "/guides/$slug",
    slug: "browser-fps-games",
  },
  {
    name: "Battle Royale",
    tag: "Project Island",
    image: battleArtwork,
    text: "Drop in, find your gear and survive the closing zone.",
    to: "/guides/$slug",
    slug: "browser-battle-royale",
  },
] as const;

/** A phone-friendly introduction, with no matchmaking or playable-game controls. */
export function FpsMobileLanding() {
  const { userId } = useAuth();
  return (
    <div className="fps-mobile-page">
      <section className="fps-mobile-hero" aria-labelledby="fps-mobile-title">
        <img
          className="fps-mobile-backdrop"
          src={STRIKE_SHOWCASE}
          alt=""
          width={1672}
          height={941}
          fetchPriority="high"
        />
        <div className="fps-mobile-hero-content">
          <p className="fps-mobile-eyebrow">
            <Crosshair size={15} aria-hidden /> Competitive browser FPS
          </p>
          <h1 id="fps-mobile-title">
            PvP<span>Strike</span>
          </h1>
          <p className="fps-mobile-lead">
            1v1 duels. 5v5 tactics.
            <br />
            Battle Royale.
          </p>
          <div className="fps-mobile-device">
            <Monitor size={23} aria-hidden />
            <div>
              <strong>Play on desktop</strong>
              <p>
                Matches need a mouse and keyboard. On your phone, explore the modes and prepare for
                your next session.
              </p>
            </div>
          </div>
          <div className="fps-mobile-actions">
            <a href="#fps-mobile-modes" className="fps-mobile-primary">
              Explore the modes <ArrowDown size={17} aria-hidden />
            </a>
            <Link to="/fps-1v1" className="fps-mobile-rules">
              Rules &amp; fees <ArrowUpRight size={15} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
      <section
        id="fps-mobile-modes"
        className="fps-mobile-modes"
        aria-labelledby="fps-mobile-modes-title"
      >
        <p className="fps-mobile-eyebrow">Find your format</p>
        <h2 id="fps-mobile-modes-title">Choose your arena</h2>
        <div className="fps-mobile-mode-list">
          {MODES.map((mode) => (
            <Link
              key={mode.name}
              to={mode.to}
              params={"slug" in mode ? { slug: mode.slug } : {}}
              className="fps-mobile-mode"
              aria-label={`Learn about ${mode.name}`}
            >
              <img src={mode.image} alt="" width={768} height={768} loading="lazy" />
              <div>
                <small>{mode.tag}</small>
                <h3>{mode.name}</h3>
                <p>{mode.text}</p>
                <span>
                  Explore mode <ArrowUpRight size={14} aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="fps-mobile-next" aria-labelledby="fps-mobile-next-title">
        <MousePointer2 size={22} aria-hidden />
        <h2 id="fps-mobile-next-title">Ready when you’re back at your PC.</h2>
        <p>
          {userId
            ? "Your account is ready. Open this site on desktop to choose a match."
            : "Create your account here, then sign in on desktop when you’re ready to play."}
        </p>
        <Link
          to={userId ? "/guides/$slug" : "/auth"}
          params={userId ? { slug: "browser-fps-games" } : {}}
          className="fps-mobile-account"
        >
          {userId ? "Browse the FPS guide" : "Create your account"}
          <ArrowUpRight size={16} aria-hidden />
        </Link>
        <small>
          Free practice available on desktop. Cash play is 18+ and subject to eligibility.
        </small>
      </section>
    </div>
  );
}
