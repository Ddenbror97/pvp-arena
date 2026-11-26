/**
 * Project Island (Battle Royale) world coordinates, shared by the server room, the client
 * renderer, the map UI and the art pipeline (art/br/build_world.py writes the same numbers).
 *
 *  - metres; origin at the map centre; +x east, +z south (three.js: -z is north); +y up;
 *    sea level is y = 0;
 *  - the playable square is [-5000, 5000] on x and z (10 x 10 km);
 *  - the map grid is columns A–J (west → east) by rows 1–10 (north → south), 1 km per cell,
 *    exactly the concept map's grid, so "Superstore E9" on the map is E9 in the world.
 */
export const WORLD_SIZE = 10_000;
export const WORLD_HALF = WORLD_SIZE / 2;
export const MAP_CELL = 1_000;
export const MAP_COLUMNS = "ABCDEFGHIJ";

/**
 * Static data published with the world. Only the files named here are published: the steps
 * they were derived from are kept in art/br/world-base (heights, land covers, metas) and
 * art/br/models-base (models), and `node scripts/br/published-assets.mjs` lists what a new
 * revision has left behind in public/.
 */
export const WORLD_ASSETS = {
  revision: "hosp-v1",
  // height.v2 (2026-11-16, art/br/grade_roads.py): height.v1 with the roads graded where the
  // later relief left them climbing a rock face (84 stretches, none steeper than 23 %).
  // height.v3, landcover.v2, world.v2 (2026-11-17, art/br/forgotten_ruins.py): Forgotten Ruins,
  // its plaza, escarpment, cenote and rainforest, and the POI.
  // height.v4, landcover.v3, world.v3 (2026-11-17, art/br/old_fortress.py): the Old Fortress's
  // hill (the ledge round its base, the ditch on the north and the bridgehead), the field of fire
  // cleared round it, and the POI.
  // height.v5, landcover.v4, world.v4 (2026-11-18, art/br/polish_roads.py): the roads audited:
  // hooks and spikes at the junctions gone, doubled roads and stubs to nowhere removed, roads
  // short of a bridge joined to it, the quarry's haul roads onto the network, longer dead ends
  // given a site; their ground eased smooth along them (bumps over 35 cm: 33 → 7).
  // height.v6 (2026-11-23, art/br/military_apron.py): the Southern Military Base's flight line
  // levelled to the base's pad between its south wall and the runway (it lay over a 4 m hump,
  // and every hangar and most aircraft placed there were refused for want of level ground).
  height: "/fps/br/height.v6.hf",
  // landcover.v5, world.v5 (2026-11-23, art/br/runway_road.py): the base's south road (1095)
  // ends 50 m out on the flight line instead of crossing the runway to the coast road; the
  // ground surface re-baked from it (surface-v5).
  landcover: "/fps/br/landcover.v5.lc",
  meta: "/fps/br/world.v5.json",
  // sites-v1 (the facades-v1 manifest, its mid-distance LODs of 54 models on the facade atlas,
  // with the 2026-11-11 location models added by add_models.mjs; "sites" because a
  // locations-v1 revision already existed) with the works halls' fit-outs measured again and
  // the lighthouse's keeper's house made enterable (art/br/fitout/halls.py, access-v12), and
  // the walls and railings beside every stair flight solid again
  // (art/blender/br/restore_stair_sides.mjs, access-v13).
  // Then (eastport-v1, add_models.mjs) the owner's 2026-11-11 downloads for Eastport and the
  // mountains: a fishing hut, two boats and three scanned rocks.
  // Then (estates-v1, add_models.mjs) the owner's downloads for the south-west coast and the
  // estates: two houses, a super yacht, a pool, a lifeguard tower and beach props; and
  // (access-v14, art/br/fitout/estates.py) the houses and the yacht made enterable.
  // Then (paint-v1, art/blender/br/paint_flat_models.mjs) the six untextured models painted:
  // the airfield hangar, field hangars, plane shelters, army tent, lookout and humvee; and
  // (zfix-v1, offset_coplanar.mjs) coplanar overlapping faces lifted apart in the buildings and
  // structures (the flicker on copings, parapets and trim). Render only: collision is access-v14's.
  // Then (superstore-v2, add_models.mjs) the Superstore's fit-out rebuilt (stair handrails, rails
  // on the mezzanine's open edges, the partition to the ceiling, the walls lined inside) and the
  // owner's 2026-11-11 store downloads placed in it (the `ss-*` models).
  // Then (strait-v1, add_models.mjs) the strait's bridges and shores: the cable-stayed bridges'
  // A-pylons, the bridgeheads' booths, lookouts and tetrapods, shore rocks, cliffs, revetments,
  // driftwood and wrecks.
  // Then (strait-v2) the bridgeheads' towers: a military guard tower at each mainland end and a
  // watchtower at each island end (the owner's downloads); and (access-v15,
  // art/br/fitout/strait.py) the guard tower's flights and cabin door and the watchtower's deck
  // made walkable (its ladder is climbed through ladders.ts).
  // Then (roadside-v1, add_models.mjs) the strait roads' stops: a roadside motel and its sign,
  // picnic shelters and payphones; and (access-v16, art/br/fitout/roadside.py) the motel's
  // eleven rooms, office, stairs and balcony made enterable.
  // Then (access-v17, art/br/fitout/zipline2.py) the Iron Peaks broadcast tower climbable for the
  // second zip-line: steps onto its base, its ladder's column, its platform and rails.
  // Then (motorcourt-v1, add_models.mjs) the owner's 2026-11-12 downloads for the strait roads: a
  // motor court (reception under a carport canopy, a two-room cabin block), fuel dispensers and
  // reflector poles; and (access-v18, art/br/fitout/motorcourt.py) its three rooms enterable.
  // Then (highway-v1, add_models.mjs) a small filling station for the highway stops along the
  // mainland's and the island's roads; and (access-v19, art/br/fitout/highway.py) its shop
  // enterable, its sidewalk and pump island exact.
  // Then (access-v20, the 2026-11-12 traversal audit) the guard tower's deck stops short of its
  // top flight's side; and (access-v21, art/blender/br/patch_collision.mjs
  // art/br/collision-patch-v21.json) every raised edge a tower's or the tank's climb reaches gets
  // a collision rail, clear of the climb itself.
  // Then (hospital-v1, art/blender/br/build_hospital.mjs and the owner's downloads) the mega
  // hospital: four enterable blocks, their sky bridges, and the furniture for their rooms.
  // Then (fixes-v1, 2026-11-13 fixes) the helidecks (build_helideck.mjs) in place of the
  // downloaded helipad, the hospital blocks mega-v3 (breakable windows, stair soffits and
  // railings) and the Skyline storeys' open lift shaft (build_condo.mjs).
  // Then (access-v23, art/br/fitout/painted-doors.py, on top of fixes-v1) the painted doors of
  // the wooden house (rural-wood-4, its back) and the works shed (ind-warehouse-1, its front
  // and west end) made real.
  // Then (downtown-v1, add_models.mjs) the owner's 2026-11-13 downloads for Downtown and the
  // Stadium: street furniture (shelters, kiosks, lamps, benches, bins, cash machines, phone
  // booths, billboards, a sign gantry, barriers), taxis and a bus, rooftop plant, office desks;
  // floodlight masts, stands, scoreboards, goals, turnstiles, ticket booths and food carts.
  // Then (arena-v1, add_models.mjs) the Arena District: the arena (build_arena.mjs: two bowls,
  // three concourse levels, rooms, stair towers, the roof catwalk), the railway station and its
  // platform (build_station.mjs), and the owner's 2026-11-14 downloads to furnish them (gates,
  // barriers, kiosks, changing rooms, toilets, gym, escalators, coaches, the signal box).
  // Then (lod-v1, art/blender/br/relod.mjs, performance audit 2026-11-14; render only, so the
  // revision and collision stay arena-v1's) lighter far LODs for the brick shop rows, parked
  // cars, boxcars and a few more, and the LOD rings `furniture` and `shop` (props-renderer.ts
  // RINGS).
  // Then (metro-v1, add_models.mjs) the owner's 2026-11-14 downloads for the Downtown metro: a
  // tennis court, skatepark ramps and rails, a car wash with its cafe, a car showroom, a burger
  // joint and a Victorian glasshouse; and (access-v24, art/br/fitout/metro.py) the burger joint,
  // the showroom (its mezzanine and stair), the glasshouse and the car wash's cafe enterable.
  // Then (blackwater-v2, add_models.mjs on access-v24) Blackwater Prison, the flagship
  // (2026-11-14): the keep, the watchtower, the guard posts, the moat's bridges and quay
  // (build_blackwater.mjs) and the owner's downloads to furnish it (cells, the mess, the armoury,
  // the battlements, the yard, the mountains' cliff rocks).
  // Then (fixes-v2, 2026-11-14) the Bauhaus block's three upper storeys and their stair
  // (access-v25, art/br/fitout/bauhaus.py); the condo, office and brick storeys rebuilt with their
  // ceilings open over the stair well (build_condo.mjs skyline-v3); and coplanar faces lifted
  // apart again across the island (offset_coplanar.mjs --tag=zfix-v3: Downtown's office and brick
  // towers had never had it, and flickered from the air).
  // Then (dam-v1, 2026-11-14) the Old Dam's spillway section (`dam-spillway`, the USACE gravity
  // dam turned to the wall's axis; its powerhouse as boxes).
  // New revisions derive from this manifest (add_models.mjs <from-models>).
  // Then (todo-v1, 2026-11-15) the Bauhaus block built procedurally (build_bauhaus.mjs, its
  // front door authored in collision.entrances), the Arena District's car park
  // (build_carpark.mjs), the arena's aisles up from the pitch, Blackwater's tower bands as rings
  // and railings for its rails (bw-v2); the new models' coplanar faces lifted (zfix-v4).
  // Then (locations-v1, 2026-11-15) the locations upgrade: the owner's 32 downloads for Eastport's
  // container terminal and fishing quay, the military base, the airfield and the villages, and 22
  // enterable procedural buildings (build_locations.mjs: doors, stairs to every floor, rooms;
  // their doors authored in collision.entrances); the new models' coplanar faces lifted (zfix-v5).
  // Then (yacht-v1, 2026-11-17) the super yacht rebuilt from the owner's re-download: textured
  // (the old build had fallen back to a flat silhouette), the people on its decks dropped, its
  // collision voxelised again without them, and its access-v14 fit-out applied again
  // (access-v26: decks, salon, flybridge, the stair down, the lower deck's cabins and doors);
  // its coplanar faces lifted (zfix-v7).
  // Then (coast-v1, 2026-11-17, add_models.mjs) the coastal towns rebuilt like the owner's
  // pictures: Fisher's Cove a painted fishing harbour village, Bayview a white Mediterranean
  // marina town (build_coast.mjs: 13 enterable houses; the owner's 42 downloads for their quays,
  // marina, promenade and beach: boats, nets, pots, palms, lamps, terrace furniture).
  // And then (ruins-v1, 2026-11-17) Forgotten Ruins: 13 procedural Maya buildings
  // (build_ruins.mjs: the pyramid and its tunnel, the palace, the tower, temples, the acropolis's
  // tunnels, the ball court, the arch, walls, stelae, paving) and the owner's downloads for its
  // rainforest (two tree species, the jungle and palm, with impostors), undergrowth, statues and
  // stelae, rocks and the expedition's camp.
  // Then (works-v1, 2026-11-17) East Works rebuilt as its card draws it: the power station
  // (build_works.mjs: three brick boiler towers, two enterable chimneys, the turbine hall, the
  // control house, the workshop, domed tanks, a pipe rack, yard floors) and the owner's 14
  // downloads (smoke stacks, cooling cells, the tank farm, tanks, boilers, machines, cabinets,
  // conveyors, pipes, valves, warning lights).
  // Then (fort-v1, 2026-11-17) the Old Fortress (build_fortress.mjs: the base with its cellars,
  // vaults, dungeon and tunnels; curtain walls with wall-walks, the breach; round and square
  // towers, the gatehouse, the keep, the great hall, the barracks, the chapel and its bell
  // tower, the stables, the bridge, the rubble ramp and the scaffold) and the owner's downloads
  // for it (siege engines, the city gate, thrones, tables, racks, shields, banners, chandeliers,
  // the cage, the bell, the smithy, carts, flags); the new models' coplanar faces lifted
  // (zfix-v9).
  // Then (fort-v2, 2026-11-18): the fortress's and the ruins' stairs walk on 5 cm ramps as the
  // old buildings' do; the fortress's tower roofs, door reveals, floor undersides and the keep's
  // plinth; the towers' lift shaft open through their roofs (skyline-v4); coplanar faces that
  // only overlap at their edges lifted too (zfix-v11); the car parks' bay lines drawn near only.
  // roads-v1: the fort-v2 models and collision on the polished roads (the same files).
  // bay-v1 (2026-11-18): Fisher's Cove's and Bayview's houses rebuilt (coast-v2) with their
  // plinth 3 cm proud of the walls, the rest of their coplanar faces lifted (zfix-v12) and the
  // window glass seated on the walls dropped (glass-v3, also the East Works); the small houses'
  // stray shelf boxes out of the collision.
  // stilt-v1 (2026-11-18): the rusty stilt house enterable (doorways, an upper floor, authored
  // collision with ramped stairs: art/blender/br/rusty_house.mjs).
  // harbor-v1 (2026-11-18): Fisher's Cove's street lights rebuilt with their posts (pole-v1:
  // the near LOD had lost them, the lamps hung in the air); the harbour yard's containers.
  // soffit-v1 (2026-11-18): the outside undersides of the apartment, bungalow, townhouse, police
  // station and strip mall face down again on their near LODs (eaves-v1,
  // art/blender/br/exterior_undersides.mjs: interior_style had lit every downward face as a
  // ceiling, so balconies, eaves and window heads turned white within 100 m and dark beyond);
  // the arena, its stands, masts and car park, the Bauhaus block and the apartment through the
  // coplanar lift again (zfix-v13); the airfield hangar repainted (paint-v2: silver arch, blue
  // sides, cream ends); the Victorian glasshouses (Riverside Park, Blackwater) glazed: frames cut
  // from the texture, see-through glass between (glass-v4, art/blender/br/glasshouse.mjs).
  // sweep-v1 (2026-11-19): every coplanar face left on the island lifted (zfix-v14, 14 passes of
  // offset_coplanar over the whole revision until none remained: 17,261 faces in 195 models, the
  // airfield terminal's wall bases among them, owner: "this building at the airfield flicker");
  // the glow taken off the East Works pipe pieces, Eastport's trawler and the lifeguard booth
  // (glow-v1, art/blender/br/strip_emissive.mjs: "white items at east works").
  // tone-v1 (2026-11-22, set_lods.mjs): far LODs only. The towers' storeys and lobbies (flat-v1),
  // the apartment block (far-v3) and the Bauhaus block (far-v2) flat, in faint bands of their
  // walls' average colour, and marked `air: "far"` (props-renderer.ts AIR_FLAT): they flickered
  // from the parachute. The 99 textured-kit buildings (the fortress, the ruins, the coast towns,
  // East Works, the 2026-11-15 locations, Blackwater) in their textures' own colours (tone-v1;
  // eleven of them through offset_coplanar again, zfix-v16): they were about twice too light.
  // jungle-v1 (2026-11-22, set_lods.mjs + drop_backfaces.mjs): the tall billboards' and the
  // roadside billboard's middle and far LODs without the inward copies of their ad panels
  // (back-v1: the panels blinked from the parachute); the J-type hangar re-cut from its pre-cut
  // model with its end walls kept (access-v27, zfix-v17); the Cessna 402 painted (livery-v1);
  // Forgotten Ruins' trees and tree-high plants on the "jungle-tree" ring (props-renderer.ts).
  // yacht-v1 (2026-11-22, process_assets.mjs + build_collision.mjs): the 40 m motor yacht
  // (cove-yacht, the owner's download at its own size) for Fisher's Cove's super yacht.
  // windows-v1 (2026-11-23, from yacht-v1): every building's window glass breakable (glass_panes.mjs). The
  // glass the near LODs drew themselves (the procedural houses' opaque dark slabs, the textured
  // kit's see-through glass) is out of 51 models' near LODs and listed as panes
  // (window-panes.json, panes.ts), and the collision boxes in their openings are cut away (a
  // broken pane is an opening). The buildings that had no window at all (the brick corner
  // shops, the garage, the quonset, the long shed, the diner's ends) have windows cut through
  // their plain walls, framed and glazed with panes, also drawn on their middle LODs; the
  // windows that were only painted on (the clapboard and stone farmhouses, the mobile home, the
  // stilt house, the bungalow, the diner, brick-shop, rural-store-3) are cut and glazed where
  // they were painted (cut_windows.mjs).
  // vehicles-v1 (2026-11-23, from windows-v1, process_assets.mjs + build_collision.mjs): 33
  // parked vehicles from Comrade1280's passenger and civil-service packs (pc-*, civ-*; the
  // passenger cars also in repainted colours, `paint`), placed where the sedan, pickup, cop
  // cruiser, taxi, ambulance, tow truck and box truck were: those had been reduced to 13–17 %
  // of their triangles and drew with hanging bumpers and sunken, leaning wheels (owner,
  // 2026-11-23: "audit all veicels. some are broken like this taxi").
  // far-facades-v1 (2026-11-23, the same world: build_facades.mjs --far on the vehicles-v1
  // manifest): 191 buildings' far LODs, which were a few flat-coloured boxes, take their near
  // model's five views from an atlas of their own (`farFacades`), so a town seen from the plane
  // or under the canopy is filtered texture, not a field of sub-pixel window bars or of blank
  // boxes (owner, 2026-11-23: "blinking/flicker buildings on distance … in the
  // airplane/parachute", "the buildings looks strange").
  // garrison-v1 (2026-11-23, from far-facades-v1 and vehicles-v1, build_garrison.mjs +
  // build_collision.mjs): the Southern Military Base's perimeter wall (mb-wall, in place of
  // the hesco baskets the base's road ran through) and its new enterable buildings: the air
  // operations tower, two command bunkers, pillboxes at the gates, three-storey barrack
  // blocks, armouries (owner, 2026-11-23: "its way to much dead space areas … build new
  // military buildings and maybe a wall around the military base", "fun military buildings,
  // bunkers maybe aswell? enterble multible floros").
  // garrison-v2 (glass_panes.mjs, offset_coplanar.mjs zfix-v20): their windows' glass
  // breakable (the tower's, the barrack blocks' and the armouries'; the bunkers' and pillboxes'
  // slits are open), their coplanar faces lifted.
  // far-facades-v2 (the same world: build_facades.mjs --far on garrison-v2 with the far LODs
  // the far-facades-v1 pass started from): the far atlas again, with the five new buildings on
  // it (196 models).
  // milprops-v1 (2026-11-23, from far-facades-v2 and garrison-v2, process_assets.mjs +
  // build_collision.mjs): the owner's downloads for the base (owner, 2026-11-23: "find sketch 3D
  // items aswell to download"): concrete roadblocks, L-shaped sandbag positions, ammunition
  // crates and boxes, olive and fuel drums, loaded missile racks (the JAC3D pack's FBX through
  // art/br/assets/convert_fbx.mjs); with world.v5 (the south road off the runway).
  // plinth-v1/v2 (2026-11-24, from milprops-v1; build_garrison.mjs TAG garrison-v3,
  // offset_coplanar.mjs --tag=zfix-v21, glass_panes.mjs plinth-v1 plinth-v2): flicker (owner,
  // 2026-11-24: "fix those flicker"). The base's buildings' plinths stand 3 cm proud of their
  // walls (flush, they fought the walls' bottom), the perimeter wall's olive band is part of its
  // panel, and the coplanar lift now works in rounds (faces stacked on one plane were lifted the
  // same 1.5 cm and fought again): every model's faces that still overlapped are apart, among
  // them the roadside motel's and the warehouse's. Far LODs unchanged (far-facades-v2).
  // bwfix-v1 (2026-11-25, from plinth-v2; owner's Blackwater Prison report): the cell houses'
  // walls carried 12 cm into the ground (extend_footing.mjs footing-v1: the downloaded shell
  // stopped 0.2 m above the yard, "a building looks like to stand abit in the air"); the
  // chapel's door sill and the wood strip under its door lifted 1.5 cm off the yard's plane
  // (groundlift-v1: they fought it, "a door that flickers"); the keep's and the watchtower's
  // stair collision as ramps of 5 cm steps (stair_ramps.mjs + patch_collision.mjs: their 19 cm
  // treads jolted the body a riser a tick, "lagg in tight space and corners").
  // hosp-v1 (2026-11-26, from bwfix-v1; owner's Central Hospital report: "items that stands
  // in the air"): the vital signs monitor's stand gets a solid pole (add_pole.mjs pole-v1: its
  // own was a sliver in LOD0 and gone in LOD1, the monitor hung over the floor on nothing). The
  // layout's part (layout.ts): the wards' wall cupboard off the window, the tents down onto
  // their stakes. Collision unchanged but for the tents' placement.
  models: "/fps/br/models/models.hosp-v1.json",
  collision: "/fps/br/models/collision.hosp-v1.json",
} as const;

/** The buildings' fitted doors (scripts/br/doors/bake.mjs): render only, no physics. */
export const DOOR_ASSETS = {
  // v25 (2026-11-17): v24 with the coastal towns' 13 houses' doors (build_coast.mjs).
  // v26 (2026-11-17): v25 with East Works' 13 new doors (build_works.mjs).
  // v27 (2026-11-23): v26 with the Southern Military Base's 14 new doors (build_garrison.mjs).
  meta: "/fps/br/models/doors.v27.json",
  atlas: "/fps/br/models/doors.v27.webp",
} as const;

/** Refuse a partially deployed/cached pair instead of drawing a different world than physics. */
export function assertIslandRevision(...parts: Array<{ worldRevision?: string }>) {
  if (parts.some((p) => p.worldRevision !== WORLD_ASSETS.revision))
    throw new Error("Island assets version mismatch");
}

/** Land-cover classes in the land-cover file (byte value = class id). */
export const LAND_COVER = [
  "water",
  "sand",
  "grass",
  "field",
  "forest",
  "rock",
  "urban",
  "road",
] as const;
export type LandCover = (typeof LAND_COVER)[number];

export type PoiKind =
  | "town-large"
  | "town"
  | "town-industrial"
  | "commercial"
  | "mountain"
  | "forest-compounds"
  | "quarry"
  | "hospital"
  | "dam"
  | "cabins"
  | "prison"
  | "military"
  | "industrial"
  | "superstore"
  | "airfield"
  | "residential"
  | "downtown"
  | "stadium"
  | "ruins"
  | "fortress";

export type WorldMeta = {
  version: number;
  world: { size: number; grid: number; spacing: number; heightOffset: number; seaLevel: number };
  cover: { size: number; classes: string[] };
  waterBodies: Array<{
    id: string;
    level: number;
    bounds: [number, number, number, number];
    areaHa: number;
  }>;
  rivers: Array<{ id: string; width: number; points: Array<[number, number]> }>;
  bridges: Array<{
    id: string;
    a: [number, number];
    b: [number, number];
    deck: number;
    width: number;
    /** A dam: the deck is the top of a solid wall down to the ground (no piers). */
    solid?: boolean;
    /** A dam: which side of the deck (+1 along `side` in bridges.ts, −1 against it) is downstream. */
    down?: 1 | -1;
  }>;
  runways: Array<{ a: [number, number]; b: [number, number]; width: number }>;
  /** Flattened summit tops on Iron Peaks for sniper positions, highest first (y = the flat top). */
  perches?: Array<{ x: number; z: number; y: number }>;
  /** Road centrelines read off the concept map (art/br/build_world.py extract_roads). */
  roads: Array<{ width: number; points: Array<[number, number]> }>;
  /**
   * Country dead ends (build_world.py connect_roads): roads that run out in the open, as
   * [x, z, dx, dz] with the unit heading the road had there. The countryside puts a farm or a
   * cabin at each, so a road leads somewhere.
   */
  roadEnds?: Array<[number, number, number, number]>;
  pois: Array<{
    id: string;
    name: string;
    kind: PoiKind;
    x: number;
    z: number;
    radius: number;
    /** Flattened building pad (POIs with buildings only): ground height and radius in metres. */
    padHeight?: number;
    padRadius?: number;
    /**
     * Towns on street grids (read off the concept map): the x of each north-south street and the
     * z of each east-west street (m), every block [column, row, roof density 0..1], street width.
     * The whole grid is on the pad (padHeight).
     */
    town?: { xs: number[]; zs: number[]; blocks: Array<[number, number, number]>; street: number };
  }>;
  stats: { minHeight: number; maxHeight: number; landFraction: number };
};

/** True for points inside the playable square. */
export const inWorld = (x: number, z: number) =>
  Math.abs(x) <= WORLD_HALF && Math.abs(z) <= WORLD_HALF;

/** Map grid reference of a world point, e.g. "E9" (null outside the map). */
export function gridRef(x: number, z: number): string | null {
  if (!inWorld(x, z)) return null;
  const col = Math.min(9, Math.floor((x + WORLD_HALF) / MAP_CELL));
  const row = Math.min(9, Math.floor((z + WORLD_HALF) / MAP_CELL));
  return `${MAP_COLUMNS[col]}${row + 1}`;
}

/** Centre of a map grid cell ("E9" → world x/z), or null for an invalid reference. */
export function cellCentre(ref: string): { x: number; z: number } | null {
  const m = /^([A-J])(10|[1-9])$/.exec(ref.trim().toUpperCase());
  if (!m) return null;
  const col = MAP_COLUMNS.indexOf(m[1]!);
  const row = Number(m[2]) - 1;
  return { x: -WORLD_HALF + (col + 0.5) * MAP_CELL, z: -WORLD_HALF + (row + 0.5) * MAP_CELL };
}

/** World x/z → normalised map UV (0..1, v down), as drawn on the map overlay. */
export const worldToMapUv = (x: number, z: number) => ({
  u: (x + WORLD_HALF) / WORLD_SIZE,
  v: (z + WORLD_HALF) / WORLD_SIZE,
});
export const mapUvToWorld = (u: number, v: number) => ({
  x: u * WORLD_SIZE - WORLD_HALF,
  z: v * WORLD_SIZE - WORLD_HALF,
});
