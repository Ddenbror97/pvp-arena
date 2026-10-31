# Nearby opponents and AK-47 aiming

The 20 Hz snapshot deadline is serviced by the 30 Hz simulation. Normal snapshot spacing can therefore alternate between approximately 34 and 67 ms. The previous 50 ms presentation buffer could exhaust its next pose during the longer interval, producing holds followed by jumps. At close range, the same world-space displacement occupies more screen pixels. Updating the network clock estimate could also reverse the sampled timeline briefly.

The shared opponent buffer is now 75 ms. Presentation advances on the render-frame clock, repaying clock-estimate errors at a bounded rate rather than playing a pose backward. It still uses received visible poses, clears hidden history, and resets teleports and round changes. This adds 25 ms of remote presentation buffering; local camera controls and trigger feedback are unchanged. The server uses the same shared delay for shot compensation, retaining the existing 200 ms maximum rewind.

The replacement rifle's previous rest yaw pointed the bore beyond the centered aim ray. The rest pose now converges at a nominal 10 m. The reticle remains on the canvas center and authoritative camera aim; the visual weapon follows it. Close-range hip-fire parallax remains physically expected. Reload animations and hand fitting are retained.

Validation: 784 unit tests pass, including 30/100/180 ms RTT compensation, quantized snapshot delivery at 60/144 Hz, and monotonic playback across a clock adjustment. Chrome and Firefox each pass a rendered approach-to-close-range trace and the actual authored-model alignment check (within one screen pixel at 10 m). The production build and TypeScript checks pass. These checks do not claim that arbitrary network outages or all devices have zero latency.

The release also includes the 45 FPS guides and final link audit. No database schema or financial rules change. New FPS entries are paused for the paired app/runtime rollout and restored to their saved configuration afterward.
