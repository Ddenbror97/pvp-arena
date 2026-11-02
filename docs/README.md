# Docs index

Two kinds of document live here. **Reference docs** describe how a system works and are kept
current. **Dated reports** (date in the file name) record an investigation, release or audit
as it was on that day; they are history, not instructions, and later work may supersede them.
For how something works today, start from the reference doc and the code.

## Reference

### Platform and data

- [PVPCasino Jackpot — architecture and verification report](ARCHITECTURE.md)
- [Database release log](DATABASE-RELEASES.md)
- [Supabase advisory review](SUPABASE-ADVISORY-REVIEW.md)

### FPS (PvPStrike)

- [Foundry aim-map upgrade](FPS-AIM-MAP.md)
- [Authored AK, arms and opponent models](FPS-AUTHORED-ASSETS.md)
- [Browser input and AK-47 release](FPS-BROWSER-INPUT.md)
- [Reference-based opponent characters](FPS-CHARACTERS.md)
- [Shared crouch-jump clearance](FPS-CROUCH-JUMP.md)
- [FPS Duel implementation and release gates](FPS-DUEL.md)
- [FPS field polish — final-polish.png reference](FPS-FINAL-POLISH.md)
- [PvPStrike frame stability](FPS-FRAME-STABILITY.md)
- [In-game polish, October 29](FPS-GAMEPLAY-POLISH.md)
- [FPS ledger and runtime contract](FPS-LEDGER.md)
- [LOST TRAIL (jungle 1v1 aim map)](FPS-LOST-TRAIL.md)
- [PvPStrike map registry](FPS-MAP-REGISTRY.md)
- [FPS Duel operations](FPS-OPERATIONS.md)
- [Reference field and AK presentation](FPS-REFERENCE-VISUALS.md)
- [Shared FPS map pack](FPS-SHARED-MAP-PACK.md)

### FPS maps

- [CROSSFIRE — Urban AIM ARENA](fps-map/CROSSFIRE.md)
- [FROSTLINE — Winter AIM ARENA](fps-map/FROSTLINE.md)
- [PVPSPINARENA 1v1 aim arena: map rebuild report](fps-map/README.md)
- [Browser test results: aim arena (headless Chrome, SwiftShader, 2 CPU cores)](fps-map/e2e-results.md)

### Poker and pool

- [Poker v1: six-max No-Limit Texas Hold'em](POKER.md)
- [Confirmed-shot replay handoff](POOL-TURN-HANDOFF.md)

### Security

- [Phase 2 Backend Security, Integrity, and Reliability Audit](security/phase-2-backend-audit.md)
- [Phase 3 Backend Reliability and Infrastructure Audit](security/phase-3-backend-audit.md)

### SEO

- [FPS Wave 2: keyword ownership and editorial gates](FPS-SEO-WAVE2-INTENT-MAP.md)
- [FPS Wave 2 URLs](FPS-SEO-WAVE2-URLS.md)
- [8-ball guide linking audit](seo/8-ball-guide-linking.md)
- [E-E-A-T and technical SEO audit](seo/eeat-audit.md)
- [Internal linking audit, 21 October 2026](seo/internal-linking-audit.md)
- [8-ball guide quality audit](seo/seo-audit-summary.md)
- [Duplicate content across the 39 new 8-ball guides](seo/seo-duplicate-content-report.md)
- [Remediation log: 39 new 8-ball guides](seo/seo-remediation-log.md)

## Dated reports (newest first)

### 2026-11-02

- [Post-performance cleanup (2026-11-02)](maintenance/POST-PERFORMANCE-CLEANUP-2026-11-02.md)
- [Render and frame-cost audit: Dustfront vs FROSTLINE, CROSSFIRE (and LOST TRAIL)](fps-map/RENDER-AUDIT-2026-11-02.md)
- [FPS map performance: audit and optimisation report (2026-11-02)](fps-map/PERFORMANCE-REPORT-2026-11-02.md)
- [FPS performance: final validation before merge (2026-11-02)](fps-map/FINAL-VALIDATION-2026-11-02.md)

### 2026-11-01

- [Free 8-ball Practice](POOL-FREE-PRACTICE-2026-11-01.md)
- [Practice route and style variation](FPS-PRACTICE-STYLES-2026-11-01.md)
- [Opponent "micro-vanish" investigation (2026-11-01)](FPS-OPPONENT-CONTINUITY-2026-11-01.md)
- [PvPStrike pre-merge audit: opponent sync, movement and performance (2026-11-01)](FPS-NETWORK-AUDIT-2026-11-01.md)
- [Pool preview and FPS gameplay polish](FPS-MATCH-AUDIO-MOVEMENT-POLISH-2026-11-01.md)
- [Dustfront loading and silent walking](FPS-LOADING-AND-WALK-2026-11-01.md)
- [Existing-infrastructure latency pipeline](FPS-LATENCY-PIPELINE-2026-11-01.md)
- [FPS session connection pool](FPS-HYPERDRIVE-2026-11-01.md)
- [PvPStrike halftime](FPS-HALFTIME-2026-11-01.md)
- [PvPStrike frontend cleanup — 2026-11-01](FPS-FRONTEND-CLEANUP-2026-11-01.md)
- [Held-fire command queue recovery](FPS-FIRE-QUEUE-2026-11-01.md)
- [Cross-region latency: US / EU / LatAm (2026-11-01)](FPS-CROSS-REGION-2026-11-01.md)
- [Human cash queue and free Practice](FPS-AVAILABLE-QUEUE-2026-11-01.md)

### 2026-10-31

- [Gameplay resilience release — 2026-10-31](GAMEPLAY-RESILIENCE-2026-10-31.md)
- [Solo Practice release — 2026-10-31](FPS-SOLO-PRACTICE-2026-10-31.md)
- [In-game preferences and late opponent packets](FPS-SETTINGS-PLAYBACK-2026-10-31.md)
- [FPS content release](FPS-SEO-RELEASE-2026-10-31.md)
- [Opponent update clock](FPS-OPPONENT-CLOCK-2026-10-31.md)
- [Bot and player movement timeline investigation](FPS-MOVEMENT-TIMELINE-2026-10-31.md)
- [Movement continuity — 2026-10-31](FPS-MOVEMENT-CONTINUITY-2026-10-31.md)
- [FPS camera and wall-cap stability](FPS-MOTION-STABILITY-2026-10-31.md)
- [PvPStrike frontend cleanup — 2026-10-31](FPS-FRONTEND-CLEANUP-2026-10-31.md)
- [FPS network timing and bounded hit compensation — 2026-10-31](FPS-CROSS-REGION-TIMING-2026-10-31.md)
- [Nearby opponents and AK-47 aiming](FPS-CLOSE-OPPONENT-RETICLE-2026-10-31.md)

### 2026-10-30

- [PvPStrike full-screen showcase and loading — 2026-10-30](PVPSTRIKE-SHOWCASE-PERFORMANCE-2026-10-30.md)
- [PvPStrike entry and winner recap release — 2026-10-30](PVPSTRIKE-ROUND-FLOW-RELEASE-2026-10-30.md)
- [PvPStrike motion and rendering release — 2026-10-30](PVPSTRIKE-PERFORMANCE-RELEASE-2026-10-30.md)
- [PvPStrike combat release — 2026-10-30](PVPSTRIKE-COMBAT-RELEASE-2026-10-30.md)
- [PvPStrike lobby and cash release — 2026-10-30](PVPSTRIKE-CASH-RELEASE-2026-10-30.md)
- [FPS controlled-release security review — 2026-10-30](FPS-SECURITY-REVIEW-2026-10-30.md)
- [FPS controlled-release verification — 2026-10-30](FPS-RELEASE-VERIFICATION-2026-10-30.md)
- [Production recovery rehearsal — 2026-10-30](FPS-PRODUCTION-RECOVERY-2026-10-30.md)
- [FPS pre-production decision — 2026-10-30](FPS-PREPRODUCTION-2026-10-30.md)

### 2026-10-28

- [Production cleanup audit — 28 Oct 2026](CLEANUP-AUDIT-2026-10-28.md)
- [Production cleanup apply — 28 Oct 2026](CLEANUP-APPLY-2026-10-28.md)
