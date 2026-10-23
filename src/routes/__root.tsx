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
import { lazy, memo, Suspense, useEffect, useLayoutEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PrestigeProvider } from "@/components/prestige/PrestigeProvider";
import { MobileTabBar, SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { arenaLogo } from "@/assets/media";
import { SLOT_STAGE } from "@/lib/slott/stage";
import { rootHead } from "@/lib/seo/root-head";
import { installGameSounds, setWheelCueEnabled } from "@/lib/sound";
import { PoolJoinNotice } from "@/components/pool/PoolJoinNotice";
import { SlotJoinNotice } from "@/components/slott/SlotJoinNotice";
import { GameSignupPromo } from "@/components/promo/GameSignupPromo";

const ProfileSetupDialog = lazy(() =>
  import("@/components/ProfileSetupDialog").then((m) => ({ default: m.ProfileSetupDialog })),
);
const Toaster = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));
const DepositNotice = lazy(() =>
  import("@/components/wallet/DepositNotice").then((m) => ({ default: m.DepositNotice })),
);

/** Reveal only after the inlined faces are usable, so button and wallet text never swap width. */
const FONT_BOOT =
  '(function(){var shown=false;function show(){if(shown)return;shown=true;var root=document.documentElement;root.classList.add("fonts-ready");if(document.body)document.body.style.opacity="1";new MutationObserver(function(){if(!root.classList.contains("fonts-ready"))root.classList.add("fonts-ready");}).observe(root,{attributes:true,attributeFilter:["class"]});}try{Promise.all([document.fonts.load("16px Manrope"),document.fonts.load("16px Unbounded")]).then(show,show);}catch(e){show();}setTimeout(show,1200);})();';

const THEME_BOOT =
  '(function(){try{localStorage.removeItem("pvp-spin-arena-theme");}catch(e){}document.documentElement.setAttribute("data-theme","dark");})();';

/** First paint is the dark shell, before stylesheets or React. */
const PAINT_CSS = `
html{background:#03060e;color-scheme:dark;overflow-x:clip;overflow-y:auto;scrollbar-gutter:stable}
html:not(.fonts-ready) body{opacity:0}
body{overflow-x:clip}
#intro-boot{display:none;position:fixed;inset:0;z-index:200;width:100%;height:100dvh;overflow:hidden;background:#000}
.intro-half{position:absolute;left:0;right:0;height:50%;overflow:hidden;background:#000}
.intro-half-top{top:0}
.intro-half-bottom{bottom:0}
.intro-logo-wrap{position:absolute;left:50%;width:min(420px,78vw);aspect-ratio:240/128}
.intro-half-top .intro-logo-wrap{bottom:0;transform:translate(-50%,50%);clip-path:inset(0 0 50% 0)}
.intro-half-bottom .intro-logo-wrap{top:0;transform:translate(-50%,-50%);clip-path:inset(50% 0 0 0)}
.intro-logo{display:block;width:100%;height:100%;object-fit:contain}
`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
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
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
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
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: ({ matches, match }) =>
    rootHead(
      match.globalNotFound === true ||
        matches.some((item) => item.status === "notFound" || item.globalNotFound === true),
      appCss,
      SLOT_STAGE,
    ),
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
        <script dangerouslySetInnerHTML={{ __html: FONT_BOOT }} />
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: "html body{opacity:1!important}" }} />
        </noscript>
      </head>
      <body className="canvas">
        <div id="intro-boot" className="intro-gate" suppressHydrationWarning>
          <div className="intro-half intro-half-top" style={{ background: "#000" }}>
            <div className="intro-logo-wrap">
              <img
                src={arenaLogo}
                alt=""
                width={240}
                height={128}
                className="intro-logo"
                decoding="sync"
                fetchPriority="high"
              />
            </div>
          </div>
          <div className="intro-half intro-half-bottom" style={{ background: "#000" }}>
            <div className="intro-logo-wrap">
              <img
                src={arenaLogo}
                alt=""
                width={240}
                height={128}
                className="intro-logo"
                decoding="sync"
                fetchPriority="high"
              />
            </div>
          </div>
          <span className="intro-seam" />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname;var home=p==="/"||p==="";var seen=false;try{seen=!!sessionStorage.getItem("pvp_intro_seen");}catch(e){}var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;var b=document.getElementById("intro-boot");var html=document.documentElement;if((p==="/slott"||p==="/slott/")&&matchMedia("(min-width:1024px)").matches)html.classList.add("slott-noscroll");function finish(){try{sessionStorage.setItem("pvp_intro_seen","1");}catch(e){}html.classList.add("intro-ready","intro-seen");html.classList.remove("intro-lock");if(b)b.style.display="none";}if(!home||seen||reduce){html.classList.add("intro-ready","intro-seen");if(b)b.style.display="none";return;}var earliest=false,arena=false,opening=false,done=false;function finishOnce(){if(done)return;done=true;finish();}function open(){if(done||opening||!earliest||!arena)return;opening=true;if(b)b.classList.add("intro-can-open");setTimeout(finishOnce,450);}window.addEventListener("pvp:home-ready",function(){arena=true;open();},{once:true});if(b)b.style.display="block";html.classList.add("intro-lock");setTimeout(function(){earliest=true;open();},700);setTimeout(function(){arena=true;open();},4000);}catch(e){document.documentElement.classList.add("intro-ready","intro-seen");}})();`,
          }}
        />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function GameSounds() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useLayoutEffect(() => {
    installGameSounds();
    setWheelCueEnabled(pathname === "/");
  }, [pathname]);
  return null;
}

const RootOverlays = memo(function RootOverlays() {
  const { ready, userId, needsProfile } = useAuth();
  return (
    <>
      {ready && !userId ? <GameSignupPromo /> : null}
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
      {userId ? <SlotJoinNotice /> : null}
      {userId ? <PoolJoinNotice /> : null}
      <Suspense fallback={null}>
        <Toaster position="top-center" />
      </Suspense>
    </>
  );
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // The router flips `location` when a navigation starts but swaps the rendered matches only
  // when it commits; the page chrome must follow the page that is actually on screen.
  const pathname = useRouterState({
    select: (s) => s.matches[s.matches.length - 1]?.pathname ?? s.location.pathname,
  });
  const admin = pathname === "/admin";
  const wide =
    pathname === "/" ||
    pathname === "/coinflip" ||
    pathname.startsWith("/coinflip/") ||
    pathname === "/roulette";
  const slott = pathname === "/slott" || pathname.startsWith("/slott/");
  const slottLobby = pathname === "/slott" || pathname === "/slott/";
  const walletHome = pathname === "/wallet";
  const pokerTable = /^\/poker\/[^/]+\/?$/.test(pathname);
  const pokerLobby = pathname === "/poker" || pathname === "/poker/";
  const poolLobby = pathname === "/8-ball-pool" || pathname === "/8-ball-pool/";
  const poolMatch = /^\/pool\/[^/]+\/?$/.test(pathname);
  const coinflipMatch = /^\/coinflip\/[^/]+\/?$/.test(pathname);
  useLayoutEffect(() => {
    if (!slottLobby) return;
    const apply = () =>
      document.documentElement.classList.toggle(
        "slott-noscroll",
        matchMedia("(min-width: 1024px)").matches,
      );
    apply();
    const m = matchMedia("(min-width: 1024px)");
    m.addEventListener("change", apply);
    return () => {
      m.removeEventListener("change", apply);
      document.documentElement.classList.remove("slott-noscroll");
    };
  }, [slottLobby]);
  useLayoutEffect(() => {
    if (!pokerTable) return;
    document.documentElement.classList.add("poker-noscroll");
    return () => document.documentElement.classList.remove("poker-noscroll");
  }, [pokerTable]);
  useLayoutEffect(() => {
    if (!poolMatch) return;
    document.documentElement.classList.add("pool-noscroll");
    return () => document.documentElement.classList.remove("pool-noscroll");
  }, [poolMatch]);
  useLayoutEffect(() => {
    if (!coinflipMatch) return;
    document.documentElement.classList.add("cf-noscroll");
    return () => document.documentElement.classList.remove("cf-noscroll");
  }, [coinflipMatch]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PrestigeProvider>
          <GameSounds />
          <SiteHeader className={pokerTable ? "hidden" : ""} />
          <main
            className={
              admin
                ? "canvas flex h-[calc(100dvh-3.5rem)] w-full max-w-none flex-col overflow-hidden sm:h-[calc(100dvh-4rem)]"
                : pokerTable
                  ? "poker-root"
                  : pokerLobby
                    ? "poker-lobby-main w-full max-w-none overflow-x-clip px-3 pt-3 pb-10 sm:px-4 lg:px-6 min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-4rem)]"
                    : poolMatch
                      ? "pool-root"
                      : poolLobby
                        ? "pool-lobby-main w-full max-w-none overflow-x-clip p-0"
                        : coinflipMatch
                          ? "cf-match-screen"
                          : wide
                            ? "canvas mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-full flex-col overflow-x-clip px-4 pt-6 pb-4 sm:min-h-[calc(100dvh-4rem)] lg:px-6"
                            : `canvas mx-auto w-full max-w-7xl overflow-x-clip ${slott ? `px-3 pt-3 pb-8 sm:px-4 sm:pt-3 lg:max-w-none ${slottLobby ? "lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:px-6 lg:pr-0 lg:pt-2 lg:pb-0" : "lg:px-0 lg:pt-0 lg:pb-0"}` : walletHome ? "px-4 py-4" : "px-4 py-8"} sm:min-h-[calc(100dvh-4rem)] min-h-[calc(100dvh-3.5rem)]`
            }
          >
            <Outlet />
          </main>
          <SiteFooter
            className={
              admin || pokerTable || poolMatch || coinflipMatch
                ? "hidden"
                : slott
                  ? "lg:hidden"
                  : ""
            }
          />
          {!admin && <MobileTabBar className={pokerTable || poolMatch ? "hidden" : ""} />}
          <RootOverlays />
        </PrestigeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
