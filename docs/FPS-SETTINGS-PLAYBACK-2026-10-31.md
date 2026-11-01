# In-game preferences and late opponent packets

Escape releases mouse capture and opens a focus-trapped game settings dialog.
Resume requests capture directly from the button gesture. Mouse sensitivity is a
0.1–3 multiplier of the previous default; sound volume controls the shared combat
master gain while respecting the existing global mute. Preferences are saved on
the device and survive blocked storage without interrupting gameplay.

Five centered crosshairs are available: dynamic cross, dot, circle, cross with
dot, and static cross. Each accepts a custom RGB color. The match continues while
settings are open; the dialog explains this explicitly.

The opponent interpolation buffer previously clamped to the newest received pose
when a packet arrived after its 75 ms playback cushion. This caused freeze/catch-up
motion even with stable render FPS. Visible grounded walking now bridges up to
50 ms from two recent poses, bounded to the maximum supported walking/sprint
speed. World occupancy prevents projection through cover. Late corrections decay
over 65 ms instead of snapping backward. Death, teleport, respawn and hidden-pose
history resets stop the bridge. No airborne or hidden-player prediction is added.
Long network outages still stop playback; this does not guarantee zero latency.

Regression coverage includes 100 ms snapshot gaps at 60/144 Hz, capped projection,
late stop correction, walls, death and hidden-history clear. Chrome and Firefox
exercise preferences, keyboard interaction, persistence, nearby opponents and
the existing crosshair/bore calibration. Shared server physics, damage and session
validation are unchanged. This is a frontend-only change, independent of map art.
