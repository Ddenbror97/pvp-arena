import { Link } from "@tanstack/react-router";
import { ArrowRight, Cpu } from "lucide-react";
import "./gpu-guide-link.css";

/**
 * The lobby's callout to the graphics card guide (GpuGuide.tsx, /fps-graphics-guide). Its own
 * small module, so the lobby does not load the guide page and its GPU probe.
 */
export function GpuGuideLink() {
  return (
    <Link className="gpu-guide-open" to="/fps-graphics-guide">
      <Cpu className="gpu-guide-open-icon" size={18} aria-hidden />
      <span>
        <strong>Low fps or blurry graphics?</strong>
        <span>Read our graphics guide: play on your graphics card</span>
      </span>
      <ArrowRight size={16} aria-hidden />
    </Link>
  );
}
