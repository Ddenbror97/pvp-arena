# FPS camera and wall-cap stability

The reported jump/crouch lag included presentation discontinuities. Browser traces reproduced roughly 0.8 m camera-height changes despite approximately 14 ms p95 frame intervals on the test workstation. Crouch switched eye height instantly; a later trace also captured a 0.64 m vertical correction in a 12 ms sample while renderer CPU work was about 1 ms.

Camera stance now transitions over frames. A separate vertical correction limiter follows ordinary jump motion immediately while bounding discontinuous corrections. Both reset at respawn/seat changes. Only the rendered camera changes: movement, collision, hit volumes, damage, server cadence and the wire protocol remain authoritative and unchanged.

Side-wall concrete extended into the metal upper-deck cap from 6.1–6.4 m. Their inward faces shared the same plane. Concrete now ends beneath the cap; the cap has a 24 mm lip, separated from both the wall and the 12 mm ribs. Existing instancing is retained. Shared gameplay colliders are unchanged. Geometry tests inspect the actual batched instance transforms, not removed construction meshes.

Regression testing captured a local shot sequence 24/28/31 against authoritative sequence 24/27/30, producing an extra sound. Cosmetic acknowledgement matching now permits the already-presented prediction to lead by one input command; later unrelated predictions remain unmatched. This does not change accepted firing or damage.

Validation covers Chrome and Firefox combined run/jump/crouch/look traces with delayed snapshots, wall-cap depth tests and screenshots, walking/look frame timing, automatic-fire audio reconciliation and six-round bot gameplay. The bot harness uses relative mouse events through the production handler and waits for acknowledged headings rather than relying on absolute WebDriver cursor positions under pointer lock. It does not inject health, damage or wins. Unit/type/lint checks and a production-target build are release gates.

The measurements are from the test workstation, not the user's MSI laptop or every browser. They establish specific discontinuities and geometry overlap, not a universal zero-latency guarantee. No broad rendering rewrite or quality reduction was applied. Release the frontend only, preserving the live runtime, ledger, financial settings, secrets and migrations.
