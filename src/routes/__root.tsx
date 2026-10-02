import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useLayoutEffect, type ReactNode } from "react";
import { ensureTheme } from "@/lib/theme";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PrestigeProvider } from "@/components/prestige/PrestigeProvider";
import { MobileTabBar, SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { arenaLogo } from "@/assets/media";
import { installGameSounds } from "@/lib/sound";

const ProfileSetupDialog = lazy(() =>
  import("@/components/ProfileSetupDialog").then((m) => ({ default: m.ProfileSetupDialog })),
);
const Toaster = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));
const DepositNotice = lazy(() =>
  import("@/components/wallet/DepositNotice").then((m) => ({ default: m.DepositNotice })),
);

/** Apply the stored theme before first paint. Dark is the default. */
const THEME_BOOT =
  '(function(){try{var t=localStorage.getItem("pvp-spin-arena-theme");if(t!=="light")t="dark";document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();';

/** First paint matches the stored theme, before stylesheets or React. */
const PAINT_CSS =
  "html{background:#03060e;color-scheme:dark;overflow-x:clip;overflow-y:auto;scrollbar-gutter:stable}html[data-theme=light]{background:#f3f1f9;color-scheme:light}body{overflow-x:clip}";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Back to the jackpot
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong on our end. You can try refreshing or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PVPspinArena — PvP Crypto Jackpot" },
      { name: "description", content: "Live PvP jackpot with provably fair, server-decided draws." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#080b19" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <style dangerouslySetInnerHTML={{ __html: PAINT_CSS }} />
        <HeadContent />
      </head>
      <body className="canvas">
        <div id="intro-boot" className="intro-gate" aria-hidden="true" style={{ display: "none" }} suppressHydrationWarning>
          <div className="intro-half intro-half-top" style={{ background: "#000" }}>
            <div className="intro-logo-wrap">
              <img src={arenaLogo} alt="" width={240} height={128} className="intro-logo" decoding="sync" fetchPriority="high" />
            </div>
          </div>
          <div className="intro-half intro-half-bottom" style={{ background: "#000" }}>
            <div className="intro-logo-wrap">
              <img src={arenaLogo} alt="" width={240} height={128} className="intro-logo" decoding="sync" fetchPriority="high" />
            </div>
          </div>
          <span className="intro-seam" />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname;var home=p==="/"||p==="";var skip=!home||sessionStorage.getItem("pvp_intro_seen")||matchMedia("(prefers-reduced-motion: reduce)").matches;var b=document.getElementById("intro-boot");var html=document.documentElement;if(skip){html.classList.add("intro-ready","intro-seen");if(b)b.style.display="none";return;}var earliest=false,arena=false,opening=false;function finish(){try{sessionStorage.setItem("pvp_intro_seen","1");}catch(e){}html.classList.add("intro-ready","intro-seen");html.classList.remove("intro-lock");if(b)b.style.display="none";}function open(){if(opening||!earliest||!arena)return;opening=true;if(b)b.classList.add("intro-can-open");setTimeout(finish,1000);}window.addEventListener("pvp:home-ready",function(){arena=true;open();},{once:true});if(b)b.style.display="block";html.classList.add("intro-lock");setTimeout(function(){earliest=true;open();},1600);setTimeout(function(){arena=true;open();},10000);}catch(e){document.documentElement.classList.add("intro-ready","intro-seen");}})();`,
          }}
        />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function ThemeSync() {
  useLayoutEffect(() => {
    ensureTheme();
  }, []);
  return null;
}

function GameSounds() {
  useEffect(() => {
    installGameSounds();
  }, []);
  return null;
}

function RootOverlays() {
  const { userId, needsProfile } = useAuth();
  return (
    <>
      {needsProfile ? (
        <Suspense fallback={null}>
          <ProfileSetupDialog />
        </Suspense>
      ) : null}
      {userId ? (
        <Suspense fallback={null}>
          <DepositNotice />
        </Suspense>
      ) : null}
      <Suspense fallback={null}>
        <Toaster position="top-center" />
      </Suspense>
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const wide = pathname === "/" || pathname === "/coinflip" || pathname.startsWith("/coinflip/") || pathname === "/roulette";
  const slott = pathname === "/slott" || pathname.startsWith("/slott/");
  const slottLobby = pathname === "/slott" || pathname === "/slott/";
  useLayoutEffect(() => {
    if (!slottLobby) return;
    const apply = () => document.documentElement.classList.toggle("slott-noscroll", matchMedia("(min-width: 1024px)").matches);
    apply();
    const m = matchMedia("(min-width: 1024px)");
    m.addEventListener("change", apply);
    return () => {
      m.removeEventListener("change", apply);
      document.documentElement.classList.remove("slott-noscroll");
    };
  }, [slottLobby]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PrestigeProvider>
        <ThemeSync />
        <GameSounds />
        <SiteHeader />
        <main className={wide ? "canvas mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-full flex-col overflow-x-clip px-4 pt-6 pb-4 sm:min-h-[calc(100dvh-4rem)] lg:px-6" : `canvas mx-auto w-full max-w-7xl overflow-x-clip ${slott ? `px-3 pt-3 pb-8 sm:px-4 sm:pt-3 lg:max-w-none lg:px-6 ${slottLobby ? "lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:pr-0 lg:pt-2 lg:pb-0" : "lg:pb-3"}` : "px-4 py-8"} sm:min-h-[calc(100dvh-4rem)] min-h-[calc(100dvh-3.5rem)]`}>
          <Outlet />
        </main>
        <SiteFooter className={slott ? "lg:hidden" : ""} />
        <MobileTabBar />
        <RootOverlays />
        </PrestigeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
