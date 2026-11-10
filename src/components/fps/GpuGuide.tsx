import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, Cpu } from "lucide-react";
import { gpuLabel, probeGpu } from "@/lib/fps/br/quality-tier";
import "./gpu-guide.css";

/**
 * PvPStrike graphics card guide (owner, 2026-11-10: "add a guide to the fps lobby, how to select
 * your graphics card … for Chrome, Firefox, etc.; not in game"; "no index and specific for our
 * games"). A page of its own (/fps-graphics-guide, noindex), linked from the lobby only: laptops
 * with two GPUs give browsers the integrated one by default, and the 1v1, Defuse the Bomb and
 * the Battle Royale then run on their lower tiers. It shows which card the browser uses now.
 */
export const GPU_GUIDE_PATH = "/fps-graphics-guide";
const WINDOWS_SHOT = "/fps/guide/windows-graphics-chrome-v1.webp";
const FLAG_SHOT = "/fps/guide/chrome-flag-high-performance-gpu-v1.webp";

/** Copies a browser-internal address (pages cannot link to chrome:// or about: addresses). */
function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="gpu-guide-copy-button"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 1600);
          })
          .catch(() => {});
      }}
    >
      {done ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

type Browser = "chromium" | "firefox" | "mac";
const TABS: Array<[Browser, string]> = [
  ["chromium", "Chrome · Edge · Brave · Opera"],
  ["firefox", "Firefox"],
  ["mac", "Mac"],
];

/** Integrated graphics by name (the dedicated cards' names never match). */
const INTEGRATED =
  /intel|radeon\(tm\) graphics|radeon graphics|vega \d|apple m\d|adreno|mali|swiftshader|llvmpipe|basic render/i;
const DEDICATED = /\brtx\b|\bgtx\b|geforce|quadro|radeon (rx|pro)|\barc\b/i;

function detectBrowser(): Browser {
  if (typeof navigator === "undefined") return "chromium";
  if (/firefox/i.test(navigator.userAgent)) return "firefox";
  if (/mac os x/i.test(navigator.userAgent)) return "mac";
  return "chromium";
}

/** The lobby's link to the guide. */
export function GpuGuideLink() {
  return (
    <Link className="gpu-guide-open" to={GPU_GUIDE_PATH}>
      <Cpu size={14} aria-hidden /> Graphics card guide: get more fps
    </Link>
  );
}

export function GpuGuidePage() {
  const [tab, setTab] = useState<Browser>("chromium");
  const [gpu, setGpu] = useState<string | null>(null);
  useEffect(() => {
    setTab(detectBrowser());
    try {
      setGpu(gpuLabel(probeGpu(false).gpu) || "");
    } catch {
      setGpu("");
    }
  }, []);
  const dedicated = !!gpu && DEDICATED.test(gpu);
  const integrated = !!gpu && !dedicated && INTEGRATED.test(gpu);
  const flagsPage = "chrome://flags/#force-high-performance-gpu";
  return (
    <main className="gpu-guide-page">
      <div className="gpu-guide">
        <Link className="gpu-guide-back" to="/fps-duel">
          <ArrowLeft size={14} aria-hidden /> Back to PvPStrike
        </Link>
        <h1 className="gpu-guide-title">Play PvPStrike on your graphics card</h1>
        <p className="gpu-guide-lead">
          PvPStrike&apos;s 1v1 Duel, Defuse the Bomb and Battle Royale run in your browser on your
          computer&apos;s graphics. Laptops with two graphics chips give browsers the weaker,
          built-in one by default, and the game then lowers its quality to keep the frame rate.
          Switch your browser to the dedicated NVIDIA or AMD card once and every match looks sharper
          and runs smoother.
        </p>
        <p
          className={`gpu-guide-now ${dedicated ? "is-good" : integrated ? "is-weak" : ""}`}
          role="status"
        >
          {gpu === null
            ? "Checking your graphics…"
            : gpu
              ? `Your browser uses: ${gpu}${
                  dedicated
                    ? ". You are already on your dedicated card; nothing to change."
                    : integrated
                      ? " (built-in graphics). If your computer has an NVIDIA or AMD card, follow the steps below."
                      : ""
                }`
              : "Your browser does not tell which graphics card it uses."}
        </p>
        <div className="gpu-guide-tabs" role="tablist" aria-label="Your browser">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "is-active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "chromium" && (
          <ol className="gpu-guide-steps">
            <li>
              <strong>Windows:</strong> open <em>Settings → System → Display → Graphics</em>. Click{" "}
              <em>Browse for an app</em> and pick your browser, e.g.{" "}
              <code>C:\Program Files\Google\Chrome\Application\chrome.exe</code> (Edge is usually
              listed already). Open it and set <em>GPU preference</em> to <em>High performance</em>,
              which names your NVIDIA or AMD card:
              <figure className="gpu-guide-shot">
                <img
                  src={WINDOWS_SHOT}
                  width={1200}
                  height={645}
                  loading="lazy"
                  alt="Windows Settings, System, Display, Graphics: Google Chrome with GPU preference set to High performance (NVIDIA GeForce RTX 2050)"
                />
                <figcaption>
                  Google Chrome set to <em>High performance</em> in Windows&apos; graphics settings.
                </figcaption>
              </figure>
            </li>
            <li>
              Copy this address into a new tab&apos;s address bar (browsers do not open it from a
              link):
              <span className="gpu-guide-copy">
                <code>{flagsPage}</code>
                <CopyButton text={flagsPage} />
              </span>
              Set <em>Force High Performance GPU</em> to <em>Enabled</em> and press{" "}
              <em>Relaunch</em>. Edge, Brave and Opera: the same address with <code>edge://</code>,{" "}
              <code>brave://</code> or <code>opera://</code> instead of <code>chrome://</code>.
              <figure className="gpu-guide-shot">
                <img
                  src={FLAG_SHOT}
                  width={1100}
                  height={200}
                  loading="lazy"
                  alt="chrome://flags/#force-high-performance-gpu with Force High Performance GPU set to Enabled"
                />
                <figcaption>
                  <em>Force High Performance GPU</em> set to <em>Enabled</em> in Chrome.
                </figcaption>
              </figure>
            </li>
            <li>
              In the browser&apos;s settings, under <em>System</em>, keep{" "}
              <em>Use graphics acceleration when available</em> on.
            </li>
            <li>
              Close every browser window, open it again and come back to this page: the line at the
              top should now name your NVIDIA or AMD card.
            </li>
          </ol>
        )}
        {tab === "firefox" && (
          <ol className="gpu-guide-steps">
            <li>
              <strong>Windows:</strong> open <em>Settings → System → Display → Graphics</em>, click{" "}
              <em>Browse for an app</em> and pick{" "}
              <code>C:\Program Files\Mozilla Firefox\firefox.exe</code>. Open it and set{" "}
              <em>GPU preference</em> to <em>High performance</em> (the same screen as for Chrome,
              in the Chrome tab).
            </li>
            <li>
              In Firefox: <em>Settings → General → Performance</em>, untick{" "}
              <em>Use recommended performance settings</em> and tick{" "}
              <em>Use hardware acceleration when available</em>.
            </li>
            <li>
              Restart Firefox and come back to this page. You can also check{" "}
              <code>about:support</code> <CopyButton text="about:support" /> under <em>Graphics</em>
              : the active GPU should be your NVIDIA or AMD card.
            </li>
          </ol>
        )}
        {tab === "mac" && (
          <ol className="gpu-guide-steps">
            <li>
              Only MacBook Pros with two graphics chips (older Intel models) need this; Apple
              silicon Macs have one.
            </li>
            <li>
              Chrome, Edge, Brave: open <code>{flagsPage}</code>, set{" "}
              <em>Force high-performance GPU</em> to <em>Enabled</em> and relaunch.
            </li>
            <li>
              Or for every app: <em>System Settings → Battery → Options</em> (older macOS:{" "}
              <em>Energy Saver</em>) and turn off <em>Automatic graphics switching</em>.
            </li>
          </ol>
        )}
        <div className="gpu-guide-more">
          <p>
            <strong>Still on the built-in chip?</strong> NVIDIA:{" "}
            <em>
              NVIDIA Control Panel → Manage 3D settings → Program Settings → your browser →
              High-performance NVIDIA processor
            </em>
            . AMD: <em>AMD Software → Settings → Graphics → your browser → High performance</em>.
          </p>
          <p>
            <strong>In a match:</strong> press <kbd>F3</kbd> to open the performance window. It
            shows your frame rate and the graphics card the game runs on.
          </p>
          <p>
            <strong>Laptop tips:</strong> plug in the charger (on battery many laptops slow the card
            down), keep your graphics driver up to date, and close other heavy tabs.
          </p>
        </div>
      </div>
    </main>
  );
}
