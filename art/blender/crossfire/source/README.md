# CROSSFIRE third-party sources

| Asset | Source | Licence |
| --- | --- | --- |
| `mi8/` (helicopter mesh, colour texture) | "helicopter mi-8" by mamont nikita, https://sketchfab.com/3d-models/helicopter-mi-8-aaa58674609e40feafe816909de65ff9 | CC BY 4.0 (credit required) |

Credit line (also in `docs/fps-map/CROSSFIRE.md`): This work is based on "helicopter mi-8"
(https://sketchfab.com/3d-models/helicopter-mi-8-aaa58674609e40feafe816909de65ff9) by mamont nikita
(https://sketchfab.com/mamontnikita62) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).

Provenance note: the file's internal names (`t5_veh_helo_mi8_woodland`, `bo2_mtl_*`, `veh_iw_*`)
match Call of Duty asset naming, so the uploader's right to license it is uncertain. The owner
chose to use it on 2026-11-01 after this was raised. `heli.py` reshapes it into the crashed wreck
(gear, pods and rotors removed, cabin opened, weathered); replace `mi8/` to swap the model.

All other CROSSFIRE textures are generated procedurally by `textures.py` (the Dustfront set from
`../map/textures.py` plus brick, asphalt, tiles, rust and signage).
